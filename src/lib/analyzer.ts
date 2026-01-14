import { ScrapedData, AnalysisResult, AnalysisCategory, AnalysisProblem } from '@/types/analysis';

/**
 * TWO-PHASE Analysis V6.0 - Full Spec Implementation
 * Phase 1: Quick analysis (3 categories, <2s)
 * Phase 2: Full analysis (10 categories with granular tags)
 *
 * Total weight: 11.5 according to specification
 */

const CATEGORY_DEFINITIONS: Record<string, { name: string; icon: string; weight: number }> = {
  value_proposition: { name: 'Värdeerbjudande', icon: '💎', weight: 2.0 },
  call_to_action: { name: 'CTA & Knappar', icon: '🎯', weight: 1.5 },
  social_proof: { name: 'Social Proof', icon: '⭐', weight: 1.0 },
  lead_capture: { name: 'Leadfångst', icon: '🧲', weight: 1.5 },
  form_design: { name: 'Formulärdesign', icon: '📝', weight: 1.0 },
  guarantees: { name: 'Garantier', icon: '🛡️', weight: 1.0 },
  urgency_scarcity: { name: 'Brådska & Knapphet', icon: '⏰', weight: 0.75 },
  process_clarity: { name: 'Processklarhet', icon: '🗺️', weight: 1.0 },
  content_architecture: { name: 'Innehållsarkitektur', icon: '🏗️', weight: 0.75 },
  offer_structure: { name: 'Erbjudande', icon: '💰', weight: 1.0 }
};
// Total weight: 2.0 + 1.5 + 1.0 + 1.5 + 1.0 + 1.0 + 0.75 + 1.0 + 0.75 + 1.0 = 11.5

// Quick prompt - only 3 most important categories for instant feedback
const QUICK_PROMPT = `Du analyserar svenska webbplatsers konverteringsförmåga. Svara ENDAST med JSON.

Analysera dessa 3 kritiska kategorier:
1. value_proposition (vikt: 2.0) - Värdeerbjudande
2. call_to_action (vikt: 1.5) - CTA & Knappar
3. lead_capture (vikt: 1.5) - Leadfångst

Poängskala 1-5:
- 1-2 = critical (allvarliga brister)
- 3 = improvement (förbättringspotential)
- 4-5 = good (fungerar bra)

Svara med:
{"c":[{"id":"value_proposition","s":3,"st":"improvement","p":"kort problembeskrivning"},{"id":"call_to_action","s":3,"st":"improvement","p":"kort problembeskrivning"},{"id":"lead_capture","s":3,"st":"improvement","p":"kort problembeskrivning"}]}

Endast JSON, inget annat.`;

// Full analysis prompt - requires ALL 10 categories with detailed descriptions
const FULL_PROMPT = `Du är en konverteringsoptimeringsexpert som analyserar svenska webbplatser. Svara ENDAST med JSON på svenska.

VIKTIGT: Du MÅSTE returnera EXAKT 10 kategorier. Ingen kategori får utelämnas.

DE 10 KATEGORIER SOM KRÄVS (alla måste inkluderas):
1. value_proposition - Värdeerbjudande: Hur tydligt kommuniceras värdet? Finns USP?
2. call_to_action - CTA & Knappar: Är CTA:er tydliga, synliga och övertygande?
3. social_proof - Social Proof: Finns recensioner, testimonials, kundlogotyper, antal användare?
4. lead_capture - Leadfångst: Finns formulär, nyhetsbrev, lead magnets?
5. form_design - Formulärdesign: Är formulär enkla, korta, användarvänliga?
6. guarantees - Garantier: Finns nöjdhetsgaranti, pengarna-tillbaka, trygghetssymboler?
7. urgency_scarcity - Brådska & Knapphet: Finns tidsbegränsade erbjudanden, lagerstatus?
8. process_clarity - Processklarhet: Är nästa steg tydliga? Finns "Så fungerar det"?
9. content_architecture - Innehållsarkitektur: Är strukturen logisk? Lätt att navigera?
10. offer_structure - Erbjudande: Är prissättning tydlig? Finns paket/alternativ?

POÄNGSKALA (1-5):
- 1 = Kritiskt dåligt, saknas helt
- 2 = Allvarliga brister
- 3 = Grundläggande men förbättringspotential
- 4 = Bra implementation
- 5 = Utmärkt, best practice

STATUS baserat på poäng:
- 1-2 = "critical"
- 3 = "improvement"
- 4-5 = "good"
- För urgency_scarcity: 3 = "neutral" (inte alltid nödvändigt)

FÖR VARJE KATEGORI, inkludera:
- d (description): Detaljerad beskrivning av problemet (minst 20 ord)
- r (recommendation): Konkret åtgärdsförslag (minst 15 ord)

EXAKT JSON-FORMAT (alla 10 kategorier krävs):
{"c":[
  {"id":"value_proposition","s":3,"st":"improvement","p":[{"d":"Detaljerad problembeskrivning här...","r":"Konkret rekommendation här..."}]},
  {"id":"call_to_action","s":4,"st":"good","p":[]},
  {"id":"social_proof","s":2,"st":"critical","p":[{"d":"...","r":"..."}]},
  {"id":"lead_capture","s":2,"st":"critical","p":[{"d":"...","r":"..."}]},
  {"id":"form_design","s":3,"st":"improvement","p":[{"d":"...","r":"..."}]},
  {"id":"guarantees","s":2,"st":"critical","p":[{"d":"...","r":"..."}]},
  {"id":"urgency_scarcity","s":3,"st":"neutral","p":[]},
  {"id":"process_clarity","s":3,"st":"improvement","p":[{"d":"...","r":"..."}]},
  {"id":"content_architecture","s":4,"st":"good","p":[]},
  {"id":"offer_structure","s":3,"st":"improvement","p":[{"d":"...","r":"..."}]}
]}

REGLER:
- Returnera EXAKT 10 kategorier, inga fler, inga färre
- Använd EXAKT dessa id-strängar (inga nummer, inga variationer)
- Varje kategori med poäng 1-3 MÅSTE ha minst ett problem med d och r
- Skriv på svenska
- Endast JSON, ingen annan text`;

