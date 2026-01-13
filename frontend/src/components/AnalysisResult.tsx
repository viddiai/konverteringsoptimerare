import { Star, AlertTriangle, ArrowRight, Lock } from 'lucide-react'
import type { AnalyzeResponse } from '../utils/types'
import clsx from 'clsx'

interface AnalysisResultProps {
  data: AnalyzeResponse
  onGetFullReport: () => void
}

export function AnalysisResult({ data, onGetFullReport }: AnalysisResultProps) {
  const stars = Math.round(data.overall_score)

  return (
    <div className="card animate-slide-up max-w-2xl mx-auto">
      {/* Company info with score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white">
            {data.company_name || 'Analysresultat'}
          </h2>
          {/* Score - moved to header */}
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  size={22}
                  className={clsx(
                    i <= stars
                      ? 'text-primary-500 fill-primary-500'
                      : 'text-gray-600'
                  )}
                />
              ))}
            </div>
            <span className="text-lg font-bold text-white">
              {data.overall_score}/5
            </span>
          </div>
        </div>
        {data.company_description && (
          <p className="text-gray-400 text-sm">
            {data.company_description.substring(0, 200)}
            {data.company_description.length > 200 && '...'}
          </p>
        )}
      </div>

      {/* Issues */}
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 text-red-400 font-medium mb-3">
          <AlertTriangle size={20} />
          <span>Identifierade problem ({data.issues_count})</span>
        </div>
        <ul className="space-y-2">
          {data.logical_errors.map((error, index) => (
            <li
              key={index}
              className="text-red-300 text-sm flex items-start gap-2"
            >
              <span className="text-red-500">•</span>
              {error}
            </li>
          ))}
        </ul>
      </div>

      {/* Sammanfattande bedömning - expanded 300% */}
      <div className="mb-6 bg-white/5 border border-white/10 rounded-lg p-4">
        <h3 className="text-base font-semibold text-white mb-3">
          Sammanfattande bedömning:
        </h3>
        <div className="text-gray-300 text-base leading-relaxed space-y-3">
          <p>{data.short_description || data.teaser_text}</p>
          {data.logical_errors.length > 0 && (
            <p>
              De mest kritiska problemen inkluderar: {data.logical_errors.slice(0, 2).join('. ')}.
              Detta påverkar direkt er förmåga att konvertera besökare till leads.
            </p>
          )}
          <p className="text-gray-500 italic">
            Den fullständiga rapporten innehåller detaljerad analys av era leadmagneter,
            formulärdesign, CTAs och konkreta rekommendationer för att öka er konvertering.
          </p>
        </div>
      </div>

      {/* Blurred Report Preview */}
      <div className="relative mb-6 rounded-lg overflow-hidden border border-white/10">
        {/* Blurred content - simulated report with more detail */}
        <div className="blur-[2px] select-none pointer-events-none p-4 bg-white/5">
          <div className="space-y-3">
            {/* Header section */}
            <div className="flex justify-between items-center mb-2">
              <div className="h-5 bg-white/20 rounded w-48"></div>
              <div className="flex gap-1">
                <div className="h-4 w-4 bg-primary-500/50 rounded"></div>
                <div className="h-4 w-4 bg-primary-500/50 rounded"></div>
                <div className="h-4 w-4 bg-white/10 rounded"></div>
              </div>
            </div>
            {/* Description text */}
            <div className="h-3 bg-white/10 rounded w-full"></div>
            <div className="h-3 bg-white/10 rounded w-11/12"></div>
            <div className="h-3 bg-white/10 rounded w-4/5"></div>
            {/* Section: Lead magnets */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="h-4 bg-white/20 rounded w-56 mb-3"></div>
              <div className="h-3 bg-white/10 rounded w-full"></div>
              <div className="h-3 bg-white/10 rounded w-5/6 mt-1"></div>
            </div>
            {/* Section: Analysis table */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="h-4 bg-white/20 rounded w-44 mb-3"></div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="h-6 bg-white/5 rounded"></div>
                <div className="h-6 bg-white/5 rounded"></div>
                <div className="h-6 bg-white/5 rounded"></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="h-6 bg-white/5 rounded"></div>
                <div className="h-6 bg-white/5 rounded"></div>
                <div className="h-6 bg-white/5 rounded"></div>
              </div>
            </div>
            {/* Section: Recommendations */}
            <div className="mt-4 pt-3 border-t border-white/10">
              <div className="h-4 bg-primary-500/30 rounded w-40 mb-3"></div>
              <div className="flex gap-2 items-center mb-2">
                <div className="h-5 w-5 bg-primary-500/30 rounded-full flex-shrink-0"></div>
                <div className="h-3 bg-white/10 rounded w-full"></div>
              </div>
              <div className="flex gap-2 items-center">
                <div className="h-5 w-5 bg-primary-500/30 rounded-full flex-shrink-0"></div>
                <div className="h-3 bg-white/10 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
        {/* Overlay with lock icon */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/80 flex items-center justify-center">
          <div className="text-center bg-black/80 border border-white/10 px-6 py-4 rounded-lg">
            <Lock className="mx-auto text-gray-400 mb-2" size={24} />
            <p className="text-sm text-gray-300 font-medium">
              Fullständig rapport
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onGetFullReport}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        Få den fullständiga rapporten
        <ArrowRight size={20} />
      </button>
    </div>
  )
}
