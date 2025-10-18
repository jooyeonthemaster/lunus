const fs = require('fs');
const path = require('path');

const dataDir = path.join(process.cwd(), 'data', '우아미');
const files = [
  'wooami-거실소파.json',
  'wooami-거실장.json',
  'wooami-매트리스.json',
  'wooami-서랍장.json',
  'wooami-장롱.json',
  'wooami-주방.json',
  'wooami-침대.json',
  'wooami-홈오피스.json',
  'wooami-화장대.json'
];

console.log('📊 우아미 크롤링 진행 상황\n');
console.log('='.repeat(60));

let totalProducts = 0;
let totalWithDetails = 0;

files.forEach((file, index) => {
  const filePath = path.join(dataDir, file);
  if (fs.existsSync(filePath)) {
    const products = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const withDetails = products.filter(p => p.detailImages && p.detailImages.length > 0).length;
    const percent = Math.round((withDetails / products.length) * 100);
    const status = percent === 100 ? '✅' : percent > 0 ? '🔄' : '⏸️';
    
    console.log(`${status} ${index + 1}. ${file.replace('wooami-', '').replace('.json', '')}`);
    console.log(`   ${withDetails}/${products.length} (${percent}%)`);
    
    totalProducts += products.length;
    totalWithDetails += withDetails;
  }
});

console.log('='.repeat(60));
console.log(`\n📈 전체: ${totalWithDetails}/${totalProducts} (${Math.round((totalWithDetails/totalProducts)*100)}%)`);
console.log(`✅ 완료: ${totalWithDetails}개`);
console.log(`⏸️ 남음: ${totalProducts - totalWithDetails}개\n`);



