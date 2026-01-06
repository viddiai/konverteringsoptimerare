"""
Analysis service that scores and generates recommendations.
"""
from typing import Dict, List, Any, Tuple
from app.models.models import CRITERIA_LABELS


class ConversionAnalyzer:
    """
    Analyzes scraped data and generates scores, issues, and recommendations.
    All text output is in Swedish with a direct, no-nonsense tone.
    """

    def __init__(self, scraped_data: Dict[str, Any]):
        self.data = scraped_data

    def analyze_value_proposition(self) -> Tuple[int, str]:
        """
        Score the clarity and effectiveness of the value proposition.
        """
        vp = self.data.get("value_proposition", {})
        score = 5
        issues = []

        h1 = vp.get("h1")
        if not h1:
            score -= 3
            issues.append("Ingen H1-rubrik hittades - besökaren vet inte vad ni erbjuder")
        elif len(h1) < 10:
            score -= 1
            issues.append("H1 är för kort för att kommunicera värde")
        elif len(h1) > 80:
            score -= 1
            issues.append("H1 är för lång - budskapet drunknar")

        if not vp.get("has_hero"):
            score -= 1
            issues.append("Ingen tydlig hero-sektion identifierad")

        if not vp.get("has_subheadline"):
            score -= 1
            issues.append("Ingen underrubrik som förtydligar erbjudandet")

        score = max(1, score)
        explanation = " | ".join(issues) if issues else "Tydligt värdeerbjudande i hero-sektionen"

        return score, explanation

    def analyze_lead_magnets(self) -> Tuple[int, str]:
        """
        Score the presence and quality of lead magnets.
        """
        magnets = self.data.get("lead_magnets", [])
        ungated = self.data.get("ungated_pdfs", [])

        score = 1  # Start low, increase with good practices
        issues = []

        if not magnets:
            issues.append("Inga lead magnets hittades - ni fångar inga leads passivt")
            return 1, issues[0]

        # Count gated vs ungated
        gated = [m for m in magnets if m.get("is_gated")]
        ungated_count = len(ungated)

        if gated:
            score += 2
            if len(gated) >= 3:
                score += 1

        if ungated_count > 0:
            score -= 1
            issues.append(f"{ungated_count} PDF:er ges bort utan e-postregistrering")

        # Variety of content
        types = set(m.get("type") for m in magnets)
        if len(types) >= 3:
            score += 1

        score = max(1, min(5, score))

        if not issues:
            issues.append(f"{len(gated)} gated lead magnets identifierade")

        return score, " | ".join(issues)

    def analyze_form_design(self) -> Tuple[int, str]:
        """
        Score form design and usability.
        """
        forms = self.data.get("forms", [])
        score = 3
        issues = []

        # Filter out search forms
        lead_forms = [f for f in forms if f.get("type") != "search"]

        if not lead_forms:
            return 1, "Inga lead capture-formulär hittades - hur ska ni samla leads?"

        for form in lead_forms:
            fields = form.get("fields", [])

            # Check number of fields
            if len(fields) > 5:
                score -= 1
                issues.append("För många fält i formuläret minskar konverteringen")

            # Check for submit button text
            submit = form.get("submit_text", "").lower()
            if submit in ["submit", "skicka", "send"]:
                score -= 1
                issues.append("Generisk knapptext 'Skicka' är svag - använd handlingsorienterad text")

            # Check for email field
            if not form.get("has_email_field"):
                score -= 1
                issues.append("Formulär utan e-postfält - hur når ni leads?")

        # Bonus for newsletter forms
        newsletter_forms = [f for f in forms if f.get("type") == "newsletter"]
        if newsletter_forms:
            score += 1

        score = max(1, min(5, score))
        return score, " | ".join(issues) if issues else "Formulärdesignen ser acceptabel ut"

    def analyze_social_proof(self) -> Tuple[int, str]:
        """
        Score the presence and quality of social proof.
        """
        proof = self.data.get("social_proof", [])
        score = 1
        issues = []

        if not proof:
            return 1, "Ingen social proof hittad - varför skulle någon lita på er?"

        # Count types of social proof
        types_found = set(p.get("type") for p in proof)

        if "testimonial" in types_found or "quote" in types_found:
            score += 2
        else:
            issues.append("Inga kundcitat eller testimonials")

        if "client_logos" in types_found:
            score += 1
        else:
            issues.append("Inga kundlogotyper synliga")

        if "ratings" in types_found:
            score += 1

        score = max(1, min(5, score))
        return score, " | ".join(issues) if issues else f"{len(proof)} element av social proof identifierade"

    def analyze_cta(self) -> Tuple[int, str]:
        """
        Score Call-to-Action buttons and their effectiveness.
        """
        ctas = self.data.get("cta_buttons", [])
        score = 3
        issues = []

        if not ctas:
            return 1, "Inga tydliga CTA-knappar hittades - hur ska besökare agera?"

        # Check for variety of CTAs
        if len(ctas) < 2:
            score -= 1
            issues.append("För få CTA:er på sidan")

        # Check for weak CTA text
        weak_texts = ["läs mer", "read more", "mer info", "klicka här", "click here"]
        for cta in ctas:
            if cta.get("text", "").lower() in weak_texts:
                score -= 1
                issues.append(f"Svag CTA-text: '{cta.get('text')}'")
                break

        # Bonus for strong action-oriented CTAs
        strong_patterns = ["gratis", "free", "starta", "start", "prova", "try", "boka", "book"]
        has_strong = any(
            any(p in cta.get("text", "").lower() for p in strong_patterns)
            for cta in ctas
        )
        if has_strong:
            score += 1

        score = max(1, min(5, score))
        return score, " | ".join(issues) if issues else f"{len(ctas)} CTA:er identifierade"

    def analyze_guiding_content(self) -> Tuple[int, str]:
        """
        Score how well the page guides visitors toward conversion.
        """
        score = 3
        issues = []

        # Check for mailto links (bad practice)
        mailto = self.data.get("mailto_links", [])
        if mailto:
            score -= 1
            issues.append(f"{len(mailto)} mailto-länkar exponerar er e-post direkt")

        # Check for ungated PDFs
        ungated = self.data.get("ungated_pdfs", [])
        if ungated:
            score -= 1
            issues.append(f"{len(ungated)} PDF:er ges bort utan lead capture")

        # Check form placement (forms should exist)
        forms = self.data.get("forms", [])
        lead_forms = [f for f in forms if f.get("type") != "search"]
        if not lead_forms:
            score -= 1
            issues.append("Ingen tydlig väg till konvertering via formulär")

        # Check for multiple CTAs guiding the journey
        ctas = self.data.get("cta_buttons", [])
        if len(ctas) >= 3:
            score += 1

        score = max(1, min(5, score))
        return score, " | ".join(issues) if issues else "Sidan vägleder besökare mot konvertering"

    def generate_analysis(self) -> Dict[str, Any]:
        """
        Generate complete analysis with all scores and explanations.
        """
        criteria_analysis = []

        # Analyze each criterion
        analysis_methods = [
            ("value_proposition", self.analyze_value_proposition),
            ("lead_magnets", self.analyze_lead_magnets),
            ("form_design", self.analyze_form_design),
            ("social_proof", self.analyze_social_proof),
            ("call_to_action", self.analyze_cta),
            ("guiding_content", self.analyze_guiding_content),
        ]

        for criterion, method in analysis_methods:
            score, explanation = method()
            criteria_analysis.append({
                "criterion": criterion,
                "criterion_label": CRITERIA_LABELS.get(criterion, criterion),
                "score": score,
                "explanation": explanation,
            })

        # Calculate overall score
        total_score = sum(c["score"] for c in criteria_analysis)
        overall_score = round(total_score / len(criteria_analysis), 1)

        # Count issues
        issues_found = self._count_issues()

        # Generate logical errors (for short summary)
        logical_errors = self._generate_logical_errors()

        return {
            "criteria_analysis": criteria_analysis,
            "overall_score": overall_score,
            "issues_found": issues_found,
            "logical_errors": logical_errors,
        }

    def _count_issues(self) -> int:
        """Count total number of issues found."""
        count = 0
        count += len(self.data.get("mailto_links", []))
        count += len(self.data.get("ungated_pdfs", []))

        forms = self.data.get("forms", [])
        lead_forms = [f for f in forms if f.get("type") != "search"]
        if not lead_forms:
            count += 1

        if not self.data.get("lead_magnets"):
            count += 1

        if not self.data.get("social_proof"):
            count += 1

        if not self.data.get("cta_buttons"):
            count += 1

        vp = self.data.get("value_proposition", {})
        if not vp.get("h1"):
            count += 1

        return count

    def _generate_logical_errors(self) -> List[str]:
        """Generate list of logical errors for short summary."""
        errors = []

        mailto = self.data.get("mailto_links", [])
        if mailto:
            errors.append(f"Ni har {len(mailto)} mailto-länkar som läcker leads till era konkurrenter")

        ungated = self.data.get("ungated_pdfs", [])
        if ungated:
            errors.append(f"{len(ungated)} värdefulla PDF-resurser ges bort utan att fånga e-postadresser")

        if not self.data.get("lead_magnets"):
            errors.append("Inga lead magnets identifierade - ni missar alla passiva leads")

        if not self.data.get("social_proof"):
            errors.append("Ingen synlig social proof - besökare har ingen anledning att lita på er")

        forms = self.data.get("forms", [])
        lead_forms = [f for f in forms if f.get("type") != "search"]
        if not lead_forms:
            errors.append("Inga lead capture-formulär - hur tänker ni konvertera trafik?")

        vp = self.data.get("value_proposition", {})
        if not vp.get("h1"):
            errors.append("Ingen H1-rubrik - besökare vet inte vad ni erbjuder inom 3 sekunder")

        return errors[:5]  # Max 5 errors for summary

    def generate_summary_assessment(self) -> str:
        """
        Generate 8 lines of 'obarmhärtig analys' (ruthless analysis).
        """
        lines = []
        company = self.data.get("company_info", {}).get("company_name", "Ert företag")

        mailto = self.data.get("mailto_links", [])
        ungated = self.data.get("ungated_pdfs", [])
        forms = self.data.get("forms", [])
        lead_forms = [f for f in forms if f.get("type") != "search"]
        social = self.data.get("social_proof", [])
        magnets = self.data.get("lead_magnets", [])

        # Line 1: Overall assessment
        issues = self._count_issues()
        if issues > 5:
            lines.append(f"{company} har allvarliga brister i sin lead generation-strategi.")
        elif issues > 2:
            lines.append(f"{company} har flera tydliga förbättringsområden i sin konverteringstratt.")
        else:
            lines.append(f"{company} har en grundläggande struktur på plats men missar viktiga möjligheter.")

        # Line 2: mailto links
        if mailto:
            lines.append(f"Att exponera {len(mailto)} e-postadresser via mailto-länkar är amatörmässigt - ni ger bort leads gratis.")
        else:
            lines.append("Bra att ni undviker direkta mailto-länkar, men det räcker inte.")

        # Line 3: Lead magnets
        if not magnets:
            lines.append("Utan lead magnets förlitar ni er helt på att besökare aktivt kontaktar er - det gör de inte.")
        elif ungated:
            lines.append(f"Att ge bort {len(ungated)} PDF-resurser utan att fånga e-post är att kasta pengar i sjön.")

        # Line 4: Forms
        if not lead_forms:
            lines.append("Avsaknaden av konverteringsformulär betyder att er webbplats är en digital broschyr, inte ett säljverktyg.")
        else:
            lines.append(f"Med {len(lead_forms)} formulär har ni åtminstone grunderna på plats.")

        # Line 5: Social proof
        if not social:
            lines.append("Ingen social proof syns - varje besökare måste lita blint på er, och det gör de inte.")
        else:
            lines.append("Social proof finns men kan troligen stärkas med fler kundcase och resultat.")

        # Line 6: The reality
        lines.append("Varje dag er webbsida ser ut så här förlorar ni potentiella kunder till konkurrenter som förstår lead generation.")

        # Line 7: The cost
        lines.append("Kostnaden för dessa brister är inte synlig i er budget, men den är verklig i förlorade affärer.")

        # Line 8: The path forward
        lines.append("Fixarna nedan är konkreta och mätbara - frågan är om ni prioriterar tillväxt eller status quo.")

        return "\n\n".join(lines)

    def generate_recommendations(self) -> List[str]:
        """
        Generate 5 concrete, actionable recommendations.
        """
        recommendations = []

        mailto = self.data.get("mailto_links", [])
        ungated = self.data.get("ungated_pdfs", [])
        forms = self.data.get("forms", [])
        lead_forms = [f for f in forms if f.get("type") != "search"]
        magnets = self.data.get("lead_magnets", [])
        social = self.data.get("social_proof", [])
        ctas = self.data.get("cta_buttons", [])
        vp = self.data.get("value_proposition", {})

        # Priority 1: Fix leaks
        if mailto:
            recommendations.append(
                f"Ersätt alla {len(mailto)} mailto-länkar med kontaktformulär. "
                "Varje mailto är en lead som försvinner ospårad."
            )

        if ungated:
            recommendations.append(
                f"Gate era {len(ungated)} öppna PDF:er bakom enkla formulär. "
                "Begär endast e-post - minimera friktionen men fånga leadet."
            )

        # Priority 2: Add what's missing
        if not magnets:
            recommendations.append(
                "Skapa en lead magnet inom 2 veckor. "
                "En enkel checklista eller guide som löser ett konkret problem för er målgrupp."
            )

        if not lead_forms:
            recommendations.append(
                "Lägg till ett lead capture-formulär above the fold. "
                "Erbjud något värdefullt i utbyte mot e-postadress."
            )

        if not social:
            recommendations.append(
                "Samla 3-5 kundcitat med namn och foto. "
                "Placera dem strategiskt nära era CTA:er."
            )

        # Priority 3: Optimize existing
        if not vp.get("h1"):
            recommendations.append(
                "Skriv en H1-rubrik som tydligt kommunicerar ert värdeerbjudande. "
                "Besökare bestämmer inom 3 sekunder om de stannar."
            )

        if len(ctas) < 3:
            recommendations.append(
                "Lägg till fler CTA:er genom hela sidan. "
                "Varje scrolldjup ska ha en tydlig handlingsuppmaning."
            )

        # Generic strong recommendations if we haven't filled 5
        generic = [
            "Implementera exit-intent popups för att fånga besökare som är på väg att lämna.",
            "A/B-testa era formulär - även små ändringar i knapptext kan öka konverteringen 20-30%.",
            "Installera heatmap-verktyg för att se var besökare faktiskt klickar och scrollar.",
            "Skapa en dedikerad landningssida för varje trafikskälla ni använder.",
            "Bygg en e-postsekvens som automatiskt nurturar leads som laddar ner ert material.",
        ]

        while len(recommendations) < 5 and generic:
            recommendations.append(generic.pop(0))

        return recommendations[:5]
