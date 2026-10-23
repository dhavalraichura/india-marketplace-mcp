function decodeEscapes(str) {
    return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}
function toAsciiIndic(str) {
    const map = {
        '\u0966': '0', '\u0967': '1', '\u0968': '2', '\u0969': '3', '\u096A': '4', '\u096B': '5', '\u096C': '6', '\u096D': '7', '\u096E': '8', '\u096F': '9',
    };
    return str.replace(/[\u0966-\u096F]/g, ch => map[ch] || ch);
}
export function parseFbSearch(html) {
    const results = [];
    // Facebook embeds marketplace feed data inside RelayPrefetchedStreamCache JSON scripts
    // We extract the JSON block by finding price + title patterns
    const priceMatches = html.match(/"formatted_amount":"([^"]+)"/g) || [];
    const titleMatches = html.match(/"marketplace_listing_title":"([^"]+)"/g) || [];
    const idMatches = html.match(/"id":"(\d{10,})"/g) || [];
    const locMatches = html.match(/"reverse_geocode":\{[^}]*"city":"([^"]+)"/g) || [];
    // Heuristic alignment: iterate over titles and grab matching nearby values
    // Simplified: extract from script JSON segments containing "MarketplaceFeedListingStoryObject"
    const segments = html.split('"MarketplaceFeedListingStoryObject"');
    for (let i = 1; i < Math.min(segments.length, 15); i++) {
        const seg = segments[i];
        const id = ((seg.match(/"id":"(\d{10,})"/) || [])[1] || '').trim();
        const title = ((seg.match(/"marketplace_listing_title":"([^"]+)"/) || [])[1] || '').trim();
        const formatted = ((seg.match(/"formatted_amount":"([^"]+)"/) || [])[1] || '').trim();
        const city = ((seg.match(/"city":"([^"]+)"/) || [])[1] || '').trim();
        const state = ((seg.match(/"state":"([^"]+)"/) || [])[1] || '').trim();
        const photo = ((seg.match(/"uri":"([^"]+\.(?:jpg|png|jpeg))[^"]*"/) || [])[1] || '').trim();
        const priceRaw = ((seg.match(/"amount":"([\d.]+)"/) || [])[1] || '').trim();
        if (id && title) {
            results.push({
                id,
                title,
                price_inr: toAsciiIndic(decodeEscapes(formatted || (priceRaw ? `₹ ${priceRaw}` : ''))) || '',
                price_raw: priceRaw || formatted || '',
                location: city ? `${city}${state ? ', ' + state : ''}` : 'India',
                url: `https://www.facebook.com/marketplace/item/${id}/`,
                image_urls: photo ? [photo.replace(/\\/g, '')] : [],
                source: 'facebook_marketplace_in',
            });
        }
    }
    return results;
}
