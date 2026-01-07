'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Users, TrendingUp, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ProblemStat {
    tag: string;
    count: number;
    percentage: number;
}

interface LeakStat {
    type: string;
    count: number;
    percentage: number;
}

interface RecentAnalysis {
    id: string;
    url: string;
    email: string;
    firstName: string;
    analyzedAt: string;
    overallScore: number;
    overallCategory: string;
}

interface AdminStats {
    totalAnalyses: number;
    averageScore: number;
    topProblems: ProblemStat[];
    topLeakingFunnels: LeakStat[];
    categoryBreakdown: Record<string, number>;
    recentAnalyses: RecentAnalysis[];
}

const PROBLEM_LABELS: Record<string, string> = {
    no_lead_magnet: 'Ingen leadmagnet',
    no_social_proof: 'Ingen social proof',
    generic_cta_text: 'Generisk CTA-text',
    no_guarantee: 'Ingen garanti',
    unclear_headline: 'Otydlig rubrik',
    no_process_explanation: 'Ingen processförklaring',
    pricing_not_transparent: 'Otydlig prissättning',
    too_many_form_fields: 'För många formulärfält',
    cta_below_fold: 'CTA under fold',
    features_not_benefits: 'Egenskaper istället för fördelar',
    mailto_link_leak: 'mailto:-länk läcka',
    open_pdf_leak: 'Öppen PDF-läcka',
    missing_usp: 'Saknar USP',
    no_testimonials: 'Inga testimonials',
    single_cta_placement: 'Endast en CTA',
    no_low_barrier_entry: 'Ingen låg tröskel',
};

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStats() {
            try {
                const response = await fetch('/api/admin/stats');
                if (!response.ok) throw new Error('Failed to fetch stats');
                const data = await response.json();
                setStats(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    const getScoreColor = (score: number) => {
        if (score < 2) return 'text-red-400';
        if (score < 3) return 'text-orange-400';
        if (score < 3.5) return 'text-yellow-400';
        if (score < 4.5) return 'text-green-400';
        return 'text-emerald-400';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            </div>
        );
    }

    if (error || !stats) {
        return (
            <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
                <div className="text-red-400">{error || 'Failed to load stats'}</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--background)] bg-grid-white text-white relative">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--background)]/50 to-[var(--background)] pointer-events-none" />
            <div className="container mx-auto px-4 py-8 relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white mb-2 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                            Tillbaka till analyzer
                        </Link>
                        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                        <p className="text-slate-400">Översikt över alla analyser</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-[var(--accent-primary)]/10 rounded-full flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-[var(--accent-primary)]" />
                            </div>
                            <span className="text-neutral-400 text-sm">Totalt analyser</span>
                        </div>
                        <div className="text-3xl font-bold">{stats.totalAnalyses}</div>
                    </div>

                    <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-[var(--accent-primary)]/10 rounded-full flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-[var(--accent-primary)]" />
                            </div>
                            <span className="text-neutral-400 text-sm">Snittbetyg</span>
                        </div>
                        <div className={`text-3xl font-bold ${getScoreColor(stats.averageScore)}`}>
                            {stats.averageScore.toFixed(1)}
                        </div>
                    </div>

                    <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-[var(--accent-secondary)]/10 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-[var(--accent-secondary)]" />
                            </div>
                            <span className="text-neutral-400 text-sm">Läckande trattar</span>
                        </div>
                        <div className="text-3xl font-bold text-[var(--accent-secondary)]">
                            {stats.topLeakingFunnels.reduce((sum, lf) => sum + lf.count, 0)}
                        </div>
                    </div>

                    <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/5">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-neutral-400 text-sm">Unika problem</span>
                        </div>
                        <div className="text-3xl font-bold">{stats.topProblems.length}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Most Common Problems */}
                    <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/5">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            ⚠️ Vanligaste problemen
                        </h2>
                        <div className="space-y-4">
                            {stats.topProblems.map((problem, i) => (
                                <div key={problem.tag}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-neutral-300">
                                            {PROBLEM_LABELS[problem.tag] || problem.tag}
                                        </span>
                                        <span className="text-neutral-400">{problem.count} st</span>
                                    </div>
                                    <div className="w-full bg-neutral-800 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${i < 3 ? 'bg-[var(--accent-secondary)]' : i < 6 ? 'bg-yellow-500' : 'bg-neutral-500'}`}
                                            style={{ width: `${Math.min(problem.percentage, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {stats.topProblems.length === 0 && (
                                <p className="text-neutral-500 text-center py-4">Inga problem registrerade ännu</p>
                            )}
                        </div>
                    </div>

                    {/* Leaking Funnels */}
                    <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/5">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            🚰 Läckande trattar
                        </h2>
                        <div className="space-y-4">
                            {stats.topLeakingFunnels.map((leak) => (
                                <div key={leak.type} className="bg-[var(--accent-secondary)]/10 rounded-xl p-4 border border-[var(--accent-secondary)]/20">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium text-[var(--accent-secondary)]">
                                            {PROBLEM_LABELS[leak.type] || leak.type}
                                        </span>
                                        <span className="text-2xl font-bold text-[var(--accent-secondary)]">{leak.count}</span>
                                    </div>
                                    <div className="w-full bg-[var(--accent-secondary)]/10 rounded-full h-2 mt-2">
                                        <div
                                            className="bg-[var(--accent-secondary)] h-2 rounded-full"
                                            style={{ width: `${Math.min(leak.percentage, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {stats.topLeakingFunnels.length === 0 && (
                                <p className="text-neutral-500 text-center py-4">Inga läckande trattar registrerade</p>
                            )}
                        </div>

                        {/* Category Breakdown */}
                        <h3 className="text-lg font-bold mt-8 mb-4">📊 Betygsfördelning</h3>
                        <div className="grid grid-cols-5 gap-2">
                            {['Kritiskt', 'Undermåligt', 'Godkänt', 'Bra', 'Utmärkt'].map(cat => (
                                <div key={cat} className="text-center">
                                    <div className={`text-2xl font-bold ${cat === 'Kritiskt' ? 'text-red-400' :
                                        cat === 'Undermåligt' ? 'text-orange-400' :
                                            cat === 'Godkänt' ? 'text-yellow-400' :
                                                cat === 'Bra' ? 'text-green-400' :
                                                    'text-emerald-400'
                                        }`}>
                                        {stats.categoryBreakdown[cat] || 0}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">{cat}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent Analyses */}
                <div className="mt-8 bg-[var(--surface)] rounded-2xl p-6 border border-white/5">
                    <h2 className="text-xl font-bold mb-6">📋 Senaste analyserna</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-neutral-400 text-sm">
                                    <th className="pb-4">URL</th>
                                    <th className="pb-4">Namn</th>
                                    <th className="pb-4">E-post</th>
                                    <th className="pb-4">Betyg</th>
                                    <th className="pb-4">Datum</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {stats.recentAnalyses.map((analysis) => (
                                    <tr key={analysis.id} className="border-t border-white/5">
                                        <td className="py-3 text-[var(--accent-primary)]">{analysis.url}</td>
                                        <td className="py-3">{analysis.firstName}</td>
                                        <td className="py-3 text-neutral-400">{analysis.email}</td>
                                        <td className={`py-3 font-bold ${getScoreColor(analysis.overallScore)}`}>
                                            {analysis.overallScore.toFixed(1)}
                                        </td>
                                        <td className="py-3 text-neutral-500">
                                            {new Date(analysis.analyzedAt).toLocaleDateString('sv-SE')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {stats.recentAnalyses.length === 0 && (
                            <p className="text-neutral-500 text-center py-8">Inga analyser ännu</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
