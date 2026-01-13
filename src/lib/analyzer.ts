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

// Full detailed prompt based on specification
const FULL_PROMPT = `Du är expert på konverteringsoptimering för svenska B2B/B2C-webbplatser. Din uppgift är att identifiera "läckande trattar" – problem som gör att potentiella kunder lämnar utan att ta kontakt.

## ANALYSERA EXAKT DESSA 10 KATEGORIER:

### 1. value_proposition (vikt: 2.0) - Värdeerbjudande
Letar efter: Tydlig H1, fokus på FÖRDELAR (inte bara egenskaper), förståeligt inom 5 sek, differentiering, bevis.
Problem-tags: unclear_headline, features_not_benefits, missing_usp, value_prop_too_complex, no_proof_points
Poäng: 1=rubrik förklarar inte vad de gör, 2=fokus på egenskaper, 3=saknar differentiering, 4=bra men saknar bevis, 5=kristallklart

### 2. call_to_action (vikt: 1.5) - CTA & Knappar
Letar efter: Tydliga CTA-knappar, synlig ovanför fold, handlingsorienterat språk (EJ "Skicka"), visuell kontrast.
Problem-tags: no_cta_found, cta_below_fold, generic_cta_text, low_contrast_cta, single_cta_placement
Poäng: 1=ingen CTA, 2=generisk text/"Skicka", 3=dålig placering, 4=bra men kan förstärkas, 5=optimal

### 3. social_proof (vikt: 1.0) - Social Proof & Trovärdighet
Letar efter: Kundrecensioner med namn, kundlogotyper, siffror ("500+ kunder"), tredjepartsvalidering.
Problem-tags: no_social_proof, no_testimonials, anonymous_testimonials, no_client_logos, no_quantitative_proof
Poäng: 1=ingen social proof, 2=anonym/gömd, 3=finns men ej strategisk, 4=flera typer, 5=omfattande

### 4. lead_capture (vikt: 1.5) - Leadfångst & Leadmagnets
Letar efter: Leadmagnet (guide, checklista), tydligt värde, få formulärfält, synlig placering.
KRITISKT: Identifiera mailto:-länkar och öppna PDF:er utan registrering!
Problem-tags: no_lead_magnet, mailto_link_leak, open_pdf_leak, weak_lead_magnet_value, lead_magnet_hidden
Poäng: 1=ingen leadmagnet, 2=mailto-läckor/öppna PDF:er, 3=svår att hitta, 4=bra men för många fält, 5=oemotståndlig

### 5. form_design (vikt: 1.0) - Formulärdesign
Letar efter: Minimalt antal fält, tydliga etiketter, handlingsorienterad knapp, visuellt rent.
Problem-tags: too_many_form_fields, generic_submit_button, unclear_field_labels, captcha_friction
Poäng: 1=många onödiga fält, 2=generisk knapp, 3=saknar optimering, 4=strömlinjeformat, 5=friktionsfritt

### 6. guarantees (vikt: 1.0) - Garantier & Riskminimering
Letar efter: Nöjdhetsgaranti/pengarna tillbaka, synligt placerad, modig formulering, enkla villkor.
Problem-tags: no_guarantee, guarantee_hidden, guarantee_short_duration, guarantee_weak_language
Poäng: 1=ingen garanti, 2=gömd/komplicerad, 3=synlig men ej optimal, 4=stark och generös, 5=modig och motiverad

### 7. urgency_scarcity (vikt: 0.75) - Brådska & Knapphet
Letar efter: Tidsbegränsade erbjudanden, begränsad kvantitet, autentisk brådska.
OBS: Ofta neutral (3/5) för tjänsteföretag om det inte finns naturlig urgency.
Problem-tags: no_urgency_elements (neutral), fake_urgency, missed_urgency_opportunity
Poäng: 2=fabricerad urgency, 3=inga element (NEUTRAL), 4=autentisk, 5=strategisk och trovärdig

### 8. process_clarity (vikt: 1.0) - Processklarhet
Letar efter: Förklaring av vad som händer efter kontakt, steg-för-steg, tidsförväntningar ("Svar inom 24h").
Problem-tags: no_process_explanation, no_next_step_info, no_timeline_info, contact_info_hidden
Poäng: 1=ingen processinfo, 2=vag/ofullständig, 3=grundläggande, 4=tydlig med tidsramar, 5=komplett future-pacing

### 9. content_architecture (vikt: 0.75) - Innehållsarkitektur
Letar efter: Logisk struktur, skannbarhet (rubriker, korta stycken), visuell hierarki.
Problem-tags: poor_content_structure, wall_of_text, no_visual_hierarchy, content_overwhelming
Poäng: 1=kaotisk/wall of text, 2=svårt att hitta info, 3=rimlig struktur, 4=bra hierarki, 5=optimal

### 10. offer_structure (vikt: 1.0) - Erbjudande
Letar efter: Lågt tröskel första steg (gratis konsultation), transparent prissättning, segmenterade alternativ.
Problem-tags: no_low_barrier_entry, pricing_not_transparent, single_offering, no_premiums
Poäng: 1=hög tröskel/otydligt, 2=ej optimerat, 3=kan förbättras, 4=bra med låg tröskel, 5=no-brainer erbjudande

## OUTPUT FORMAT (ENDAST JSON):
{
  "c": [
    {
      "id": "value_proposition",
      "s": 3,
      "st": "improvement",
      "p": [{
        "t": "features_not_benefits",
        "sv": "medium",
        "d": "Problembeskrivning på svenska",
        "r": "Konkret rekommendation",
        "e": "Hittade: 'Välkommen till vår webbplats'"
      }]
    }
  ]
}

Fält:
- id: kategori-id
- s: poäng 1-5
- st: critical|improvement|good|neutral
- p: array av problem (kan vara tom om score 4-5)
- t: problem-tag
- sv: severity (high|medium|low)
- d: description (svenska)
- r: recommendation (svenska)
- e: evidence (vad du hittade på sidan, kan vara null)

Svara ENDAST med JSON, inget annat.`;

