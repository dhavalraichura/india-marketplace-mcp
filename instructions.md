# India Marketplace MCP — Scraping Architecture & Reverse-Engineering Notes

## Overview
Unified Model Context Protocol server that searches **OLX India** (`olx.in`) and **Facebook Marketplace India**,
exposing the same `search_marketplace` and `get_listing_details` tool set to any MCP client (Claude Desktop, Cursor, etc.).
All listings are normalized to a single schema (`id`, `title`, `price_inr`, `description`, `location`, `url`, `image_urls`, `source`).

Sources studied:
- `l-margiela/olx-mcp` (TypeScript + Playwright scraping of 5 European OLX domains; adapted to `olx.in`).
- `jlsookiki/secondhand-mcp` (logged-out Facebook Marketplace scraping via RelayPrefetchedStreamCache JSON segments).

## Methodology
1. Live HTTP fetch of both listing surfaces with Indian headers (`Accept-Language: en-IN`, `Sec-Fetch-Mode: navigate`,
   `User-Agent: ...Chrome/124…`). No browser automation — pure static HTML parsing.
2. OLX renders search cards as `<li data-aut-id="itemBox3">…`. Each card exposes stable accessibility selectors:
   `data-aut-id="itemTitle"`, `data-aut-id="itemPrice"` (contains `₹`),
   `data-aut-id="itemImage"` (`<img src>`),
   `data-aut-id="item-location">` and the class `_1Rk21` / `_3Vshh` for location text.
   Item detail page embeds `<script type="application/ld+json">` Product schema (`priceCurrency":"INR","price":"19000",…`,
   `seller:"Anshuman Singh"`, multi-image array) used by `parseOlxItem`.
3. Facebook Marketplace returns a logged-out search HTML with a `RelayPrefetchedStreamCache` JSON blob containing
   `MarketplaceFeedListingStoryObject` segments. Each segment carries
   `marketplace_listing_title`, `formatted_amount` (INR, often escaped as `\u20b9`/Devanagari digits),
   `city`, `state`, `amount`, and a primary image `uri`. Scraped in order → aligned pairing of title+price+location+image.
4. Pythonized decode helpers `decodeEscapes()` and `toAsciiIndic()` normalize the escaped characters so `₹6,000` is produced rather than `\u20b9\u096c,…`.

## Files & responsibilities
- `src/index.ts` — MCP SDK server, stdio transport, two tools registered.
- `src/scrapers/olx.ts` — `parseOlxSearch` (cards), `parseOlxItem` (JSON-LD details).
- `src/scrapers/facebook.ts` — `parseFbSearch` (Relay JSON alignment).
- `src/types.ts` — shared `Listing` / `SearchResult` Zod schemas.
- `test-scrapers.js` — quick live scraper smoke test at project root.
- `process-deals.js` / `filter-top.js` — optional end-to-end deal-filtering pipeline used by the MCP example task.

## Regional targeting
- OLX domain forced to `https://www.olx.in`; query param `?q=<term>&location=<city>`.
- Facebook page forced to `https://www.facebook.com/marketplace/<lowercased city>/search/?query=<term>` with a fixed default of `delhi`;
  users can override per-call `location` into any Indian city.

## Limitations / known fragility
- Both sites are anti-bot heavy; a rotating UA or TLS fingerprint change can shift selectors. The `_1Rk21`/`_3Vshh` fallbacks were added to absorb minor drift.
- Facebook location is resolved client-side from `city` fields and may occasionally return `Mumbai` even when searching `Pune`.
- Facebook feed snippets are capped at ~15 per request for speed; pagination beyond the first feed page is not implemented.
