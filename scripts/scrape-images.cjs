/*
  Scrape representative images from provided URLs and save under
  public/external/{소파|침대|옷장|의자}/

  Usage:
    node scripts/scrape-images.cjs
*/

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const sanitize = require('sanitize-filename');

// Categories and URLs (cleaned)
const categoryToUrls = {
  '소파': [
    'https://villarecord.com/sofa-bench/?idx=1346',
    'https://www.seatandmore.co.kr/goods/goods_view.php?goodsNo=1000001021',
    'https://www.seatandmore.co.kr/goods/goods_view.php?goodsNo=1000002318',
    'https://www.iloom.com/product/detail.do?productCd=ISU0001A',
    'https://store.hanssem.com/goods/737686',
    'https://store.hanssem.com/goods/916927',
    'https://sysdesign.co.kr/shop/sofa/material/fabric/huming_br_corner/',
    'https://living.hyundailivart.co.kr/p/P200165382',
    'https://living.hyundailivart.co.kr/p/P200181188',
    'https://living.hyundailivart.co.kr/p/P200196333',
    'https://flatpoint.co.kr/product/layer-sofa-leather2700/6985/category/351/display/1/',
    'https://ativ.co.kr/product/detail.html?product_no=34&cate_no=24&display_group=1',
    'https://ativ.co.kr/product/detail.html?product_no=250&cate_no=24&display_group=1',
    'https://jacksonchameleon.co.kr/product/inksofa/4787/category/228/display/1/',
    'https://jacksonchameleon.co.kr/product/pebble-sofafabric/4819/category/228/display/1/'
  ],
  '침대': [
    'https://www.iloom.com/product/detail.do?productCd=IBL0014A',
    'https://www.iloom.com/product/detail.do?productCd=IBF0016A',
    'https://www.iloom.com/product/detail.do?productCd=IBS0018A',
    'https://www.iloom.com/product/detail.do?productCd=HBA511501',
    'https://www.guud.com/shop/goodsView?itemId=257758',
    'https://www.guud.com/shop/goodsView?itemId=199045',
    'https://living.hyundailivart.co.kr/p/P100009520',
    'https://living.hyundailivart.co.kr/p/P200173927'
  ],
  '옷장': [
    'https://living.hyundailivart.co.kr/p/P100032088',
    'https://living.hyundailivart.co.kr/p/P100033909',
    'https://www.guud.com/shop/goodsView?itemId=187031',
    'https://www.iloom.com/product/detail.do?productCd=IFM0003A'
  ],
  '의자': [
    'https://ativ.co.kr/product/detail.html?product_no=1923&cate_no=24&display_group=1',
    'https://ativ.co.kr/product/detail.html?product_no=254&cate_no=24&display_group=1',
    'https://villarecord.com/chair/?idx=1317',
    'https://remod.co.kr/product/%EA%B0%80%EB%A6%AC%EB%AA%A8%EC%BF%A0-60-%EC%BC%80%EC%9D%B4%EC%B2%B4%EC%96%B4-1-%EC%9D%B8%EC%9A%A9-%EC%8A%A4%ED%83%A0%EB%8B%A4%EB%93%9C%EB%B8%94%EB%9E%99%EC%9B%94%EB%84%9B-kchair-one-seater-standard-black/3031/category/192/display/1/',
    'https://spacelogic.co.kr/product/detail.html?product_no=8701&cate_no=99&display_group=1',
    'https://spacelogic.co.kr/product/detail.html?product_no=1256&cate_no=227&display_group=1',
    'https://baccibfd.com/product/detail.html?product_no=22&cate_no=86&display_group=1'
  ]
};

const OUTPUT_ROOT = path.join(process.cwd(), 'public', 'external');

/**
 * Resolve a possibly relative URL against a base
 */
function toAbsoluteUrl(url, base) {
  try {
    return new URL(url, base).toString();
  } catch {
    return null;
  }
}

/**
 * Pick best representative image from a page
 */
