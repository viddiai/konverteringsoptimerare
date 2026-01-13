"""
Industry detection service for identifying business sector from web content.
Used to adapt report tone and terminology.
"""
import re
from typing import Dict, List, Tuple, Any
from collections import Counter


# Industry taxonomy with keywords, tone, and terminology
INDUSTRY_TAXONOMY: Dict[str, Dict[str, Any]] = {
    "finance": {
        "keywords": [
            # Swedish
            "bank", "lån", "investering", "försäkring", "pension", "kapital",
            "värdering", "m&a", "transaktion", "förvärv", "avyttring", "rådgivning",
            "due diligence", "exit", "private equity", "venture", "fond", "aktie",
            "obligation", "ränta", "kredit", "finansiering", "börs", "handel",
            # English
            "investment", "acquisition", "valuation", "merger", "advisory",
            "equity", "debt", "portfolio", "asset", "wealth"
        ],
        "tone": "förtroendebyggande, precision, seriositet, konfidentialitet",
        "terminology": ["exit-strategi", "värderingsmultipel", "due diligence", "closing"],
        "label": "Finans & Transaktionsrådgivning"
    },
    "saas": {
        "keywords": [
            # Swedish
            "plattform", "mjukvara", "app", "dashboard", "integration", "api",
            "moln", "prenumeration", "abonnemang", "automatisera", "workflow",
            "saas", "paas", "system", "digital", "teknologi", "verktyg",
            # English
            "software", "cloud", "subscription", "platform", "automation",
            "enterprise", "startup", "scale", "growth", "analytics"
        ],
        "tone": "teknisk men tillgänglig, resultatfokuserad, innovativ",
        "terminology": ["onboarding", "churn", "MRR", "ARR", "NPS"],
        "label": "SaaS & Teknologi"
    },
    "ecommerce": {
        "keywords": [
            # Swedish
            "köp", "handla", "varukorg", "leverans", "produkt", "pris",
            "erbjudande", "rea", "rabatt", "webshop", "butik", "sortiment",
            "beställning", "frakt", "retur", "lager", "grossist", "detaljhandel",
            # English
            "shop", "cart", "checkout", "shipping", "product", "order",
            "retail", "wholesale", "inventory"
        ],
        "tone": "direkt, konverteringsfokuserad, brådskande",
        "terminology": ["AOV", "cart abandonment", "upsell", "cross-sell"],
        "label": "E-handel & Retail"
    },
    "consulting": {
        "keywords": [
            # Swedish
            "rådgivning", "konsult", "expertis", "strategi", "transformation",
            "projekt", "uppdrag", "analys", "utredning", "implementering",
            "förändring", "ledarskap", "organisation", "process", "effektivisering",
            # English
            "consulting", "advisory", "strategy", "management", "implementation",
            "transformation", "leadership", "change"
        ],
        "tone": "auktoritär, insiktsfull, metodisk",
        "terminology": ["engagement", "scope", "deliverable", "roadmap"],
        "label": "Konsulttjänster"
    },
    "healthcare": {
        "keywords": [
            # Swedish
            "hälsa", "vård", "patient", "behandling", "klinik", "läkare",
            "sjukvård", "medicin", "diagnos", "terapi", "rehabilitering",
            "tandvård", "vårdcentral", "specialistvård", "omsorg",
            # English
            "health", "care", "patient", "treatment", "clinic", "medical",
            "therapy", "wellness"
        ],
        "tone": "trygg, professionell, empatisk, kvalitetsfokuserad",
        "terminology": ["patientresa", "vårdkvalitet", "remiss"],
        "label": "Hälsa & Sjukvård"
    },
    "realestate": {
        "keywords": [
            # Swedish
            "fastighet", "bostad", "hyra", "köpa", "sälja", "mäklare",
            "lägenhet", "villa", "tomt", "bygga", "renovera", "investera",
            "hyresrätt", "bostadsrätt", "kommersiell", "lokal",
            # English
            "property", "real estate", "housing", "rental", "mortgage"
        ],
        "tone": "lokal expertis, personlig service, marknadskännedom",
        "terminology": ["visning", "budgivning", "tillträde", "kontraktsskrivning"],
        "label": "Fastighet & Mäkleri"
    },
    "legal": {
        "keywords": [
            # Swedish
            "juridik", "advokat", "jurist", "avtal", "tvist", "rätt",
            "process", "domstol", "lag", "bolagsrätt", "arbetsrätt",
            "immaterialrätt", "skatterätt", "förhandling", "rådgivning",
            # English
            "legal", "law", "attorney", "contract", "litigation", "compliance"
        ],
        "tone": "korrekt, formell, tillförlitlig, diskret",
        "terminology": ["due diligence", "closing", "SPA", "NDA"],
        "label": "Juridik & Advokat"
    },
    "marketing": {
        "keywords": [
            # Swedish
            "marknadsföring", "reklam", "kampanj", "varumärke", "kommunikation",
            "digital", "sociala medier", "content", "seo", "annonsering",
            "strategi", "målgrupp", "konvertering", "leads", "trafik",
            # English
            "marketing", "advertising", "brand", "campaign", "social media",
            "content", "digital", "conversion", "growth"
        ],
        "tone": "kreativ, resultatdriven, trendig",
        "terminology": ["ROI", "CTR", "CPA", "funnel", "attribution"],
        "label": "Marknadsföring & Reklam"
    },
    "manufacturing": {
        "keywords": [
            # Swedish
            "tillverkning", "produktion", "fabrik", "industri", "maskin",
            "leverantör", "kvalitet", "process", "automation", "logistik",
            "materialhantering", "lean", "iso", "certifiering",
            # English
            "manufacturing", "production", "factory", "industrial", "supply chain"
        ],
        "tone": "kvalitetsfokuserad, pålitlig, teknisk kompetens",
        "terminology": ["OEM", "lead time", "batch", "certifiering"],
        "label": "Tillverkning & Industri"
    },
    "education": {
        "keywords": [
            # Swedish
            "utbildning", "kurs", "lärande", "skola", "universitet",
            "akademi", "certifiering", "kompetens", "utveckling", "träning",
            "workshop", "seminarium", "e-learning", "distans",
            # English
            "education", "learning", "training", "course", "certification"
        ],
        "tone": "pedagogisk, inspirerande, kunskapsbyggande",
        "terminology": ["curriculum", "modul", "examen", "diplom"],
        "label": "Utbildning & Lärande"
    }
}


