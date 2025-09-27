import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

type Product = {
  title?: string | null;
  name?: string | null;
  price?: number | string | null;
  priceText?: number | string | null;
  productUrl?: string | null;
  imageUrl?: string | null;
};

function isArray(value: unknown): value is any[] {
  return Array.isArray(value);
}

function parseNumber(n: unknown): number | null {
  if (n == null) return null;
  if (typeof n === 'number' && Number.isFinite(n)) return n;
  if (typeof n === 'string') {
    const only = n.replace(/[^0-9]/g, '');
    if (only.length === 0) return null;
    const parsed = parseInt(only, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalize(p: Product) {
  const title = (p.title ?? p.name ?? null) as string | null;
  const price = parseNumber(p.price ?? p.priceText ?? null);
  const productUrl = (p.productUrl ?? null) as string | null;
  const imageUrl = (p.imageUrl ?? null) as string | null;
  return { title, price, productUrl, imageUrl };
}

function walkJsonFiles(startDir: string): string[] {
  const out: string[] = [];
  const stack: string[] = [startDir];
  const ignore = new Set(['node_modules', '.next', '.git']);
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: string[] = [];
    try { entries = fs.readdirSync(dir); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(dir, entry);
      let stat: fs.Stats;
      try { stat = fs.statSync(full); } catch { continue; }
      if (stat.isDirectory()) {
        if (!ignore.has(entry)) stack.push(full);
      } else if (entry.toLowerCase().endsWith('.json')) {
        out.push(full);
      }
    }
  }
  return out;
}

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const files = walkJsonFiles(dataDir);
    const seen = new Set<string>();
    const products: Array<{
      title: string | null;
      price: number | null;
      productUrl: string | null;
      imageUrl: string | null;
      origin: { group: string; file: string; path: string; category: string | null };
    }> = [];

    for (const file of files) {
      try {
        const raw = fs.readFileSync(file, 'utf8');
        const json = JSON.parse(raw);
        if (!isArray(json)) continue;
        const relPath = path.relative(dataDir, file);
        const segs = relPath.split(path.sep);
        const group = segs.length > 1 ? segs[0] : 'root';
        const fileBase = path.basename(file);
        const fileNameNoExt = fileBase.replace(/\.json$/i, '');
        let categoryFromFile: string | null = null;
        const dashIdx = fileNameNoExt.indexOf('-');
        if (dashIdx >= 0 && dashIdx < fileNameNoExt.length - 1) {
          categoryFromFile = fileNameNoExt.slice(dashIdx + 1);
        } else {
          categoryFromFile = fileNameNoExt;
        }
        for (const item of json) {
          const prod = normalize(item || {});
          const key = prod.productUrl || `${prod.title}|${prod.imageUrl}`;
          if (!key || seen.has(key)) continue;
          seen.add(key);
          products.push({
            ...prod,
            origin: { group, file: fileBase, path: relPath, category: categoryFromFile },
          });
        }
      } catch { /* ignore bad files */ }
    }

    return NextResponse.json({ success: true, message: `총 ${products.length}개 상품`, products });
  } catch (e: any) {
    return NextResponse.json({ success: false, message: '로컬 데이터 로드 실패', error: e?.message || 'unknown' }, { status: 500 });
  }
}