function pickBestImage($, baseUrl) {
  const candidates = [];

  const push = (src, source) => {
    if (!src) return;
    const abs = toAbsoluteUrl(src, baseUrl);
    if (!abs) return;
    candidates.push({ url: abs, source });
  };

  // Open Graph / Twitter
  push($('meta[property="og:image"]').attr('content'), 'og:image');
  push($('meta[name="og:image"]').attr('content'), 'og:image');
  push($('meta[name="twitter:image"]').attr('content'), 'twitter:image');
  push($('link[rel="image_src"]').attr('href'), 'link:image_src');

  // Images in DOM (prefer with larger attributes)
  $('img').each((_, el) => {
    const src = el.attribs['src'] || el.attribs['data-src'] || el.attribs['data-original'];
    if (!src) return;
    const width = parseInt(el.attribs['width'] || '0', 10) || 0;
    const height = parseInt(el.attribs['height'] || '0', 10) || 0;
    const area = width * height;
    const abs = toAbsoluteUrl(src, baseUrl);
    if (!abs) return;
    candidates.push({ url: abs, source: `img(${width}x${height})`, area });
  });

  if (candidates.length === 0) return null;

  // Rank: meta candidates first, then biggest area, fallback to first
  const meta = candidates.find(c => c.source && (c.source.includes('og:') || c.source.includes('twitter')));
  if (meta) return meta.url;

  candidates.sort((a, b) => (b.area || 0) - (a.area || 0));
  return (candidates[0] && candidates[0].url) || candidates[0];
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function extFromContentType(ct) {
  if (!ct) return '.jpg';
  if (ct.includes('jpeg')) return '.jpg';
  if (ct.includes('png')) return '.png';
  if (ct.includes('webp')) return '.webp';
  if (ct.includes('gif')) return '.gif';
  if (ct.includes('svg')) return '.svg';
  return '.jpg';
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  const html = await res.text();
  return html;
}

async function downloadImage(imgUrl, outPath) {
  const res = await fetch(imgUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'Referer': new URL(imgUrl).origin,
    },
  });
  if (!res.ok) throw new Error(`Image fetch failed ${res.status} for ${imgUrl}`);
  const ct = res.headers.get('content-type') || '';
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = path.extname(new URL(imgUrl).pathname) || extFromContentType(ct);
  const finalPath = outPath + ext;
  fs.writeFileSync(finalPath, buf);
  return finalPath;
}

async function processUrl(category, url, index) {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    const imgUrl = pickBestImage($, url);
    if (!imgUrl) {
      console.warn(`[WARN] No image found for ${url}`);
      return null;
    }
    const dir = path.join(OUTPUT_ROOT, category);
    ensureDir(dir);
    const host = new URL(url).hostname.replace(/^www\./, '');
    const baseName = sanitize(`${host}-${index + 1}`);
    const outPathNoExt = path.join(dir, baseName);
    const saved = await downloadImage(imgUrl, outPathNoExt);

    // Extract title and price
    const title = extractTitle($) || new URL(url).pathname.split('/').filter(Boolean).pop() || '상품';
    const price = extractPrice($);

    console.log(`[OK] ${category} <- ${url}\n     -> ${saved}${price ? ` (₩${price.toLocaleString('ko-KR')})` : ''}`);

    return {
      category,
      url,
      imagePath: `/external/${category}/${path.basename(saved)}`,
      title,
      price,
      brand: new URL(url).hostname.replace(/^www\./, ''),
    };
  } catch (err) {
    console.error(`[ERROR] ${url}:`, err.message);
    return null;
  }
}

function extractTitle($) {
  const og = $('meta[property="og:title"], meta[name="og:title"]').attr('content');
  if (og && og.trim()) return og.trim();
  const h1 = $('h1').first().text();
  if (h1 && h1.trim()) return cleanText(h1);
  const title = $('title').text();
  return title ? cleanText(title) : null;
}

