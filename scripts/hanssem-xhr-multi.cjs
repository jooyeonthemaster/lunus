/*
  Playwright crawler for multiple Hanssem categories (XHR-first with DOM fallback)
  - Outputs: data/hanssem-<category>.json per category
  - Env override: set HANSSEM_CATEGORIES as JSON string of [{ key, url }]
*/

// Load env (support .env.local if present)
try { require('dotenv').config({ path: require('fs').existsSync('.env.local') ? '.env.local' : '.env' }); } catch {}

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// Categories: prefer env-provided JSON; fallback to provided defaults
let categories = [];
if (process.env.HANSSEM_CATEGORIES) {
  try {
    const parsed = JSON.parse(process.env.HANSSEM_CATEGORIES);
    if (Array.isArray(parsed)) categories = parsed.filter(c => c && c.key && c.url);
  } catch (e) {
    console.error('Failed to parse HANSSEM_CATEGORIES JSON:', e.message);
  }
}
// Fallback defaults if env is missing
if (categories.length === 0) {
  categories = [
    { key: '침실', url: 'https://store.hanssem.com/category/20070' },
    { key: '거실', url: 'https://store.hanssem.com/category/20071' },
    { key: '다이닝', url: 'https://store.hanssem.com/category/20072' },
    { key: '옷장, 드레스룸', url: 'https://store.hanssem.com/category/20073' },
    { key: '키즈룸', url: 'https://store.hanssem.com/category/20074' },
    { key: '홈오피스', url: 'https://store.hanssem.com/category/20076' },
  ];
}

function absoluteUrl(urlLike, base) { try { return new URL(urlLike, base).toString(); } catch { return null; } }
function parsePrice(text) {
  if (!text) return null;
  const m = String(text).match(/(\d{1,3}(?:[\.,]\d{3})+|\d+)\s*(원|KRW|₩)?/);
  return m ? parseInt(m[1].replace(/[^0-9]/g, ''), 10) : null;
}

async function extractFromXHR(body) {
  // Try common shapes seen in modern commerce APIs
  const listCandidates = [
    body?.items,
    body?.data,
    body?.data?.list,
    body?.data?.items,
    body?.result?.items,
    body?.goods,
  ].filter(Boolean);
  const items = Array.isArray(listCandidates[0]) ? listCandidates[0] : [];
  return items.map((it) => {
    const title = String(it.goodsNm ?? it.name ?? it.title ?? it.goodsName ?? '').trim() || null;
    // Collect candidate prices and choose the minimum non-zero (treat as sale price)
    const priceCandidates = [
      it.salePrice, it.discountPrice, it.finalPrice, it.sellPrice, it.goodsSalePrice,
      it.lowPrice, it.minPrice, it.price, it.displayPrice, it.dcPrice,
    ]
      .map(v => (v == null ? null : Number(String(v).replace(/[^0-9]/g, ''))))
      .filter(v => typeof v === 'number' && v > 0);
    let price = 0;
    if (priceCandidates.length > 0) price = Math.min(...priceCandidates);
    // If only original price exists and discount rate is available, compute sale
    if ((!price || price === 0) && typeof it.discountRate === 'number' && typeof it.price === 'number') {
      const listPrice = Number(String(it.price).replace(/[^0-9]/g, '')) || 0;
      price = Math.round(listPrice * (100 - it.discountRate) / 100);
    }
    const img = it.imageUrl ?? it.thumbnailUrl ?? it.thumbnail ?? it.img ?? it.listImage ?? null;
    const id = it.goodsId ?? it.id ?? it.code ?? it.goodsNo ?? null;
    // Guess detail URL pattern when direct link missing
    const link = it.url ?? it.link ?? (id ? `/goods/${id}` : null);
    const productUrl = link ? new URL(link, 'https://store.hanssem.com').toString() : null;
    const imageUrl = img ? new URL(img, 'https://image.hanssem.com').toString() : null;
    return { title, price, productUrl, imageUrl };
  });
}

