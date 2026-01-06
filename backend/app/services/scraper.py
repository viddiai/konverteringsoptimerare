"""
Web scraping service for fetching and parsing web pages.
"""
import re
import asyncio
from typing import Dict, List, Any, Optional
from urllib.parse import urljoin, urlparse
import httpx
from bs4 import BeautifulSoup, Tag
from app.core.config import settings


class WebScraper:
    """
    Scrapes web pages and extracts conversion-relevant elements.
    """

    def __init__(self, timeout: int = None):
        self.timeout = timeout or settings.SCRAPE_TIMEOUT
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "sv-SE,sv;q=0.9,en;q=0.8",
        }

    async def fetch_page(self, url: str) -> Dict[str, Any]:
        """
        Fetch page HTML and parse it.
        Returns dict with html, soup, and metadata.
        """
        async with httpx.AsyncClient(
            timeout=self.timeout,
            follow_redirects=True,
            verify=False,  # Some sites have SSL issues
        ) as client:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()

            # Check content size
            content_length = len(response.content)
            if content_length > settings.MAX_PAGE_SIZE:
                raise ValueError(f"Page too large: {content_length} bytes")

            html = response.text
            soup = BeautifulSoup(html, "html.parser")

            return {
                "html": html,
                "soup": soup,
                "url": str(response.url),
                "status_code": response.status_code,
                "content_type": response.headers.get("content-type", ""),
            }

    def extract_company_info(self, soup: BeautifulSoup, url: str) -> Dict[str, Any]:
        """
        Extract company name and description from the page.
        """
        # Try to find company name from various sources
        company_name = None

        # 1. Check Open Graph tags
        og_site_name = soup.find("meta", property="og:site_name")
        if og_site_name:
            company_name = og_site_name.get("content")

        # 2. Check title tag
        if not company_name:
            title_tag = soup.find("title")
            if title_tag:
                title = title_tag.get_text(strip=True)
                # Often format: "Page Title | Company Name" or "Company Name - Page Title"
                for sep in ["|", "-", "–", "—", ":"]:
                    if sep in title:
                        parts = title.split(sep)
                        # Company name is usually the shorter part
                        company_name = min(parts, key=len).strip()
                        break
                if not company_name:
                    company_name = title[:50]

        # 3. Fallback to domain name
        if not company_name:
            parsed = urlparse(url)
            company_name = parsed.netloc.replace("www.", "").split(".")[0].title()

        # Extract description
        description = None

        # 1. Meta description
        meta_desc = soup.find("meta", attrs={"name": "description"})
        if meta_desc:
            description = meta_desc.get("content")

        # 2. Open Graph description
        if not description:
            og_desc = soup.find("meta", property="og:description")
            if og_desc:
                description = og_desc.get("content")

        # 3. First paragraph in main content
        if not description:
            main = soup.find("main") or soup.find("article") or soup.find("body")
            if main:
                first_p = main.find("p")
                if first_p:
                    description = first_p.get_text(strip=True)[:300]

        return {
            "company_name": company_name,
            "description": description,
        }

    def extract_lead_magnets(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """
        Find downloadable resources: guides, whitepapers, ebooks, etc.
        """
        lead_magnets = []

        # Keywords that indicate lead magnets
        keywords = [
            "ladda ner", "download", "gratis", "free", "guide",
            "whitepaper", "e-bok", "ebook", "checklista", "checklist",
            "mall", "template", "rapport", "report", "pdf"
        ]

        # Look for links with these keywords
        for link in soup.find_all("a", href=True):
            text = link.get_text(strip=True).lower()
            href = link.get("href", "").lower()

            is_lead_magnet = False
            magnet_type = "unknown"

            # Check link text
            for keyword in keywords:
                if keyword in text:
                    is_lead_magnet = True
                    magnet_type = keyword
                    break

            # Check if it's a PDF link
            if ".pdf" in href:
                is_lead_magnet = True
                magnet_type = "pdf"

            if is_lead_magnet:
                full_url = urljoin(base_url, link.get("href"))
                lead_magnets.append({
                    "text": link.get_text(strip=True),
                    "url": full_url,
                    "type": magnet_type,
                    "is_gated": self._is_gated(link),
                })

        return lead_magnets

    def _is_gated(self, element: Tag) -> bool:
        """
        Check if a link/element is behind a form (gated content).
        """
        # Check if there's a nearby form
        parent = element.parent
        for _ in range(5):  # Check up to 5 levels up
            if parent is None:
                break
            if parent.find("form"):
                return True
            # Check for common modal/popup classes
            classes = parent.get("class", [])
            if any(c in str(classes).lower() for c in ["modal", "popup", "gate", "form"]):
                return True
            parent = parent.parent
        return False

    def extract_forms(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """
        Extract all forms on the page with analysis.
        """
        forms = []

        for form in soup.find_all("form"):
            form_data = {
                "id": form.get("id"),
                "action": form.get("action", ""),
                "method": form.get("method", "get"),
                "fields": [],
                "has_email_field": False,
                "has_name_field": False,
                "has_phone_field": False,
                "submit_text": "",
                "type": "unknown",
            }

            # Analyze form fields
            for inp in form.find_all(["input", "textarea", "select"]):
                inp_type = inp.get("type", "text")
                inp_name = inp.get("name", "").lower()
                inp_placeholder = inp.get("placeholder", "").lower()

                if inp_type == "hidden":
                    continue

                field_info = {
                    "type": inp_type,
                    "name": inp.get("name"),
                    "placeholder": inp.get("placeholder"),
                    "required": inp.has_attr("required"),
                }
                form_data["fields"].append(field_info)

                # Check field types
                if inp_type == "email" or "email" in inp_name or "email" in inp_placeholder:
                    form_data["has_email_field"] = True
                if "name" in inp_name or "namn" in inp_name:
                    form_data["has_name_field"] = True
                if "phone" in inp_name or "telefon" in inp_name or "tel" in inp_name:
                    form_data["has_phone_field"] = True

            # Find submit button text
            submit_btn = form.find("button", type="submit") or form.find("input", type="submit")
            if submit_btn:
                if submit_btn.name == "button":
                    form_data["submit_text"] = submit_btn.get_text(strip=True)
                else:
                    form_data["submit_text"] = submit_btn.get("value", "Submit")

            # Classify form type
            if form_data["has_email_field"] and not form_data["has_phone_field"]:
                form_data["type"] = "newsletter"
            elif form_data["has_email_field"] and form_data["has_name_field"]:
                if len(form_data["fields"]) > 4:
                    form_data["type"] = "contact"
                else:
                    form_data["type"] = "lead_capture"
            elif "search" in str(form.get("class", [])).lower() or "search" in str(form.get("id", "")).lower():
                form_data["type"] = "search"

            forms.append(form_data)

        return forms

    def extract_cta_buttons(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """
        Find Call-to-Action buttons and links.
        """
        ctas = []

        # CTA keywords in Swedish and English
        cta_keywords = [
            "köp", "buy", "beställ", "order", "boka", "book",
            "prova", "try", "starta", "start", "börja", "begin",
            "kontakta", "contact", "få", "get", "hämta", "fetch",
            "registrera", "register", "sign up", "anmäl", "subscribe",
            "demo", "offert", "quote", "gratis", "free"
        ]

        # Find buttons and prominent links
        for elem in soup.find_all(["button", "a"]):
            text = elem.get_text(strip=True).lower()
            classes = " ".join(elem.get("class", [])).lower()

            is_cta = False

            # Check text for CTA keywords
            for keyword in cta_keywords:
                if keyword in text:
                    is_cta = True
                    break

            # Check for button-like classes
            if not is_cta and any(c in classes for c in ["btn", "button", "cta"]):
                is_cta = True

            if is_cta and len(text) < 50:  # Ignore very long text
                # Try to get color from inline styles
                style = elem.get("style", "")
                color = None
                if "background" in style:
                    # Simple extraction, not perfect
                    color = style.split("background")[1][:20]

                ctas.append({
                    "text": elem.get_text(strip=True),
                    "tag": elem.name,
                    "href": elem.get("href") if elem.name == "a" else None,
                    "classes": elem.get("class", []),
                    "color_hint": color,
                })

        return ctas

    def extract_social_proof(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """
        Find testimonials, reviews, client logos, and trust badges.
        """
        social_proof = []

        # Look for testimonials
        testimonial_keywords = ["testimonial", "review", "omdöme", "recension", "citat", "quote"]
        for elem in soup.find_all(["div", "section", "article", "blockquote"]):
            classes = " ".join(elem.get("class", [])).lower()
            elem_id = (elem.get("id") or "").lower()

            if any(k in classes or k in elem_id for k in testimonial_keywords):
                social_proof.append({
                    "type": "testimonial",
                    "content": elem.get_text(strip=True)[:200],
                })

        # Look for blockquotes (often testimonials)
        for quote in soup.find_all("blockquote"):
            social_proof.append({
                "type": "quote",
                "content": quote.get_text(strip=True)[:200],
            })

        # Look for client logos
        logo_keywords = ["logo", "kund", "client", "partner", "trust", "featured"]
        for elem in soup.find_all(["div", "section"]):
            classes = " ".join(elem.get("class", [])).lower()
            if any(k in classes for k in logo_keywords):
                images = elem.find_all("img")
                if len(images) >= 3:  # Multiple logos suggest client list
                    social_proof.append({
                        "type": "client_logos",
                        "count": len(images),
                    })
                    break

        # Look for rating/review numbers
        rating_pattern = re.compile(r"(\d[,.]?\d?)\s*(/\s*5|av\s*5|stjärnor|stars)")
        text = soup.get_text()
        ratings = rating_pattern.findall(text)
        if ratings:
            social_proof.append({
                "type": "ratings",
                "found": len(ratings),
            })

        return social_proof

    def extract_mailto_links(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """
        Find mailto: links - these represent "läckande tratt" (leaking funnel).
        """
        mailto_links = []

        for link in soup.find_all("a", href=True):
            href = link.get("href", "")
            if href.startswith("mailto:"):
                email = href.replace("mailto:", "").split("?")[0]
                context = ""

                # Get surrounding context
                parent = link.parent
                if parent:
                    context = parent.get_text(strip=True)[:100]

                mailto_links.append({
                    "email": email,
                    "text": link.get_text(strip=True),
                    "context": context,
                    "issue": "Direkt e-postlänk exponerar er adress och gör det omöjligt att spåra konverteringar",
                })

        return mailto_links

    def extract_ungated_pdfs(self, soup: BeautifulSoup, base_url: str) -> List[Dict[str, Any]]:
        """
        Find PDF links that aren't behind a form - "läckande tratt".
        """
        ungated_pdfs = []

        for link in soup.find_all("a", href=True):
            href = link.get("href", "").lower()
            if ".pdf" in href:
                full_url = urljoin(base_url, link.get("href"))

                # Check if it's gated
                if not self._is_gated(link):
                    ungated_pdfs.append({
                        "url": full_url,
                        "text": link.get_text(strip=True),
                        "issue": "Öppen PDF utan formulär - ni ger bort innehåll utan att fånga leads",
                    })

        return ungated_pdfs

    def extract_value_proposition(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """
        Analyze the hero section and main value proposition.
        """
        result = {
            "h1": None,
            "h1_length": 0,
            "has_hero": False,
            "hero_text": None,
            "has_subheadline": False,
        }

        # Find H1
        h1 = soup.find("h1")
        if h1:
            result["h1"] = h1.get_text(strip=True)
            result["h1_length"] = len(result["h1"])

        # Look for hero section
        hero_keywords = ["hero", "banner", "jumbotron", "header", "intro"]
        for elem in soup.find_all(["section", "div", "header"]):
            classes = " ".join(elem.get("class", [])).lower()
            if any(k in classes for k in hero_keywords):
                result["has_hero"] = True
                result["hero_text"] = elem.get_text(strip=True)[:300]
                break

        # Check for subheadline (H2 or prominent paragraph after H1)
        if h1:
            next_elem = h1.find_next_sibling(["h2", "p"])
            if next_elem:
                result["has_subheadline"] = True
                result["subheadline"] = next_elem.get_text(strip=True)[:150]

        return result

    async def scrape_and_analyze(self, url: str) -> Dict[str, Any]:
        """
        Main method: scrape page and extract all analysis data.
        """
        # Fetch the page
        page_data = await self.fetch_page(url)
        soup = page_data["soup"]
        final_url = page_data["url"]

        # Extract all elements
        return {
            "url": final_url,
            "company_info": self.extract_company_info(soup, final_url),
            "lead_magnets": self.extract_lead_magnets(soup, final_url),
            "forms": self.extract_forms(soup),
            "cta_buttons": self.extract_cta_buttons(soup),
            "social_proof": self.extract_social_proof(soup, final_url),
            "mailto_links": self.extract_mailto_links(soup),
            "ungated_pdfs": self.extract_ungated_pdfs(soup, final_url),
            "value_proposition": self.extract_value_proposition(soup),
        }
