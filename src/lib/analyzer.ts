import { ScrapedData, AnalysisResult, AnalysisCategory } from '@/types/analysis';

/**
 * ULTRA-FAST Analysis V4.0
 * Single API call, local summary generation
 */

const CATEGORY_DEFINITIONS: Record<string, { name: string; icon: string; weight: number }> = {
  value_proposition: { name: 'Värdeerbjudande', icon: '💎', weight: 2.0 },
  call_to_action: { name: 'CTA & Knappar', icon: '🎯', weight: 1.5 },
  social_proof: { name: 'Social Proof', icon: '⭐️', weight: 1.0 },
  lead_capture: { name: 'Leadfångst', icon: '🧲', weight: 1.5 },
  trust_signals: { name: 'Förtroende', icon: '🛡️', weight: 1.0 },
  content_clarity: { name: 'Innehåll', icon: '📝', weight: 1.0 }
};

// Single ultra-compact prompt - 6 categories only
const SINGLE_PROMPT = `Analysera webbsida för konvertering. 6 kategorier. Kortfattat.
JSON: {"c":[{"id":"value_proposition|call_to_action|social_proof|lead_capture|trust_signals|content_clarity","s":1-5,"st":"critical|improvement|good","p":"problem","r":"rekommendation"}]}
Exakt 6 objekt. Svenska. Max 15 ord per p/r.`;

export async function* analyzeWebsiteStream(scrapedData: ScrapedData): AsyncGenerator<any> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const userPrompt = formatPrompt(scrapedData);

  yield { type: 'metadata', data: { url: scrapedData.url, analyzed_at: new Date().toISOString() } };

  try {
    // SINGLE API CALL - that's it!
    const res = await callAPI(apiKey, SINGLE_PROMPT, userPrompt);

    const categories = (res.c || []).map((cat: any) => {
      const def = CATEGORY_DEFINITIONS[cat.id] || { name: cat.id, icon: '❓', weight: 1.0 };
      return {
        id: cat.id,
        ...def,
        score: cat.s || 3,
        status: cat.st || 'improvement',
        problems: cat.p ? [{ description: cat.p, recommendation: cat.r || '' }] : []
      };
    });

    yield { type: 'categories', data: categories };

    // Generate summary LOCALLY (no API call needed!)
    const summary = generateLocalSummary(categories, scrapedData);
    yield { type: 'summary', data: summary };

  } catch (e) {
    console.error("Analysis failed", e);
    yield { type: 'categories', data: [] };
    yield { type: 'summary', data: { overall_summary: 'Analysen misslyckades', strengths: [], action_list: [] } };
  }
}

function generateLocalSummary(categories: any[], scrapedData: ScrapedData) {
  const avgScore = categories.reduce((sum, c) => sum + (c.score || 3), 0) / (categories.length || 1);
  const critical = categories.filter(c => c.status === 'critical');
  const good = categories.filter(c => c.status === 'good');

  // Generate strengths from good categories
  const strengths = good.slice(0, 3).map(c => `${c.name} är bra`);
  if (strengths.length === 0) strengths.push('Webbplatsen fungerar tekniskt');

  // Generate action list from problems
  const action_list = categories
    .filter(c => c.problems?.length > 0)
    .slice(0, 5)
    .map(c => ({
      priority: c.status === 'critical' ? 'critical' : 'important',
      action: c.problems[0]?.recommendation || `Förbättra ${c.name}`,
      category_id: c.id
    }));

  // Generate summary
  let overall_summary = '';
  if (avgScore < 2.5) {
    overall_summary = `Webbplatsen har ${critical.length} kritiska problem som måste åtgärdas. Fokusera på värdeerbjudande och CTA.`;
  } else if (avgScore < 3.5) {
    overall_summary = `Webbplatsen har förbättringspotential. ${critical.length > 0 ? `${critical.length} kritiska områden.` : 'Inga kritiska fel.'}`;
  } else {
    overall_summary = `Webbplatsen presterar bra. ${good.length} områden är starka. Finjustera detaljerna för ännu bättre resultat.`;
  }

  return {
    overall_summary,
    strengths,
    action_list,
    language_detected: 'sv'
  };
}

async function callAPI(apiKey: string, system: string, user: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

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
        max_tokens: 600, // Very small - just scores and short text
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { c: [] };

    return JSON.parse(content);
  } catch (e) {
    clearTimeout(timeout);
    console.error("API failed:", e);
    return { c: [] };
  }
}

function formatPrompt(data: ScrapedData): string {
  // Ultra-compact: just 1500 chars of content
  const text = data.visibleText.substring(0, 1500);
  const forms = data.forms?.length || 0;
  const btns = data.buttons?.filter(b => b.trim()).slice(0, 3).join(', ') || 'inga';

  return `${data.url}\n${data.title}\nForms:${forms} CTAs:${btns}\n${text}`;
}

// Fallback for non-streaming
export async function analyzeWebsite(scrapedData: ScrapedData): Promise<AnalysisResult> {
  const stream = analyzeWebsiteStream(scrapedData);
  const results: any[] = [];
  for await (const chunk of stream) {
    results.push(chunk);
  }

  const metadata = results.find(r => r.type === 'metadata')?.data;
  const allCategories = results.filter(r => r.type === 'categories').flatMap(r => r.data);
  const summaryData = results.find(r => r.type === 'summary')?.data;

  const categories: AnalysisCategory[] = allCategories.map(cat => ({
    ...cat,
    score: cat.score || 3,
    status: cat.status || 'not_identified',
    problems: cat.problems || []
  }));

  const score = calculateScore(categories);

  return {
    ...metadata,
    language_detected: 'sv',
    language_supported: true,
    overall_score: score,
    overall_score_rounded: score.toFixed(1),
    overall_category: getCategory(score),
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

function calculateScore(categories: AnalysisCategory[]): number {
  const totalWeight = categories.reduce((sum, cat) => sum + (cat.weight || 1), 0);
  if (totalWeight === 0) return 3;
  const weightedSum = categories.reduce((sum, cat) => sum + ((cat.score || 3) * (cat.weight || 1)), 0);
  return parseFloat(((weightedSum / (5 * totalWeight)) * 5).toFixed(1));
}

function getCategory(score: number): AnalysisResult['overall_category'] {
  if (score < 2) return 'Kritiskt';
  if (score < 3) return 'Undermåligt';
  if (score < 3.5) return 'Godkänt';
  if (score < 4.5) return 'Bra';
  return 'Utmärkt';
}