export interface QuickAnalysisResult {
  score: number;
  problems: Array<{ category: string; problem: string; status: string }>;
}

/**
 * QUICK Analysis - Phase 1 (mål: <3 sekunder)
 * Analyzes only 3 key categories for instant feedback
 */
export async function analyzeQuick(scrapedData: ScrapedData): Promise<QuickAnalysisResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('XAI_API_KEY is not configured');

  const userPrompt = formatQuickPrompt(scrapedData);

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

function formatQuickPrompt(data: ScrapedData): string {
  return `URL: ${data.url}
Titel: ${data.title}
H1: ${data.h1.join(', ')}
Beskrivning: ${data.metaDescription}
Text: ${data.visibleText.substring(0, 500)}`;
}

/**
 * Quick Grok API call with shorter timeout
 */
async function callGrokQuick(apiKey: string, system: string, user: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout for quick

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
        max_tokens: 500
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

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { c: [] };

    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    clearTimeout(timeout);
    console.error("Grok quick API failed:", e instanceof Error ? e.message : e);
    return { c: [] };
  }
}

/**
 * FULL Analysis - Phase 2 (all 10 categories)
 * Streams results as they become available
 */
export async function* analyzeWebsiteStream(scrapedData: ScrapedData): AsyncGenerator<any> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('XAI_API_KEY is not configured');

  const userPrompt = formatFullPrompt(scrapedData);

  yield { type: 'metadata', data: { url: scrapedData.url, analyzed_at: new Date().toISOString() } };

  try {
    // FULL API CALL - all 10 categories
    const res = await callGrok(apiKey, FULL_PROMPT, userPrompt);

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
  // Include more data for full analysis
  const leaks = data.localLeaks.map(l => `${l.type}: ${l.details}`).join('\n');
  const forms = data.forms.map(f => `Formulär: ${f.fields.length} fält, knapp: "${f.submitText}"`).join('\n');
  const buttons = data.buttons.slice(0, 10).join(', ');

  return `URL: ${data.url}
Titel: ${data.title}
H1-rubriker: ${data.h1.join(', ')}
Meta-beskrivning: ${data.metaDescription}

FORMULÄR:
${forms || 'Inga formulär hittade'}

KNAPPAR: ${buttons || 'Inga knappar'}

LOKALT DETEKTERADE LÄCKOR:
${leaks || 'Inga mailto/PDF-läckor hittade'}

SYNLIG TEXT (första 2000 tecken):
${data.visibleText.substring(0, 2000)}`;
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

async function callGrok(apiKey: string, system: string, user: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000); // 45s timeout for full analysis

  try {
    console.log("Calling Grok API (full, 10 categories)...");
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
        max_tokens: 3000  // More tokens for 10 categories
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

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in Grok response:", content.substring(0, 300));
      return { c: [] };
    }

    console.log("Grok success, parsing JSON:", jsonMatch[0].substring(0, 300));
    const parsed = JSON.parse(jsonMatch[0]);
    console.log("Parsed categories count:", parsed.c?.length || 0);
    return parsed;
  } catch (e) {
    clearTimeout(timeout);
    console.error("Grok API failed:", e instanceof Error ? e.message : e);
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
