// Analysis types
export interface AnalyzeResponse {
  report_id: number
  url: string
  company_name: string | null
  company_description: string | null
  overall_score: number
  issues_count: number
  logical_errors: string[]
  teaser_text: string
  // Enhanced AI-generated fields
  short_description?: string | null
  detected_industry?: string | null
  industry_label?: string | null
}

export interface LeadRequest {
  name: string
  email: string
  company_name?: string | null
  report_id: number
}

export interface LeadResponse {
  success: boolean
  message: string
  lead_id?: number
  access_token?: string
}

export interface AnalysisCriterion {
  criterion: string
  criterion_label: string
  score: number
  explanation: string
}

export interface DetectedElement {
  text?: string
  url?: string
  type?: string
  email?: string
  issue?: string
  [key: string]: unknown
}

export interface FullReport {
  report_id: number
  url: string
  company_name: string | null
  company_description: string | null
  overall_score: number
  issues_count: number
  // Industry detection
  detected_industry?: string | null
  industry_label?: string | null
  // AI-generated text sections
  short_description?: string | null
  logical_verdict?: string | null
  final_hook?: string | null
  // Detailed category analysis (AI-generated)
  detailed_lead_magnets?: string | null
  detailed_forms?: string | null
  detailed_social_proof?: string | null
  detailed_mailto?: string | null
  detailed_ungated_pdfs?: string | null
  // Detected elements (raw data)
  lead_magnets: DetectedElement[]
  forms: DetectedElement[]
  cta_buttons: DetectedElement[]
  social_proof: DetectedElement[]
  mailto_links: DetectedElement[]
  ungated_pdfs: DetectedElement[]
  // Analysis scores
  criteria_analysis: AnalysisCriterion[]
  summary_assessment: string
  recommendations: string[]
  created_at: string
}

// Admin types
export interface Lead {
  id: number
  name: string
  email: string
  company_name: string | null
  analyzed_url: string
  created_at: string
}

export interface ReportListItem {
  id: number
  url: string
  company_name_detected: string | null
  overall_score: number | null
  issues_found: number
  lead_email: string | null
  access_token: string | null  // For PDF download link
  created_at: string
}

export interface DashboardStats {
  total_leads: number
  total_reports: number
  reports_today: number
  leads_today: number
  average_score: number | null
  top_issues: Array<{ criterion: string; count: number }>
}
