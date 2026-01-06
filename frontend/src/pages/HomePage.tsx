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
