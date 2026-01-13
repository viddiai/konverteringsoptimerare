'use client';

import { useState } from 'react';
import { Search, Loader2, AlertCircle, CheckCircle2, Target, Users, Zap } from 'lucide-react';
import { AnalysisResult } from '@/types/analysis';

type AppState = 'input' | 'loading' | 'teaser' | 'registration' | 'report';

// Loading tips from the specification
const LOADING_TIPS = [
    "96% av besökare som kommer till din webbplats är inte redo att köpa. Utan en lead magnet förlorar du dem för alltid.",
    "En CTA-knapp med 'Skicka' konverterar upp till 30% sämre än handlingsorienterat språk som 'Få din kostnadsfria offert'.",
    "Webbplatser med synliga kundrecensioner har i genomsnitt 270% högre konverteringsgrad.",
    "Varje extra fält i ett formulär minskar konverteringen med cirka 10%.",
    "73% av B2B-köpare vill ha en självbetjäningsupplevelse – men 83% vill fortfarande ha möjlighet att prata med en människa.",
    "En tydlig garanti kan öka konverteringen med upp till 30% genom att minska upplevd risk.",
    "Besökare spenderar i genomsnitt 5,59 sekunder på att titta på skriven text. Ditt värdeerbjudande måste vara kristallklart.",
    "Social proof nära din CTA kan öka klickfrekvensen med upp till 34%.",
];

