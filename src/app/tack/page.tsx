'use client';

import { CheckCircle2, Download, ArrowRight } from 'lucide-react';

export default function ThankYouPage() {
    return (
        <div className="min-h-screen bg-[var(--background)] text-white">
            {/* Header */}
            <header className="border-b border-white/10 py-4">
                <div className="container mx-auto px-4">
                    <a href="/" className="flex items-center gap-2 text-white hover:text-white/80 transition-colors">
                        <span className="text-emerald-400">→</span>
                        <span className="font-medium">Konverteramera</span>
                    </a>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-16">
                <div className="max-w-3xl mx-auto text-center">
                    {/* Success Icon */}
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        Tack! Din guide är redo.
                    </h1>
                    <p className="text-lg text-gray-400 mb-12">
                        Klicka på knappen nedan för att ladda ner din kostnadsfria guide med 7 beprövade sätt att öka konverteringen.
                    </p>

                    {/* Download Card */}
                    <div className="bg-[var(--surface)] rounded-2xl p-8 border border-white/10 mb-12">
                        <div className="flex flex-col md:flex-row gap-8 items-center">
                            {/* Book Cover */}
                            <div className="w-48 flex-shrink-0">
                                <div className="bg-black rounded-xl p-6 text-center">
                                    <div className="text-emerald-400 text-2xl mb-2">◆</div>
                                    <h4 className="text-white font-bold text-sm mb-1">7 beprövade sätt att öka konverteringen och vinna fler affärer</h4>
                                    <p className="text-gray-500 text-xs">En strategisk guide för VD:ar och säljchefer på medelstora svenska företag</p>
                                    <div className="mt-4 flex justify-center">
                                        <div className="w-12 h-12">
                                            <svg viewBox="0 0 100 100" className="w-full h-full">
                                                <polygon points="50,10 90,90 10,90" fill="#2DD4BF" opacity="0.8"/>
                                                <polygon points="50,30 75,80 25,80" fill="#F472B6" opacity="0.6"/>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Download Info */}
                            <div className="flex-1 text-left">
                                <h3 className="text-xl font-bold text-white mb-2">
                                    7 beprövade sätt att öka konverteringen och vinna fler affärer
                                </h3>
                                <p className="text-gray-400 mb-4">
                                    En strategisk guide för VD:ar och säljchefer på medelstora svenska företag
                                </p>
                                <a
                                    href="https://portalfabriken.se/7-beprovade-satt-att-oka-konverteringen.pdf"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
                                >
                                    <Download className="w-5 h-5" />
                                    Ladda ner PDF (Gratis)
                                </a>
                                <p className="text-gray-500 text-sm mt-2">PDF • 26 sidor • 2.5 MB</p>
                            </div>
                        </div>
                    </div>

                    {/* Next Steps */}
                    <div className="text-left mb-12">
                        <h2 className="text-xl font-bold mb-4">Vad händer nu?</h2>
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-bold flex-shrink-0">1</span>
                                <p className="text-gray-300 pt-1">Läs guiden och identifiera de områden där ni har störst potential</p>
                            </div>
                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-bold flex-shrink-0">2</span>
                                <p className="text-gray-300 pt-1">Välj 1-2 strategier att implementera först – börja med "3 saker du kan göra imorgon"</p>
                            </div>
                            <div className="flex items-start gap-4">
                                <span className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 font-bold flex-shrink-0">3</span>
                                <p className="text-gray-300 pt-1">Vill du ha hjälp med implementeringen? Boka ett kostnadsfritt strategisamtal</p>
                            </div>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="border-t border-white/10 pt-12">
                        <p className="text-gray-400 mb-4">Redo att ta nästa steg?</p>
                        <a
                            href="https://calendly.com/stefan-245/30min"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-100 text-black font-semibold rounded-full transition-all transform hover:scale-105"
                        >
                            <span>Boka konsultation: få fler kvalificerade leads</span>
                            <ArrowRight className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </main>
        </div>
    );
}
