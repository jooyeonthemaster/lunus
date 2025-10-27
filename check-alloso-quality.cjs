const data = require('./data/premium-brands-unified.json');

const alloso = data.filter(p => p.brand === '알로소');
const incomplete = alloso.filter(p =>
  !p.title || !p.price || !p.productUrl || !p.imageUrl
);

console.log('알로소 전체:', alloso.length, '개');
console.log('완전한 데이터:', (alloso.length - incomplete.length), '개');
console.log('불완전한 데이터:', incomplete.length, '개');

if (incomplete.length > 0) {
  console.log('\n불완전한 제품:');
  incomplete.forEach((p, i) => {
    console.log(`${i+1}. ${p.title || '제목없음'}`);
    console.log('   price:', p.price || 'X');
    console.log('   productUrl:', p.productUrl ? 'O' : 'X');
    console.log('   imageUrl:', p.imageUrl ? 'O' : 'X');
  });
}

// 카테고리 분포
const categories = {};
alloso.forEach(p => {
  const cat = p.category || '미분류';
  categories[cat] = (categories[cat] || 0) + 1;
});

console.log('\n알로소 카테고리 분포:');
Object.entries(categories)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}개`);
  });
