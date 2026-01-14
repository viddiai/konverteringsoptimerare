'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { AnalysisResult } from '@/types/analysis';

type AppState = 'input' | 'loading' | 'teaser' | 'registration' | 'report';

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

// Scroll animation hook
function useScrollAnimation() {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(entry.target);
                }
            },
            { threshold: 0.1 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, []);

    return { ref, isVisible };
}

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
    const [quickResult, setQuickResult] = useState<{ score: number; problems: Array<{ category: string; problem: string; status: string }> } | null>(null);
    const [isLoadingFull, setIsLoadingFull] = useState(false);

    const heroRef = useScrollAnimation();
    const featuresRef = useScrollAnimation();
    const guideRef = useScrollAnimation();

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
        setQuickResult(null);
        setIsLoadingFull(false);
        setProgressMessage('Startar...');

        const tipInterval = setInterval(() => {
            setCurrentTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
        }, 5000); // 5s between tips

        // Client-side timeout to prevent infinite loading (matches Vercel Pro maxDuration)
        const controller = new AbortController();
        const clientTimeout = setTimeout(() => {
            controller.abort();
        }, 90000); // 90 second max

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Något gick fel');
            }

            const reader = response.body?.getReader();
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
                        } else if (chunk.type === 'quick_result') {
                            // Phase 1: Quick result - show teaser immediately!
                            setQuickResult(chunk.data);
                            setAppState('teaser');
                            setIsLoadingFull(true);
                        } else if (chunk.type === 'full_metadata') {
                            partialResult = { ...partialResult, ...chunk.data };
                        } else if (chunk.type === 'full_categories') {
                            partialResult.categories = [...chunk.data];
                            setIsLoadingFull(false);
                        } else if (chunk.type === 'full_summary') {
                            partialResult = { ...partialResult, ...chunk.data };
                        } else if (chunk.type === 'complete') {
                            setIsLoadingFull(false);
                        } else if (chunk.type === 'error') {
                            throw new Error(chunk.data);
                        }

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
            clearTimeout(clientTimeout);
            if (err instanceof Error && err.name === 'AbortError') {
                setError('Analysen tog för lång tid. Försök igen eller prova en annan URL.');
            } else {
                setError(err instanceof Error ? err.message : 'Något gick fel');
            }
            setAppState('input');
        } finally {
            clearTimeout(clientTimeout);
            clearInterval(tipInterval);
        }
    };

    const handleRegister = (e: React.FormEvent) => {
        e.preventDefault();
        if (firstName.trim() && email.trim()) {
            setAppState('report');
        }
    };

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
        if (score < 4.5) return 'text-emerald-400';
        return 'text-emerald-500';
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'critical':
                return <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">Kritiskt</span>;
            case 'improvement':
                return <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Förbättra</span>;
            case 'good':
                return <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400">Bra</span>;
            case 'neutral':
                return <span className="px-2 py-1 text-xs rounded-full bg-white/10 text-white/50">Neutral</span>;
            default:
                return null;
        }
    };

    const getSeverityBadge = (severity?: string) => {
        switch (severity) {
            case 'high':
                return <span className="px-2 py-0.5 text-xs rounded bg-red-500/30 text-red-300">Hög</span>;
            case 'medium':
                return <span className="px-2 py-0.5 text-xs rounded bg-yellow-500/30 text-yellow-300">Medel</span>;
            case 'low':
                return <span className="px-2 py-0.5 text-xs rounded bg-blue-500/30 text-blue-300">Låg</span>;
            default:
                return null;
        }
    };

    // View 1: Home Page (URL Input) - Clean Portalfabriken style
    if (appState === 'input') {
        return (
            <div className="min-h-screen bg-black text-white relative overflow-hidden">
                {/* Background */}
                <div className="fixed inset-0 -z-10 h-full w-full bg-black">
                    <div className="absolute inset-0 bg-grid-pattern" />
                    <div className="absolute inset-0 bg-glow" />
                </div>

                {/* Hero Section */}
                <section className="pt-16 md:pt-24 pb-16 px-6 relative">
                    <div className="max-w-3xl mx-auto text-center relative z-10">
                        <div
                            ref={heroRef.ref}
                            className={`transition-all duration-700 ${heroRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
                        >
                            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight mb-6">
                                Analysera din webbsidas<br />
                                konverteringsförmåga
                            </h1>

                            <p className="text-base md:text-lg leading-relaxed font-light text-white/60 max-w-2xl mx-auto mb-10">
                                Få en obarmhärtig analys av vad som hindrar din webbsida från att konvertera besökare till leads. Ingen fluff – bara konkreta problem och lösningar.
                            </p>
                        </div>

                        {/* Analysis Input - Inline style */}
                        <div
                            className={`max-w-2xl mx-auto transition-all duration-700 delay-150 ${heroRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
                        >
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-5 h-5" />
                                    <input
                                        type="text"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                                        placeholder="Ange URL att analysera, t.ex. www.example.se"
                                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                                    />
                                </div>
                                <button
                                    onClick={handleAnalyze}
                                    className="h-14 px-8 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-xl transition-all hover:scale-105 active:scale-95"
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
                    </div>
                </section>

                {/* "Vad vi analyserar" Section */}
                <section className="py-20 px-6">
                    <div
                        ref={featuresRef.ref}
                        className={`max-w-4xl mx-auto transition-all duration-700 ${featuresRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
                    >
                        <h2 className="text-2xl md:text-3xl font-semibold text-white text-center mb-12">
                            Vad vi analyserar
                        </h2>

                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Leadmagneter & Formulär */}
                            <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-8 text-center hover:border-emerald-500/30 transition-colors">
                                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <circle cx="12" cy="12" r="3" />
                                        <circle cx="12" cy="12" r="8" strokeDasharray="4 2" />
                                        <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-lg mb-3 text-white">Leadmagneter & Formulär</h3>
                                <p className="text-white/50 text-sm font-light leading-relaxed">
                                    Vi hittar läckande trattar – mailto-länkar och öppna PDF:er som ger bort värde utan att fånga leads.
                                </p>
                            </div>

                            {/* Konverteringselement */}
                            <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-8 text-center hover:border-emerald-500/30 transition-colors">
                                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-lg mb-3 text-white">Konverteringselement</h3>
                                <p className="text-white/50 text-sm font-light leading-relaxed">
                                    CTA-knappar, värdeerbjudande, social proof – allt som påverkar om besökare konverterar eller studsar.
                                </p>
                            </div>

                            {/* Konkreta Rekommendationer */}
                            <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-8 text-center hover:border-emerald-500/30 transition-colors">
                                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                    <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-lg mb-3 text-white">Konkreta Rekommendationer</h3>
                                <p className="text-white/50 text-sm font-light leading-relaxed">
                                    Inga fluffiga tips. Fem konkreta åtgärder prioriterade efter påverkan på din konvertering.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Guide Section */}
                <section id="guide" className="py-16 px-6">
                    <div
                        ref={guideRef.ref}
                        className={`max-w-5xl mx-auto transition-all duration-700 ${guideRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
                    >
                        <div className="bg-[#0d1117] border border-white/10 rounded-2xl overflow-hidden">
                            <div className="flex flex-col md:flex-row">
                                {/* Book Cover - Left Side */}
                                <div className="w-full md:w-2/5 p-8 md:p-12 flex items-center justify-center">
                                    <img
                                        src="/omslag.png"
                                        alt="7 beprövade sätt att öka konverteringen och vinna fler affärer - Guide"
                                        className="w-full max-w-[280px] rounded-lg shadow-2xl"
                                    />
                                </div>

                                {/* Content - Right Side */}
                                <div className="flex-1 p-8 md:p-12">
                                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                                        7 beprövade sätt att öka konverteringen och vinna fler affärer
                                    </h2>

                                    <p className="text-white/90 mb-4 font-medium">
                                        Denna guide ger dig
                                    </p>

                                    <p className="text-white/50 mb-3 text-sm">
                                        Konkreta verktyg för att:
                                    </p>

                                    <ul className="space-y-2 text-white/70 mb-6 text-sm">
                                        <li className="flex items-start gap-3">
                                            <span className="text-emerald-400 mt-0.5">•</span>
                                            <span>Formulera ett värdeerbjudande som faktiskt övertygar svenska beslutsfattare</span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <span className="text-emerald-400 mt-0.5">•</span>
                                            <span>Fånga upp potentiella kunder innan de är redo att köpa</span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <span className="text-emerald-400 mt-0.5">•</span>
                                            <span>Eliminera friktion som dödar affärer</span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <span className="text-emerald-400 mt-0.5">•</span>
                                            <span>Bygga systematiskt förtroende genom sociala bevis</span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <span className="text-emerald-400 mt-0.5">•</span>
                                            <span>Skapa handlingsdriven kommunikation som leder till avslut</span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <span className="text-emerald-400 mt-0.5">•</span>
                                            <span>Strukturera komplex information utan att överväldiga</span>
                                        </li>
                                        <li className="flex items-start gap-3">
                                            <span className="text-emerald-400 mt-0.5">•</span>
                                            <span>Använda avancerade strategier för dramatisk tillväxt</span>
                                        </li>
                                    </ul>

                                    {/* Kom ihåg box */}
                                    <div className="flex items-start gap-3 bg-white/5 rounded-lg p-4 mb-6">
                                        <span className="text-xl">💡</span>
                                        <p className="text-white/60 text-sm">
                                            Kom ihåg: Varje kapitel avslutas med &quot;3 saker du kan göra imorgon&quot; – konkreta åtgärder som ger omedelbar effekt.
                                        </p>
                                    </div>

                                    <form
                                        name="guide-download"
                                        method="POST"
                                        data-netlify="true"
                                        action="/tack"
                                        className="flex flex-col sm:flex-row gap-3"
                                    >
                                        <input type="hidden" name="form-name" value="guide-download" />
                                        <input
                                            type="email"
                                            name="email"
                                            placeholder="Din e-postadress"
                                            required
                                            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                                        />
                                        <input type="hidden" name="guide" value="7 beprövade sätt att öka konverteringen" />
                                        <button
                                            type="submit"
                                            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-xl transition-colors whitespace-nowrap"
                                        >
                                            Hämta guiden
                                        </button>
                                    </form>

                                    <p className="text-white/30 text-xs mt-4">
                                        Vi behandlar dina uppgifter enligt vår integritetspolicy.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-white/5 py-8 px-6">
                    <div className="max-w-5xl mx-auto text-center text-white/30 text-sm">
                        © {new Date().getFullYear()} Konverteramera. Ett verktyg från Portalfabriken.
                    </div>
                </footer>
            </div>
        );
    }

    // View 2: Loading State
    if (appState === 'loading') {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center relative">
                <div className="fixed inset-0 -z-10 h-full w-full bg-black">
                    <div className="absolute inset-0 bg-grid-pattern" />
                    <div className="absolute inset-0 bg-glow" />
                </div>
                <div className="max-w-xl mx-auto text-center px-6 relative z-10">
                    <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mx-auto mb-6" />
                    <h2 className="text-2xl font-medium mb-2 tracking-tight">Analyserar {url}</h2>
                    <p className="text-emerald-400 text-sm mb-8 animate-pulse">{progressMessage}</p>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md">
                        <p className="text-white/70 text-lg font-light italic">"{LOADING_TIPS[currentTipIndex]}"</p>
                    </div>
                </div>
            </div>
        );
    }

    // View 3: Teaser (Before Registration) - Portalfabriken style
    if (appState === 'teaser' && (quickResult || analysisResult)) {
        const displayScore = analysisResult?.overall_score ?? quickResult?.score ?? 3;
        const displayScoreRounded = displayScore.toFixed(1);
        const displayCategory = displayScore < 2 ? 'Kritiskt' : displayScore < 3 ? 'Undermåligt' : displayScore < 3.5 ? 'Godkänt' : displayScore < 4.5 ? 'Bra' : 'Utmärkt';
        const topProblems = analysisResult ? getTopProblems() : [];
        const quickProblems = quickResult?.problems ?? [];

        // Extract domain name for display
        const domainName = (() => {
            try {
                const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
                return urlObj.hostname.replace('www.', '');
            } catch {
                return url;
            }
        })();

        // Get meta description or first part of summary
        const siteDescription = analysisResult?.overall_summary?.split('.')[0] || 'Analyserar din webbplats';

        return (
            <div className="min-h-screen bg-black text-white py-8 md:py-16 relative">
                <div className="fixed inset-0 -z-10 h-full w-full bg-black">
                    <div className="absolute inset-0 bg-grid-pattern" />
                    <div className="absolute inset-0 bg-glow" />
                </div>

                <div className="container mx-auto px-4 md:px-6 max-w-xl relative z-10">
                    {/* Main Card */}
                    <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-md">
                        {/* Header */}
                        <div className="mb-6">
                            <h1 className="text-lg md:text-xl font-medium text-white/90 mb-4">
                                Analysera din webbsidas konverteringsförmåga
                            </h1>

                            {/* Site Info with Score */}
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-xl md:text-2xl font-semibold text-white capitalize">
                                        {domainName.split('.')[0]}
                                    </h2>
                                    <p className="text-emerald-400 text-xs uppercase tracking-wider font-medium">
                                        {domainName}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <span
                                                key={star}
                                                className={`text-lg ${star <= Math.round(displayScore) ? 'text-emerald-400' : 'text-white/20'}`}
                                            >
                                                ★
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-white/50 text-sm">{displayScoreRounded}/5</p>
                                </div>
                            </div>
                        </div>

                        {/* Site Description */}
                        <p className="text-white/50 text-sm mb-6 font-light leading-relaxed">
                            {siteDescription}
                        </p>

                        {/* Problems Found */}
                        <div className="bg-[#161b22] border border-white/5 rounded-xl p-4 mb-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
                                        <AlertCircle className="w-4 h-4 text-red-400" />
                                    </div>
                                    <span className="font-medium text-white/90">Identifierade problem</span>
                                </div>
                                <span className="text-white/40 text-sm">
                                    {topProblems.length > 0 ? topProblems.filter(c => c.status === 'critical' || c.status === 'improvement').length : quickProblems.length} st
                                </span>
                            </div>
                            <ul className="space-y-2">
                                {topProblems.length > 0 ? (
                                    topProblems.slice(0, 2).map((category) => (
                                        <li key={category.id} className="flex items-start gap-2 text-sm">
                                            <span className="text-red-400 mt-0.5">•</span>
                                            <span className="text-white/70">
                                                {category.problems[0]?.description || `${category.name} behöver förbättras`}
                                            </span>
                                        </li>
                                    ))
                                ) : (
                                    quickProblems.slice(0, 2).map((problem, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                            <span className="text-red-400 mt-0.5">•</span>
                                            <span className="text-white/70">{problem.problem}</span>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>

                        {/* Summary */}
                        <div className="bg-[#161b22] border border-white/5 rounded-xl p-4 mb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center">
                                    <span className="text-sm">📄</span>
                                </div>
                                <span className="font-medium text-white/90">Sammanfattning</span>
                            </div>
                            <p className="text-white/60 text-sm font-light leading-relaxed">
                                {analysisResult?.overall_summary || `${domainName.split('.')[0]} har förbättringsmöjligheter i sin lead generation.`}
                            </p>
                        </div>

                        {/* Full Report Preview */}
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                                    <span className="text-sm">📊</span>
                                </div>
                                <span className="font-medium text-white/90">Den fullständiga rapporten</span>
                            </div>
                            <ul className="space-y-2">
                                <li className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500/70" />
                                    <span className="text-white/60">Detaljerad analys av leadmagneter och formulär</span>
                                </li>
                                <li className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500/70" />
                                    <span className="text-white/60">Granskning av CTA-knappar och konverteringselement</span>
                                </li>
                                <li className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500/70" />
                                    <span className="text-white/60">Betyg på varje konverteringskriterium</span>
                                </li>
                                <li className="flex items-center gap-2 text-sm">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500/70" />
                                    <span className="text-white/60">{analysisResult?.action_list?.length || 5} konkreta rekommendationer för ökad konvertering</span>
                                </li>
                            </ul>
                        </div>

                        {/* CTA Button */}
                        <button
                            onClick={() => setAppState('registration')}
                            disabled={isLoadingFull}
                            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-xl transition-all transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoadingFull ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Laddar fullständig rapport...
                                </>
                            ) : (
                                <>
                                    Få den fullständiga rapporten
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </button>

                        {/* Trust Badge */}
                        <p className="text-center text-white/30 text-xs mt-4">
                            Gratis • Ingen spam • Levereras direkt
                        </p>

                        {/* Tips while loading full report */}
                        {isLoadingFull && (
                            <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-4">
                                <p className="text-white/60 text-sm font-light italic text-center">
                                    {LOADING_TIPS[currentTipIndex]}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // View 4: Registration
    if (appState === 'registration') {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center py-16 relative">
                <div className="fixed inset-0 -z-10 h-full w-full bg-black">
                    <div className="absolute inset-0 bg-grid-pattern" />
                    <div className="absolute inset-0 bg-glow" />
                </div>
                <div className="max-w-md mx-auto px-6 w-full relative z-10">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-md">
                        <h2 className="text-2xl font-medium text-center mb-6 tracking-tight">Ange dina uppgifter</h2>
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-white/70 mb-2">
                                    Förnamn
                                </label>
                                <input
                                    type="text"
                                    id="firstName"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                                    placeholder="Ditt förnamn"
                                />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-white/70 mb-2">
                                    E-post
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                                    placeholder="din@email.se"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 bg-white hover:bg-emerald-100 text-black font-medium rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] mt-4"
                            >
                                Visa min rapport
                            </button>
                        </form>
                        <p className="text-center text-sm text-white/40 mt-4">
                            🔒 Vi delar aldrig din information med tredje part.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // View 5: Full Report - Portalfabriken style
    if (appState === 'report' && analysisResult) {
        const criticalCategories = analysisResult.categories.filter(c => c.status === 'critical');
        const improvementCategories = analysisResult.categories.filter(c => c.status === 'improvement' || c.status === 'neutral' || c.status === 'not_identified');
        const goodCategories = analysisResult.categories.filter(c => c.status === 'good');

        return (
            <div className="min-h-screen bg-black text-white py-6 md:py-10 relative">
                <div className="fixed inset-0 -z-10 h-full w-full bg-black">
                    <div className="absolute inset-0 bg-grid-pattern" />
                    <div className="absolute inset-0 bg-glow" />
                </div>

                <div className="container mx-auto px-4 md:px-6 max-w-3xl relative z-10">
                    {/* Header Card */}
                    <div className="bg-[#0d1117] border border-white/10 rounded-2xl p-6 md:p-8 mb-6 backdrop-blur-md">
                        {/* Top Row */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                                    <span className="text-lg">📊</span>
                                </div>
                                <div>
                                    <h1 className="text-lg font-semibold text-white">Konverteringsanalys</h1>
                                    <p className="text-white/40 text-xs">{analysisResult.url}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleDownloadPdf}
                                disabled={isDownloadingPdf}
                                className="px-4 py-2 bg-[#161b22] hover:bg-[#1f2937] border border-white/10 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-white/70 hover:text-white"
                            >
                                {isDownloadingPdf ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="hidden sm:inline">Genererar...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>📥</span>
                                        <span className="hidden sm:inline">Ladda ner PDF</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Score Display */}
                        <div className="text-center py-6">
                            <div className="text-6xl md:text-7xl font-bold mb-1">
                                <span className={getScoreColor(analysisResult.overall_score)}>
                                    {analysisResult.overall_score_rounded}
                                </span>
                                <span className="text-white/20 text-2xl md:text-3xl">/ 5</span>
                            </div>
                            <div className="text-xl font-medium text-white/60 mb-4">
                                {analysisResult.overall_category}
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full max-w-sm mx-auto bg-[#161b22] rounded-full h-2.5 mb-6 overflow-hidden">
                                <div
                                    className="bg-emerald-500 h-2.5 rounded-full transition-all duration-700"
                                    style={{ width: `${(analysisResult.overall_score / 5) * 100}%` }}
                                />
                            </div>

                            <p className="text-white/50 max-w-xl mx-auto text-sm font-light leading-relaxed">
                                {analysisResult.overall_summary}
                            </p>
                        </div>

                        {/* Date */}
                        <p className="text-center text-white/30 text-xs">
                            Genererad: {new Date(analysisResult.analyzed_at).toLocaleDateString('sv-SE')}
                        </p>
                    </div>

                    {/* Critical Issues */}
                    {criticalCategories.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                                    Kritiska problem
                                </h2>
                            </div>
                            <div className="space-y-3">
                                {criticalCategories.map(category => (
                                    <div key={category.id} className="bg-[#0d1117] border border-red-500/20 rounded-xl overflow-hidden">
                                        {/* Category Header */}
                                        <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-red-500/10 rounded-lg flex items-center justify-center">
                                                    <span className="text-base">{category.icon}</span>
                                                </div>
                                                <span className="font-medium text-white">{category.name}</span>
                                            </div>
                                            <span className="text-red-400 font-semibold text-sm">{category.score}/5</span>
                                        </div>
                                        {/* Problems */}
                                        <div className="px-5 py-4 space-y-3">
                                            {category.problems.map((problem, i) => (
                                                <div key={i} className="bg-[#161b22] rounded-lg p-4">
                                                    <p className="text-white/70 text-sm mb-3">
                                                        <span className="text-white font-medium">Problem:</span> {problem.description}
                                                    </p>
                                                    <p className="text-emerald-400 text-sm">
                                                        <span className="font-medium">Rekommendation:</span> {problem.recommendation}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Improvement Opportunities */}
                    {improvementCategories.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                                    Förbättringsmöjligheter
                                </h2>
                            </div>
                            <div className="space-y-3">
                                {improvementCategories.map(category => (
                                    <div key={category.id} className="bg-[#0d1117] border border-yellow-500/20 rounded-xl overflow-hidden">
                                        {/* Category Header */}
                                        <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                                                    <span className="text-base">{category.icon}</span>
                                                </div>
                                                <span className="font-medium text-white">{category.name}</span>
                                            </div>
                                            <span className="text-yellow-400 font-semibold text-sm">{category.score}/5</span>
                                        </div>
                                        {/* Problems */}
                                        <div className="px-5 py-4 space-y-3">
                                            {category.problems.map((problem, i) => (
                                                <div key={i} className="bg-[#161b22] rounded-lg p-4">
                                                    <p className="text-white/70 text-sm mb-3">
                                                        <span className="text-white font-medium">Problem:</span> {problem.description}
                                                    </p>
                                                    <p className="text-emerald-400 text-sm">
                                                        <span className="font-medium">Rekommendation:</span> {problem.recommendation}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Strengths */}
                    {goodCategories.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                                    Styrkor
                                </h2>
                            </div>
                            <div className="space-y-3">
                                {goodCategories.map((category) => (
                                    <div key={category.id} className="bg-[#0d1117] border border-emerald-500/20 rounded-xl overflow-hidden">
                                        <div className="px-5 py-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                                                    <span className="text-base">{category.icon}</span>
                                                </div>
                                                <span className="font-medium text-white">{category.name}</span>
                                            </div>
                                            <span className="text-emerald-400 font-semibold text-sm">{category.score}/5</span>
                                        </div>
                                        {category.strength_reason && (
                                            <div className="px-5 pb-4 pt-1 border-t border-white/5">
                                                <p className="text-white/60 text-sm leading-relaxed">
                                                    {category.strength_reason}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action List */}
                    {analysisResult.action_list.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-3 h-3 rounded-full bg-white/40" />
                                <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
                                    Prioriterad åtgärdslista
                                </h2>
                            </div>
                            <div className="bg-[#0d1117] border border-white/10 rounded-xl p-5">
                                <div className="space-y-3">
                                    {analysisResult.action_list.map((action, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                                                action.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                                                action.priority === 'important' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-white/10 text-white/50'
                                            }`}>
                                                {i + 1}
                                            </div>
                                            <span className="text-white/80 text-sm leading-relaxed">{action.action}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CTA */}
                    <div className="bg-[#0d1117] border border-emerald-500/20 rounded-xl p-6 md:p-8 text-center">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">🚀</span>
                        </div>
                        <h2 className="text-lg font-semibold text-white mb-2">Nästa steg</h2>
                        <p className="text-white/50 mb-6 text-sm font-light max-w-md mx-auto">
                            Vill du ha hjälp att implementera dessa förbättringar och öka din konvertering?
                        </p>
                        <a
                            href="https://calendly.com/stefan-245/30min"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Boka genomgång för ökad konvertering
                            <ArrowRight className="w-4 h-4" />
                        </a>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-white/20 text-xs mt-6">
                        Rapport genererad av Konverteramera • Ett verktyg från Portalfabriken
                    </p>
                </div>
            </div>
        );
    }

    return null;
}
