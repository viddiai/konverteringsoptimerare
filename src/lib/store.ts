import { AnalysisResult } from '@/types/analysis';

interface StoredAnalysis {
    id: string;
    url: string;
    email: string;
    firstName: string;
    analyzedAt: string;
    overallScore: number;
    overallCategory: string;
    problemTags: string[];
    leakingFunnels: string[];
}

// In-memory storage for demo purposes
// In production, this would be a database
let analyses: StoredAnalysis[] = [];

export function storeAnalysis(
    analysis: AnalysisResult,
    email: string,
    firstName: string
): StoredAnalysis {
    // Extract all problem tags from categories
    const problemTags: string[] = [];
    for (const category of analysis.categories) {
        for (const problem of category.problems) {
            problemTags.push(problem.tag);
        }
    }

    // Extract leaking funnel types
    const leakingFunnels = analysis.leaking_funnels.map(lf => lf.type);

    const stored: StoredAnalysis = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url: analysis.url,
        email,
        firstName,
        analyzedAt: analysis.analyzed_at,
        overallScore: analysis.overall_score,
        overallCategory: analysis.overall_category,
        problemTags,
        leakingFunnels,
    };

    analyses.push(stored);
    return stored;
}

export function getAllAnalyses(): StoredAnalysis[] {
    return analyses;
}

export function getAnalysisStats() {
    const total = analyses.length;

    // Count problem tag occurrences
    const problemCounts: Record<string, number> = {};
    for (const analysis of analyses) {
        for (const tag of analysis.problemTags) {
            problemCounts[tag] = (problemCounts[tag] || 0) + 1;
        }
    }

    // Count leaking funnel occurrences
    const leakingFunnelCounts: Record<string, number> = {};
    for (const analysis of analyses) {
        for (const funnel of analysis.leakingFunnels) {
            leakingFunnelCounts[funnel] = (leakingFunnelCounts[funnel] || 0) + 1;
        }
    }

    // Sort by count descending
    const topProblems = Object.entries(problemCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count, percentage: total > 0 ? (count / total) * 100 : 0 }));

    const topLeakingFunnels = Object.entries(leakingFunnelCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count, percentage: total > 0 ? (count / total) * 100 : 0 }));

    // Calculate average score
    const avgScore = total > 0
        ? analyses.reduce((sum, a) => sum + a.overallScore, 0) / total
        : 0;

    // Count by category
    const categoryBreakdown: Record<string, number> = {};
    for (const analysis of analyses) {
        categoryBreakdown[analysis.overallCategory] = (categoryBreakdown[analysis.overallCategory] || 0) + 1;
    }

    return {
        totalAnalyses: total,
        averageScore: parseFloat(avgScore.toFixed(2)),
        topProblems,
        topLeakingFunnels,
        categoryBreakdown,
        recentAnalyses: analyses.slice(-10).reverse(),
    };
}

// Demo data for testing the dashboard
export function seedDemoData() {
    const demoProblems = [
        'no_lead_magnet', 'no_social_proof', 'generic_cta_text', 'no_guarantee',
        'unclear_headline', 'no_process_explanation', 'pricing_not_transparent',
        'too_many_form_fields', 'cta_below_fold', 'features_not_benefits'
    ];

    const demoLeaks = ['mailto_link_leak', 'open_pdf_leak'];
    const categories = ['Kritiskt', 'Undermåligt', 'Godkänt', 'Bra', 'Utmärkt'];

    for (let i = 0; i < 25; i++) {
        const score = 1 + Math.random() * 4;
        const numProblems = Math.floor(Math.random() * 6) + 2;
        const problemTags = [];
        for (let j = 0; j < numProblems; j++) {
            problemTags.push(demoProblems[Math.floor(Math.random() * demoProblems.length)]);
        }

        const leakingFunnels = Math.random() > 0.5
            ? [demoLeaks[Math.floor(Math.random() * demoLeaks.length)]]
            : [];

        analyses.push({
            id: `demo-${i}`,
            url: `https://example${i + 1}.se`,
            email: `user${i + 1}@example.com`,
            firstName: `User ${i + 1}`,
            analyzedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            overallScore: parseFloat(score.toFixed(1)),
            overallCategory: categories[Math.min(4, Math.floor(score) - 1)] || 'Godkänt',
            problemTags,
            leakingFunnels,
        });
    }
}
