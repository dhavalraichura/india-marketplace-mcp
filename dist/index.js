#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { parseOlxSearch, parseOlxItem } from './scrapers/olx.js';
import { parseFbSearch } from './scrapers/facebook.js';
async function fetchHtml(url, ua) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'en-IN,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
        },
    });
    if (!res.ok)
        throw new Error(`HTTP ${res.status} for ${url}`);
    return res.text();
}
const server = new Server({ name: 'india-marketplace-mcp', version: '1.0.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'search_marketplace',
            description: 'Search OLX India (olx.in) and Facebook Marketplace India. Pass query, source (olx.in | facebook_marketplace_in), location (e.g., Delhi, Mumbai, Bangalore), and optional price filters.',
            inputSchema: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search query like "iphone" or "bike"' },
                    source: { type: 'string', enum: ['olx.in', 'facebook_marketplace_in', 'both'], description: 'Source marketplace' },
                    location: { type: 'string', description: 'Indian city/location filter, e.g., Delhi, Mumbai, Bangalore' },
                    min_price: { type: 'number' },
                    max_price: { type: 'number' },
                    limit: { type: 'number', default: 10, description: 'Max results per source' },
                },
                required: ['query'],
            },
        },
        {
            name: 'get_listing_details',
            description: 'Retrieve full details for an OLX India or Facebook Marketplace listing by ID and source.',
            inputSchema: {
                type: 'object',
                properties: {
                    id: { type: 'string', description: 'Listing ID' },
                    source: { type: 'string', enum: ['olx.in', 'facebook_marketplace_in'], description: 'Source marketplace' },
                },
                required: ['id', 'source'],
            },
        },
    ],
}));
server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args } = req.params;
    if (name === 'search_marketplace') {
        const q = String(args?.query || '');
        const src = args?.source || 'both';
        const loc = String(args?.location || '');
        const limit = Math.min(Number(args?.limit || 10), 20);
        const results = [];
        const agents = src === 'both' ? ['olx.in', 'facebook_marketplace_in'] : [src];
        for (const source of agents) {
            try {
                if (source === 'olx.in') {
                    const queryStr = encodeURIComponent(q);
                    const url = `https://www.olx.in/items/q-${queryStr}` + (loc ? `?q=${queryStr}&location=${encodeURIComponent(loc)}` : `?q=${queryStr}`);
                    const html = await fetchHtml(url);
                    const parsed = parseOlxSearch(html, 'https://www.olx.in');
                    for (const item of parsed) {
                        if (item.id && item.title)
                            results.push({ ...item, source: 'olx.in' });
                    }
                }
                else if (source === 'facebook_marketplace_in') {
                    // Default to Indian cities; Facebook resolves based on session/cookies; we pass query only
                    const url = `https://www.facebook.com/marketplace/delhi/search/?query=${encodeURIComponent(q)}`;
                    const html = await fetchHtml(url);
                    const parsed = parseFbSearch(html);
                    for (const item of parsed) {
                        if (item.id && item.title)
                            results.push({ ...item, source: 'facebook_marketplace_in' });
                    }
                }
            }
            catch (e) {
                console.error(`Search error for ${source}:`, e.message);
            }
        }
        return { content: [{ type: 'text', text: JSON.stringify({ listings: results.slice(0, limit), total_found: results.length, sources: agents, query: q, location: loc }) }] };
    }
    if (name === 'get_listing_details') {
        const id = String(args?.id || '');
        const source = String(args?.source || 'olx.in');
        try {
            if (source === 'olx.in') {
                const url = `https://www.olx.in/item/mobile-phones-c1453-used-iphone-in-delhi-iid-${id}`; // generic path; better to reconstruct
                // For simplicity we fetch item page via search-derived URL or direct known pattern
                const directUrl = `https://www.olx.in/item/iphone-iid-${id}`;
                const html = await fetchHtml(directUrl);
                const parsed = parseOlxItem(html, directUrl);
                const result = {
                    id,
                    title: parsed.title || '',
                    price_inr: parsed.price_inr || '',
                    description: parsed.description || '',
                    location: parsed.location || '',
                    url: directUrl,
                    image_urls: parsed.image_urls || [],
                    source: 'olx.in',
                    seller: parsed.seller,
                };
                return { content: [{ type: 'text', text: JSON.stringify(result) }] };
            }
            if (source === 'facebook_marketplace_in') {
                const url = `https://www.facebook.com/marketplace/item/${id}/`;
                const html = await fetchHtml(url);
                // Simple extract from meta title / description
                const title = (html.match(/<title[^>]*>([^<]+)<\/title>/) || [])[1] || 'Facebook Listing';
                const descMatch = html.match(/"description":"([^"]{10,300})"/);
                const result = {
                    id,
                    title: title.replace(' | Facebook', '').trim(),
                    description: descMatch ? descMatch[1].replace(/\\n/g, '\n') : '',
                    location: 'India',
                    url,
                    source: 'facebook_marketplace_in',
                };
                return { content: [{ type: 'text', text: JSON.stringify(result) }] };
            }
        }
        catch (e) {
            return { content: [{ type: 'text', text: JSON.stringify({ error: e.message }) }], isError: true };
        }
    }
    return { content: [{ type: 'text', text: JSON.stringify({ error: 'Unknown tool' }) }], isError: true };
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('India Marketplace MCP server running on stdio');
}
main();
