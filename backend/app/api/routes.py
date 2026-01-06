"""
API routes for the Conversion Analyzer.
"""
import secrets
import time
import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks

logger = logging.getLogger(__name__)
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db, SessionLocal
from app.core.config import settings
from app.models.models import Lead, Report, AnalysisData
from app.schemas.schemas import (
    AnalyzeRequest,
    ShortSummaryResponse,
    FullReportResponse,
    LeadCreate,
    LeadResponse,
    LeadListItem,
    ReportListItem,
    DashboardStats,
    AnalysisCriterion,
)
from app.services.scraper import WebScraper
from app.services.analyzer import ConversionAnalyzer
from app.services.ai_report_generator import generate_enhanced_report
from app.services.industry_detector import IndustryDetector
from app.services.pdf_generator import generate_report_pdf


def generate_ai_sync(report_id: int, scraped_data: dict, analysis: dict):
    """
    Generate AI-enhanced sections synchronously in a background thread.
    This runs AFTER the HTTP response is sent to the client.
    """
    import asyncio
    print(f"🚀 Starting background AI generation for report {report_id}")

    async def _generate():
        try:
            # Generate AI sections
            print(f"📝 Calling Claude API for report {report_id}...")
            enhanced_sections = await generate_enhanced_report(scraped_data, analysis)
            print(f"📝 Claude API returned for report {report_id}")

            # Update report in database
            db = SessionLocal()
            try:
                report = db.query(Report).filter(Report.id == report_id).first()
                if report and report.full_report:
                    # Merge AI sections into existing report
                    full_report = dict(report.full_report)  # Make mutable copy

                    # Comprehensive AI sections (new format)
                    full_report["short_description"] = enhanced_sections.get("short_description", "")
                    full_report["lead_magnets_analysis"] = enhanced_sections.get("lead_magnets_analysis", "")
                    full_report["forms_analysis"] = enhanced_sections.get("forms_analysis", "")
                    full_report["cta_analysis"] = enhanced_sections.get("cta_analysis", "")
                    full_report["logical_verdict"] = enhanced_sections.get("logical_verdict", "")
                    full_report["summary_assessment"] = enhanced_sections.get("summary_assessment", "")
                    full_report["criteria_explanations"] = enhanced_sections.get("criteria_explanations", {})

                    # Legacy fields (backward compatibility)
                    full_report["final_hook"] = enhanced_sections.get("final_hook", "")
                    full_report["detailed_lead_magnets"] = enhanced_sections.get("detailed_lead_magnets", "")
                    full_report["detailed_forms"] = enhanced_sections.get("detailed_forms", "")
                    full_report["detailed_social_proof"] = enhanced_sections.get("detailed_social_proof", "")
                    full_report["detailed_mailto"] = enhanced_sections.get("detailed_mailto", "")
                    full_report["detailed_ungated_pdfs"] = enhanced_sections.get("detailed_ungated_pdfs", "")

                    full_report["ai_generated"] = True

                    report.full_report = full_report
                    db.commit()
                    print(f"✅ AI generation complete for report {report_id}")
            finally:
                db.close()
        except Exception as e:
            print(f"❌ Background AI generation failed for report {report_id}: {e}")

    # Run in a new event loop (since BackgroundTasks runs in a thread)
    asyncio.run(_generate())

router = APIRouter()


# ============== Analysis Endpoints ==============

