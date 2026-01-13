import { ScrapedData, AnalysisResult, AnalysisCategory } from '@/types/analysis';

/**
 * TWO-PHASE Analysis V5.0 - Grok Edition
 * Phase 1: Quick analysis (3 categories, <2s)
 * Phase 2: Full analysis (6 categories, detailed)
 */

const CATEGORY_DEFINITIONS: Record<string, { name: string; icon: string; weight: number }> = {
  value_proposition: { name: 'Värdeerbjudande', icon: '💎', weight: 2.0 },
  call_to_action: { name: 'CTA & Knappar', icon: '🎯', weight: 1.5 },
  social_proof: { name: 'Social Proof', icon: '⭐️', weight: 1.0 },
  lead_capture: { name: 'Leadfångst', icon: '🧲', weight: 1.5 },
  trust_signals: { name: 'Förtroende', icon: '🛡️', weight: 1.0 },
  content_clarity: { name: 'Innehåll', icon: '📝', weight: 1.0 }
};

// Quick prompt - only 3 most important categories
const QUICK_PROMPT = `Analysera konvertering. Svara ENDAST med JSON: {"c":[{"id":"value_proposition","s":3,"st":"improvement","p":"kort problem"},{"id":"call_to_action","s":3,"st":"improvement","p":"kort problem"},{"id":"lead_capture","s":3,"st":"improvement","p":"kort problem"}]} där id är en av: value_proposition, call_to_action, lead_capture. s=poäng 1-5, st=critical|improvement|good, p=kort problembeskrivning på svenska.`;

// Full prompt - all 6 categories with recommendations
const FULL_PROMPT = `Analysera konvertering. Svara ENDAST med JSON: {"c":[{"id":"value_proposition","s":3,"st":"improvement","p":"kort problem","r":"kort lösning"},...]} för alla 6 kategorier: value_proposition, call_to_action, social_proof, lead_capture, trust_signals, content_clarity. s=poäng 1-5, st=critical|improvement|good, p=problem, r=rekommendation. Svenska.`;

export interface QuickAnalysisResult {
  score: number;
  problems: Array<{ category: string; problem: string; status: string }>;
}

/**
 * QUICK Analysis - Phase 1 (mål: <2 sekunder)
 * Analyzes only 3 key categories for instant feedback
 */
export async function analyzeQuick(scrapedData: ScrapedData): Promise<QuickAnalysisResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('XAI_API_KEY is not configured');

  const userPrompt = `${scrapedData.url}\n${scrapedData.title}\n${scrapedData.visibleText.substring(0, 300)}`;

  try {
    const res = await callGrokQuick(apiKey, QUICK_PROMPT, userPrompt);

    const categories = (res.c || []).map((cat: any) => {
      const def = CATEGORY_DEFINITIONS[cat.id] || { name: cat.id, weight: 1.0 };
      return {
        id: cat.id,
        name: def.name,
        score: cat.s || 3,
        status: cat.st || 'improvement',
        problem: cat.p || ''
      };
    });

    // Calculate quick score from 3 categories
    const totalWeight = categories.reduce((sum: number, c: any) => sum + (CATEGORY_DEFINITIONS[c.id]?.weight || 1), 0);
    const weightedSum = categories.reduce((sum: number, c: any) => sum + (c.score * (CATEGORY_DEFINITIONS[c.id]?.weight || 1)), 0);
    const score = totalWeight > 0 ? parseFloat(((weightedSum / (5 * totalWeight)) * 5).toFixed(1)) : 3;

    const problems = categories
      .filter((c: any) => c.problem && c.status !== 'good')
      .map((c: any) => ({
        category: c.name,
        problem: c.problem,
        status: c.status
      }));

    return { score, problems };
  } catch (e) {
    console.error("Quick analysis failed", e);
    return { score: 3, problems: [] };
  }
}

/**
 * Quick Grok API call with shorter timeout
 */
async function callGrokQuick(apiKey: string, system: string, user: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout for quick

  try {
    console.log("Calling Grok API (quick)...");
    const startTime = Date.now();

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'grok-3-fast',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.1,
        max_tokens: 400
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    console.log(`Grok quick response in ${Date.now() - startTime}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Grok API error:", response.status, errorText);
      return { c: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return { c: [] };

    // Extract JSON from response (Grok might include markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { c: [] };

    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    clearTimeout(timeout);
    console.error("Grok quick API failed:", e instanceof Error ? e.message : e);
    return { c: [] };
  }
}

export async function* analyzeWebsiteStream(scrapedData: ScrapedData): AsyncGenerator<any> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('XAI_API_KEY is not configured');

  const userPrompt = formatPrompt(scrapedData);

  yield { type: 'metadata', data: { url: scrapedData.url, analyzed_at: new Date().toISOString() } };

  try {
    // FULL API CALL - all 6 categories
    const res = await callGrok(apiKey, FULL_PROMPT, userPrompt);

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

async function callGrok(apiKey: string, system: string, user: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

  try {
    console.log("Calling Grok API (full)...");
    console.log("System prompt length:", system.length);
    console.log("User prompt length:", user.length);
    const startTime = Date.now();

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'grok-3-fast',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.1,
        max_tokens: 800
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    console.log(`Grok response in ${Date.now() - startTime}ms, status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Grok API error:", response.status, errorText);
      return { c: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error("Grok empty response:", JSON.stringify(data).substring(0, 500));
      return { c: [] };
    }

    // Extract JSON from response (Grok might include markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in Grok response:", content.substring(0, 200));
      return { c: [] };
    }

    console.log("Grok success, parsing JSON:", jsonMatch[0].substring(0, 200));
    const parsed = JSON.parse(jsonMatch[0]);
    console.log("Parsed categories count:", parsed.c?.length || 0);
    return parsed;
  } catch (e) {
    clearTimeout(timeout);
    console.error("Grok API failed:", e instanceof Error ? e.message : e);
    return { c: [] };
  }
}

function formatPrompt(data: ScrapedData): string {
  // Minimal content for speed
  const text = data.visibleText.substring(0, 1000);
  return `${data.url}\n${data.title}\n${text}`;
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
