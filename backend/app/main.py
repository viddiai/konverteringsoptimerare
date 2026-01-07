"""
FastAPI main application entry point.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import os

from app.core.config import settings
from app.core.database import engine, Base
from app.api.routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Creates database tables on startup.
    """
    # Create database tables
    Base.metadata.create_all(bind=engine)
    print(f"✓ Database tables created")
    print(f"✓ {settings.APP_NAME} v{settings.APP_VERSION} started")

    yield

    # Cleanup on shutdown
    print("Shutting down...")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Analysera webbsidors konverteringsförmåga och fånga leads",
    lifespan=lifespan,
)

# Configure CORS
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api", tags=["api"])


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.APP_VERSION}


# Simple report viewer page
REPORT_PAGE_TEMPLATE = '''
<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Konverteringsrapport</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: {
                            400: '#34d399',
                            500: '#10b981',
                            600: '#059669',
                        }
                    },
                    fontFamily: {
                        sans: ['Geist', 'system-ui', '-apple-system', 'sans-serif'],
                    }
                }
            }
        }
    </script>
    <style>
        @font-face {
            font-family: 'Geist';
            src: url('https://cdn.jsdelivr.net/npm/geist@1.2.0/dist/fonts/geist-sans/Geist-Regular.woff2') format('woff2');
            font-weight: 400;
        }
        @font-face {
            font-family: 'Geist';
            src: url('https://cdn.jsdelivr.net/npm/geist@1.2.0/dist/fonts/geist-sans/Geist-Medium.woff2') format('woff2');
            font-weight: 500;
        }
        @font-face {
            font-family: 'Geist';
            src: url('https://cdn.jsdelivr.net/npm/geist@1.2.0/dist/fonts/geist-sans/Geist-SemiBold.woff2') format('woff2');
            font-weight: 600;
        }
        @font-face {
            font-family: 'Geist';
            src: url('https://cdn.jsdelivr.net/npm/geist@1.2.0/dist/fonts/geist-sans/Geist-Bold.woff2') format('woff2');
            font-weight: 700;
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .stars { font-size: 1.1em; letter-spacing: 2px; }
        .stars-large { font-size: 1.8em; letter-spacing: 3px; }
        body { font-family: 'Geist', system-ui, -apple-system, sans-serif; }
        ::selection { background-color: rgba(16, 185, 129, 0.2); color: #10b981; }
    </style>
</head>
<body class="bg-black min-h-screen text-white">
    <div id="app" class="container mx-auto px-4 py-8 max-w-4xl">
        <div id="loading" class="text-center py-20">
            <div class="inline-block w-12 h-12 border-4 border-white/10 border-t-primary-500 rounded-full animate-spin"></div>
            <p class="mt-4 text-gray-400">Laddar rapport...</p>
        </div>
        <div id="error" class="hidden text-center py-20">
            <div class="text-6xl mb-4">🔒</div>
            <h2 class="text-2xl font-bold text-white mb-2">Åtkomst nekad</h2>
            <p class="text-gray-400" id="error-message"></p>
        </div>
        <div id="report" class="hidden"></div>
    </div>

    <script>
        let pollCount = 0;
        const MAX_POLLS = 30; // Max 30 attempts (60 seconds)

        async function loadReport() {
            const pathParts = window.location.pathname.split('/');
            const reportId = pathParts[pathParts.length - 1];
            const token = new URLSearchParams(window.location.search).get('token');

            if (!token) {
                showError('Ingen åtkomsttoken angiven');
                return;
            }

            try {
                const response = await fetch('/api/report/' + reportId + '?token=' + token);
                if (!response.ok) {
                    const data = await response.json();
                    showError(data.detail || 'Kunde inte ladda rapporten');
                    return;
                }

                const data = await response.json();
                renderReport(data);

                // If AI analysis is not complete, poll for updates
                if (!data.ai_generated && pollCount < MAX_POLLS) {
                    pollCount++;
                    setTimeout(() => {
                        refreshReport(reportId, token);
                    }, 2000); // Poll every 2 seconds
                }
            } catch (err) {
                showError('Något gick fel: ' + err.message);
            }
        }

        async function refreshReport(reportId, token) {
            try {
                const response = await fetch('/api/report/' + reportId + '?token=' + token);
                if (response.ok) {
                    const data = await response.json();
                    renderReport(data);

                    // Continue polling if AI not complete
                    if (!data.ai_generated && pollCount < MAX_POLLS) {
                        pollCount++;
                        setTimeout(() => {
                            refreshReport(reportId, token);
                        }, 2000);
                    }
                }
            } catch (err) {
                console.error('Error refreshing report:', err);
            }
        }

        function showError(message) {
            document.getElementById('loading').classList.add('hidden');
            document.getElementById('error').classList.remove('hidden');
            document.getElementById('error-message').textContent = message;
        }

        function renderReport(data) {
            document.getElementById('loading').classList.add('hidden');
            const container = document.getElementById('report');
            container.classList.remove('hidden');

            const stars = (score, large = false) => {
                const filled = Math.round(score);
                const empty = 5 - filled;
                const filledStars = '<span class="text-primary-500">' + '★'.repeat(filled) + '</span>';
                const emptyStars = '<span class="text-gray-600">' + '☆'.repeat(empty) + '</span>';
                const sizeClass = large ? 'stars-large' : 'stars';
                return '<span class="' + sizeClass + '">' + filledStars + emptyStars + '</span>';
            };

            // Get AI-generated explanations or use defaults
            const criteriaExplanations = data.criteria_explanations || {};

            container.innerHTML = `
                <div class="fade-in">
                    <header class="mb-8">
                        <h1 class="text-2xl font-bold text-white mb-2">
                            Analys av leadgenerering och konverteringsoptimering för ${data.company_name || 'Er Webbsida'}
                        </h1>
                        ${data.industry_label ? `<p class="text-primary-500 text-sm font-medium mb-2">Bransch: ${data.industry_label}</p>` : ''}
                        <p class="text-gray-500 text-sm">Analyserad: ${new Date(data.created_at).toLocaleDateString('sv-SE')}</p>
                        <p class="text-gray-500 text-sm">URL: <a href="${data.url}" target="_blank" class="text-primary-500 hover:text-primary-400 transition-colors">${data.url}</a></p>
                    </header>

                    <!-- Kort beskrivning -->
                    <section class="mb-8">
                        <h2 class="text-lg font-semibold text-white mb-3">Kort beskrivning:</h2>
                        <p class="text-gray-300 leading-relaxed">${data.short_description || data.company_description || 'Ingen beskrivning tillgänglig.'}</p>
                    </section>

                    <!-- Resultat: Leadmagneter, formulär och innehåll -->
                    <section class="mb-8">
                        <h2 class="text-lg font-semibold text-white mb-4">Resultat: Leadmagneter, nyhetsbrev, värdeskapande innehåll och formulär</h2>

                        ${data.lead_magnets_analysis ? `
                        <div class="text-gray-300 leading-relaxed mb-4">${data.lead_magnets_analysis}</div>
                        ` : `
                        <p class="text-gray-300 mb-4">${data.company_name || 'Webbplatsen'} har ${data.lead_magnets?.length || 0} identifierade leadmagneter.</p>
                        `}

                        <ul class="space-y-2 mb-4 text-gray-300">
                            <li><strong class="text-white">Leadmagneter:</strong> ${data.lead_magnets?.length || 0} identifierade. ${data.lead_magnets?.slice(0, 3).map(lm => lm.text || '').join(', ') || 'Inga specifika hittades.'}</li>
                            <li><strong class="text-white">Formulär:</strong> ${data.forms?.length || 0} st identifierade.</li>
                            <li><strong class="text-white">CTA:</strong> ${data.cta_buttons?.slice(0, 5).map(c => '"' + c.text + '"').join(', ') || 'Inga tydliga CTAs hittades.'}</li>
                        </ul>

                        ${data.forms_analysis ? `
                        <div class="text-gray-300 leading-relaxed mb-4">${data.forms_analysis}</div>
                        ` : ''}

                        ${data.cta_analysis ? `
                        <div class="text-gray-300 leading-relaxed">${data.cta_analysis}</div>
                        ` : ''}
                    </section>

                    <!-- Avgörande insikter -->
                    <section class="mb-8">
                        <h2 class="text-lg font-semibold text-white mb-3">Avgörande insikter:</h2>
                        <div class="text-gray-300 leading-relaxed whitespace-pre-line">
                            ${data.logical_verdict ? data.logical_verdict : (data.ai_generated ? 'Ingen detaljerad analys tillgänglig.' : '<div class="flex items-center gap-2 text-gray-400"><svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Genererar AI-analys...</div>')}
                        </div>
                    </section>

                    <!-- Konverteringsanalys tabell -->
                    <section class="mb-8">
                        <h2 class="text-lg font-semibold text-white mb-4">Konverteringsanalys (tabell)</h2>
                        <div class="overflow-x-auto bg-white/5 rounded-xl border border-white/10">
                            <table class="w-full text-left">
                                <thead class="bg-white/5">
                                    <tr class="border-b border-white/10">
                                        <th class="py-3 px-4 font-medium text-white">Kriterium</th>
                                        <th class="py-3 px-4 font-medium text-white">Betyg</th>
                                        <th class="py-3 px-4 font-medium text-white">Logisk förklaring (hård och direkt)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(data.criteria_analysis || []).map(c => {
                                        // Use AI explanation if available, otherwise use default
                                        const criterionKey = c.criterion.toLowerCase().replace(/_/g, '_');
                                        const aiExplanation = criteriaExplanations[criterionKey] || criteriaExplanations[c.criterion] || c.explanation;
                                        return `
                                        <tr class="border-b border-white/10 hover:bg-white/5">
                                            <td class="py-3 px-4 font-medium text-white">${c.criterion_label}</td>
                                            <td class="py-3 px-4">${stars(c.score)}</td>
                                            <td class="py-3 px-4 text-gray-400">${aiExplanation}</td>
                                        </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <!-- Sammanfattande bedömning -->
                    <section class="mb-8">
                        <h2 class="text-lg font-semibold text-white mb-4">Sammanfattande bedömning:</h2>
                        <div class="bg-white/5 rounded-xl border border-white/10 p-5">
                            <div class="flex flex-col gap-4">
                                ${(data.summary_assessment || 'Ingen sammanfattning tillgänglig.').split(/\n\n|\n/).filter(line => line.trim()).map(line => `
                                <div class="flex items-start gap-3">
                                    <div class="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
                                    <span class="text-gray-300 leading-relaxed">${line.trim()}</span>
                                </div>
                                `).join('')}
                            </div>
                        </div>
                    </section>

                    <!-- Rekommendationer -->
                    <section class="bg-primary-500/10 rounded-xl p-6 mb-6 border border-primary-500/20">
                        <h2 class="text-xl font-semibold text-primary-400 mb-4">Rekommendationer</h2>
                        <ol class="space-y-4">
                            ${(data.recommendations || []).map((r, i) => `
                            <li class="flex gap-3">
                                <span class="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">${i + 1}</span>
                                <span class="text-gray-300">${r}</span>
                            </li>
                            `).join('')}
                        </ol>
                    </section>

                    <!-- Nästa steg med CTA -->
                    <section class="bg-white/5 rounded-xl p-6 mb-6 border border-white/10">
                        <h2 class="text-xl font-semibold text-white mb-4">Nästa steg</h2>
                        <p class="text-gray-300 leading-relaxed mb-4">
                            Vill du ha hjälp att åtgärda problemen och öka din konvertering?
                        </p>
                        <a href="https://calendly.com/stefan-245/30min"
                           target="_blank"
                           class="inline-block px-6 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors">
                            Boka genomgång för ökad konvertering
                        </a>
                    </section>

                    <!-- Ladda ner PDF -->
                    <section class="text-center py-6 border-t border-white/10">
                        <a href="/api/report/${data.report_id}/pdf?token=${new URLSearchParams(window.location.search).get('token')}"
                           class="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 text-gray-300 font-medium rounded-lg hover:bg-white/20 transition-colors border border-white/10">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Ladda ner som PDF
                        </a>
                    </section>

                    <footer class="text-center text-gray-500 text-sm py-8">
                        <p>Genererad av Portalfabriken.se</p>
                    </footer>
                </div>
            `;
        }

        loadReport();
    </script>
</body>
</html>
'''


@app.get("/report/{report_id}", response_class=HTMLResponse)
async def view_report_page(report_id: int):
    """
    Serve the report viewer page.
    The actual data is fetched via JavaScript.
    """
    return HTMLResponse(content=REPORT_PAGE_TEMPLATE)


# Widget embed page (for iframe embedding)
WIDGET_EMBED_TEMPLATE = '''
<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Conversion Analyzer Widget</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    </style>
</head>
<body>
    <div id="conversion-analyzer-widget"></div>
    <script>
        window.CAWidgetConfig = {
            theme: new URLSearchParams(window.location.search).get('theme') || 'light',
            primaryColor: new URLSearchParams(window.location.search).get('color') || '#2563eb'
        };
    </script>
    <script src="/api/widget.js"></script>
</body>
</html>
'''


@app.get("/widget/embed", response_class=HTMLResponse)
async def widget_embed_page():
    """
    Serve a standalone widget page for iframe embedding.
    Query params: theme (light/dark), color (hex color)
    """
    return HTMLResponse(content=WIDGET_EMBED_TEMPLATE)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
