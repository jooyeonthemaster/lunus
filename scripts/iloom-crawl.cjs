/*
  Crawl ILOOM category listing pages and upsert into a local JSON snapshot.
  Later, embed-products.cjs will push to Supabase and create embeddings.
*/
const fs = require('fs');
// Load env from .env.local first
try { require('dotenv').config({ path: fs.existsSync('.env.local') ? '.env.local' : '.env' }); } catch {}
const path = require('path');
const cheerio = require('cheerio');

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

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return await res.text();
}

function abs(u, base) { try { return new URL(u, base).toString(); } catch { return null; } }

function parsePrice(text) {
  if (!text) return null;
  const m = text.match(/(\d{1,3}(?:[\.,]\d{3})+|\d+)\s*(원|KRW|₩)/);
  if (!m) return null;
  return parseInt(m[1].replace(/[^0-9]/g, ''), 10);
}

async function crawlCategory(cat) {
  let page = 1;
  const out = [];
  // 단순 페이지 파라미터 추정. 필요시 무한루프 + next 링크 탐지로 교체
  while (page < 200) {
    const url = cat.url + `&pageNo=${page}`;
    try {
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);
      const cards = $('a').filter((_, el) => /product\/detail\.do/.test($(el).attr('href') || ''));
      if (cards.length === 0 && page > 1) break;
      const seen = new Set();
      cards.each((_, a) => {
        const href = $(a).attr('href');
        if (!href) return;
        const detail = abs(href, url);
        if (!detail || seen.has(detail)) return;
        seen.add(detail);
        const title = $(a).text().trim() || $('img', a).attr('alt') || '';
        const img = $('img', a).attr('src') || $('img', a).attr('data-src');
        const image = img ? abs(img, url) : null;
        // 가격은 리스트에 없을 수 있어 상세에서 보강 예정
        const priceText = $(a).closest('li,div,article').text();
        const price = parsePrice(priceText);
        out.push({
          id: `iloom-${Buffer.from(detail).toString('base64').slice(0, 16)}`,
          source: 'iloom',
          url: detail,
          brand: 'iloom',
          title,
          category: cat.key,
          price: price || null,
          image_url: image,
        });
      });
    } catch (e) {
      console.warn(`[WARN] ${url}: ${e.message}`);
      break;
    }
    console.log(`cat=${cat.key} page=${page} items=${out.length}`);
    page++;
    // polite delay with jitter to avoid rate limiting
    await delay(1000 + Math.floor(Math.random() * 800));
  }
  return out;
}

async function main() {
  const all = [];
  for (const cat of categories) {
    const items = await crawlCategory(cat);
    all.push(...items);
  }
  const outDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  const outPath = path.join(outDir, `iloom-products.json`);
  fs.writeFileSync(outPath, JSON.stringify(all, null, 2), 'utf8');
  console.log(`Saved ${all.length} items -> ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });


