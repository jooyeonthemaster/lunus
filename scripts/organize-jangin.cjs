const fs = require('fs');
const path = require('path');

const brandName = '장인가구';
const sourceDir = path.join(process.cwd(), 'data');
const targetDir = path.join(sourceDir, brandName);

if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

let all = [];

// 1. data/ 폴더에서 jangin-*.json 파일 찾기 (아직 안 옮긴 파일)
for (const file of fs.readdirSync(sourceDir)) {
  if (file.startsWith('jangin-') && file.endsWith('.json')) {
    const p = path.join(sourceDir, file);
    try {
      const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (Array.isArray(arr)) all.push(...arr);
      fs.renameSync(p, path.join(targetDir, file));
      console.log(`moved: ${file} -> ${brandName}/`);
    } catch (e) {
      console.error(`Error processing ${file}:`, e.message);
    }
  }
}

// 2. 장인가구/ 폴더 내부의 jangin-*.json 파일도 병합 (이미 옮겨진 파일)
if (fs.existsSync(targetDir)) {
  for (const file of fs.readdirSync(targetDir)) {
    if (file.startsWith('jangin-') && file.endsWith('.json')) {
      const p = path.join(targetDir, file);
      try {
        const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (Array.isArray(arr)) all.push(...arr);
        console.log(`merged: ${file} (${arr.length} items)`);
      } catch (e) {
        console.error(`Error reading ${file}:`, e.message);
      }
    }
  }
}

const merged = path.join(targetDir, 'products.json');
fs.writeFileSync(merged, JSON.stringify(all, null, 2), 'utf8');
console.log(`\n✅ products.json 생성 완료: ${all.length}개 제품`);



