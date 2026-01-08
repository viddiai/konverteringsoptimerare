import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { UrlInput } from '../components/UrlInput'
import { AnalysisResult } from '../components/AnalysisResult'
import { LeadForm } from '../components/LeadForm'
import { analyzeUrl, submitLead } from '../utils/api'
import type { AnalyzeResponse, LeadRequest } from '../utils/types'
import { BarChart2, Target, TrendingUp } from 'lucide-react'

type ViewState = 'input' | 'result' | 'form' | 'success'

export default function HomePage() {
  const [view, setView] = useState<ViewState>('input')
  const [analysisData, setAnalysisData] = useState<AnalyzeResponse | null>(null)

  const analyzeMutation = useMutation({
    mutationFn: analyzeUrl,
    onSuccess: (data) => {
      setAnalysisData(data)
      setView('result')
    },
  })

  const leadMutation = useMutation({
    mutationFn: submitLead,
    onSuccess: (data) => {
      setView('success')
      // Redirect to full report (served by backend) after a short delay
      if (data.access_token && analysisData) {
        const baseUrl = import.meta.env.VITE_API_URL || ''
        setTimeout(() => {
          window.location.href = `${baseUrl}/report/${analysisData.report_id}?token=${data.access_token}`
        }, 1500)
      }
    },
  })

  const handleAnalyze = (url: string) => {
    analyzeMutation.mutate(url)
  }

  const handleLeadSubmit = async (data: LeadRequest) => {
    await leadMutation.mutateAsync(data)
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Section */}
      <header className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6 text-white animate-fade-slide-in">
            Analysera din webbsidas konverteringsförmåga
          </h1>
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
            Få en obarmhärtig analys av vad som hindrar din webbsida från att konvertera besökare till leads.
            Ingen fluff - bara konkreta problem och lösningar.
          </p>

          {view === 'input' && (
            <UrlInput
              onSubmit={handleAnalyze}
              isLoading={analyzeMutation.isPending}
            />
          )}

          {analyzeMutation.isError && (
            <p className="mt-4 text-red-400">
              {(analyzeMutation.error as Error).message || 'Något gick fel. Försök igen.'}
            </p>
          )}
        </div>
      </header>

      {/* Result/Form Section */}
      {(view === 'result' || view === 'form' || view === 'success') && (
        <section className="py-12 px-4">
          {view === 'result' && analysisData && (
            <AnalysisResult
              data={analysisData}
              onGetFullReport={() => setView('form')}
            />
          )}

          {(view === 'form' || view === 'success') && analysisData && (
            <LeadForm
              reportId={analysisData.report_id}
              onSubmit={handleLeadSubmit}
              onBack={() => setView('result')}
              isLoading={leadMutation.isPending}
              isSuccess={view === 'success'}
            />
          )}
        </section>
      )}

      {/* Features Section - Only show on input view */}
      {view === 'input' && (
        <section className="py-20 px-4 border-t border-white/10">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold text-center text-white mb-12">
              Vad vi analyserar
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Target className="text-primary-500" size={32} />}
                title="Leadmagneter & Formulär"
                description="Vi hittar läckande trattar - mailto-länkar och öppna PDF:er som ger bort värde utan att fånga leads."
              />
              <FeatureCard
                icon={<BarChart2 className="text-primary-500" size={32} />}
                title="Konverteringselement"
                description="CTA-knappar, värdeerbjudande, social proof - allt som påverkar om besökare konverterar eller studsar."
              />
              <FeatureCard
                icon={<TrendingUp className="text-primary-500" size={32} />}
                title="Konkreta Rekommendationer"
                description="Inga fluffiga tips. Fem konkreta åtgärder prioriterade efter påverkan på din konvertering."
              />
            </div>
          </div>
        </section>
      )}

      {/* Guide Value Proposition */}
      {view === 'input' && (
        <section className="py-16 px-4 border-t border-white/10">
          <div className="container mx-auto max-w-5xl">
            <div className="bg-white rounded-2xl p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center">
              {/* Guide Cover Image */}
              <div className="flex-shrink-0 w-full md:w-80">
                <div className="bg-black rounded-xl p-6 text-center">
                  <div className="w-8 h-8 mx-auto mb-4">
                    <svg viewBox="0 0 24 24" fill="none" className="text-primary-500">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.3"/>
                      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h3 className="text-white text-xl font-bold mb-2 leading-tight">
                    7 beprövade sätt att öka konverteringen och vinna fler affärer
                  </h3>
                  <p className="text-gray-400 text-sm">
                    En strategisk guide för VD:ar och säljchefer på medelstora svenska företag
                  </p>
                  <div className="mt-6 flex justify-center">
                    <div className="relative w-32 h-32">
                      {/* Funnel illustration */}
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <polygon points="20,20 80,20 65,50 35,50" fill="#4ECDC4" opacity="0.8"/>
                        <polygon points="35,50 65,50 55,80 45,80" fill="#FF6B6B" opacity="0.8"/>
                        <polygon points="45,80 55,80 50,95 50,95" fill="#FFE66D" opacity="0.8"/>
                        <path d="M70,30 Q90,40 85,60" stroke="#4ECDC4" strokeWidth="3" fill="none" markerEnd="url(#arrow)"/>
                        <defs>
                          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                            <path d="M0,0 L0,6 L9,3 z" fill="#4ECDC4"/>
                          </marker>
                        </defs>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Guide Content */}
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  7 beprövade sätt att öka konverteringen och vinna fler affärer
                </h2>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Denna guide ger dig
                </h3>
                <p className="text-gray-600 mb-3">Konkreta verktyg för att:</p>
                <ul className="space-y-2 text-gray-700 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <span>Formulera ett värdeerbjudande som faktiskt övertygar svenska beslutsfattare</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <span>Fånga upp potentiella kunder innan de är redo att köpa</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <span>Eliminera friktion som dödar affärer</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <span>Bygga systematiskt förtroende genom sociala bevis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <span>Skapa handlingsdriven kommunikation som leder till avslut</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <span>Strukturera komplex information utan att överväldiga</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <span>Använda avancerade strategier för dramatisk tillväxt</span>
                  </li>
                </ul>
                <div className="flex items-start gap-2 text-gray-600 mb-6">
                  <span className="text-yellow-500">💡</span>
                  <span className="text-sm">
                    Kom ihåg: Varje kapitel avslutas med "3 saker du kan göra imorgon" – konkreta åtgärder som ger omedelbar effekt.
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="email"
                    placeholder="Din e-postadress"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button className="px-6 py-3 bg-primary-500 text-white font-semibold rounded-lg hover:bg-primary-600 transition-colors whitespace-nowrap">
                    Hämta guiden
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4">
        <div className="container mx-auto max-w-5xl text-center text-gray-500 text-sm">
          <p>Portalfabriken.se</p>
          <p className="mt-2">
            <a href="/admin" className="hover:text-primary-500 transition-colors">Admin Dashboard</a>
          </p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="card text-center">
      <div className="w-16 h-16 bg-primary-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-400 text-sm">
        {description}
      </p>
    </div>
  )
}
