const fs = require('fs');
const path = require('path');

const dataDir = path.join(process.cwd(), 'data');
const brandDir = path.join(dataDir, '플랫포인트');
if (!fs.existsSync(brandDir)) fs.mkdirSync(brandDir, { recursive: true });

const files = fs.readdirSync(dataDir).filter(f => /^flatpoint-.*\.json$/i.test(f));
const merged = [];
for (const f of files) {
  const src = path.join(dataDir, f);
  const json = JSON.parse(fs.readFileSync(src, 'utf8'));
  const dest = path.join(brandDir, f);
  fs.writeFileSync(dest, JSON.stringify(json, null, 2), 'utf8');
  try { fs.unlinkSync(src); } catch {}
  for (const it of json) merged.push(it);
}
fs.writeFileSync(path.join(brandDir, 'products.json'), JSON.stringify(merged, null, 2), 'utf8');
console.log(`Moved ${files.length} files to ${brandDir} and wrote ${merged.length} items to products.json`);


