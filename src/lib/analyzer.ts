import { ScrapedData, AnalysisResult, AnalysisCategory } from '@/types/analysis';

/**
 * Streaming Architecture (V3.2)
 * Uses Static Metadata for 100% reliability and reduced token usage.
 */

// Static definitions to ensure UI always breaks correctly and saves tokens
const CATEGORY_DEFINITIONS: Record<string, { name: string; icon: string; weight: number }> = {
  // Batch 1
  value_proposition: { name: 'Värdeerbjudandets Tydlighet', icon: '💎', weight: 2.0 },
  call_to_action: { name: 'CTA Effektivitet', icon: '🎯', weight: 1.5 },
  social_proof: { name: 'Social Proof & Trovärdighet', icon: '⭐️', weight: 1.0 },
  lead_magnets: { name: 'Leadmagnet-kvalitet', icon: '🧲', weight: 1.5 },
  form_design: { name: 'Formulärdesign', icon: '📝', weight: 1.0 },
  // Batch 2
  guarantees: { name: 'Riskminimering & Garantier', icon: '🛡️', weight: 1.0 },
  urgency_scarcity: { name: 'Brådska & Knapphet', icon: '⏳', weight: 0.75 },
  process_clarity: { name: 'Processklarhet', icon: '⚙️', weight: 1.0 },
  content_architecture: { name: 'Innehållsarkitektur', icon: '🏗️', weight: 0.75 },
  offer_structure: { name: 'Erbjudandets Struktur', icon: '📦', weight: 1.0 }
};

// Combined prompt for ALL 10 categories (faster than 2 separate calls)
const SYSTEM_PROMPT_CATEGORIES = `Konverteringsexpert. Analysera ALLA 10 kategorier för webbplatsen. Kortfattat.
JSON: { "categories": [{ "id": "...", "score": 1-5, "status": "critical|improvement|good", "problems": [{"description":"...","recommendation":"..."}] }] }
IDs: value_proposition, call_to_action, social_proof, lead_magnets, form_design, guarantees, urgency_scarcity, process_clarity, content_architecture, offer_structure.
Max 1 problem per kategori. Svenska.`;

const SYSTEM_PROMPT_SUMMARY = `Sammanfatta konverteringsanalys. Kortfattat.
JSON: { "overall_summary": "2 meningar", "strengths": ["kort","kort","kort"], "action_list": [{"priority":"critical|important|nice","action":"kort"}], "language_detected": "sv" }
Max 5 åtgärder.`;

export async function* analyzeWebsiteStream(scrapedData: ScrapedData): AsyncGenerator<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const userPrompt = formatScrapedDataForPrompt(scrapedData);

  // Initial yield with metadata
  yield { type: 'metadata', data: { url: scrapedData.url, analyzed_at: new Date().toISOString() } };

  // Process all categories in a single call (faster than 2 separate calls)
  const processCategories = async (): Promise<any> => {
    try {
      const res = await callAPI(apiKey, SYSTEM_PROMPT_CATEGORIES, userPrompt, 2000);
      const categories = (res.categories || []).map((cat: any) => {
        const def = CATEGORY_DEFINITIONS[cat.id] || { name: cat.id, icon: '❓', weight: 1.0 };
        return {
          ...cat,
          ...def,
          weighted_score: (cat.score || 3) * def.weight
        };
      });
      return { type: 'categories', data: categories };
    } catch (e) {
      console.error("Categories failed", e);
      return { type: 'categories', data: [] };
    }
  };

  // Run both in parallel (2 calls instead of 3)
  const categoriesPromise = processCategories();
  const summaryPromise = callAPI(apiKey, SYSTEM_PROMPT_SUMMARY, userPrompt, 800)
    .then(res => ({ type: 'summary', data: res }))
    .catch(() => ({ type: 'summary', data: {} }));

  // Yield results as they complete
  const pending = new Map<Promise<any>, string>();
  pending.set(categoriesPromise.then(v => ({ v, id: 'cat' })), 'cat');
  pending.set(summaryPromise.then(v => ({ v, id: 'sum' })), 'sum');

  while (pending.size > 0) {
    const result = await Promise.race(pending.keys());
    const resolved = await result;
    yield resolved.v;

    for (const [promise, id] of pending.entries()) {
      if (id === resolved.id) {
        pending.delete(promise);
        break;
      }
    }
  }
}

// Fallback for non-streaming usage
export async function analyzeWebsite(scrapedData: ScrapedData): Promise<AnalysisResult> {
  const stream = analyzeWebsiteStream(scrapedData);
  const results: any[] = [];
  for await (const chunk of stream) {
    results.push(chunk);
  }

  // Merge into final AnalysisResult
  const metadata = results.find(r => r.type === 'metadata')?.data;
  const allCategories = results.filter(r => r.type === 'categories').flatMap(r => r.data);
  const summaryData = results.find(r => r.type === 'summary')?.data;

  const categories: AnalysisCategory[] = allCategories.map(cat => ({
    ...cat,
    score: cat.score || 3,
    status: cat.status || 'not_identified',
    problems: cat.problems || []
  }));

  const score = calculateOverallScore(categories);

  return {
    ...metadata,
    language_detected: summaryData?.language_detected || 'sv',
    language_supported: true,
    overall_score: score,
    overall_score_rounded: score.toFixed(1),
    overall_category: getOverallCategory(score),
    overall_summary: summaryData?.overall_summary || "",
    categories,
    strengths: summaryData?.strengths || [],
    action_list: summaryData?.action_list || [],
    leaking_funnels: scrapedData.localLeaks || [],
    metadata: {
      categories_analyzed: categories.length,
      critical_issues: categories.filter(c => c.status === 'critical').length,
      improvement_opportunities: categories.filter(c => c.status === 'improvement').length,
      strengths_found: summaryData?.strengths?.length || 0,
      leaking_funnels_found: scrapedData.localLeaks?.length || 0
    }
  };
}

async function callAPI(apiKey: string, system: string, user: string, maxTokens: number = 1000): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: 0.1,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return {};

    return JSON.parse(content);
  } catch (e) {
    clearTimeout(timeout);
    console.error("API call failed:", e);
    return {};
  }
}

function formatScrapedDataForPrompt(data: ScrapedData): string {
  // Reduced to 3000 chars for faster processing
  const content = data.visibleText.substring(0, 3000);

  // Compact form info
  const formsInfo = data.forms?.length
    ? `\nForms(${data.forms.length}): ${data.forms.map(f => f.submitText || 'Skicka').join(', ')}`
    : '\nForms: 0';

  // Compact buttons
  const btns = data.buttons?.filter(b => b.trim()).slice(0, 5) || [];
  const buttonsInfo = btns.length ? `\nCTAs: ${btns.join(', ')}` : '';

  return `${data.url}\n${data.title}\n${content}${formsInfo}${buttonsInfo}`;
}

function calculateOverallScore(categories: AnalysisCategory[]): number {
  const totalWeight = categories.reduce((sum, cat) => sum + (cat.weight || 1), 0);
  if (totalWeight === 0) return 3;
  const weightedSum = categories.reduce((sum, cat) => sum + ((cat.score || 3) * (cat.weight || 1)), 0);
  return parseFloat(((weightedSum / (5 * totalWeight)) * 5).toFixed(1));
}

function getOverallCategory(score: number): AnalysisResult['overall_category'] {
  if (score < 2) return 'Kritiskt';
  if (score < 3) return 'Undermåligt';
  if (score < 3.5) return 'Godkänt';
  if (score < 4.5) return 'Bra';
  return 'Utmärkt';
}