class IndustryDetector:
    """
    Detects industry/sector from scraped web content.
    Uses metadata and content analysis to classify.
    """

    def __init__(self, scraped_data: Dict[str, Any]):
        """
        Initialize with scraped data from WebScraper.

        Args:
            scraped_data: Dictionary containing company_info, value_proposition, etc.
        """
        self.data = scraped_data

    def detect(self) -> Tuple[str, float, str]:
        """
        Detect the industry from scraped content.

        Returns:
            Tuple of (industry_key, confidence, label)
            - industry_key: Key from INDUSTRY_TAXONOMY (e.g., "finance")
            - confidence: Float 0.0-1.0 indicating detection confidence
            - label: Human-readable Swedish label (e.g., "Finans & Transaktionsrådgivning")
        """
        # Collect all text for analysis
        text_sources = self._collect_text()
        combined_text = " ".join(text_sources).lower()

        # Count keyword matches per industry
        scores = self._score_industries(combined_text)

        if not scores:
            return "general", 0.0, "Allmänt B2B"

        # Get the top scoring industry
        top_industry = max(scores, key=scores.get)
        top_score = scores[top_industry]

        # Calculate confidence based on:
        # 1. Absolute score (more matches = higher confidence)
        # 2. Relative score (how much it beats second place)
        sorted_scores = sorted(scores.values(), reverse=True)
        second_score = sorted_scores[1] if len(sorted_scores) > 1 else 0

        # Confidence formula
        absolute_confidence = min(top_score / 10, 1.0)  # Cap at 10 matches for max
        relative_confidence = (top_score - second_score) / max(top_score, 1)

        confidence = (absolute_confidence * 0.6) + (relative_confidence * 0.4)
        confidence = round(min(confidence, 1.0), 2)

        label = INDUSTRY_TAXONOMY[top_industry]["label"]

        return top_industry, confidence, label

    def _collect_text(self) -> List[str]:
        """
        Collect all relevant text from scraped data.
        """
        texts = []

        # Company info
        company_info = self.data.get("company_info", {})
        if company_info.get("company_name"):
            texts.append(company_info["company_name"])
        if company_info.get("description"):
            texts.append(company_info["description"])

        # Value proposition
        vp = self.data.get("value_proposition", {})
        if vp.get("h1"):
            texts.append(vp["h1"])
        if vp.get("hero_text"):
            texts.append(vp["hero_text"])
        if vp.get("subheadline"):
            texts.append(vp["subheadline"])

        # Lead magnets (titles often reveal industry)
        for magnet in self.data.get("lead_magnets", []):
            if magnet.get("text"):
                texts.append(magnet["text"])

        # CTA buttons
        for cta in self.data.get("cta_buttons", []):
            if cta.get("text"):
                texts.append(cta["text"])

        # Forms (submit button text)
        for form in self.data.get("forms", []):
            if form.get("submit_text"):
                texts.append(form["submit_text"])

        return texts

    def _score_industries(self, text: str) -> Dict[str, int]:
        """
        Score each industry based on keyword matches.
        """
        scores = Counter()

        for industry, data in INDUSTRY_TAXONOMY.items():
            for keyword in data["keywords"]:
                # Use word boundary matching for more accuracy
                pattern = r'\b' + re.escape(keyword.lower()) + r'\b'
                matches = len(re.findall(pattern, text))
                if matches > 0:
                    # Weight longer keywords higher (more specific)
                    weight = 1 + (len(keyword.split()) - 1) * 0.5
                    scores[industry] += matches * weight

        return dict(scores)

    def get_industry_tone(self, industry: str) -> str:
        """
        Get the recommended tone for an industry.

        Args:
            industry: Industry key (e.g., "finance")

        Returns:
            Tone description string
        """
        if industry in INDUSTRY_TAXONOMY:
            return INDUSTRY_TAXONOMY[industry]["tone"]
        return "professionell, direkt, logisk"

    def get_industry_terminology(self, industry: str) -> List[str]:
        """
        Get industry-specific terminology examples.

        Args:
            industry: Industry key

        Returns:
            List of terminology examples
        """
        if industry in INDUSTRY_TAXONOMY:
            return INDUSTRY_TAXONOMY[industry]["terminology"]
        return []

    def get_industry_label(self, industry: str) -> str:
        """
        Get human-readable Swedish label for industry.

        Args:
            industry: Industry key

        Returns:
            Swedish label string
        """
        if industry in INDUSTRY_TAXONOMY:
            return INDUSTRY_TAXONOMY[industry]["label"]
        return "Allmänt B2B"
