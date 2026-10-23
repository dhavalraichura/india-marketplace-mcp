import { parseOlxSearch } from './dist/scrapers/olx.js';
import { parseFbSearch } from './dist/scrapers/facebook.js';
import fs from 'fs';

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
  return res.ok ? res.text() : '';
}

const queries = ["gaming laptop RTX","RTX 3060 laptop","RTX 4050 laptop","RTX 4060 laptop"];
const locations = ["Pune","Vadodara"];
const all = [];

for (const q of queries) {
  for (const loc of locations) {
    // OLX
    try {
      const url = `https://www.olx.in/items/q-${encodeURIComponent(q)}?q=${encodeURIComponent(q)}&location=${encodeURIComponent(loc)}`;
      const html = await fetchHtml(url);
      if (html) {
        const parsed = parseOlxSearch(html, 'https://www.olx.in');
        for (const item of parsed) {
          if (item.id && item.title) {
            all.push({ ...item, source:'OLX India', query: q, searchLoc: loc, url: item.url || '' });
          }
        }
      }
    } catch(e) {}
    // FB
    try {
      const fbUrl = `https://www.facebook.com/marketplace/${encodeURIComponent(loc.toLowerCase())}/search/?query=${encodeURIComponent(q)}`;
      const html = await fetchHtml(fbUrl);
      if (html) {
        const parsed = parseFbSearch(html);
        for (const item of parsed) {
          if (item.id && item.title) {
            all.push({ ...item, source:'FB Marketplace', query: q, searchLoc: loc, url: item.url || '' });
          }
        }
      }
    } catch(e) {}
  }
}

fs.writeFileSync('/tmp/all_search.json', JSON.stringify(all, null, 2));
console.log('Total raw listings fetched:', all.length);
