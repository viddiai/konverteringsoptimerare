import { ScrapedData } from '@/types/analysis';

// Cache for instant responses on repeated URLs
const scrapeCache = new Map<string, { data: ScrapedData; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * QUICK Scraper - Fas 1 (mål: <2 sekunder)
 * Endast direkthämtning, minimal parsing
 */
export async function scrapeQuick(url: string): Promise<ScrapedData> {
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
    }

    // Cache hit = instant return
    const cacheKey = normalizedUrl.toLowerCase();
    const cached = scrapeCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
        return cached.data;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000); // 2s timeout!

    try {
        const res = await fetch(normalizedUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)',
                'Accept': 'text/html',
            },
            redirect: 'follow',
        });
        clearTimeout(timeout);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        return parseHtmlQuick(html, normalizedUrl);
    } catch (e) {
        clearTimeout(timeout);
        // Return minimal data on failure - full scrape will retry
        return {
            url: normalizedUrl,
            title: '',
            metaDescription: '',
            h1: [],
            headings: [],
            paragraphs: [],
            links: [],
            buttons: [],
            forms: [],
            images: [],
            visibleText: '',
            localLeaks: []
        };
    }
}

/**
 * Minimal HTML parsing for quick analysis
 */
function parseHtmlQuick(html: string, url: string): ScrapedData {
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

    const h1Matches = html.matchAll(/<h1[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/h1>/gi);
    const h1: string[] = [];
    for (const match of h1Matches) {
        h1.push(stripHtml(match[1]).trim());
    }

    // Only extract first 500 chars of visible text for quick analysis
    const visibleText = stripHtml(html)
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 500);

    return {
        url,
        title,
        metaDescription,
        h1,
        headings: [],
        paragraphs: [],
        links: [],
        buttons: [],
        forms: [],
        images: [],
        visibleText,
        localLeaks: []
    };
}

/**
 * FULL Scraper - Fas 2
 * Uses Scrapfly for JS-rendered pages, direct fetch as fast fallback
 */
export async function scrapeWebsite(url: string): Promise<ScrapedData> {
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
    }

    // Cache hit = instant return
    const cacheKey = normalizedUrl.toLowerCase();
    const cached = scrapeCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
        console.log("Scraper: Cache hit for", normalizedUrl);
        return cached.data;
    }

    const scrapflyKey = process.env.SCRAPFLY_API_KEY;

    // Strategy: Try direct fetch first (fast), use Scrapfly only when truly needed
    try {
        // Fast direct fetch (2s timeout)
        const directResult = await scrapeDirectFast(normalizedUrl);
        // Raised threshold: only fallback to Scrapfly if content is truly thin
        // Most static sites have 500+ chars, JS-heavy SPAs often have <100
        if (directResult.visibleText.length > 100 && directResult.h1.length > 0) {
            console.log("Scraper: Direct fetch success, text length:", directResult.visibleText.length);
            scrapeCache.set(cacheKey, { data: directResult, timestamp: Date.now() });
            return directResult;
        }
        console.log("Scraper: Direct fetch got thin content (" + directResult.visibleText.length + " chars, " + directResult.h1.length + " h1s), trying Scrapfly...");
    } catch (e) {
        console.log("Scraper: Direct fetch failed, trying Scrapfly...", e instanceof Error ? e.message : e);
    }

    // Scrapfly for JS-rendered pages or when direct fails
    if (scrapflyKey) {
        try {
            const scrapflyResult = await scrapeWithScrapfly(normalizedUrl, scrapflyKey);
            scrapeCache.set(cacheKey, { data: scrapflyResult, timestamp: Date.now() });
            return scrapflyResult;
        } catch (e) {
            console.error("Scraper: Scrapfly failed:", e instanceof Error ? e.message : e);
        }
    }

    throw new Error(`Kunde inte hämta ${normalizedUrl}`);
}

/**
 * Fast direct fetch without JS rendering (2s timeout)
 */
async function scrapeDirectFast(url: string): Promise<ScrapedData> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    try {
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml',
            },
            redirect: 'follow',
        });
        clearTimeout(timeout);

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        return parseHtml(html, url);
    } catch (e) {
        clearTimeout(timeout);
        throw e;
    }
}

/**
 * Scrapfly scraper with JS rendering for modern websites
 */
async function scrapeWithScrapfly(url: string, apiKey: string): Promise<ScrapedData> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout - rendering_wait is only 2s now

    try {
        console.log("Scraper: Calling Scrapfly for", url);
        const startTime = Date.now();

        const params = new URLSearchParams({
            key: apiKey,
            url: url,
            render_js: 'true',
            // Simplified selectors - fewer = faster matching, exits early when found
            wait_for_selector: 'h1, main, [class*="content"]',
            rendering_wait: '2000', // Reduced from 5s - most content loads within 2s
            country: 'se',
            asp: 'true', // Anti-scraping protection bypass
        });

        const res = await fetch(`https://api.scrapfly.io/scrape?${params}`, {
            signal: controller.signal,
        });
        clearTimeout(timeout);

        console.log(`Scraper: Scrapfly response in ${Date.now() - startTime}ms, status: ${res.status}`);

        if (!res.ok) {
            const errorText = await res.text();
            console.error("Scrapfly error:", res.status, errorText.substring(0, 200));
            throw new Error(`Scrapfly ${res.status}`);
        }

        const data = await res.json();
        const html = data.result?.content || '';

        if (!html) {
            throw new Error('Scrapfly returned empty content');
        }

        console.log("Scraper: Scrapfly success, HTML length:", html.length);
        return parseHtml(html, url);
    } catch (e) {
        clearTimeout(timeout);
        throw e;
    }
}

/**
 * Parse HTML content into structured data
 */
