/*
  Playwright crawler for ILOOM categories (renders JS) and exports data/iloom-products.json
*/
// Load env
try { require('dotenv').config({ path: require('fs').existsSync('.env.local') ? '.env.local' : '.env' }); } catch {}

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const categories = [
  { key: '침실', url: 'https://www.iloom.com/product/list.do?categoryNo=1' },
  { key: '옷장', url: 'https://www.iloom.com/product/list.do?categoryNo=844' },
  { key: '거실', url: 'https://www.iloom.com/product/list.do?categoryNo=3' },
  { key: '주방', url: 'https://www.iloom.com/product/list.do?categoryNo=4' },
  { key: '키즈룸', url: 'https://www.iloom.com/product/list.do?categoryNo=5' },
  { key: '학생방', url: 'https://www.iloom.com/product/list.do?categoryNo=6' },
  { key: '서재', url: 'https://www.iloom.com/product/list.do?categoryNo=7' },
  { key: '조명', url: 'https://www.iloom.com/product/list.do?categoryNo=1055' },
];

function abs(u, base) { try { return new URL(u, base).toString(); } catch { return null; } }
function parsePrice(t){ if(!t) return null; const m=t.match(/(\d{1,3}(?:[\.,]\d{3})+|\d+)\s*(원|KRW|₩)/); return m?parseInt(m[1].replace(/[^0-9]/g,''),10):null; }

async function crawlCategory(context, cat){
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(90000);
  const out = [];
  let pageNo = 1;
  while (pageNo < 200){
    const url = cat.url + `&pageNo=${pageNo}`;
    try {
      // Block heavy resources to speed up initial DOM availability
      await page.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (type === 'image' || type === 'font' || type === 'media') {
          return route.abort();
        }
        return route.continue();
      });

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    } catch {}
    // 네트워크 안정화 조금 대기
    await page.waitForTimeout(1400 + Math.floor(Math.random() * 600));
    // 상품 카드 등장 대기(있으면)
    try { await page.waitForSelector('a[href*="product/detail.do"]', { timeout: 60000 }); } catch {}
    const items = await page.$$eval('a', (nodes) => nodes
      .filter(a => /product\/detail\.do/.test(a.getAttribute('href')||''))
      .map(a => {
        const href = a.getAttribute('href');
        const img = a.querySelector('img');
        const title = (a.textContent||'').trim() || (img?.getAttribute('alt')||'');
        const priceText = a.closest('li,div,article')?.textContent||'';
        return { href, imgSrc: img?.getAttribute('src')||img?.getAttribute('data-src')||'', title, priceText };
      })
    );
    if (items.length === 0 && pageNo > 1) break;
    const base = url;
    const seen = new Set();
    for (const it of items){
      const detail = abs(it.href, base);
      if(!detail || seen.has(detail)) continue; seen.add(detail);
      const image = abs(it.imgSrc, base);
      const price = parsePrice(it.priceText);
      out.push({
        id: `iloom-${Buffer.from(detail).toString('base64').slice(0,16)}`,
        source: 'iloom', url: detail, brand: 'iloom', title: it.title,
        category: cat.key, price: price ?? null, image_url: image
      });
    }
    console.log(`cat=${cat.key} page=${pageNo} items=${out.length}`);
    // 다음 페이지 버튼 유무 체크(없으면 break)
    const hasNext = await page.$('a:has-text("다음")') || await page.$('a.next');
    if (!hasNext && items.length === 0) break;
    pageNo++;
  }
  await page.close();
  return out;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    viewport: { width: 1366, height: 2200 },
    extraHTTPHeaders: { 'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8' }
  });
  const all = [];
  for (const cat of categories){
    const items = await crawlCategory(context, cat);
    all.push(...items);
  }
  await context.close();
  await browser.close();
  const outDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outPath = path.join(outDir, 'iloom-products.json');
  fs.writeFileSync(outPath, JSON.stringify(all, null, 2), 'utf8');
  console.log(`Saved ${all.length} items -> ${outPath}`);
})();