@router.post("/analyze", response_model=ShortSummaryResponse)
async def analyze_url(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Analyze a URL and return a short summary (public teaser) IMMEDIATELY.
    AI-enhanced text is generated in background and will be ready for full report.

    This provides sub-second response times while AI generates in parallel.
    """
    url = str(request.url)
    total_start = time.time()

    try:
        # Scrape the page
        scraper = WebScraper()
        scraped_data = await scraper.scrape_and_analyze(url)

        # Detect industry
        detector = IndustryDetector(scraped_data)
        industry, industry_confidence, industry_label = detector.detect()

        # Analyze the scraped data (scoring) - FAST, no AI
        analyzer = ConversionAnalyzer(scraped_data)
        analysis = analyzer.generate_analysis()

        # Generate quick teaser from analysis (no AI needed)
        quick_description = _generate_quick_description(
            scraped_data.get("company_info", {}),
            analysis,
            industry_label
        )

        # Build initial report data (will be enhanced with AI in background)
        full_report = {
            "scraped_data": scraped_data,
            "criteria_analysis": analysis["criteria_analysis"],
            "summary_assessment": analyzer.generate_summary_assessment(),
            "recommendations": analyzer.generate_recommendations(),
            # Placeholder for AI sections (will be filled by background task)
            "short_description": quick_description,
            "logical_verdict": "",
            "final_hook": "",
            "detailed_lead_magnets": "",
            "detailed_forms": "",
            "detailed_social_proof": "",
            "detailed_mailto": "",
            "detailed_ungated_pdfs": "",
            # Industry detection
            "detected_industry": industry,
            "industry_label": industry_label,
            "industry_confidence": industry_confidence,
            "ai_generated": False,  # Will be set to True when AI completes
        }

        # Create report in database
        report = Report(
            url=url,
            company_name_detected=scraped_data.get("company_info", {}).get("company_name"),
            company_description=scraped_data.get("company_info", {}).get("description"),
            short_summary="; ".join(analysis["logical_errors"][:3]),
            full_report=full_report,
            overall_score=analysis["overall_score"],
            issues_found=analysis["issues_found"],
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        # Store individual analysis data
        for criterion in analysis["criteria_analysis"]:
            analysis_item = AnalysisData(
                report_id=report.id,
                criterion=criterion["criterion"],
                score=criterion["score"],
                explanation=criterion["explanation"],
            )
            db.add(analysis_item)
        db.commit()

        # Start AI generation in TRUE background (runs AFTER response is sent)
        background_tasks.add_task(generate_ai_sync, report.id, scraped_data, analysis)

        # Generate teaser text
        teaser = f"Vi har identifierat {analysis['issues_found']} specifika fel som hindrar er från att dominera marknaden"

        print(f"⏱️ TOTAL analyze endpoint took {time.time() - total_start:.2f}s (AI generating in background)")

        return ShortSummaryResponse(
            report_id=report.id,
            url=url,
            company_name=report.company_name_detected,
            company_description=report.company_description,
            overall_score=analysis["overall_score"],
            issues_count=analysis["issues_found"],
            logical_errors=analysis["logical_errors"],
            teaser_text=teaser,
            # Quick description (non-AI)
            short_description=quick_description,
            detected_industry=industry,
            industry_label=industry_label,
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Kunde inte analysera URL: {str(e)}")


def _generate_quick_description(company_info: dict, analysis: dict, industry_label: str) -> str:
    """
    Generate a quick company description without AI.
    Used for immediate response while AI generates in background.
    """
    company_name = company_info.get("company_name", "Webbplatsen")
    issues = analysis.get("logical_errors", [])
    score = analysis.get("overall_score", 0)

    if score <= 2:
        severity = "allvarliga brister"
    elif score <= 3:
        severity = "betydande förbättringsmöjligheter"
    else:
        severity = "vissa förbättringsområden"

    main_issue = issues[0] if issues else "saknar tydlig konverteringsstrategi"

    return f"{company_name} ({industry_label}) har {severity} i sin lead generation. {main_issue}."


@router.post("/lead", response_model=LeadResponse)
async def create_lead(lead_data: LeadCreate, db: Session = Depends(get_db)):
    """
    Capture lead information and grant access to full report.
    """
    # Check if report exists
    report = db.query(Report).filter(Report.id == lead_data.report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Rapport hittades inte")

    # Check if email already exists
    existing_lead = db.query(Lead).filter(Lead.email == lead_data.email).first()

    if existing_lead:
        # Update existing lead with new analyzed URL if different
        if existing_lead.analyzed_url != report.url:
            existing_lead.analyzed_url = report.url

        # Link report to existing lead
        report.lead_id = existing_lead.id

        # Generate access token
        access_token = secrets.token_urlsafe(32)
        report.access_token = access_token
        db.commit()

        return LeadResponse(
            success=True,
            message="Välkommen tillbaka! Din fullständiga rapport är redo.",
            lead_id=existing_lead.id,
            access_token=access_token,
        )

    # Create new lead
    lead = Lead(
        name=lead_data.name,
        email=lead_data.email,
        company_name=lead_data.company_name,
        analyzed_url=report.url,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)

    # Link report to lead and generate access token
    report.lead_id = lead.id
    access_token = secrets.token_urlsafe(32)
    report.access_token = access_token
    db.commit()

    return LeadResponse(
        success=True,
        message="Tack! Din fullständiga rapport är redo.",
        lead_id=lead.id,
        access_token=access_token,
    )


@router.get("/report/{report_id}")
async def get_full_report(
    report_id: int,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Get full report. Requires valid access token.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Rapport hittades inte")

    # Verify access token
    if not token or report.access_token != token:
        raise HTTPException(
            status_code=403,
            detail="Åtkomst nekad. Vänligen fyll i formuläret för att få tillgång till rapporten."
        )

    # Check token expiry (72 hours from creation)
    expiry = report.created_at + timedelta(hours=settings.REPORT_ACCESS_TOKEN_EXPIRE_HOURS)
    if datetime.utcnow() > expiry:
        raise HTTPException(status_code=403, detail="Länken har upphört. Analysera sidan igen.")

    # Build full report response
    full_data = report.full_report or {}
    scraped = full_data.get("scraped_data", {})

    return FullReportResponse(
        report_id=report.id,
        url=report.url,
        company_name=report.company_name_detected,
        company_description=report.company_description,
        overall_score=float(report.overall_score) if report.overall_score else 0.0,
        issues_count=report.issues_found,
        # Industry detection
        detected_industry=full_data.get("detected_industry"),
        industry_label=full_data.get("industry_label"),
        # AI-generated text sections (comprehensive)
        short_description=full_data.get("short_description"),
        logical_verdict=full_data.get("logical_verdict"),
        final_hook=full_data.get("final_hook"),
        # New comprehensive analysis sections
        lead_magnets_analysis=full_data.get("lead_magnets_analysis"),
        forms_analysis=full_data.get("forms_analysis"),
        cta_analysis=full_data.get("cta_analysis"),
        # Legacy detailed category analysis (backward compatibility)
        detailed_lead_magnets=full_data.get("detailed_lead_magnets"),
        detailed_forms=full_data.get("detailed_forms"),
        detailed_social_proof=full_data.get("detailed_social_proof"),
        detailed_mailto=full_data.get("detailed_mailto"),
        detailed_ungated_pdfs=full_data.get("detailed_ungated_pdfs"),
        # AI-generated criteria explanations
        criteria_explanations=full_data.get("criteria_explanations"),
        # Raw detected elements
        lead_magnets=scraped.get("lead_magnets", []),
        forms=scraped.get("forms", []),
        cta_buttons=scraped.get("cta_buttons", []),
        social_proof=scraped.get("social_proof", []),
        mailto_links=scraped.get("mailto_links", []),
        ungated_pdfs=scraped.get("ungated_pdfs", []),
        # Analysis scores
        criteria_analysis=[
            AnalysisCriterion(**c) for c in full_data.get("criteria_analysis", [])
        ],
        summary_assessment=full_data.get("summary_assessment", ""),
        recommendations=full_data.get("recommendations", []),
        created_at=report.created_at,
    )


@router.get("/report/{report_id}/pdf")
async def download_report_pdf(
    report_id: int,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Download report as PDF. Requires valid access token.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Rapport hittades inte")

    # Verify access token
    if not token or report.access_token != token:
        raise HTTPException(
            status_code=403,
            detail="Åtkomst nekad. Vänligen fyll i formuläret för att få tillgång till rapporten."
        )

    # Check token expiry
    expiry = report.created_at + timedelta(hours=settings.REPORT_ACCESS_TOKEN_EXPIRE_HOURS)
    if datetime.utcnow() > expiry:
        raise HTTPException(status_code=403, detail="Länken har upphört. Analysera sidan igen.")

    # Build report data for PDF
    full_data = report.full_report or {}
    scraped = full_data.get("scraped_data", {})

    pdf_data = {
        "report_id": report.id,
        "url": report.url,
        "company_name": report.company_name_detected,
        "company_description": report.company_description,
        "overall_score": float(report.overall_score) if report.overall_score else 0.0,
        "issues_count": report.issues_found,
        "detected_industry": full_data.get("detected_industry"),
        "industry_label": full_data.get("industry_label"),
        "short_description": full_data.get("short_description"),
        "logical_verdict": full_data.get("logical_verdict"),
        "lead_magnets_analysis": full_data.get("lead_magnets_analysis"),
        "forms_analysis": full_data.get("forms_analysis"),
        "cta_analysis": full_data.get("cta_analysis"),
        "detailed_lead_magnets": full_data.get("detailed_lead_magnets"),
        "detailed_forms": full_data.get("detailed_forms"),
        "criteria_analysis": full_data.get("criteria_analysis", []),
        "criteria_explanations": full_data.get("criteria_explanations", {}),
        "summary_assessment": full_data.get("summary_assessment", ""),
        "recommendations": full_data.get("recommendations", []),
        "scraped_data": scraped,
        "lead_magnets": scraped.get("lead_magnets", []),
        "forms": scraped.get("forms", []),
        "cta_buttons": scraped.get("cta_buttons", []),
        "mailto_links": scraped.get("mailto_links", []),
        "ungated_pdfs": scraped.get("ungated_pdfs", []),
        "created_at": report.created_at.isoformat(),
    }

    try:
        pdf_bytes = generate_report_pdf(pdf_data)
    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        raise HTTPException(status_code=500, detail="Kunde inte generera PDF")

    # Create filename
    company_slug = (report.company_name_detected or "rapport").replace(" ", "-").lower()[:30]
    filename = f"konverteringsanalys-{company_slug}-{report.id}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )


# ============== Widget Endpoint ==============

WIDGET_JS_TEMPLATE = '''
(function() {
  const WIDGET_API_URL = '%API_URL%';

  // Create widget container
  function createWidget(config) {
    config = config || {};
    const theme = config.theme || 'light';
    const primaryColor = config.primaryColor || '#2563eb';
    const buttonText = config.buttonText || 'Analysera';
    const placeholder = config.placeholder || 'Ange URL att analysera...';

    const container = document.getElementById('conversion-analyzer-widget');
    if (!container) {
      console.error('Widget container not found');
      return;
    }

    const isDark = theme === 'dark';
    const bgColor = isDark ? '#1f2937' : '#ffffff';
    const textColor = isDark ? '#f9fafb' : '#111827';
    const borderColor = isDark ? '#374151' : '#e5e7eb';

    container.innerHTML = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  max-width: 500px; padding: 24px; background: ${bgColor};
                  border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <h3 style="margin: 0 0 16px; color: ${textColor}; font-size: 18px; font-weight: 600;">
          Analysera din webbsidas konverteringsförmåga
        </h3>
        <div id="caw-input-section">
          <div style="display: flex; gap: 8px;">
            <input type="url" id="caw-url-input"
                   placeholder="${placeholder}"
                   style="flex: 1; padding: 12px 16px; border: 1px solid ${borderColor};
                          border-radius: 8px; font-size: 14px; background: ${bgColor};
                          color: ${textColor};">
            <button id="caw-analyze-btn"
                    style="padding: 12px 24px; background: ${primaryColor}; color: white;
                           border: none; border-radius: 8px; font-size: 14px; font-weight: 500;
                           cursor: pointer; transition: opacity 0.2s;">
              ${buttonText}
            </button>
          </div>
          <p id="caw-error" style="color: #ef4444; margin: 8px 0 0; font-size: 13px; display: none;"></p>
        </div>
        <div id="caw-loading" style="display: none; text-align: center; padding: 40px 0;">
          <div style="width: 40px; height: 40px; border: 3px solid ${borderColor};
                      border-top-color: ${primaryColor}; border-radius: 50%;
                      animation: caw-spin 1s linear infinite; margin: 0 auto;"></div>
          <p style="margin: 16px 0 0; color: ${textColor};">Analyserar webbsidan...</p>
        </div>
        <div id="caw-result" style="display: none;"></div>
        <div id="caw-lead-form" style="display: none;"></div>
      </div>
      <style>
        @keyframes caw-spin { to { transform: rotate(360deg); } }
        #caw-analyze-btn:hover { opacity: 0.9; }
        #caw-url-input:focus { outline: 2px solid ${primaryColor}; outline-offset: -1px; }
      </style>
    `;

    // Attach event listeners
    const btn = document.getElementById('caw-analyze-btn');
    const input = document.getElementById('caw-url-input');

    btn.addEventListener('click', () => analyzeUrl(config));
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') analyzeUrl(config);
    });
  }

  async function analyzeUrl(config) {
    const input = document.getElementById('caw-url-input');
    const error = document.getElementById('caw-error');
    const loading = document.getElementById('caw-loading');
    const inputSection = document.getElementById('caw-input-section');
    const result = document.getElementById('caw-result');

    const url = input.value.trim();
    if (!url) {
      error.textContent = 'Ange en URL';
      error.style.display = 'block';
      return;
    }

    // Basic URL validation
    try {
      new URL(url.startsWith('http') ? url : 'https://' + url);
    } catch {
      error.textContent = 'Ogiltig URL';
      error.style.display = 'block';
      return;
    }

    error.style.display = 'none';
    inputSection.style.display = 'none';
    loading.style.display = 'block';

    try {
      const response = await fetch(WIDGET_API_URL + '/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.startsWith('http') ? url : 'https://' + url })
      });

      if (!response.ok) throw new Error('Analys misslyckades');

      const data = await response.json();
      loading.style.display = 'none';
      showResult(data, config);
    } catch (err) {
      loading.style.display = 'none';
      inputSection.style.display = 'block';
      error.textContent = err.message || 'Något gick fel';
      error.style.display = 'block';
    }
  }

  function showResult(data, config) {
    const result = document.getElementById('caw-result');
    const isDark = (config.theme || 'light') === 'dark';
    const textColor = isDark ? '#f9fafb' : '#111827';
    const mutedColor = isDark ? '#9ca3af' : '#6b7280';
    const primaryColor = config.primaryColor || '#2563eb';

    const stars = '⭐'.repeat(Math.round(data.overall_score));

    result.style.display = 'block';
    result.innerHTML = `
      <div style="color: ${textColor};">
        <h4 style="margin: 0 0 8px; font-size: 16px;">${data.company_name || 'Analysresultat'}</h4>
        <p style="margin: 0 0 16px; color: ${mutedColor}; font-size: 13px;">
          ${(data.company_description || '').substring(0, 150)}...
        </p>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
          <span style="font-size: 24px;">${stars}</span>
          <span style="color: ${mutedColor}; font-size: 14px;">${data.overall_score}/5</span>
        </div>
        <div style="background: ${isDark ? '#374151' : '#fef2f2'}; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0 0 8px; font-weight: 600; color: #dc2626; font-size: 14px;">
            Identifierade problem:
          </p>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: ${textColor};">
            ${data.logical_errors.map(e => '<li style="margin-bottom: 4px;">' + e + '</li>').join('')}
          </ul>
        </div>
        <p style="text-align: center; font-weight: 500; color: ${primaryColor}; margin-bottom: 16px; font-size: 14px;">
          ${data.teaser_text}
        </p>
        <button id="caw-get-report-btn"
                style="width: 100%; padding: 14px; background: ${primaryColor}; color: white;
                       border: none; border-radius: 8px; font-size: 15px; font-weight: 600;
                       cursor: pointer;">
          Få den fullständiga rapporten
        </button>
      </div>
    `;

    document.getElementById('caw-get-report-btn').addEventListener('click', () => {
      showLeadForm(data.report_id, config);
    });

    window.CAW_REPORT_ID = data.report_id;
  }

  function showLeadForm(reportId, config) {
    const result = document.getElementById('caw-result');
    const form = document.getElementById('caw-lead-form');
    const isDark = (config.theme || 'light') === 'dark';
    const textColor = isDark ? '#f9fafb' : '#111827';
    const borderColor = isDark ? '#374151' : '#e5e7eb';
    const bgColor = isDark ? '#1f2937' : '#ffffff';
    const primaryColor = config.primaryColor || '#2563eb';

    result.style.display = 'none';
    form.style.display = 'block';

    form.innerHTML = `
      <div style="color: ${textColor};">
        <h4 style="margin: 0 0 16px; font-size: 16px;">Fyll i för att få rapporten</h4>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <input type="text" id="caw-name" placeholder="Ditt namn *" required
                 style="padding: 12px 16px; border: 1px solid ${borderColor}; border-radius: 8px;
                        font-size: 14px; background: ${bgColor}; color: ${textColor};">
          <input type="email" id="caw-email" placeholder="Din e-post *" required
                 style="padding: 12px 16px; border: 1px solid ${borderColor}; border-radius: 8px;
                        font-size: 14px; background: ${bgColor}; color: ${textColor};">
          <input type="text" id="caw-company" placeholder="Företagsnamn (valfritt)"
                 style="padding: 12px 16px; border: 1px solid ${borderColor}; border-radius: 8px;
                        font-size: 14px; background: ${bgColor}; color: ${textColor};">
          <button id="caw-submit-lead"
                  style="padding: 14px; background: ${primaryColor}; color: white; border: none;
                         border-radius: 8px; font-size: 15px; font-weight: 600; cursor: pointer;">
            Få den fullständiga rapporten
          </button>
          <p id="caw-form-error" style="color: #ef4444; margin: 0; font-size: 13px; display: none;"></p>
        </div>
      </div>
    `;

    document.getElementById('caw-submit-lead').addEventListener('click', () => submitLead(reportId, config));
  }

  async function submitLead(reportId, config) {
    const name = document.getElementById('caw-name').value.trim();
    const email = document.getElementById('caw-email').value.trim();
    const company = document.getElementById('caw-company').value.trim();
    const error = document.getElementById('caw-form-error');

    if (!name || !email) {
      error.textContent = 'Namn och e-post krävs';
      error.style.display = 'block';
      return;
    }

    if (!email.includes('@')) {
      error.textContent = 'Ogiltig e-postadress';
      error.style.display = 'block';
      return;
    }

    error.style.display = 'none';

    try {
      const response = await fetch(WIDGET_API_URL + '/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          email: email,
          company_name: company || null,
          report_id: reportId
        })
      });

      if (!response.ok) throw new Error('Något gick fel');

      const data = await response.json();

      // Redirect to full report
      window.location.href = WIDGET_API_URL.replace('/api', '') +
        '/report/' + reportId + '?token=' + data.access_token;
    } catch (err) {
      error.textContent = err.message || 'Något gick fel';
      error.style.display = 'block';
    }
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => createWidget(window.CAWidgetConfig));
  } else {
    createWidget(window.CAWidgetConfig);
  }
})();
'''


@router.get("/widget.js")
async def get_widget_js():
    """
    Return the embeddable widget JavaScript.
    """
    # Replace API URL placeholder - use PUBLIC_URL if set, otherwise fallback to HOST:PORT
    if settings.PUBLIC_URL:
        api_url = f"{settings.PUBLIC_URL.rstrip('/')}/api"
    else:
        api_url = f"http://{settings.HOST}:{settings.PORT}/api"
    js_content = WIDGET_JS_TEMPLATE.replace('%API_URL%', api_url)

    return Response(
        content=js_content,
        media_type="application/javascript",
        headers={
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
        }
    )


# ============== Admin Endpoints ==============

@router.get("/admin/leads", response_model=list[LeadListItem])
async def list_leads(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    List all captured leads (admin only in production).
    """
    leads = db.query(Lead).order_by(Lead.created_at.desc()).offset(skip).limit(limit).all()
    return [LeadListItem.model_validate(lead) for lead in leads]


@router.get("/admin/reports", response_model=list[ReportListItem])
async def list_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    List all reports (admin only in production).
    """
    reports = db.query(Report).order_by(Report.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for report in reports:
        lead_email = None
        if report.lead:
            lead_email = report.lead.email

        result.append(ReportListItem(
            id=report.id,
            url=report.url,
            company_name_detected=report.company_name_detected,
            overall_score=float(report.overall_score) if report.overall_score else None,
            issues_found=report.issues_found,
            lead_email=lead_email,
            access_token=report.access_token,  # For PDF download
            created_at=report.created_at,
        ))

    return result


@router.get("/admin/stats", response_model=DashboardStats)
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Get dashboard statistics (admin only in production).
    """
    today = datetime.utcnow().date()

    total_leads = db.query(func.count(Lead.id)).scalar()
    total_reports = db.query(func.count(Report.id)).scalar()

    leads_today = db.query(func.count(Lead.id)).filter(
        func.date(Lead.created_at) == today
    ).scalar()

    reports_today = db.query(func.count(Report.id)).filter(
        func.date(Report.created_at) == today
    ).scalar()

    avg_score = db.query(func.avg(Report.overall_score)).scalar()

    # Get top issues (most common low-scoring criteria)
    low_scores = db.query(
        AnalysisData.criterion,
        func.count(AnalysisData.id).label("count")
    ).filter(
        AnalysisData.score <= 2
    ).group_by(
        AnalysisData.criterion
    ).order_by(
        func.count(AnalysisData.id).desc()
    ).limit(5).all()

    top_issues = [{"criterion": r[0], "count": r[1]} for r in low_scores]

    return DashboardStats(
        total_leads=total_leads or 0,
        total_reports=total_reports or 0,
        reports_today=reports_today or 0,
        leads_today=leads_today or 0,
        average_score=round(float(avg_score), 1) if avg_score else None,
        top_issues=top_issues,
    )
