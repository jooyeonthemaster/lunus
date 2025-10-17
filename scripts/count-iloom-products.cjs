const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data/일룸');
const files = fs.readdirSync(dataDir)
  .filter(f => f.endsWith('.json') && f.startsWith('iloom-') && !f.includes('detail') && !f.includes('test') && !f.includes('products') && !f.includes('xhr') && !f.includes('sample'));

let total = 0;
let withHTML = 0;

console.log('📊 일룸 제품 현황:\n');

files.forEach(file => {
  const filePath = path.join(dataDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const count = data.length;
  const htmlCount = data.filter(p => p.detailHTML && p.detailHTML.length > 0).length;
  
  total += count;
  withHTML += htmlCount;
  
  console.log(`${file}: ${count}개 제품 (HTML: ${htmlCount}개)`);
});

console.log(`\n✅ 총 제품 수: ${total}개`);
console.log(`📄 HTML 있는 제품: ${withHTML}개`);
console.log(`❌ HTML 없는 제품: ${total - withHTML}개`);

