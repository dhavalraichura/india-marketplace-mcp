import { parseOlxSearch, parseOlxItem } from './dist/scrapers/olx.js';
import { parseFbSearch } from './dist/scrapers/facebook.js';

async function fetchHtml(url, ua) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-IN,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function main() {
  const query = 'laptop';
  const location = 'Pune';

  // OLX India
  try {
    const url = `https://www.olx.in/items/q-${encodeURIComponent(query)}?q=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`;
    const html = await fetchHtml(url);
    const parsed = parseOlxSearch(html, 'https://www.olx.in');
    const listings = parsed.filter(x => x.id && x.title).slice(0, 2);
    console.log('=== OLX INDIAscraper ===');
    console.log(JSON.stringify(listings, null, 2));
  } catch (e) {
    console.error('OLX error:', e.message);
  }

  // Facebook Marketplace India
  try {
    const url = `https://www.facebook.com/marketplace/pune/search/?query=${encodeURIComponent(query)}`;
    const html = await fetchHtml(url);
    const parsed = parseFbSearch(html);
    const listings = parsed.filter(x => x.id && x.title).slice(0, 2);
    console.log('=== FACEBOOK MARKETPLACE IN ===');
    console.log(JSON.stringify(listings, null, 2));
  } catch (e) {
    console.error('FB error:', e.message);
  }
}

main();
