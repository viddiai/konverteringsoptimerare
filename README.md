# Lead Generation Conversion Analyzer

En fullstack-applikation som analyserar webbsidors konverteringsförmåga och identifierar "läckande trattar" - problem som hindrar lead generation.

## Funktioner

- **URL-analys**: Analyserar webbsidor för konverteringselement
- **Lead Capture**: Samlar in leads i utbyte mot fullständiga rapporter
- **Inbäddningsbar Widget**: Kan bäddas in på vilken webbsida som helst
- **Admin Dashboard**: Överblick över leads och rapporter
- **Mörkt tema**: Stöd för både ljust och mörkt tema

## Teknisk Stack

- **Backend**: Python 3.11+ med FastAPI
- **Frontend**: React 18 med TypeScript och Tailwind CSS
- **Databas**: PostgreSQL 15
- **Containerisering**: Docker & Docker Compose

## Snabbstart med Docker

```bash
# Klona och gå in i projektet
cd Konverteringsoptimerare

# Starta alla tjänster
docker-compose up -d

# Öppna i webbläsaren
open http://localhost
```

## Lokal Utveckling

### Backend

```bash
cd backend

# Skapa virtuell miljö
python -m venv venv
source venv/bin/activate  # På Windows: venv\Scripts\activate

# Installera beroenden
pip install -r requirements.txt

# Kopiera miljövariabler
cp .env.example .env

# Starta PostgreSQL (eller använd Docker)
docker run -d --name postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=conversion_analyzer -p 5432:5432 postgres:15-alpine

# Starta servern
uvicorn app.main:app --reload
```

Backend körs på http://localhost:8000

### Frontend

```bash
cd frontend

# Installera beroenden
npm install

# Starta utvecklingsserver
npm run dev
```

Frontend körs på http://localhost:3000

## API-dokumentation

När backend körs, öppna:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Huvudsakliga Endpoints

| Metod | Endpoint | Beskrivning |
|-------|----------|-------------|
| POST | `/api/analyze` | Analysera en URL |
| POST | `/api/lead` | Registrera en lead |
| GET | `/api/report/{id}` | Hämta fullständig rapport |
| GET | `/api/widget.js` | Widget JavaScript |
| GET | `/api/admin/leads` | Lista leads (admin) |
| GET | `/api/admin/reports` | Lista rapporter (admin) |
| GET | `/api/admin/stats` | Dashboard-statistik (admin) |

## Widget-inbäddning

### Via JavaScript

```html
<div id="conversion-analyzer-widget"></div>
<script>
  window.CAWidgetConfig = {
    theme: 'light',  // 'light' eller 'dark'
    primaryColor: '#2563eb'
  };
</script>
<script src="https://din-domän.se/api/widget.js"></script>
```

### Via iFrame

```html
<iframe
  src="https://din-domän.se/widget/embed?theme=light&color=%232563eb"
  width="500"
  height="400"
  frameborder="0">
</iframe>
```

## Databasschema

```sql
-- Leads
leads (id, name, email, company_name, analyzed_url, created_at)

-- Rapporter
reports (id, lead_id, url, short_summary, full_report, overall_score, issues_found, access_token, created_at)

-- Analysdata
analysis_data (id, report_id, criterion, score, explanation)
```

## Analyserade Element

1. **Lead Magnets**: Nedladdningsbara resurser, guider, whitepapers
2. **Formulär**: Kontaktformulär, nyhetsbrev, demo-bokningar
3. **CTA-knappar**: Text, placering, effektivitet
4. **Social Proof**: Testimonials, kundlogotyper, recensioner
5. **Värdeerbjudande**: H1-rubrik, hero-sektion
6. **Mailto-länkar**: Identifieras som "läckande tratt"
7. **Öppna PDF:er**: PDF-länkar utan formulär

## Miljövariabler

| Variabel | Standard | Beskrivning |
|----------|----------|-------------|
| `DATABASE_URL` | - | PostgreSQL-anslutning |
| `SECRET_KEY` | - | Hemlig nyckel för tokens |
| `CORS_ORIGINS` | localhost | Tillåtna CORS-ursprung |
| `DEBUG` | false | Debug-läge |
| `SCRAPE_TIMEOUT` | 30 | Timeout för web scraping (sekunder) |

## Produktion

1. Ändra `SECRET_KEY` till ett slumpmässigt värde
2. Uppdatera `CORS_ORIGINS` till din domän
3. Konfigurera SSL/HTTPS (rekommenderat via Traefik eller Nginx proxy)
4. Lägg till autentisering för admin-endpoints

```bash
# Generera säker SECRET_KEY
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Licens

MIT