function extractPrice($) {
  // 1) Domain-specific selectors (most reliable)
  const domainSelectors = {
    'villarecord.com': ['.pitem-header-sum__price', '.price-area', '.price'],
    'seatandmore.co.kr': ['.price', '.goods_prc', '.goods_price'],
    'iloom.com': ['.price', '.price-area', 'meta[property="product:price:amount"]'],
    'store.hanssem.com': ['meta[itemprop="price"]', '.price', '.product-price'],
    'sysdesign.co.kr': ['.sum', '.price', '.goods_price'],
    'living.hyundailivart.co.kr': ['.price', '.color-red', '.final-price', '.pitem-header-sum__price'],
    'flatpoint.co.kr': ['.price', '.amount'],
    'ativ.co.kr': ['.product_price', '.xans-product-detail .price', '.price'],
    'jacksonchameleon.co.kr': ['.price', '.amount'],
    'remod.co.kr': ['.price', '.amount'],
    'spacelogic.co.kr': ['.price', '[itemprop="price"]'],
    'guud.com': ['.price', '.amount']
  };

  const hostname = (() => {
    const a = $('link[rel="canonical"]').attr('href') || $('meta[property="og:url"]').attr('content') || '';
    try { return new URL(a).hostname.replace(/^www\./,''); } catch { return null; }
  })();

  const selectors = [
    ...(hostname && domainSelectors[hostname] ? domainSelectors[hostname] : []),
    '.pitem-header-sum__price',
    '.price',
    '.total',
    '.sum',
    '.sale',
    '.amount',
    '.product-price',
    '.price-area',
    '.goods_prc',
    '.goods_price',
    'meta[property="product:price:amount"]'
  ];

  const candidates = [];

  // Plausible price range (KRW)
  const defaultMin = 10000; // 1만 원 미만은 대부분 배송비/옵션가격
  const defaultMax = 50000000; // 5천만 원 초과는 노이즈로 간주
  const domainMin = {
    'ativ.co.kr': 100000,
    'villarecord.com': 100000,
    'seatandmore.co.kr': 100000,
    'living.hyundailivart.co.kr': 100000,
    'jacksonchameleon.co.kr': 100000,
    'remod.co.kr': 100000,
  };
  const minAllowed = domainMin[hostname || ''] || defaultMin;
  const maxAllowed = defaultMax;

  // 2) JSON-LD offers parsing
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).contents().text());
      const pushOffer = (offer) => {
        if (!offer) return;
        const p = parseInt(String(offer.price || offer.lowPrice || offer.highPrice || ''), 10);
        if (p) candidates.push({ value: p, source: 'jsonld' });
      };
      if (Array.isArray(json)) json.forEach(x => pushOffer(x?.offers));
      else if (json.offers) {
        if (Array.isArray(json.offers)) json.offers.forEach(pushOffer);
        else pushOffer(json.offers);
      }
    } catch {}
  });

  // 3) DOM selectors (require currency symbol)
  for (const sel of selectors) {
    const node = $(sel).first();
    if (node && node.length) {
      const txt = node.attr('content') || node.text();
      const vals = extractAllKrwWithCurrency(txt);
      vals.forEach(v => candidates.push({ value: v, source: sel, text: txt }));
    }
  }

  // 4) Body fallback (still require currency unit)
  const bodyText = $('body').text();
  extractAllKrwWithCurrency(bodyText).forEach(v => candidates.push({ value: v, source: 'body' }));

  if (candidates.length === 0) return null;

  // Filter to plausible range
  const filtered = candidates
    .map(c => c.value)
    .filter(v => Number.isFinite(v) && v >= minAllowed && v <= maxAllowed);

  if (filtered.length === 0) {
    // As last resort, allow values >= defaultMin from JSON-LD/meta even without currency
    const relaxed = candidates
      .map(c => c.value)
      .filter(v => Number.isFinite(v) && v >= defaultMin && v <= maxAllowed);
    if (relaxed.length === 0) return null;
    return Math.max(...relaxed);
  }

  // Choose largest plausible (옵션/배송비 등 소액을 배제)
  return Math.max(...filtered);
}

