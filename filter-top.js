import fs from 'fs';
const raw = JSON.parse(fs.readFileSync('/tmp/all_search.json', 'utf8'));

const allowed = [];
for (const r of raw) {
  const text = (r.title || '') + ' ' + (r.description || '');
  const lower = text.toLowerCase();
  const hasTarget = lower.includes('3060') || lower.includes('4050') || lower.includes('4060') || lower.includes('3070') || lower.includes('3080') || lower.includes('3090') || lower.includes('4070') || lower.includes('4080');

  // Exclude low VRAM / non-RTX / 3050
  if (lower.includes('3050') || lower.includes('4gb') || lower.includes('gtx 1650') || lower.includes('2gb')) continue;
  // Must have target GPU
  if (!hasTarget) continue;

  // Price sanity: exclude suspiciously low (< 30k typical RTX laptop deals)
  const priceNum = parseInt((r.price_inr || r.price_raw || '').replace(/[^\d]/g, '')) || 0;
  if (priceNum > 0 && priceNum < 30000) continue;

  // Strict location: Pune or Vadodara only
  const locText = (r.location || '').toLowerCase();
  const hasPune = locText.includes('pune') || locText.includes('maharashtra');
  const hasVadodara = locText.includes('vadodara') || locText.includes('baroda');
  if (!hasPune && !hasVadodara) continue;

  allowed.push(r);
}

const seen = new Set();
const unique = [];
for (const a of allowed) {
  const key = (a.title || '').slice(0, 60) + '|' + (a.price_inr || '') + '|' + a.source;
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push(a);
}
unique.sort((a, b) => {
  const pa = parseInt((a.price_inr || a.price_raw || '').replace(/[^\d]/g, '')) || 999999;
  const pb = parseInt((b.price_inr || b.price_raw || '').replace(/[^\d]/g, '')) || 999999;
  return pa - pb;
});

console.log('Total filtered unique deals:', unique.length);
console.log('===== TOP 5 FILTERED DEALS =====');
for (const r of unique.slice(0, 5)) {
  const specs = (r.title || '').match(/(rtx\s*30[0-9]|rtx\s*40[0-9]|rtx\s*30[0-9][0-9]?|rx\s*\d+|amd\s*rx)/i) || (r.description || '').match(/(rtx\s*30[0-9]|rtx\s*40[0-9]|rtx\s*30[0-9][0-9]?|rx\s*\d+)/i) || '';
  console.log('\nTitle:', r.title);
  console.log('Price:', r.price_inr || r.price_raw);
  console.log('Location:', r.location);
  console.log('Platform:', r.source);
  console.log('Query/SearchLoc:', (r.query || '') + ' / ' + (r.searchLoc || ''));
  console.log('GPU/Specs:', specs[0] || '(RTX-series, 6GB+)');
  console.log('URL:', r.url);
}
fs.writeFileSync('/tmp/top_deals.json', JSON.stringify(unique.slice(0,5), null, 2));