async function crawlCategory(context, cat, maxPages = 5, perCategoryLimit = 120) {
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(90000);
  const out = [];
  const seen = new Set();
  let pageNo = 1;

  // Stealth signals (Playwright: use addInitScript instead of evaluateOnNewDocument)
  await page.addInitScript(() => {
    try {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
      Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });
      Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
      window.chrome = { runtime: {}, csi: () => {}, loadTimes: () => {} };
    } catch {}
  });

  // Block heavy resources to speed up
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (type === 'font' || type === 'media' || type === 'stylesheet') return route.abort();
    return route.continue();
  });

  // XHR-first
  page.on('response', async (res) => {
    const ct = res.headers()['content-type'] || '';
    if (!ct.includes('application/json')) return;
    try {
      const url = res.url();
      if (!/goods|product|list|category|search|item/i.test(url)) return;
      const json = await res.json();
      const items = await extractFromXHR(json);
      for (const it of items) {
        const key = it.productUrl || it.title + ':' + it.imageUrl;
        if (!key || seen.has(key) || out.length >= perCategoryLimit) continue;
        seen.add(key);
        // Align schema with iloom: title, price, productUrl, imageUrl
        out.push({
          title: it.title,
          price: it.price || null,
          productUrl: it.productUrl || null,
          imageUrl: it.imageUrl || null,
        });
      }
    } catch {}
  });

  while (out.length < perCategoryLimit && pageNo <= maxPages) {
    const beforeCount = out.length;
    const url = cat.url.includes('page=') ? cat.url : `${cat.url}${cat.url.includes('?') ? '&' : '?'}page=${pageNo}`;
    let ok = false;
    for (let i = 0; i < 3; i++) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
        ok = true; break;
      } catch (e) {
        console.error(`[Retry ${i + 1}] goto failed: ${e.message}`);
        await page.waitForTimeout(1500 * (i + 1));
      }
    }
    if (!ok) break;

    await page.waitForTimeout(1200 + Math.floor(Math.random() * 600));

    // DOM fallback: extract from listing units
    const domItems = await page.$$eval('[data-goods-id], [data-gtm-tracking-good-id]', (nodes) => {
      const results = [];
      for (const n of nodes) {
        const goodsId = n.getAttribute('data-goods-id') || n.getAttribute('data-gtm-tracking-good-id');
        // Title: prefer visible text containing Hangul; fallback to image alt
        const hangul = /[\uAC00-\uD7A3]/;
        const titleCand = Array.from(n.querySelectorAll('div[color="color_chip.primary"], [data-testid="product-title"], .product_title'))
          .map(el => (el.textContent || '').trim())
          .find(t => hangul.test(t));
        const img = n.querySelector('.thumbnail-carousel__Container img[src], img[alt], img[src]');
        const title = (titleCand || img?.getAttribute('alt') || '').trim();

        // Collect all numeric prices inside this card; choose the minimum (sale)
        // Sale price: choose numeric text next to a sibling '원', prefer elements with color_chip.primary
        function pickSale() {
          const candidates = [];
          const priceNodes = n.querySelectorAll('[color="color_chip.primary"], .price, .sale');
          for (const el of Array.from(priceNodes)) {
            const txt = (el.textContent || '').trim();
            const mAll = txt.match(/\d{1,3}(?:[\.,]\d{3})+|\d{5,9}/g);
            if (mAll) {
              for (const m of mAll) {
                const val = parseInt(m.replace(/[^0-9]/g, ''), 10);
                // ignore counts like 1,164 (reviews) by requiring >= 10000
                if (val >= 10000 && val <= 100000000) {
                  // If next sibling is '원', boost this candidate
                  const sib = el.nextElementSibling;
                  const weight = (sib && /원/.test((sib.textContent || '').trim())) ? 0 : 1;
                  candidates.push({ val, weight });
                }
              }
            }
          }
          if (candidates.length === 0) return null;
          candidates.sort((a, b) => a.weight - b.weight || a.val - b.val);
          return candidates[0].val;
        }
        const priceMin = pickSale();

        // Image src: prefer product gallery image over badges
        let imgSrc = '';
        const imgCandidates = Array.from(n.querySelectorAll('img[src], img[data-src]')).map(el => el.getAttribute('src') || el.getAttribute('data-src') || '');
        imgSrc = imgCandidates.find(s => /\/gds\//.test(s)) || imgCandidates[0] || '';

        // Detail url guesses
        const a = n.querySelector('a[href*="/goods/"]') || n.closest('a');
        const href = a?.getAttribute('href') || (goodsId ? `/goods/${goodsId}` : null);
        results.push({ title, salePrice: priceMin, href, imgSrc, goodsId });
      }
      return results;
    });

    const base = page.url();
    for (const it of domItems) {
      if (out.length >= perCategoryLimit) break;
      const detail = it.href ? absoluteUrl(it.href, base) : null;
      const image = it.imgSrc ? absoluteUrl(it.imgSrc, base) : null;
      let price = it.salePrice ?? null;
      if (price == null) {
        // Fallback: if only an original price string was found earlier
        price = null;
      }
      const key = detail || (it.title + ':' + image);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      // Align schema with iloom output keys
      out.push({
        title: it.title || null,
        price: price ?? null,
        productUrl: detail,
        imageUrl: image,
      });
    }

    const added = out.length - beforeCount;
    console.log(`[cat=${cat.key}] page=${pageNo} collected=${out.length} (+${added})`);
    if (added <= 0) {
      // No new items found on this page; stop iterating further pages
      break;
    }
    pageNo++;
  }

  await page.close();
  return out;
}

(async () => {
  if (categories.length === 0) {
    console.warn('No Hanssem categories provided. Set HANSSEM_CATEGORIES env to JSON array [{ key, url }].');
  }

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    viewport: { width: 1366, height: 768 },
    timezoneId: 'Asia/Seoul',
    extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' },
  });

  const maxPages = Math.max(5, parseInt(process.env.HANSSEM_MAX_PAGES || '5', 10));
  const perCategoryLimit = parseInt(process.env.HANSSEM_PER_CATEGORY_LIMIT || '120', 10);

  const outDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  for (const cat of categories) {
    console.log(`[cat] ${cat.key} start`);
    const items = await crawlCategory(context, cat, maxPages, perCategoryLimit);
    const outPath = path.join(outDir, `hanssem-${cat.key}.json`);
    fs.writeFileSync(outPath, JSON.stringify(items, null, 2), 'utf8');
    console.log(`[cat] ${cat.key} done: ${items.length} -> ${outPath}`);
  }

  await context.close();
  await browser.close();
  console.log('Saved per-category Hanssem files under data/');
})();


