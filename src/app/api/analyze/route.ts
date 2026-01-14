import { NextRequest, NextResponse } from 'next/server';
import { scrapeWebsite, scrapeQuick } from '@/lib/scraper';
import { analyzeWebsiteStream, analyzeQuick } from '@/lib/analyzer';

// Vercel Pro: Allow up to 120 seconds for JS-heavy sites that need Scrapfly rendering
export const maxDuration = 120;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url } = body;

        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Two-phase streaming response with PARALLEL scraping
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                const send = (chunk: object) => {
                    controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
                };

                try {
                    // ========== START BOTH SCRAPES IN PARALLEL ==========
                    send({ type: 'progress', data: { step: 'quick_scraping', message: 'Snabbhämtar webbsida...' } });

                    // Start full scrape immediately (don't wait for quick analysis)
                    const fullScrapePromise = scrapeWebsite(url);

                    // Quick scrape runs in parallel
                    const quickData = await scrapeQuick(url);

                    // ========== PHASE 1: Quick Analysis ==========
                    if (quickData.visibleText && quickData.visibleText.length > 50) {
                        send({ type: 'progress', data: { step: 'quick_analyzing', message: 'Snabbanalyserar...' } });
                        const quickResult = await analyzeQuick(quickData);
                        send({ type: 'quick_result', data: quickResult });
                    } else {
                        // JS-heavy site or scrape failed - send placeholder quick result
                        // so UI can show teaser state while full analysis runs
                        send({ type: 'progress', data: { step: 'quick_analyzing', message: 'JS-tung webbplats, kör fullständig analys...' } });
                        send({ type: 'quick_result', data: { score: 3, problems: [{ category: 'Analys', problem: 'Webbplatsen kräver JavaScript-rendering', status: 'neutral' }] } });
                    }

                    // ========== PHASE 2: Full Analysis (scrape already running) ==========
                    send({ type: 'progress', data: { step: 'full_scraping', message: 'Hämtar fullständig data...' } });

                    // Wait for full scrape (likely already done or almost done)
                    const fullData = await fullScrapePromise;

                    send({ type: 'progress', data: { step: 'full_analyzing', message: 'Djupanalyserar...' } });

                    const analyzer = analyzeWebsiteStream(fullData);
                    for await (const chunk of analyzer) {
                        send({ type: 'full_' + chunk.type, data: chunk.data });
                    }

                    send({ type: 'complete', data: {} });
                    controller.close();
                } catch (err) {
                    send({ type: 'error', data: err instanceof Error ? err.message : 'Analysis failed' });
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'application/x-ndjson',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            }
        });

    } catch (error) {
        return NextResponse.json({
            error: 'Invalid request',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 400 });
    }
}
