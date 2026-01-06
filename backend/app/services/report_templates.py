"""
Static report templates for fallback when AI is unavailable.
Also provides structure and prompts for AI generation.
"""
from typing import Dict, List, Any


class ReportTemplates:
    """
    Provides templates and fallback content for report generation.
    All text is in Swedish with a direct, provocative tone.
    """

    # ==================== PROMPTS FOR AI ====================

    @staticmethod
    def get_short_description_prompt(
        company_name: str,
        company_description: str,
        industry: str,
        industry_tone: str,
        main_issues: List[str]
    ) -> str:
        """
        Build prompt for AI to generate short description (3 sentences).
        """
        issues_text = "\n".join(f"- {issue}" for issue in main_issues[:5])

        return f"""Du är en obarmhärtig konverteringsexpert som analyserar webbsidor.
Skriv EXAKT 3 meningar på svenska om företaget {company_name}.

Bransch: {industry}
Företagsbeskrivning: {company_description or 'Ingen beskrivning tillgänglig'}
Huvudproblem vi identifierat:
{issues_text}

MENING 1: Beskriv vad företaget gör idag (kritiskt perspektiv - vad de ÄR)
MENING 2: Beskriv vad de BORDE göra istället (vad de saknar)
MENING 3: Konsekvensen av detta gap (affärspåverkan)

TON: {industry_tone}

EXEMPEL PÅ STIL:
"Skarpa är en transaktionsrådgivare som agerar som en passiv informationsbroschyr snarare än en hungrig affärsgenerator. Webbplatsen presenterar vad företaget gör men misslyckas kapitalt med att aktivt bearbeta besökaren eller skapa ett psykologiskt behov av omedelbar kontakt. Det är en klassisk 'vi finns här'-sida utan säljtryck."

VIKTIGT:
- Använd "ni/er" istället för "de/dem" när du hänvisar till företaget
- Var direkt och provocerande men professionell
- Fokusera på AFFÄRSKONSEKVENSER
- Max 3 meningar, inga fler"""

    @staticmethod
    def get_summary_assessment_prompt(
        company_name: str,
        industry: str,
        industry_tone: str,
        overall_score: float,
        issues: List[str],
        mailto_count: int,
        ungated_pdf_count: int,
        has_lead_magnets: bool,
        has_forms: bool,
        has_social_proof: bool
    ) -> str:
        """
        Build prompt for AI to generate summary assessment (8 paragraphs).
        """
        issues_text = "\n".join(f"- {issue}" for issue in issues)

        return f"""Du är en senior konverteringsexpert. Skriv EXAKT 8 stycken "obarmhärtig analys" på svenska för {company_name}.

ANALYSDATA:
- Bransch: {industry}
- Övergripande betyg: {overall_score}/5
- Antal mailto-länkar: {mailto_count}
- Antal öppna PDF:er: {ungated_pdf_count}
- Har lead magnets: {"Ja" if has_lead_magnets else "Nej"}
- Har konverteringsformulär: {"Ja" if has_forms else "Nej"}
- Har social proof: {"Ja" if has_social_proof else "Nej"}

Identifierade problem:
{issues_text}

VARJE STYCKE SKA:
1. Vara 2-3 meningar
2. Vara provocerande men professionellt
3. Fokusera på AFFÄRSKONSEKVENSER
4. Använda "ni/er" (inte "de/dem")

DE 8 STYCKENA (skriv i denna ordning):
1. ÖVERGRIPANDE OMDÖME - Hur allvarligt är läget?
2. STÖRSTA LÄCKAN - Det mest kritiska problemet
3. KOSTNAD FÖR FELEN - Vad detta kostar i förlorade affärer
4. KONKURRENSSITUATION - Hur ni står mot konkurrenter
5. BESÖKARPSYKOLOGI - Varför besökare inte konverterar
6. FÖRTROENDEUNDERSKOTT - Vad som saknas för att bygga tillit
7. BRÅDSKANDE HANDLINGSBEHOV - Varför ni måste agera nu
8. VÄG FRAMÅT - Kort om vad som krävs

TON: {industry_tone}

VIKTIGT: Skriv varje stycke på en ny rad. Inga numreringar eller rubriker."""

    @staticmethod
    def get_detailed_analysis_prompt(
        category: str,
        items: List[Dict],
        issues: List[str],
        industry: str,
        industry_tone: str
    ) -> str:
        """
        Build prompt for detailed analysis of a specific category.
        """
        items_text = "\n".join(
            f"- {item.get('text', item.get('type', 'Okänd'))}"
            for item in items[:10]
        )

        issues_text = "\n".join(f"- {issue}" for issue in issues)

        category_labels = {
            "lead_magnets": "Lead Magnets",
            "forms": "Formulär",
            "cta_buttons": "CTA-knappar",
            "social_proof": "Social Proof",
            "mailto_links": "Mailto-länkar (Läckande tratt)",
            "ungated_pdfs": "Öppna PDF:er (Läckande tratt)"
        }

        return f"""Analysera kategorin "{category_labels.get(category, category)}" för en webbsida.

Hittade element:
{items_text if items else "Inga element hittade"}

Problem i denna kategori:
{issues_text if issues else "Inga specifika problem"}

Skriv 2-4 meningar som:
1. Sammanfattar vad som finns (eller saknas)
2. Förklarar varför detta är ett problem
3. Kvantifierar påverkan om möjligt

TON: {industry_tone}
SPRÅK: Svenska
PERSPEKTIV: Använd "ni/er\""""

    @staticmethod
    def get_logical_verdict_prompt(
        company_name: str,
        main_issues: List[str],
        mailto_count: int,
        ungated_pdf_count: int,
        missing_elements: List[str]
    ) -> str:
        """
        Build prompt for logical verdict section.
        """
        issues_text = "\n".join(f"- {issue}" for issue in main_issues)
        missing_text = "\n".join(f"- {elem}" for elem in missing_elements)

        return f"""Skriv en "LOGISK DOM" för {company_name} på svenska.

FAKTA:
- {mailto_count} mailto-länkar (varje = läckande tratt)
- {ungated_pdf_count} öppna PDF:er utan gate
- Saknas: {missing_text}

Problem:
{issues_text}

Skriv 3-4 meningar som:
1. Sammanfattar "leaky funnel"-syndromet
2. Förklarar affärskonsekvensen logiskt
3. Använder termen "logisk kortslutning" om lämpligt

TON: Direkt, logisk, obarmhärtig
SPRÅK: Svenska
PERSPEKTIV: Använd "ni/er\""""

    @staticmethod
    def get_final_hook_prompt(company_name: str, issues_count: int) -> str:
        """
        Build prompt for final hook/teaser.
        """
        return f"""Skriv en "teaser" för fullständig rapport för {company_name}.

Vi har identifierat {issues_count} specifika problem.

Skriv 2 meningar som:
1. Nämner att detta bara är en ytlig analys
2. Nämner antal problem som hindrar marknadsdominans
3. Uppmanar till att beställa fullständig rapport

EXEMPEL:
"Detta är inte en djupgående analys, men vi har trots det identifierat {issues_count} specifika logiska fel som hindrar er från att dominera er marknad. För att få den kompletta åtgärdsplanen och tekniska specifikationer, beställ den fullständiga rapporten."

SPRÅK: Svenska
TON: Säljande men inte desperat"""

    # ==================== FALLBACK TEMPLATES ====================

    @staticmethod
    def get_fallback_short_description(
        company_name: str,
        company_description: str,
        industry_label: str,
        has_lead_magnets: bool,
        has_forms: bool
    ) -> str:
        """
        Generate short description without AI.
        """
        company = company_name or "Företaget"

        if not has_lead_magnets and not has_forms:
            return (
                f"{company} verkar inom {industry_label} men agerar som en digital "
                f"broschyr snarare än en lead-genererande maskin. Webbplatsen "
                f"saknar helt mekanismer för att fånga besökares kontaktuppgifter "
                f"eller bygga en pipeline. Varje besökare som lämnar utan att "
                f"konvertera är en förlorad affärsmöjlighet."
            )
        elif not has_lead_magnets:
            return (
                f"{company} har grundläggande kontaktvägar men saknar lead magnets "
                f"som fångar besökare tidigt i köpresan. Ni förlitar er helt på att "
                f"besökaren aktivt tar kontakt - vilket 95% inte gör. Er webbsida "
                f"arbetar inte för er när ni sover."
            )
        else:
            return (
                f"{company} har strukturen på plats men utnyttjar inte sin potential "
                f"fullt ut. Det finns element för lead generation men de saknar den "
                f"strategiska sammankoppling som maximerar konvertering. Små "
                f"justeringar kan ge stora resultat."
            )

    @staticmethod
    def get_fallback_summary_assessment(
        company_name: str,
        overall_score: float,
        issues_count: int,
        mailto_count: int,
        ungated_pdf_count: int,
        has_lead_magnets: bool,
        has_forms: bool,
        has_social_proof: bool
    ) -> str:
        """
        Generate 8-paragraph summary without AI.
        """
        company = company_name or "Ert företag"
        paragraphs = []

        # 1. Overall verdict
        if overall_score < 2.0:
            paragraphs.append(
                f"{company} har allvarliga brister i sin lead generation-strategi. "
                f"Med {overall_score}/5 i betyg ligger ni långt under vad som krävs "
                f"för att konkurrera effektivt online."
            )
        elif overall_score < 3.5:
            paragraphs.append(
                f"{company} har flera tydliga förbättringsområden i sin konverteringstratt. "
                f"Betyget {overall_score}/5 indikerar att grunderna finns men att ni "
                f"läcker leads på vägen."
            )
        else:
            paragraphs.append(
                f"{company} har en grundläggande struktur på plats med {overall_score}/5 i betyg. "
                f"Men 'grundläggande' räcker inte i en konkurrensutsatt marknad - "
                f"ni missar fortfarande betydande möjligheter."
            )

        # 2. Biggest leak
        if mailto_count > 0:
            paragraphs.append(
                f"Er största läcka är de {mailto_count} mailto-länkarna som exponerar "
                f"er e-postadress direkt. Varje klick på dessa är en lead ni aldrig "
                f"kan spåra, nurtura eller följa upp systematiskt."
            )
        elif ungated_pdf_count > 0:
            paragraphs.append(
                f"Ni ger bort {ungated_pdf_count} värdefulla PDF-resurser utan att "
                f"begära något i utbyte. Det är som att ha en butik utan kassa - "
                f"folk tar varorna och går."
            )
        elif not has_lead_magnets:
            paragraphs.append(
                f"Er största brist är avsaknaden av lead magnets. Utan något värdefullt "
                f"att erbjuda i utbyte mot e-post har besökare ingen anledning att "
                f"identifiera sig innan de är köpredo."
            )
        else:
            paragraphs.append(
                f"Er konverteringstratt har flera små läckor som tillsammans skapar "
                f"betydande förluster. Ingen enskild katastrof, men summan av bristerna "
                f"kostar er leads varje dag."
            )

        # 3. Cost of issues
        paragraphs.append(
            f"Kostnaden för dessa {issues_count} identifierade problem är inte synlig "
            f"i er budget, men den är verklig i förlorade affärer. Varje månad som "
            f"går utan åtgärd multiplicerar förlusten."
        )

        # 4. Competitive situation
        paragraphs.append(
            f"Era konkurrenter som har optimerade konverteringsflöden fångar de leads "
            f"ni missar. I en digital värld där besökaren jämför på sekunder är "
            f"er nuvarande setup en konkurrensnackdel."
        )

        # 5. Visitor psychology
        if not has_forms:
            paragraphs.append(
                f"Besökare som landar på er sida har inget tydligt sätt att ta nästa steg. "
                f"Utan formulär eller bokningsvägar studsar de vidare till någon som "
                f"gör det enkelt att agera."
            )
        else:
            paragraphs.append(
                f"Besökaren fattar beslut om att stanna eller gå inom 3 sekunder. "
                f"Er nuvarande uppläggning ger inte tillräckligt starka signaler för "
                f"att fånga deras uppmärksamhet och leda dem vidare."
            )

        # 6. Trust deficit
        if not has_social_proof:
            paragraphs.append(
                f"Ingen synlig social proof betyder att besökare måste lita blint på "
                f"era påståenden. Det gör de inte. Utan kundcitat, logotyper eller "
                f"resultat har ni ett förtroendeunderskott."
            )
        else:
            paragraphs.append(
                f"Ni har social proof men den utnyttjas inte strategiskt nära era "
                f"konverteringspunkter. Bevis på resultat måste synas när besökaren "
                f"överväger att agera - inte begravd på en undersida."
            )

        # 7. Urgency
        paragraphs.append(
            f"Varje dag er webbsida ser ut så här förlorar ni potentiella kunder till "
            f"konkurrenter som förstår digital lead generation. Fördröjning är inte "
            f"neutralt - det är en aktiv kostnad."
        )

        # 8. Path forward
        paragraphs.append(
            f"Fixarna som krävs är konkreta och mätbara. Frågan är inte om ni har råd "
            f"att investera i förbättringar - frågan är om ni har råd att låta bli "
            f"och fortsätta läcka leads till konkurrenterna."
        )

        return "\n\n".join(paragraphs)

    @staticmethod
    def get_fallback_detailed_analysis(
        category: str,
        items: List[Dict],
        industry_label: str
    ) -> str:
        """
        Generate detailed category analysis without AI.
        """
        count = len(items)

        templates = {
            "lead_magnets": {
                "found": (
                    f"Vi identifierade {count} potentiella lead magnets på sidan. "
                    f"{'Majoriteten är dock inte strategiskt placerade eller saknar tydlig gate.' if count > 0 else ''}"
                ),
                "missing": (
                    f"Inga lead magnets identifierade. Detta är en fundamental brist för "
                    f"företag inom {industry_label}. Utan värdefullt innehåll att erbjuda "
                    f"har besökare ingen anledning att lämna sina kontaktuppgifter."
                )
            },
            "forms": {
                "found": (
                    f"{count} formulär hittades. "
                    f"{'Dock saknas ofta tydlig value proposition vid formuläret.' if count > 0 else ''}"
                ),
                "missing": (
                    f"Inga konverteringsformulär hittades. Detta betyder att besökare "
                    f"inte har något enkelt sätt att ta kontakt eller visa intresse. "
                    f"En fundamental brist i konverteringskedjan."
                )
            },
            "social_proof": {
                "found": (
                    f"{count} element av social proof identifierades. "
                    f"Dock bör dessa placeras strategiskt nära era CTA:er för maximal effekt."
                ),
                "missing": (
                    f"Ingen tydlig social proof hittades. Kundcitat, logotyper, och "
                    f"resultatbevis är avgörande för att bygga förtroende hos nya besökare."
                )
            },
            "mailto_links": {
                "found": (
                    f"{count} mailto-länkar exponerar era e-postadresser direkt. "
                    f"Varje klick på dessa är en lead ni tappar spårning av. "
                    f"Ni får ett mail, men ingen möjlighet till systematisk uppföljning."
                ),
                "missing": ""
            },
            "ungated_pdfs": {
                "found": (
                    f"{count} PDF-resurser ges bort utan att fånga leadinformation. "
                    f"Dessa representerar värde som ni producerat men inte kapitaliserar på. "
                    f"En enkel gate skulle fånga dessa intressenter."
                ),
                "missing": ""
            }
        }

        category_template = templates.get(category, {
            "found": f"{count} element hittades i denna kategori.",
            "missing": "Inga element hittades."
        })

        if count > 0:
            return category_template["found"]
        return category_template["missing"]

    @staticmethod
    def get_fallback_logical_verdict(
        mailto_count: int,
        ungated_pdf_count: int,
        missing_elements: List[str]
    ) -> str:
        """
        Generate logical verdict without AI.
        """
        issues = []

        if mailto_count > 0:
            issues.append(
                f"genom att använda {mailto_count} mailto-länkar tappar ni all "
                f"spårbarhet och kontroll över konverteringen"
            )

        if ungated_pdf_count > 0:
            issues.append(
                f"att ge bort {ungated_pdf_count} PDF-resurser utan gate innebär "
                f"att ni kastar bort 95% av trafiken som är i research-fasen"
            )

        if "lead_magnets" in missing_elements:
            issues.append(
                f"utan gated content förlitar ni er helt på att besökare aktivt "
                f"tar kontakt - vilket majoriteten inte gör"
            )

        issues_text = "; ".join(issues) if issues else "flera grundläggande brister"

        return (
            f"Webbplatsen lider av ett massivt 'leaky funnel'-syndrom. {issues_text.capitalize()}. "
            f"Det är en logisk kortslutning i en marknad där förtroende och expertis "
            f"är valutan - ni ger bort värde utan att få något tillbaka."
        )

    @staticmethod
    def get_fallback_final_hook(issues_count: int) -> str:
        """
        Generate final hook/teaser without AI.
        """
        return (
            f"Detta är inte en djupgående analys, men vi har trots det identifierat "
            f"{issues_count} specifika logiska fel som hindrar er från att dominera "
            f"er marknad. För att få den kompletta åtgärdsplanen och tekniska "
            f"specifikationer, beställ den fullständiga rapporten."
        )
