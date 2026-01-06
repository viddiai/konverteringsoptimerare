"""
AI-powered report generation using Claude API.
Generates professional, sales-focused analysis reports in Swedish.
"""
import asyncio
import json
import logging
import re
from typing import Dict, List, Any, Optional
from anthropic import Anthropic, APIError, RateLimitError

from app.core.config import settings
from app.services.report_templates import ReportTemplates
from app.services.industry_detector import IndustryDetector, INDUSTRY_TAXONOMY

logger = logging.getLogger(__name__)


class AIReportGenerator:
    """
    Generates professional, sales-focused analysis reports.

    Uses Claude API for dynamic text generation with fallback to static templates.
    All output is in Swedish with a direct, provocative tone.
    """

    def __init__(
        self,
        scraped_data: Dict[str, Any],
        analysis: Dict[str, Any],
        industry: str,
        industry_confidence: float
    ):
        """
        Initialize the report generator.

        Args:
            scraped_data: Raw data from WebScraper
            analysis: Processed analysis from ConversionAnalyzer
            industry: Detected industry key (e.g., "finance")
            industry_confidence: Confidence score 0-1
        """
        self.scraped_data = scraped_data
        self.analysis = analysis
        self.industry = industry
        self.industry_confidence = industry_confidence

        # Initialize Anthropic client if API key is available
        self.client = None
        if settings.ANTHROPIC_API_KEY and settings.AI_ENABLED:
            self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        # Get industry metadata
        industry_data = INDUSTRY_TAXONOMY.get(industry, {})
        self.industry_tone = industry_data.get("tone", "professionell, direkt, logisk")
        self.industry_label = industry_data.get("label", "Allmänt B2B")

        # Extract commonly used data
        self.company_name = scraped_data.get("company_info", {}).get("company_name", "Företaget")
        self.company_description = scraped_data.get("company_info", {}).get("description", "")

        # Count issues
        self.mailto_count = len(scraped_data.get("mailto_links", []))
        self.ungated_pdf_count = len(scraped_data.get("ungated_pdfs", []))
        self.has_lead_magnets = bool(scraped_data.get("lead_magnets", []))
        self.has_social_proof = bool(scraped_data.get("social_proof", []))

        # Filter forms (exclude search forms)
        forms = scraped_data.get("forms", [])
        self.lead_forms = [f for f in forms if f.get("type") != "search"]
        self.has_forms = bool(self.lead_forms)

        # Get issues from analysis
        self.logical_errors = analysis.get("logical_errors", [])
        self.issues_count = analysis.get("issues_found", 0)
        self.overall_score = analysis.get("overall_score", 0)

    async def _call_claude(self, prompt: str, max_tokens: int = None) -> Optional[str]:
        """
        Call Claude API with the given prompt.

        Args:
            prompt: The prompt to send
            max_tokens: Override default max tokens

        Returns:
            Response text or None if failed
        """
        if not self.client:
            return None

        try:
            message = self.client.messages.create(
                model=settings.AI_MODEL,
                max_tokens=max_tokens or settings.AI_MAX_TOKENS,
                temperature=settings.AI_TEMPERATURE,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            return message.content[0].text

        except RateLimitError as e:
            logger.warning(f"Claude API rate limit: {e}")
            return None
        except APIError as e:
            logger.error(f"Claude API error: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error calling Claude: {e}")
            return None

    async def generate_short_description(self) -> str:
        """
        Generate 3-sentence company description.
        AI-generated with fallback to static template.
        """
        # Build prompt
        prompt = ReportTemplates.get_short_description_prompt(
            company_name=self.company_name,
            company_description=self.company_description,
            industry=self.industry_label,
            industry_tone=self.industry_tone,
            main_issues=self.logical_errors
        )

        # Try AI
        result = await self._call_claude(prompt, max_tokens=400)

        if result:
            return result.strip()

        # Fallback to static template
        if settings.AI_FALLBACK_ON_ERROR:
            return ReportTemplates.get_fallback_short_description(
                company_name=self.company_name,
                company_description=self.company_description,
                industry_label=self.industry_label,
                has_lead_magnets=self.has_lead_magnets,
                has_forms=self.has_forms
            )

        return f"{self.company_name} saknar effektiv lead generation på sin webbplats."

    async def generate_summary_assessment(self) -> str:
        """
        Generate 8-paragraph "ruthless analysis".
        AI-generated with fallback to static template.
        """
        prompt = ReportTemplates.get_summary_assessment_prompt(
            company_name=self.company_name,
            industry=self.industry_label,
            industry_tone=self.industry_tone,
            overall_score=self.overall_score,
            issues=self.logical_errors,
            mailto_count=self.mailto_count,
            ungated_pdf_count=self.ungated_pdf_count,
            has_lead_magnets=self.has_lead_magnets,
            has_forms=self.has_forms,
            has_social_proof=self.has_social_proof
        )

        result = await self._call_claude(prompt, max_tokens=1200)

        if result:
            return result.strip()

        if settings.AI_FALLBACK_ON_ERROR:
            return ReportTemplates.get_fallback_summary_assessment(
                company_name=self.company_name,
                overall_score=self.overall_score,
                issues_count=self.issues_count,
                mailto_count=self.mailto_count,
                ungated_pdf_count=self.ungated_pdf_count,
                has_lead_magnets=self.has_lead_magnets,
                has_forms=self.has_forms,
                has_social_proof=self.has_social_proof
            )

        return f"{self.company_name} har brister i sin konverteringsstrategi."

    async def generate_detailed_analysis(self, category: str) -> str:
        """
        Generate detailed analysis for a specific category.

        Args:
            category: One of lead_magnets, forms, social_proof, mailto_links, ungated_pdfs
        """
        items = self.scraped_data.get(category, [])

        # Get category-specific issues
        category_issues = []
        for error in self.logical_errors:
            if category in error.lower() or self._category_matches_error(category, error):
                category_issues.append(error)

        prompt = ReportTemplates.get_detailed_analysis_prompt(
            category=category,
            items=items,
            issues=category_issues,
            industry=self.industry_label,
            industry_tone=self.industry_tone
        )

        result = await self._call_claude(prompt, max_tokens=400)

        if result:
            return result.strip()

        if settings.AI_FALLBACK_ON_ERROR:
            return ReportTemplates.get_fallback_detailed_analysis(
                category=category,
                items=items,
                industry_label=self.industry_label
            )

        return f"Ingen analys tillgänglig för {category}."

    def _category_matches_error(self, category: str, error: str) -> bool:
        """Check if an error message relates to a category."""
        error_lower = error.lower()
        mappings = {
            "lead_magnets": ["lead magnet", "passiva leads", "gated content"],
            "forms": ["formulär", "konvertering"],
            "social_proof": ["social proof", "lita på", "förtroende"],
            "mailto_links": ["mailto", "e-post", "läcker"],
            "ungated_pdfs": ["pdf", "ge bort", "gate"],
            "cta_buttons": ["cta", "uppmaning"]
        }

        keywords = mappings.get(category, [])
        return any(kw in error_lower for kw in keywords)

    async def generate_logical_verdict(self) -> str:
        """
        Generate the "Logisk Dom" section summarizing leaky funnel issues.
        """
        missing_elements = []
        if not self.has_lead_magnets:
            missing_elements.append("lead_magnets")
        if not self.has_forms:
            missing_elements.append("konverteringsformulär")
        if not self.has_social_proof:
            missing_elements.append("social_proof")

        prompt = ReportTemplates.get_logical_verdict_prompt(
            company_name=self.company_name,
            main_issues=self.logical_errors,
            mailto_count=self.mailto_count,
            ungated_pdf_count=self.ungated_pdf_count,
            missing_elements=missing_elements
        )

        result = await self._call_claude(prompt, max_tokens=400)

        if result:
            return result.strip()

        if settings.AI_FALLBACK_ON_ERROR:
            return ReportTemplates.get_fallback_logical_verdict(
                mailto_count=self.mailto_count,
                ungated_pdf_count=self.ungated_pdf_count,
                missing_elements=missing_elements
            )

        return "Webbplatsen har betydande brister i sin konverteringstratt."

    async def generate_final_hook(self) -> str:
        """
        Generate the teaser/CTA for full report.
        """
        prompt = ReportTemplates.get_final_hook_prompt(
            company_name=self.company_name,
            issues_count=self.issues_count
        )

        result = await self._call_claude(prompt, max_tokens=200)

        if result:
            return result.strip()

        if settings.AI_FALLBACK_ON_ERROR:
            return ReportTemplates.get_fallback_final_hook(self.issues_count)

        return f"Vi har identifierat {self.issues_count} problem som hindrar er tillväxt."

    def _get_fallback_sections(self) -> Dict[str, Any]:
        """
        Get fallback sections using static templates when AI is unavailable.
        """
        missing_elements = []
        if not self.has_lead_magnets:
            missing_elements.append("lead_magnets")
        if not self.has_forms:
            missing_elements.append("konverteringsformulär")
        if not self.has_social_proof:
            missing_elements.append("social_proof")

        return {
            "short_description": ReportTemplates.get_fallback_short_description(
                company_name=self.company_name,
                company_description=self.company_description,
                industry_label=self.industry_label,
                has_lead_magnets=self.has_lead_magnets,
                has_forms=self.has_forms
            ),
            "summary_assessment": ReportTemplates.get_fallback_summary_assessment(
                company_name=self.company_name,
                overall_score=self.overall_score,
                issues_count=self.issues_count,
                mailto_count=self.mailto_count,
                ungated_pdf_count=self.ungated_pdf_count,
                has_lead_magnets=self.has_lead_magnets,
                has_forms=self.has_forms,
                has_social_proof=self.has_social_proof
            ),
            "logical_verdict": ReportTemplates.get_fallback_logical_verdict(
                mailto_count=self.mailto_count,
                ungated_pdf_count=self.ungated_pdf_count,
                missing_elements=missing_elements
            ),
            "final_hook": ReportTemplates.get_fallback_final_hook(self.issues_count),
            "detailed_lead_magnets": ReportTemplates.get_fallback_detailed_analysis(
                category="lead_magnets",
                items=self.scraped_data.get("lead_magnets", []),
                industry_label=self.industry_label
            ),
            "detailed_forms": ReportTemplates.get_fallback_detailed_analysis(
                category="forms",
                items=self.lead_forms,
                industry_label=self.industry_label
            ),
            "detailed_social_proof": ReportTemplates.get_fallback_detailed_analysis(
                category="social_proof",
                items=self.scraped_data.get("social_proof", []),
                industry_label=self.industry_label
            ),
            "detailed_mailto": ReportTemplates.get_fallback_detailed_analysis(
                category="mailto_links",
                items=self.scraped_data.get("mailto_links", []),
                industry_label=self.industry_label
            ),
            "detailed_ungated_pdfs": ReportTemplates.get_fallback_detailed_analysis(
                category="ungated_pdfs",
                items=self.scraped_data.get("ungated_pdfs", []),
                industry_label=self.industry_label
            ),
            "detected_industry": self.industry,
            "industry_label": self.industry_label,
            "industry_confidence": self.industry_confidence,
        }

    async def generate_all_sections(self) -> Dict[str, Any]:
        """
        Generate ALL report sections in a SINGLE Claude API call.

        This is 4-5x faster than making 9 separate API calls.
        Returns structured JSON with all sections.
        """
        if not self.client:
            logger.info("AI disabled, using fallback templates")
            return self._get_fallback_sections()

        # Extract detailed data for comprehensive analysis
        lead_magnets = self.scraped_data.get("lead_magnets", [])
        forms = self.scraped_data.get("forms", [])
        cta_buttons = self.scraped_data.get("cta_buttons", [])
        social_proof = self.scraped_data.get("social_proof", [])
        mailto_links = self.scraped_data.get("mailto_links", [])
        ungated_pdfs = self.scraped_data.get("ungated_pdfs", [])

        # Extract detailed form field information for friction analysis
        form_details = []
        for f in forms[:3]:
            fields = f.get('fields', [])
            field_names = [field.get('name') or field.get('placeholder') or field.get('type') for field in fields]
            form_details.append({
                'type': f.get('type', 'unknown'),
                'submit_text': f.get('submit_text', ''),
                'field_count': len(fields),
                'fields': field_names
            })

        # Extract criteria scores from analysis
        criteria_scores = {}
        for c in self.analysis.get("criteria_analysis", []):
            criteria_scores[c.get("criterion", "")] = c.get("score", 0)

        # Build comprehensive prompt for high-value analysis
        prompt = f"""Du är en expert på konverteringsoptimering och lead generation. Analysera {self.company_name} ({self.industry_label}) och skriv en OMFATTANDE, VÄRDEFULL rapport på svenska.

FÖRETAGSDATA:
- Bransch: {self.industry_label}
- Beskrivning: {self.company_description[:500] if self.company_description else 'Ej tillgänglig'}

ANALYSDATA:
- Övergripande betyg: {self.overall_score}/5
- Identifierade problem: {self.logical_errors}
- Lead magnets: {len(lead_magnets)} st - {[lm.get('text', '')[:50] for lm in lead_magnets[:5]]}
- Formulär ({len(forms)} st): {form_details}
- CTA-knappar: {[cta.get('text', '') for cta in cta_buttons[:10]]}
- Social proof: {len(social_proof)} st - {[sp.get('text', '')[:80] for sp in social_proof[:5]]}
- Mailto-länkar (läckande tratt): {self.mailto_count} st - {[m.get('email', '') for m in mailto_links[:5]]}
- Öppna PDFs (läckande tratt): {self.ungated_pdf_count} st - {[p.get('url', '')[-50:] for p in ungated_pdfs[:5]]}

BETYG PER KRITERIUM (1-5 stjärnor, dessa är EXAKTA och får EJ ändras):
- Värdeerbjudande: {criteria_scores.get('value_proposition', 0)}/5
- Lead Magnets: {criteria_scores.get('lead_magnets', 0)}/5
- Formulärdesign: {criteria_scores.get('form_design', 0)}/5
- Social Proof: {criteria_scores.get('social_proof', 0)}/5
- CTA: {criteria_scores.get('call_to_action', 0)}/5
- Vägledande innehåll: {criteria_scores.get('guiding_content', 0)}/5

SKRIV EN DJUPGÅENDE ANALYS med följande sektioner (svenska, direkt och provocerande ton som en erfaren konsult):

Svara ENDAST med JSON:
{{
  "short_description": "3-4 meningar som positionerar företaget och identifierar kärnproblemet med deras lead generation. Var specifik om vad de gör och vad som saknas.",

  "lead_magnets_analysis": "2-3 stycken om deras lead magnets/erbjudanden. Nämn specifika exempel. Vad är bra? Vad saknas? Är de relevanta för målgruppen?",

  "forms_analysis": "2 stycken om formulärdesign. Hur många fält? Onödig friktion? Prioriterar de CRM framför användarupplevelse?",

  "cta_analysis": "1-2 stycken om deras CTAs. Är de svaga ('Kontakta oss') eller starka? Saknas mellansteg för kall trafik?",

  "logical_verdict": "2-3 stycken HÅRD, KONKRET kritik i stil med: 'Ni begår det klassiska misstaget att...' Identifiera SPECIFIKA problem som: (1) onödig friktion i formulär (t.ex. dropdown för 'Roll' som inte ger säljaren info de inte redan kan hitta på LinkedIn), (2) 'dödsgränder' efter konvertering (t.ex. 'Tack! Din inlämning har mottagits!' utan nästa steg som kalenderbokning eller VSL), (3) 'leaky funnels' där värde ges bort utan att fånga leads. Nämn exakt vad du ser i deras kod/CTAs. Skriv provocerande men sakligt.",

  "criteria_explanations": {{
    "value_proposition": "VIKTIGT: Betyget är {criteria_scores.get('value_proposition', 0)}/5. Skriv 1 mening som MOTIVERAR detta betyg - om det är lågt (1-2), förklara vad som är svagt. Om det är högt (4-5), förklara vad som fungerar.",
    "lead_magnets": "Betyg: {criteria_scores.get('lead_magnets', 0)}/5. 1 mening som motiverar detta.",
    "form_design": "Betyg: {criteria_scores.get('form_design', 0)}/5. 1 mening som motiverar detta.",
    "social_proof": "Betyg: {criteria_scores.get('social_proof', 0)}/5. 1 mening som motiverar detta.",
    "call_to_action": "Betyg: {criteria_scores.get('call_to_action', 0)}/5. 1 mening som motiverar detta.",
    "guiding_content": "Betyg: {criteria_scores.get('guiding_content', 0)}/5. 1 mening som motiverar detta."
  }},

  "summary_assessment": "3-4 stycken sammanfattande bedömning. Vad är företaget bra på? Var misslyckas de? Vad är den övergripande diagnosen? Skriv som en erfaren konsult som inte lindar in budskapet."
}}"""

        try:
            result = await self._call_claude(prompt, max_tokens=3000)

            if result:
                # Try to parse JSON directly
                try:
                    sections = json.loads(result)
                except json.JSONDecodeError:
                    # Try to extract JSON from markdown code blocks
                    match = re.search(r'\{[\s\S]*\}', result)
                    if match:
                        sections = json.loads(match.group())
                    else:
                        raise json.JSONDecodeError("No JSON found", result, 0)

                # Add metadata
                sections["detected_industry"] = self.industry
                sections["industry_label"] = self.industry_label
                sections["industry_confidence"] = self.industry_confidence

                logger.info("Successfully generated all sections in single API call")
                return sections

        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse AI response as JSON: {e}")
        except Exception as e:
            logger.error(f"Error generating consolidated report: {e}")

        # Fallback to static templates
        if settings.AI_FALLBACK_ON_ERROR:
            logger.info("Using fallback templates due to AI error")
            return self._get_fallback_sections()

        # Minimal fallback
        return {
            "short_description": f"{self.company_name} har brister i sin lead generation.",
            "summary_assessment": "Analysen kunde inte slutföras.",
            "logical_verdict": "Webbplatsen behöver förbättringar.",
            "final_hook": f"Vi hittade {self.issues_count} problem som hindrar er tillväxt.",
            "detailed_lead_magnets": "",
            "detailed_forms": "",
            "detailed_social_proof": "",
            "detailed_mailto": "",
            "detailed_ungated_pdfs": "",
            "detected_industry": self.industry,
            "industry_label": self.industry_label,
            "industry_confidence": self.industry_confidence,
        }


async def generate_enhanced_report(
    scraped_data: Dict[str, Any],
    analysis: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Convenience function to generate enhanced report with industry detection.

    Args:
        scraped_data: Raw data from WebScraper
        analysis: Processed analysis from ConversionAnalyzer

    Returns:
        Dictionary with all enhanced report sections
    """
    # Detect industry
    detector = IndustryDetector(scraped_data)
    industry, confidence, label = detector.detect()

    logger.info(f"Detected industry: {label} (confidence: {confidence})")

    # Generate report
    generator = AIReportGenerator(
        scraped_data=scraped_data,
        analysis=analysis,
        industry=industry,
        industry_confidence=confidence
    )

    return await generator.generate_all_sections()
