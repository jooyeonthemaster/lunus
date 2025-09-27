const fs = require('fs');
const path = require('path');
const sanitize = require('sanitize-filename');

const dataDir = path.join(process.cwd(), 'data');
const brandDir = path.join(dataDir, '우아미');
if (!fs.existsSync(brandDir)) fs.mkdirSync(brandDir, { recursive: true });

const files = fs.readdirSync(dataDir).filter(f => /^wooami-.*\.json$/i.test(f));
const merged = [];
for (const f of files) {
  const src = path.join(dataDir, f);
  const json = JSON.parse(fs.readFileSync(src, 'utf8'));
  const pretty = path.join(brandDir, f);
  fs.writeFileSync(pretty, JSON.stringify(json, null, 2), 'utf8');
  // move: remove original after writing into brand dir
  try { fs.unlinkSync(src); } catch {}
  for (const it of json) merged.push(it);
}
const mergedPath = path.join(brandDir, 'products.json');
fs.writeFileSync(mergedPath, JSON.stringify(merged, null, 2), 'utf8');
console.log(`Moved ${files.length} files to ${brandDir} and wrote ${merged.length} items to products.json`);



