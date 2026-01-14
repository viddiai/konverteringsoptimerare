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
                    // ========== START ALL OPERATIONS IN PARALLEL ==========
                    send({ type: 'progress', data: { step: 'quick_scraping', message: 'Snabbhämtar webbsida...' } });

                    // Start BOTH scrapes immediately
                    const fullScrapePromise = scrapeWebsite(url);
                    const quickScrapePromise = scrapeQuick(url);

                    // Wait for quick scrape first (for teaser)
                    const quickData = await quickScrapePromise;

                    // ========== PHASE 1: Quick Analysis ==========
                    // Start full analysis in background while quick analysis runs
                    const fullAnalysisPromise = (async () => {
                        const fullData = await fullScrapePromise;
                        const results: any[] = [];
                        const analyzer = analyzeWebsiteStream(fullData);
                        for await (const chunk of analyzer) {
                            results.push(chunk);
                        }
                        return results;
                    })();

                    if (quickData.visibleText && quickData.visibleText.length > 50) {
                        send({ type: 'progress', data: { step: 'quick_analyzing', message: 'Snabbanalyserar...' } });
                        const quickResult = await analyzeQuick(quickData);
                        send({ type: 'quick_result', data: quickResult });
                    } else {
                        // JS-heavy site - send placeholder for teaser
                        send({ type: 'progress', data: { step: 'quick_analyzing', message: 'JS-tung webbplats, kör fullständig analys...' } });
                        send({ type: 'quick_result', data: { score: 3, problems: [{ category: 'Analys', problem: 'Webbplatsen kräver JavaScript-rendering', status: 'neutral' }] } });
                    }

                    // ========== PHASE 2: Wait for Full Analysis (already running!) ==========
                    send({ type: 'progress', data: { step: 'full_analyzing', message: 'Djupanalyserar...' } });

                    const fullResults = await fullAnalysisPromise;
                    for (const chunk of fullResults) {
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
