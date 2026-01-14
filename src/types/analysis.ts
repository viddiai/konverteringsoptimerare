/**
 * Analysis result types matching the specification in section 10.2
 */

export interface AnalysisProblem {
    tag?: string;  // Granulär problem-tag, t.ex. "no_social_proof"
    severity?: 'high' | 'medium' | 'low';
    description: string;
    recommendation: string;
    evidence?: string | null;  // Konkret bevis från webbplatsen
}

export interface AnalysisCategory {
    id: string;
    name: string;
    icon: string;
    score: number;
    weight: number;
    weighted_score: number;
    status: 'critical' | 'improvement' | 'good' | 'neutral' | 'not_identified';
    problems: AnalysisProblem[];
    strength_reason?: string;  // Förklaring varför detta är en styrka (för kategorier med 4-5 poäng)
}

export interface ActionItem {
    priority: 'critical' | 'important' | 'improvement';
    action: string;
    category_id: string;
    impact: 'high' | 'medium' | 'low';
}

export interface LeakingFunnel {
    type: string;
    severity: 'high' | 'medium' | 'low';
    location: string;
    details: string;
    recommendation: string;
}

export interface AnalysisMetadata {
    categories_analyzed: number;
    critical_issues: number;
    improvement_opportunities: number;
    strengths_found: number;
    leaking_funnels_found: number;
}

export interface AnalysisResult {
    url: string;
    analyzed_at: string;
    language_detected: string;
    language_supported: boolean;

    overall_score: number;
    overall_score_rounded: string;
    overall_category: 'Kritiskt' | 'Undermåligt' | 'Godkänt' | 'Bra' | 'Utmärkt';
    overall_summary: string;

    categories: AnalysisCategory[];
    strengths: string[];
    action_list: ActionItem[];
    leaking_funnels: LeakingFunnel[];
    metadata: AnalysisMetadata;
}

export interface AnalysisError {
    language_detected?: string;
    language_supported: boolean;
    error: string;
}

export type AnalysisResponse = AnalysisResult | AnalysisError;

/**
 * Scraped website data structure
 */
export interface ScrapedData {
    url: string;
    title: string;
    metaDescription: string;
    h1: string[];
    headings: { level: number; text: string }[];
    paragraphs: string[];
    links: { text: string; href: string }[];
    buttons: string[];
    forms: {
        action: string;
        method: string;
        fields: { name: string; type: string; required: boolean }[];
        submitText: string;
    }[];
    images: { alt: string; src: string }[];
    visibleText: string;
    localLeaks: LeakingFunnel[];
}
