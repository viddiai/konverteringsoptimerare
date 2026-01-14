import { NextRequest, NextResponse } from 'next/server';
import { scrapeWebsite, scrapeQuick } from '@/lib/scraper';
import { analyzeWebsiteStream, analyzeQuick } from '@/lib/analyzer';

// Allow up to 60 seconds for JS-heavy sites that need Scrapfly rendering
export const maxDuration = 60;

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
                    if (quickData.visibleText) {
                        send({ type: 'progress', data: { step: 'quick_analyzing', message: 'Snabbanalyserar...' } });
                        const quickResult = await analyzeQuick(quickData);
                        send({ type: 'quick_result', data: quickResult });
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
