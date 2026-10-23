export function parseOlxSearch(html, baseUrl = 'https://www.olx.in') {
    const results = [];
    // OLX India uses data-aut-id="itemBox3" cards
    const cardMatches = html.match(/<li[^>]*data-aut-id="itemBox3"[^>]*>[\s\S]*?<\/li>/g) || [];
    for (const block of cardMatches.slice(0, 20)) {
        const linkMatch = block.match(/href="([^"]+)"/g);
        let url = '';
        if (linkMatch && linkMatch[0])
            url = baseUrl + linkMatch[0].slice(6, -1);
        const title = (block.match(/data-aut-id="itemTitle">([^<]+)/) || [])[1] || '';
        const price = (block.match(/data-aut-id="itemPrice">([^<]+)/) || [])[1] || '';
        let location = (block.match(/data-aut-id="item-location"[^>]*>([^<]+)/) || [])[1] || (block.match(/data-aut-id="item-location"[^>]*>\s*([^<]+)/) || [])[1] || '';
        if (!location) {
            const locClass = block.match(/class="[^"]*(_1Rk21|_3Vshh)[^"]*"[^>]*>([^<]+)/) || block.match(/class="[^"]*(_1Rk21|_3Vshh)[^"]*"[^>]*>\s*([^<]+)/);
            if (locClass)
                location = locClass[2] || locClass[1] || '';
        }
        // Alternative: data-aut-id="itemLocation"
        if (!location) {
            const alt = block.match(/data-aut-id="itemLocation"[^>]*>([^<]+)/) || block.match(/data-aut-id="itemLocation"[^>]*>\s*([^<]+)/);
            if (alt)
                location = alt[1] || '';
        }
        const imgMatch = block.match(/data-aut-id="itemImage"[^>]*>\s*<img[^>]+src="([^"]+)"/);
        const image = imgMatch ? imgMatch[1] : '';
        const idMatch = url.match(/iid-(\d+)/);
        results.push({
            id: idMatch ? idMatch[1] : url,
            title: title.trim(),
            price_inr: price.trim(),
            location: location.trim(),
            url,
            image_urls: image ? [image] : [],
            source: 'olx.in',
        });
    }
    return results;
}
export function parseOlxItem(html, url) {
    // Schema.org Product JSON-LD
    const productMatch = html.match(/"@type":"Product"[\s\S]{0,4000}"description":"([^"]+)"/);
    const desc = productMatch ? productMatch[1].replace(/\\n/g, '\n') : '';
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1].replace(/ - Mobile Phones - OLX.*/, '').trim() : '';
    const priceMatch = html.match(/"price":"(\d+)"/);
    const price = priceMatch ? `₹ ${priceMatch[1]}` : '';
    const imageMatches = html.match(/"image":\[([^\]]*)\]/); // basic
    const sellerMatch = html.match(/"seller":"([^"]+)"/);
    const idMatch = url.match(/iid-(\d+)/);
    return {
        id: idMatch ? idMatch[1] : '',
        title,
        description: desc,
        price_inr: price,
        price_raw: priceMatch ? priceMatch[1] : '',
        location: '', // extracted from breadcrumbs if needed
        url,
        source: 'olx.in',
        seller: sellerMatch ? sellerMatch[1] : undefined,
    };
}
