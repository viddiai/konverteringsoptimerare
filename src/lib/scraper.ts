import { ScrapedData } from '@/types/analysis';

// Cache for instant responses on repeated URLs
const scrapeCache = new Map<string, { data: ScrapedData; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * ULTRA-FAST Scraper V2.0
 * Uses Promise.race - returns first successful result
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
        return cached.data;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4s max!

    // RACE: First one to succeed wins!
    const directPromise = fetch(normalizedUrl, {
        signal: controller.signal,
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Bot/1.0)',
            'Accept': 'text/html',
        },
        redirect: 'follow',
    }).then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        clearTimeout(timeout);
        return parseHtml(html, normalizedUrl);
    });

    // Jina as backup (often slower)
    const jinaPromise = fetch(`https://r.jina.ai/${normalizedUrl}`, {
        headers: { 'Accept': 'text/plain' },
        signal: controller.signal
    }).then(async (res) => {
        if (!res.ok) throw new Error(`Jina ${res.status}`);
        const md = await res.text();
        clearTimeout(timeout);
        return parseJinaMarkdown(md, normalizedUrl);
    });

    try {
        // Return whichever finishes first!
        const result = await Promise.race([directPromise, jinaPromise]);
        scrapeCache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
    } catch (e) {
        clearTimeout(timeout);
        // If race failed, try waiting for either
        try {
            const fallback = await Promise.any([directPromise, jinaPromise]);
            scrapeCache.set(cacheKey, { data: fallback, timestamp: Date.now() });
            return fallback;
        } catch {
            throw new Error(`Kunde inte hämta ${normalizedUrl}`);
        }
    }
}

/**
 * Parse Jina markdown (compact)
 */
function parseJinaMarkdown(markdown: string, url: string): ScrapedData {
    // Extract title from markdown
    const titleMatch = markdown.match(/^Title:\s*(.*)$/m);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract H1s
    const h1s = markdown.match(/^# (.*)$/gm)?.map(h => h.replace(/^# /, '').trim()) || [];

    return {
        url,
        title,
        metaDescription: '', // Jina often misses this in plain text, but content is better
        h1: h1s,
        headings: [], // We'll rely on visibleText for structure
        paragraphs: [],
        links: [],
        buttons: [],
        forms: [],
        images: [],
        visibleText: markdown,
        localLeaks: [] // We lose local regex leaks with plain text, but AI will find them in markdown
    };
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
