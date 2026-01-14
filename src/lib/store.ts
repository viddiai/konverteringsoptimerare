import { AnalysisResult } from '@/types/analysis';

export interface StoredAnalysis {
    id: string;
    url: string;
    email: string;
    firstName: string;
    analyzedAt: string;
    overallScore: number;
    overallCategory: string;
    problemTags: string[];
    leakingFunnels: string[];
    fullReport: AnalysisResult; // Store full report for viewing
}

const ANALYSIS_IDS_KEY = 'analysis:ids';

// Check if KV is configured (supports both Vercel KV and Upstash naming)
function isKVConfigured(): boolean {
    const hasVercelKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
    return hasVercelKV || hasUpstash;
}

// Dynamic import to avoid errors when KV is not configured
async function getKV() {
    if (!isKVConfigured()) {
        return null;
    }
    const { kv } = await import('@vercel/kv');
    return kv;
}

export async function storeAnalysis(
    analysis: AnalysisResult,
    email: string,
    firstName: string
): Promise<StoredAnalysis> {
    // Extract all problem tags from categories
    const problemTags: string[] = [];
    for (const category of analysis.categories) {
        for (const problem of category.problems) {
            if (problem.tag) {
                problemTags.push(problem.tag);
            }
        }
    }

    // Extract leaking funnel types
    const leakingFunnels = analysis.leaking_funnels.map(lf => lf.type);

    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const stored: StoredAnalysis = {
        id,
        url: analysis.url,
        email,
        firstName,
        analyzedAt: analysis.analyzed_at,
        overallScore: analysis.overall_score,
        overallCategory: analysis.overall_category,
        problemTags,
        leakingFunnels,
        fullReport: analysis,
    };

    // Store in Vercel KV if configured
    const kv = await getKV();
    if (kv) {
        await kv.set(`analysis:${id}`, stored);
        await kv.lpush(ANALYSIS_IDS_KEY, id);
    } else {
        console.warn('Vercel KV not configured - registration not saved');
    }

    return stored;
}

export async function getAnalysisById(id: string): Promise<StoredAnalysis | null> {
    const kv = await getKV();
    if (!kv) return null;

    return await kv.get<StoredAnalysis>(`analysis:${id}`);
}

export async function getAllAnalyses(): Promise<StoredAnalysis[]> {
    const kv = await getKV();
    if (!kv) {
        return [];
    }

    const ids = await kv.lrange<string>(ANALYSIS_IDS_KEY, 0, -1);
    if (!ids || ids.length === 0) return [];

    const analyses = await Promise.all(
        ids.map(id => kv.get<StoredAnalysis>(`analysis:${id}`))
    );

    return analyses.filter((a): a is StoredAnalysis => a !== null);
}

export async function getAnalysisStats() {
    const analyses = await getAllAnalyses();
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

    // Sort by date descending (exclude fullReport from list to save bandwidth)
    const sortedAnalyses = [...analyses]
        .sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime())
        .map(({ fullReport, ...rest }) => rest);

    return {
        totalAnalyses: total,
        averageScore: parseFloat(avgScore.toFixed(2)),
        topProblems,
        topLeakingFunnels,
        categoryBreakdown,
        recentAnalyses: sortedAnalyses,
    };
}