export interface QuickAnalysisResult {
  score: number;
  problems: Array<{ category: string; problem: string; status: string }>;
}

/**
 * QUICK Analysis - Phase 1 (mål: <3 sekunder)
 * Analyzes only 3 key categories for instant feedback
 */
export async function analyzeQuick(scrapedData: ScrapedData): Promise<QuickAnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const userPrompt = formatQuickPrompt(scrapedData);

  try {
    const res = await callClaudeQuick(apiKey, QUICK_PROMPT, userPrompt);

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

function formatQuickPrompt(data: ScrapedData): string {
  return `URL: ${data.url}
Titel: ${data.title}
H1: ${data.h1.join(', ')}
Beskrivning: ${data.metaDescription}
Text: ${data.visibleText.substring(0, 500)}`;
}

/**
 * Quick Claude Haiku API call with shorter timeout
 */
async function callClaudeQuick(apiKey: string, system: string, user: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout for quick

  try {
    console.log("Calling Claude Haiku API (quick)...");
    const startTime = Date.now();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 500,
        system: system,
        messages: [
          { role: 'user', content: user }
        ]
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    console.log(`Claude Haiku quick response in ${Date.now() - startTime}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      return { c: [] };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;
    if (!content) return { c: [] };

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { c: [] };

    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    clearTimeout(timeout);
    console.error("Claude quick API failed:", e instanceof Error ? e.message : e);
    return { c: [] };
  }
}

/**
 * FULL Analysis - Phase 2 (all 10 categories)
 * Streams results as they become available
 */
export async function* analyzeWebsiteStream(scrapedData: ScrapedData): AsyncGenerator<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  const userPrompt = formatFullPrompt(scrapedData);

  yield { type: 'metadata', data: { url: scrapedData.url, analyzed_at: new Date().toISOString() } };

  try {
    // FULL API CALL - all 10 categories
    const res = await callClaude(apiKey, FULL_PROMPT, userPrompt);

    const categories = parseCategories(res, scrapedData);

    yield { type: 'categories', data: categories };

    // Generate summary locally
    const summary = generateLocalSummary(categories, scrapedData);
    yield { type: 'summary', data: summary };

  } catch (e) {
    console.error("Analysis failed", e);
    yield { type: 'categories', data: [] };
    yield { type: 'summary', data: { overall_summary: 'Analysen misslyckades', strengths: [], action_list: [] } };
  }
}

function formatFullPrompt(data: ScrapedData): string {
  // ULTRA-COMPACT format for fastest API response
  const leaks = data.localLeaks.slice(0, 2).map(l => l.type).join(', ');
  const formInfo = data.forms.length > 0 ? `${data.forms[0].fields.length} fält` : 'Inga';
  const ctaButtons = data.buttons.slice(0, 3).join(', ');

  // Limit text strictly to 1000 chars
  const visibleText = (data.visibleText || '').substring(0, 1000);

  // Build compact prompt
  const parts = [
    data.url,
    `T:${(data.title || '').substring(0, 60)}`,
    `H1:${(data.h1[0] || '').substring(0, 60)}`,
    `Meta:${(data.metaDescription || '').substring(0, 80)}`,
    `Form:${formInfo}`,
    `CTA:${ctaButtons.substring(0, 50)}`,
    `Leaks:${leaks || 'Inga'}`,
    visibleText
  ];

  return parts.join('|');
}

function parseCategories(res: any, scrapedData: ScrapedData): AnalysisCategory[] {
  const categories: AnalysisCategory[] = [];

  for (const cat of (res.c || [])) {
    const def = CATEGORY_DEFINITIONS[cat.id];
    if (!def) continue;

    // Parse problems array
    const problems: AnalysisProblem[] = [];
    const rawProblems = Array.isArray(cat.p) ? cat.p : (cat.p ? [cat.p] : []);

    for (const prob of rawProblems) {
      if (typeof prob === 'string') {
        // Simple string problem (backwards compatibility)
        problems.push({
          description: prob,
          recommendation: cat.r || ''
        });
      } else if (typeof prob === 'object') {
        // Full problem object
        problems.push({
          tag: prob.t || undefined,
          severity: prob.sv || undefined,
          description: prob.d || prob.description || '',
          recommendation: prob.r || prob.recommendation || '',
          evidence: prob.e || prob.evidence || null
        });
      }
    }

    categories.push({
      id: cat.id,
      name: def.name,
      icon: def.icon,
      weight: def.weight,
      weighted_score: (cat.s || 3) * def.weight,
      score: cat.s || 3,
      status: cat.st || 'improvement',
      problems
    });
  }

  // Ensure all 10 categories exist (add missing ones with neutral score)
  for (const [id, def] of Object.entries(CATEGORY_DEFINITIONS)) {
    if (!categories.find(c => c.id === id)) {
      categories.push({
        id,
        name: def.name,
        icon: def.icon,
        weight: def.weight,
        weighted_score: 3 * def.weight,
        score: 3,
        status: 'not_identified',
        problems: [{
          description: `Kunde inte analysera ${def.name.toLowerCase()}`,
          recommendation: `Se över ${def.name.toLowerCase()} manuellt`
        }]
      });
    }
  }

  // Sort by weight (highest first)
  return categories.sort((a, b) => b.weight - a.weight);
}

function generateLocalSummary(categories: AnalysisCategory[], scrapedData: ScrapedData) {
  // Calculate weighted score
  const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0);
  const weightedSum = categories.reduce((sum, c) => sum + (c.score * c.weight), 0);
  const avgScore = totalWeight > 0 ? weightedSum / totalWeight : 3;

  const critical = categories.filter(c => c.status === 'critical');
  const good = categories.filter(c => c.status === 'good');

  // Generate strengths from good categories
  const strengths = good.slice(0, 3).map(c => `${c.name} fungerar bra`);
  if (strengths.length === 0 && avgScore >= 3) {
    strengths.push('Webbplatsen har grunderna på plats');
  }

  // Generate action list from problems (sorted by severity and weight)
  const action_list = categories
    .filter(c => c.problems?.length > 0 && c.status !== 'good')
    .sort((a, b) => {
      // Critical first, then by weight
      if (a.status === 'critical' && b.status !== 'critical') return -1;
      if (b.status === 'critical' && a.status !== 'critical') return 1;
      return b.weight - a.weight;
    })
    .slice(0, 6)
    .map(c => ({
      priority: c.status === 'critical' ? 'critical' as const : 'important' as const,
      action: c.problems[0]?.recommendation || `Förbättra ${c.name}`,
      category_id: c.id,
      impact: c.weight >= 1.5 ? 'high' as const : c.weight >= 1.0 ? 'medium' as const : 'low' as const
    }));

  // Generate summary based on score using spec templates
  let overall_summary = '';
  if (avgScore < 2) {
    overall_summary = `Din webbplats har allvarliga brister som kraftigt hindrar konvertering. Vi har identifierat ${critical.length} kritiska problem som behöver åtgärdas omedelbart.`;
  } else if (avgScore < 3) {
    overall_summary = `Din webbplats har grunderna på plats men läcker leads på flera kritiska ställen. Vi har identifierat ${critical.length} problem som, om de åtgärdas, kan öka din konvertering markant.`;
  } else if (avgScore < 3.5) {
    overall_summary = `Din webbplats fungerar men har tydlig förbättringspotential. Med ${action_list.length} strategiska förbättringar kan du öka din konvertering betydligt.`;
  } else if (avgScore < 4.5) {
    overall_summary = `Din webbplats är väl optimerad för konvertering. Vi har hittat ${action_list.length} förbättringsmöjligheter som kan ta den till nästa nivå.`;
  } else {
    overall_summary = `Imponerande! Din webbplats är optimerad för konvertering på de flesta områden. Fortsätt det goda arbetet!`;
  }

  return {
    overall_summary,
    strengths,
    action_list,
    language_detected: 'sv'
  };
}

async function callClaude(apiKey: string, system: string, user: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout (Vercel limit)

  try {
    console.log("Calling Claude Haiku API (full, 10 categories)...");
    console.log("System prompt length:", system.length);
    console.log("User prompt length:", user.length);
    const startTime = Date.now();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4000,
        system: system,
        messages: [
          { role: 'user', content: user }
        ]
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    console.log(`Claude Haiku response in ${Date.now() - startTime}ms, status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);
      return { c: [] };
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;
    if (!content) {
      console.error("Claude empty response:", JSON.stringify(data).substring(0, 500));
      return { c: [] };
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in Claude response:", content.substring(0, 300));
      return { c: [] };
    }

    console.log("Claude success, parsing JSON:", jsonMatch[0].substring(0, 300));
    const parsed = JSON.parse(jsonMatch[0]);
    console.log("Parsed categories count:", parsed.c?.length || 0);
    return parsed;
  } catch (e) {
    clearTimeout(timeout);
    console.error("Claude API failed:", e instanceof Error ? e.message : e);
    return { c: [] };
  }
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

  const categories: AnalysisCategory[] = allCategories.map((cat: any) => ({
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