function parseKrw(text) {
  if (!text) return null;
  // pick the first number followed by 원 or KRW, prioritize those near price words
  const priceRegex = /(\d{1,3}(?:[\.,]\d{3})+|\d+)(?=\s*(?:원|KRW|₩))/g;
  let match;
  let best = null;
  while ((match = priceRegex.exec(text))) {
    const raw = match[1];
    const num = parseInt(raw.replace(/[^0-9]/g, ''), 10);
    if (!best || num < best) {
      best = num; // often option totals show larger; take smaller plausible unit price
    }
  }
  return best;
}

function extractAllKrw(text) {
  if (!text) return [];
  const out = [];
  const rx = /(\d{1,3}(?:[\.,]\d{3})+|\d+)\s*(?:원|KRW|₩)?/g;
  let m;
  while ((m = rx.exec(text))) {
    const num = parseInt(m[1].replace(/[^0-9]/g, ''), 10);
    if (Number.isFinite(num)) out.push(num);
  }
  return out;
}

function extractAllKrwWithCurrency(text) {
  if (!text) return [];
  const out = [];
  const rx = /(\d{1,3}(?:[\.,]\d{3})+|\d+)\s*(원|KRW|₩)/g;
  let m;
  while ((m = rx.exec(text))) {
    const num = parseInt(m[1].replace(/[^0-9]/g, ''), 10);
    if (Number.isFinite(num)) out.push(num);
  }
  return out;
}

function cleanText(t) {
  return t.replace(/\s+/g, ' ').trim();
}

async function main() {
  ensureDir(OUTPUT_ROOT);
  const manifest = [];
  for (const [category, urls] of Object.entries(categoryToUrls)) {
    console.log(`\n=== ${category} (${urls.length}) ===`);
    for (let i = 0; i < urls.length; i++) {
      // Small delay to be polite
      // eslint-disable-next-line no-await-in-loop
      const item = await processUrl(category, urls[i], i);
      if (item) manifest.push(item);
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 300));
    }
  }
  // Merge manual overrides from existing JSON if present
  try {
    const existingPath = path.join(OUTPUT_ROOT, 'products.json');
    if (fs.existsSync(existingPath)) {
      const raw = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
      const byUrl = new Map();
      if (Array.isArray(raw)) {
        raw.forEach(r => { if (r && r.url) byUrl.set(r.url, r); });
        for (const item of manifest) {
          const ov = byUrl.get(item.url);
          if (ov) {
            if (ov.title) item.title = ov.title;
            if (typeof ov.price === 'number') item.price = ov.price;
            if (ov.brand) item.brand = ov.brand;
            if (ov.category) item.category = ov.category;
            // imagePath/url remain as scraped unless explicitly changed
          }
        }
      }
    }
  } catch (e) {
    console.warn('[WARN] Failed merging products.json overrides:', e.message);
  }
  // Write TS manifest for frontend consumption
  const outTs = path.join(process.cwd(), 'src', 'data', 'external.ts');
  const makeId = (m) => {
    const base = path.basename(m.imagePath);
    return `${m.category}-${m.brand}-${base}-${shortHash(m.url)}`;
  };
  const ts = `// Auto-generated by scrape-images.cjs\n` +
`import type { Product } from './products';\n` +
`export const externalProducts: Product[] = [\n` +
manifest.map(m => `  { id: ${JSON.stringify(makeId(m))}, name: ${JSON.stringify(m.title)}, brand: ${JSON.stringify(m.brand)}, image: ${JSON.stringify(m.imagePath)}, category: ${JSON.stringify(m.category)}, price: ${m.price || 0}, description: ${JSON.stringify(m.title)}, tags: [], externalUrl: ${JSON.stringify(m.url)} }`).join(',\n') +
`\n];\n`;
  ensureDir(path.dirname(outTs));
  fs.writeFileSync(outTs, ts, 'utf8');

  // Write JSON export for external usage
  const outJson = path.join(OUTPUT_ROOT, 'products.json');
  fs.writeFileSync(outJson, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\nDone. Images saved under public/external/, JSON at public/external/products.json, and TS manifest at src/data/external.ts`);
}

function shortHash(input) {
  const s = String(input);
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i); // djb2 variant
  }
  // Convert to unsigned 32-bit and to base36 for brevity
  return (h >>> 0).toString(36);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