export default function Home() {
    const [url, setUrl] = useState('');
    const [appState, setAppState] = useState<AppState>('input');
    const [currentTipIndex, setCurrentTipIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [email, setEmail] = useState('');
    const [firstName, setFirstName] = useState('');
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [progressMessage, setProgressMessage] = useState<string>('Startar...');

    const handleDownloadPdf = async () => {
        if (!analysisResult) return;

        setIsDownloadingPdf(true);
        try {
            const response = await fetch('/api/pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(analysisResult),
            });

            if (!response.ok) {
                throw new Error('Failed to generate PDF');
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `konverteringsanalys-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (err) {
            console.error('PDF download error:', err);
            setError('Kunde inte ladda ner PDF. Försök igen.');
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const handleAnalyze = async () => {
        if (!url.trim()) {
            setError('Ange en URL att analysera');
            return;
        }

        setError(null);
        setAppState('loading');
        setAnalysisResult(null);
        setProgressMessage('Startar...');

        const tipInterval = setInterval(() => {
            setCurrentTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
        }, 4000);

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Något gick fel');
            }

            const reader = response.body?.getReader();
            const decoder = new TextEncoder();
            const textDecoder = new TextDecoder();

            let partialResult: any = {
                url: '',
                analyzed_at: '',
                categories: [],
                overall_score: 0,
                overall_score_rounded: '0.0',
                overall_category: 'Godkänt',
                overall_summary: '',
                strengths: [],
                action_list: [],
                leaking_funnels: [],
                metadata: {
                    categories_analyzed: 0,
                    critical_issues: 0,
                    improvement_opportunities: 0,
                    strengths_found: 0,
                    leaking_funnels_found: 0
                }
            };

            while (reader) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = textDecoder.decode(value);
                const lines = text.split('\n').filter(l => l.trim());

                for (const line of lines) {
                    try {
                        const chunk = JSON.parse(line);

                        if (chunk.type === 'progress') {
                            setProgressMessage(chunk.data.message);
                        } else if (chunk.type === 'metadata') {
                            partialResult = { ...partialResult, ...chunk.data };
                        } else if (chunk.type === 'categories') {
                            partialResult.categories = [...partialResult.categories, ...chunk.data];
                            // Transition to teaser as soon as we have some categories
                            if (partialResult.categories.length > 0) {
                                setAppState('teaser');
                            }
                        } else if (chunk.type === 'summary') {
                            partialResult = { ...partialResult, ...chunk.data };
                        } else if (chunk.type === 'error') {
                            throw new Error(chunk.data);
                        }

                        // Re-calculate scores and category mapping
                        const cats = partialResult.categories;
                        const totalWeight = cats.reduce((sum: number, c: any) => sum + (c.weight || 1), 0);
                        const weightedSum = cats.reduce((sum: number, c: any) => sum + ((c.score || 3) * (c.weight || 1)), 0);
                        const score = totalWeight > 0 ? parseFloat(((weightedSum / (5 * totalWeight)) * 5).toFixed(1)) : 0;

                        const fullResult: AnalysisResult = {
                            ...partialResult,
                            overall_score: score,
                            overall_score_rounded: score.toFixed(1),
                            overall_category: score < 2 ? 'Kritiskt' : score < 3 ? 'Undermåligt' : score < 3.5 ? 'Godkänt' : score < 4.5 ? 'Bra' : 'Utmärkt',
                            metadata: {
                                categories_analyzed: cats.length,
                                critical_issues: cats.filter((c: any) => c.status === 'critical').length,
                                improvement_opportunities: cats.filter((c: any) => c.status === 'improvement').length,
                                strengths_found: partialResult.strengths?.length || 0,
                                leaking_funnels_found: partialResult.leaking_funnels?.length || 0
                            }
                        };

                        setAnalysisResult(fullResult);
                    } catch (e) {
                        console.error("Error parsing NDJSON chunk:", e);
                    }
                }
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Något gick fel');
            setAppState('input');
        } finally {
            clearInterval(tipInterval);
        }
    };

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        if (firstName.trim() && email.trim()) {
            setAppState('report');
        }
    };

    // Get 3 lowest scoring categories for teaser
    const getTopProblems = () => {
        if (!analysisResult) return [];
        return [...analysisResult.categories]
            .sort((a, b) => a.score - b.score)
            .slice(0, 3);
    };

    const getScoreColor = (score: number) => {
        if (score < 2) return 'text-red-500';
        if (score < 3) return 'text-orange-500';
        if (score < 3.5) return 'text-yellow-500';
        if (score < 4.5) return 'text-green-500';
        return 'text-emerald-500';
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'critical':
                return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Kritiskt</span>;
            case 'improvement':
                return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">Förbättra</span>;
            case 'good':
                return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Bra</span>;
            default:
                return null;
        }
    };

    // View 1: Home Page (URL Input)
    if (appState === 'input') {
        return (
            <div className="min-h-screen bg-[var(--background)] bg-grid-white text-white relative">
                {/* Gradient overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--background)]/50 to-[var(--background)] pointer-events-none" />
                <div className="container mx-auto px-4 py-16 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="text-4xl md:text-6xl font-medium mb-6 text-white tracking-tight">
                            Analysera din webbplats konverteringsförmåga
                        </h1>
                        <p className="text-lg md:text-xl text-neutral-400 mb-12 font-light">
                            Få en obarmhärtig analys av vad som hindrar din webbplats från att konvertera besökare till leads.
                            Inget fluff – bara konkreta problem och lösningar.
                        </p>

                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-slate-700">
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                                        placeholder="Ange URL att analysera, t.ex. www.example.se"
                                        className="w-full pl-12 pr-4 py-4 bg-[var(--surface)] border border-slate-800 rounded-full text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all"
                                    />
                                </div>
                                <button
                                    onClick={handleAnalyze}
                                    className="px-8 py-4 bg-[var(--accent-primary)] hover:bg-[#00bfa3] text-black font-semibold rounded-full transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(0,217,163,0.3)]"
                                >
                                    Analysera
                                </button>
                            </div>

                            {error && (
                                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>

                        {/* Feature cards */}
                        <div className="grid md:grid-cols-3 gap-6 mt-16">
                            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/5">
                                <div className="w-12 h-12 bg-[var(--accent-primary)]/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                                    <Target className="w-6 h-6 text-[var(--accent-primary)]" />
                                </div>
                                <h3 className="font-medium text-lg mb-2 text-white">10 Kritiska Områden</h3>
                                <p className="text-neutral-400 text-sm">Vi analyserar allt från värdeerbjudande till formulärdesign</p>
                            </div>
                            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/5">
                                <div className="w-12 h-12 bg-[var(--accent-secondary)]/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                                    <Zap className="w-6 h-6 text-[var(--accent-secondary)]" />
                                </div>
                                <h3 className="font-medium text-lg mb-2 text-white">Läckande Trattar</h3>
                                <p className="text-neutral-400 text-sm">Identifierar var du förlorar potentiella kunder</p>
                            </div>
                            <div className="bg-[var(--surface)] rounded-2xl p-6 border border-white/5">
                                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 mx-auto">
                                    <Users className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="font-medium text-lg mb-2 text-white">Konkreta Åtgärder</h3>
                                <p className="text-neutral-400 text-sm">Prioriterad lista med förbättringar du kan göra idag</p>
                            </div>
                        </div>

                        {/* Guide Section - portalfabriken.se style */}
                        <div id="guide" className="mt-20 bg-[#0a0a0a] rounded-3xl p-8 md:p-12 border border-white/10">
                            <div className="flex flex-col md:flex-row gap-8 items-center">
                                {/* Book Cover - real image */}
                                <div className="w-full md:w-1/3 flex-shrink-0">
                                    <img
                                        src="/omslag.png"
                                        alt="7 beprövade sätt att öka konverteringen och vinna fler affärer"
                                        className="w-full rounded-xl shadow-2xl"
                                    />
                                </div>

                                {/* Guide Content */}
                                <div className="flex-1">
                                    <h3 className="text-3xl font-bold text-white mb-4">7 beprövade sätt att öka konverteringen och vinna fler affärer</h3>
                                    <p className="font-semibold text-white mb-2">Denna guide ger dig</p>
                                    <p className="text-white/60 mb-4">Konkreta verktyg för att:</p>
                                    <ul className="space-y-2 text-white/80 mb-6 text-sm">
                                        <li className="flex items-start gap-2">
                                            <span className="text-white/40 mt-0.5">•</span>
                                            <span>Formulera ett värdeerbjudande som faktiskt övertygar svenska beslutsfattare</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-white/40 mt-0.5">•</span>
                                            <span>Fånga upp potentiella kunder innan de är redo att köpa</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-white/40 mt-0.5">•</span>
                                            <span>Eliminera friktion som dödar affärer</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-white/40 mt-0.5">•</span>
                                            <span>Bygga systematiskt förtroende genom sociala bevis</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-white/40 mt-0.5">•</span>
                                            <span>Skapa handlingsdriven kommunikation som leder till avslut</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-white/40 mt-0.5">•</span>
                                            <span>Strukturera komplex information utan att överväldiga</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="text-white/40 mt-0.5">•</span>
                                            <span>Använda avancerade strategier för dramatisk tillväxt</span>
                                        </li>
                                    </ul>
                                    <div className="flex items-start gap-2 text-white/60 mb-6">
                                        <span className="text-yellow-500">💡</span>
                                        <span className="text-sm">
                                            Kom ihåg: Varje kapitel avslutas med &quot;3 saker du kan göra imorgon&quot; – konkreta åtgärder som ger omedelbar effekt.
                                        </span>
                                    </div>
                                    <form
                                        name="guide-download"
                                        method="POST"
                                        data-netlify="true"
                                        action="/tack"
                                        className="flex flex-col sm:flex-row gap-4"
                                    >
                                        <input type="hidden" name="form-name" value="guide-download" />
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="Din e-postadress"
                                            required
                                            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                        />
                                        <input type="hidden" name="guide" value="7 beprövade sätt att öka konverteringen" />
                                        <button
                                            type="submit"
                                            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors whitespace-nowrap"
                                        >
                                            Hämta guiden
                                        </button>
                                    </form>
                                    <p className="mt-4 text-xs text-white/40">
                                        Vi behandlar dina uppgifter enligt vår integritetspolicy.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // View 2: Loading State
    if (appState === 'loading') {
        return (
            <div className="min-h-screen bg-[var(--background)] bg-grid-white text-white flex items-center justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--background)]/80 to-[var(--background)] pointer-events-none" />
                <div className="max-w-xl mx-auto text-center px-4 relative z-10">
                    <Loader2 className="w-16 h-16 text-[var(--accent-primary)] animate-spin mx-auto mb-6" />
                    <h2 className="text-2xl font-medium mb-2">Analyserar {url}</h2>
                    <p className="text-[var(--accent-primary)] text-sm mb-6 animate-pulse">{progressMessage}</p>
                    <div className="bg-[var(--surface)] rounded-2xl p-8 border border-white/5">
                        <p className="text-neutral-300 text-lg italic">"{LOADING_TIPS[currentTipIndex]}"</p>
                    </div>
                </div>
            </div>
        );
    }

    // View 3: Teaser (Before Registration)
    if (appState === 'teaser' && analysisResult) {
        const topProblems = getTopProblems();

        return (
            <div className="min-h-screen bg-[var(--background)] bg-grid-white text-white py-16 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--background)]/50 to-[var(--background)] pointer-events-none" />
                <div className="container mx-auto px-4 max-w-2xl relative z-10">
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-medium mb-2">Analys klar för</h2>
                        <p className="text-[var(--accent-primary)]">{analysisResult.url}</p>
                    </div>

                    <div className="bg-[var(--surface)] rounded-2xl p-8 border border-white/5 mb-8 text-center shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div>
                            <div className="text-6xl font-bold mb-2">
                                <span className={getScoreColor(analysisResult.overall_score)}>
                                    {analysisResult.overall_score_rounded}
                                </span>
                                <span className="text-neutral-500 text-2xl"> / 5</span>
                            </div>
                            <div className="text-xl font-medium text-neutral-300 mb-6">
                                {analysisResult.overall_category}
                            </div>
                            <div className="w-full bg-neutral-900 rounded-full h-3 mb-2 overflow-hidden">
                                <div
                                    className="bg-[var(--accent-primary)] h-3 rounded-full transition-all duration-1000"
                                    style={{ width: `${(analysisResult.overall_score / 5) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-[var(--surface)] rounded-2xl p-8 border border-white/5 mb-8">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="text-[var(--accent-secondary)]">🔴</span> De största problemen vi hittade:
                        </h3>
                        <div className="space-y-4">
                            {topProblems.map((category, index) => (
                                <div key={category.id} className="flex items-center justify-between p-4 bg-neutral-900/50 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{category.icon}</span>
                                        <span className="font-medium">{category.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`font-bold ${getScoreColor(category.score)}`}>
                                            {category.score}/5
                                        </span>
                                        {getStatusBadge(category.status)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gradient-to-b from-[var(--surface)] to-neutral-900/50 rounded-2xl p-8 border border-[var(--accent-primary)]/20 shadow-[0_0_30px_rgba(0,217,163,0.1)]">
                        <div className="text-center mb-6">
                            <span className="text-2xl">🔒</span>
                            <h3 className="text-xl font-bold mt-2 text-white">Registrera dig för att se:</h3>
                        </div>
                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-[var(--accent-primary)]" />
                                <span>Detaljerade problembeskrivningar</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-[var(--accent-primary)]" />
                                <span>Konkreta lösningsförslag</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-[var(--accent-primary)]" />
                                <span>Alla 10 analyserade områden</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-[var(--accent-primary)]" />
                                <span>Nedladdningsbar PDF-rapport</span>
                            </li>
                        </ul>
                        <button
                            onClick={() => setAppState('registration')}
                            className="w-full py-4 bg-[var(--accent-primary)] hover:bg-[#00bfa3] text-black font-semibold rounded-full transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(0,217,163,0.3)]"
                        >
                            Visa min fullständiga rapport
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // View 4: Registration
    if (appState === 'registration') {
        return (
            <div className="min-h-screen bg-[var(--background)] bg-grid-white text-white flex items-center justify-center py-16 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--background)]/80 to-[var(--background)] pointer-events-none" />
                <div className="max-w-md mx-auto px-4 w-full relative z-10">
                    <div className="bg-[var(--surface)] rounded-2xl p-8 border border-white/5 shadow-2xl">
                        <h2 className="text-2xl font-bold text-center mb-6">Ange dina uppgifter</h2>
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-neutral-300 mb-2">
                                    Förnamn
                                </label>
                                <input
                                    type="text"
                                    id="firstName"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    className="w-full px-6 py-3 bg-neutral-900 border border-neutral-800 rounded-full text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                                    placeholder="Ditt förnamn"
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-2">
                                    E-post
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-6 py-3 bg-neutral-900 border border-neutral-800 rounded-full text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                                    placeholder="din@email.se"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 bg-[var(--accent-primary)] hover:bg-[#00bfa3] text-black font-semibold rounded-full transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(0,217,163,0.3)] mt-4"
                            >
                                Visa min rapport
                            </button>
                        </form>
                        <p className="text-center text-sm text-neutral-500 mt-4">
                            🔒 Vi delar aldrig din information med tredje part.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // View 5: Full Report
    if (appState === 'report' && analysisResult) {
        const criticalCategories = analysisResult.categories.filter(c => c.status === 'critical');
        const improvementCategories = analysisResult.categories.filter(c => c.status === 'improvement' || c.status === 'neutral' || c.status === 'not_identified');
        const goodCategories = analysisResult.categories.filter(c => c.status === 'good');

        return (
            <div className="min-h-screen bg-[var(--background)] bg-grid-white text-white py-8 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--background)]/50 to-[var(--background)] pointer-events-none" />
                <div className="container mx-auto px-4 max-w-4xl relative z-10">
                    {/* Header */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 mb-8">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h1 className="text-2xl font-bold mb-2">📊 Konverteringsanalys</h1>
                                <p className="text-slate-400">{analysisResult.url}</p>
                                <p className="text-slate-500 text-sm">Genererad: {new Date(analysisResult.analyzed_at).toLocaleDateString('sv-SE')}</p>
                            </div>
                            <button
                                onClick={handleDownloadPdf}
                                disabled={isDownloadingPdf}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isDownloadingPdf ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Genererar...
                                    </>
                                ) : (
                                    '📥 Ladda ner PDF'
                                )}
                            </button>
                        </div>

                        <div className="text-center py-8">
                            <div className="text-7xl font-bold mb-2">
                                <span className={getScoreColor(analysisResult.overall_score)}>
                                    {analysisResult.overall_score_rounded}
                                </span>
                                <span className="text-slate-500 text-3xl"> / 5</span>
                            </div>
                            <div className="text-2xl font-semibold text-slate-300 mb-4">
                                {analysisResult.overall_category}
                            </div>
                            <div className="w-full max-w-md mx-auto bg-slate-700 rounded-full h-4 mb-6">
                                <div
                                    className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-4 rounded-full transition-all duration-500"
                                    style={{ width: `${(analysisResult.overall_score / 5) * 100}%` }}
                                />
                            </div>
                            <p className="text-slate-300 max-w-2xl mx-auto">{analysisResult.overall_summary}</p>
                        </div>
                    </div>

                    {/* Critical Issues */}
                    {criticalCategories.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="text-red-400">🔴</span> KRITISKA PROBLEM
                            </h2>
                            <div className="space-y-4">
                                {criticalCategories.map(category => (
                                    <div key={category.id} className="bg-red-500/10 backdrop-blur-sm rounded-2xl p-6 border border-red-500/20">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{category.icon}</span>
                                                <h3 className="text-lg font-semibold">{category.name}</h3>
                                            </div>
                                            <span className="text-red-400 font-bold">{category.score}/5</span>
                                        </div>
                                        {category.problems.map((problem, i) => (
                                            <div key={i} className="bg-slate-900/50 rounded-xl p-4 mb-3">
                                                <p className="text-slate-300 mb-3"><strong>Problem:</strong> {problem.description}</p>
                                                <p className="text-emerald-400"><strong>Rekommendation:</strong> {problem.recommendation}</p>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Improvement Opportunities */}
                    {improvementCategories.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="text-yellow-400">🟡</span> FÖRBÄTTRINGSMÖJLIGHETER
                            </h2>
                            <div className="space-y-4">
                                {improvementCategories.map(category => (
                                    <details key={category.id} className="bg-yellow-500/10 backdrop-blur-sm rounded-2xl border border-yellow-500/20 group">
                                        <summary className="p-6 cursor-pointer flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{category.icon}</span>
                                                <h3 className="text-lg font-semibold">{category.name}</h3>
                                            </div>
                                            <span className="text-yellow-400 font-bold">{category.score}/5</span>
                                        </summary>
                                        <div className="px-6 pb-6">
                                            {category.problems.map((problem, i) => (
                                                <div key={i} className="bg-slate-900/50 rounded-xl p-4 mb-3">
                                                    <p className="text-slate-300 mb-3"><strong>Problem:</strong> {problem.description}</p>
                                                    <p className="text-emerald-400"><strong>Rekommendation:</strong> {problem.recommendation}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Strengths */}
                    {goodCategories.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="text-green-400">🟢</span> STYRKOR
                            </h2>
                            <div className="bg-green-500/10 backdrop-blur-sm rounded-2xl p-6 border border-green-500/20">
                                <ul className="space-y-2">
                                    {analysisResult.strengths.map((strength, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                                            <span>{strength}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Action List */}
                    <div className="mb-8">
                        <h2 className="text-xl font-bold mb-4">📋 PRIORITERAD ÅTGÄRDSLISTA</h2>
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
                            <ul className="space-y-3">
                                {analysisResult.action_list.map((action, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="w-6 h-6 flex items-center justify-center rounded border border-slate-600 text-sm">
                                            {i + 1}
                                        </span>
                                        <div>
                                            <span className="font-medium">{action.action}</span>
                                            <span className={`ml-2 text-xs px-2 py-0.5 rounded ${action.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                                                action.priority === 'important' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-slate-500/20 text-slate-400'
                                                }`}>
                                                {action.priority === 'critical' ? 'Kritisk' : action.priority === 'important' ? 'Viktig' : 'Förbättring'}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-2xl p-8 border border-emerald-500/20 text-center">
                        <h2 className="text-xl font-bold mb-4">📞 Nästa steg</h2>
                        <p className="text-slate-300 mb-6">
                            Vill du ha hjälp att implementera dessa förbättringar och öka din konvertering?
                        </p>
                        <a
                            href="https://calendly.com/stefan-245/30min"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-emerald-500/25"
                        >
                            Boka genomgång för ökad konvertering
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
