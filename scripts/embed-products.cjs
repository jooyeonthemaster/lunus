/*
  Read crawled products (data/iloom-products.json or public/external/products.json),
  generate embeddings with Gemini, and upsert into Supabase (products, product_features).
*/
const fs = require('fs');
try { require('dotenv').config({ path: fs.existsSync('.env.local') ? '.env.local' : '.env' }); } catch {}
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function readProducts() {
  const candidates = [
    path.join(process.cwd(), 'data', 'iloom-products.json'),
    path.join(process.cwd(), 'public', 'external', 'products.json')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  throw new Error('No input products file found.');
}

async function embedImageUrl(url) {
  // Use REST endpoint for image embeddings (stable across SDK versions)
  const apiKey = process.env.GEMINI_API_KEY;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/image-embedding-001:embedImage?key=${apiKey}`;
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: { url } })
  });
  if (!resp.ok) throw new Error(`embedImage REST ${resp.status}`);
  const data = await resp.json();
  const values = data?.embedding?.values;
  if (!values) throw new Error('No embedding returned');
  return values;
}

async function embedText(text) {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const res = await model.embedContent(text || '');
  return res.embedding.values;
}

async function upsertProduct(p) {
  const id = p.id || `iloom-${Buffer.from(p.url).toString('base64').slice(0,16)}`;
  const { error: e1 } = await supabase
    .from('products')
    .upsert({
      id,
      source: p.source || 'iloom',
      url: p.url,
      brand: p.brand || 'iloom',
      title: p.title,
      category: p.category,
      price: p.price ?? null,
      currency: 'KRW',
      image_url: p.image_url || p.imagePath || null,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (e1) throw e1;

  const [imgEmb, txtEmb] = await Promise.all([
    p.image_url ? embedImageUrl(p.image_url) : embedImageUrl(new URL(p.imagePath, 'http://localhost').toString()),
    embedText(p.title)
  ]);

  const { error: e2 } = await supabase
    .from('product_features')
    .upsert({ product_id: id, img_embedding: imgEmb, txt_embedding: txtEmb, updated_at: new Date().toISOString() });
  if (e2) throw e2;
  return id;
}

async function main() {
  const products = await readProducts();
  let ok = 0, fail = 0;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    try {
      await upsertProduct(p);
      ok++;
    } catch (e) {
      fail++;
      console.warn('[WARN] upsert failed', p.url, e.message);
    }
    if (i % 8 === 7) await new Promise(r => setTimeout(r, 500));
  }
  console.log(`Done. ok=${ok} fail=${fail}`);
}

main().catch(err => { console.error(err); process.exit(1); });


