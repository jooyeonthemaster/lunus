const fs = require('fs');
const path = require('path');

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

(async () => {
  const dataDir = path.join(process.cwd(), 'data');
  const brandDir = path.join(dataDir, '동서가구');
  ensureDir(dataDir);
  ensureDir(brandDir);

  const files = fs.readdirSync(dataDir).filter(f => /^dongsuh-.*\.json$/.test(f));
  const merged = [];

  for (const f of files) {
    const src = path.join(dataDir, f);
    const dest = path.join(brandDir, f);
    try {
      const arr = JSON.parse(fs.readFileSync(src, 'utf8'));
      const key = f.replace(/^dongsuh-|\.json$/g, '');
      const normalized = arr.map(x => ({
        source: 'dongsuh',
        brand: '동서가구',
        category: key,
        title: x.title ?? null,
        price: x.price ?? null,
        productUrl: x.productUrl ?? null,
        imageUrl: x.imageUrl ?? null,
        capturedAt: x.capturedAt || new Date().toISOString(),
      }));
      merged.push(...normalized);
      try { fs.renameSync(src, dest); }
      catch (e2) { fs.copyFileSync(src, dest); fs.unlinkSync(src); }
    } catch (e) {
      console.error('Skip file due to error:', f, e.message);
    }
  }

  const outMerged = path.join(brandDir, 'products.json');
  fs.writeFileSync(outMerged, JSON.stringify(merged, null, 2), 'utf8');
  console.log(`Moved ${files.length} files to ${brandDir} and wrote ${merged.length} items to products.json`);
})();



