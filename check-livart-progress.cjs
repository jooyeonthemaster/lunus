const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data', '리바트');

const files = [
  'livart-거실장, 거실 테이블.json',
  'livart-소파.json',
  'livart-수납장, 서랍.json',
  'livart-식탁.json',
  'livart-옷장, 드레스룸.json',
  'livart-의자.json',
  'livart-조명.json',
  'livart-책상, 책장.json',
  'livart-침대, 메트리스.json',
  'livart-키즈, 주니어.json',
  'livart-화장대, 거울, 스툴.json'
];

let totalScraped = 0;
let totalProducts = 0;

console.log('\n📊 리바트 스크래핑 진행 상황:\n');

files.forEach((file, idx) => {
  const filePath = path.join(DATA_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const scraped = data.filter(p => p.detailImage1 || p.detailImage2 || p.detailImage3).length;

  totalScraped += scraped;
  totalProducts += data.length;

  const status = scraped === data.length ? '✅' : scraped > 0 ? '🔄' : '⏸️';
  console.log(`${status} [${idx + 1}/11] ${file}`);
  console.log(`   → ${scraped}/${data.length} 완료`);
});

console.log(`\n📈 전체: ${totalScraped}/${totalProducts} (${Math.round(totalScraped/totalProducts*100)}%)\n`);
