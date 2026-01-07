import { NextRequest, NextResponse } from 'next/server';
import { scrapeWebsite } from '@/lib/scraper';
import { analyzeWebsiteStream } from '@/lib/analyzer';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url } = body;

        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Create streaming response that includes scraping progress
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                const send = (chunk: object) => {
                    controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
                };

                try {
                    // Step 1: Scrape the website with progress updates
                    send({ type: 'progress', data: { step: 'scraping', message: 'Hämtar webbsida...' } });

                    const scrapedData = await scrapeWebsite(url);

                    send({ type: 'progress', data: { step: 'scraped', message: 'Webbsida hämtad, startar analys...' } });

                    // Step 2: Stream Analysis Results
                    send({ type: 'progress', data: { step: 'analyzing', message: 'Analyserar konverteringsförmåga...' } });

                    const analyzer = analyzeWebsiteStream(scrapedData);
                    for await (const chunk of analyzer) {
                        send(chunk);
                    }

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