function parseHtml(html: string, url: string): ScrapedData {
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract meta description
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
        html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
    const metaDescription = metaDescMatch ? metaDescMatch[1].trim() : '';

    // Extract H1 headings
    const h1Matches = html.matchAll(/<h1[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/h1>/gi);
    const h1: string[] = [];
    for (const match of h1Matches) {
        h1.push(stripHtml(match[1]).trim());
    }

    // Extract all headings
    const headings: { level: number; text: string }[] = [];
    const headingMatches = html.matchAll(/<h([1-6])[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/h\1>/gi);
    for (const match of headingMatches) {
        headings.push({
            level: parseInt(match[1]),
            text: stripHtml(match[2]).trim(),
        });
    }

    // Extract paragraphs
    const paragraphs: string[] = [];
    const pMatches = html.matchAll(/<p[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/p>/gi);
    for (const match of pMatches) {
        const text = stripHtml(match[1]).trim();
        if (text.length > 20) {
            paragraphs.push(text);
        }
    }

    // Extract links
    const links: { text: string; href: string }[] = [];
    const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/gi);
    for (const match of linkMatches) {
        links.push({
            href: match[1],
            text: stripHtml(match[2]).trim(),
        });
    }

    // Extract buttons
    const buttons: string[] = [];
    const buttonMatches = html.matchAll(/<button[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/button>/gi);
    for (const match of buttonMatches) {
        buttons.push(stripHtml(match[1]).trim());
    }
    // Also get input type="submit" and type="button"
    const inputButtonMatches = html.matchAll(/<input[^>]*type=["'](submit|button)["'][^>]*value=["']([^"']*)["']/gi);
    for (const match of inputButtonMatches) {
        buttons.push(match[2].trim());
    }

    // Extract forms
    const forms: ScrapedData['forms'] = [];
    const formMatches = html.matchAll(/<form[^>]*>([\s\S]*?)<\/form>/gi);
    for (const formMatch of formMatches) {
        const formHtml = formMatch[0];
        const actionMatch = formHtml.match(/action=["']([^"']*)["']/i);
        const methodMatch = formHtml.match(/method=["']([^"']*)["']/i);

        const fields: { name: string; type: string; required: boolean }[] = [];
        const inputMatches = formHtml.matchAll(/<input[^>]*>/gi);
        for (const inputMatch of inputMatches) {
            const inputHtml = inputMatch[0];
            const nameMatch = inputHtml.match(/name=["']([^"']*)["']/i);
            const typeMatch = inputHtml.match(/type=["']([^"']*)["']/i);
            const required = /required/i.test(inputHtml);

            if (nameMatch) {
                fields.push({
                    name: nameMatch[1],
                    type: typeMatch ? typeMatch[1] : 'text',
                    required,
                });
            }
        }

        // Get submit button text
        const submitMatch = formHtml.match(/<button[^>]*type=["']submit["'][^>]*>([^<]*)<\/button>/i) ||
            formHtml.match(/<input[^>]*type=["']submit["'][^>]*value=["']([^"']*)["']/i) ||
            formHtml.match(/<button[^>]*>([^<]*)<\/button>/i);

        forms.push({
            action: actionMatch ? actionMatch[1] : '',
            method: methodMatch ? methodMatch[1].toUpperCase() : 'GET',
            fields,
            submitText: submitMatch ? stripHtml(submitMatch[1]).trim() : 'Submit',
        });
    }

    // Extract images
    const images: { alt: string; src: string }[] = [];
    const imgMatches = html.matchAll(/<img[^>]*>/gi);
    for (const match of imgMatches) {
        const imgHtml = match[0];
        const srcMatch = imgHtml.match(/src=["']([^"']*)["']/i);
        const altMatch = imgHtml.match(/alt=["']([^"']*)["']/i);
        if (srcMatch) {
            images.push({
                src: srcMatch[1],
                alt: altMatch ? altMatch[1] : '',
            });
        }
    }

    // Extract leaking funnels locally
    const localLeaks: ScrapedData['localLeaks'] = [];

    // mailto: leaks
    const mailtoMatches = html.matchAll(/href=["']mailto:([^"']*)["']/gi);
    for (const match of mailtoMatches) {
        localLeaks.push({
            type: 'mailto_link_leak',
            severity: 'high',
            location: `Link: ${match[0]}`,
            details: `E-postlänk (${match[1]}) hittades. Besökare som klickar här lämnar din webbplats utan att du kan spåra dem eller samla in data i ett CRM.`,
            recommendation: 'Ersätt mailto-länken med ett dedicerat kontaktformulär för att öka konverteringen och mätbarheten.'
        });
    }

    // PDF leaks
    const pdfMatches = html.matchAll(/href=["']([^"']*\.pdf)["']/gi);
    for (const match of pdfMatches) {
        localLeaks.push({
            type: 'open_pdf_leak',
            severity: 'medium',
            location: `Link: ${match[1]}`,
            details: `En länk till en PDF (${match[1]}) hittades. Detta skickar iväg besökaren från din konverteringstratt.`,
            recommendation: 'Använd en "Gated Content"-strategi där besökaren måste ange sin e-postadress för att ladda ner PDF:en.'
        });
    }

    // visible text summary
    const visibleText = stripHtml(html)
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 5000); // Reduced to 5k for faster prompt processing

    return {
        url,
        title,
        metaDescription,
        h1,
        headings,
        paragraphs: paragraphs.slice(0, 15), // Reduced from 20
        links: links.slice(0, 30), // Reduced from 50
        buttons,
        forms,
        images: images.slice(0, 10), // Reduced from 20
        visibleText,
        localLeaks
    };
}

/**
 * Strip HTML tags from a string
 */
function stripHtml(html: string): string {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
}
