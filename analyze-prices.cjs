const data = require('./data/premium-brands-unified.json');

console.log('='.repeat(60));
console.log('📊 LUNUS 제품 가격 분석 리포트');
console.log('='.repeat(60));
console.log(`전체 제품 수: ${data.length}개\n`);

// 가격 이상 데이터 검사
const priceIssues = data.filter(p =>
  !p.price ||
  p.price === 0 ||
  p.price < 0 ||
  p.price > 100000000 ||
  typeof p.price !== 'number'
);

console.log('🚨 가격 이상 데이터:');
console.log(`총 ${priceIssues.length}개 발견\n`);

if (priceIssues.length > 0) {
  priceIssues.forEach((p, i) => {
    console.log(`${i+1}. [${p.brand}] ${p.title}`);
    console.log(`   가격: ${p.price}원 (타입: ${typeof p.price})`);
    console.log(`   URL: ${p.productUrl}`);
    console.log('');
  });
}

// 통계 분석
const validPrices = data.filter(p => p.price > 0).map(p => p.price);
const stats = {
  total: data.length,
  min: Math.min(...validPrices),
  max: Math.max(...validPrices),
  avg: Math.round(validPrices.reduce((sum, p) => sum + p, 0) / validPrices.length),
  median: validPrices.sort((a, b) => a - b)[Math.floor(validPrices.length / 2)],
  zero: data.filter(p => p.price === 0).length,
  negative: data.filter(p => p.price < 0).length,
  tooHigh: data.filter(p => p.price > 10000000).length
};

console.log('='.repeat(60));
console.log('📈 가격 통계:');
console.log('='.repeat(60));
console.log(`최저가: ${stats.min.toLocaleString()}원`);
console.log(`최고가: ${stats.max.toLocaleString()}원`);
console.log(`평균가: ${stats.avg.toLocaleString()}원`);
console.log(`중간값: ${stats.median.toLocaleString()}원`);
console.log(`0원 제품: ${stats.zero}개`);
console.log(`음수 가격: ${stats.negative}개`);
console.log(`1천만원 초과: ${stats.tooHigh}개`);

// 브랜드별 가격 통계
console.log('\n' + '='.repeat(60));
console.log('🏪 브랜드별 가격 통계:');
console.log('='.repeat(60));

const brands = [...new Set(data.map(p => p.brand))];
brands.forEach(brand => {
  const brandProducts = data.filter(p => p.brand === brand && p.price > 0);
  if (brandProducts.length > 0) {
    const prices = brandProducts.map(p => p.price);
    const brandAvg = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);
    const brandMin = Math.min(...prices);
    const brandMax = Math.max(...prices);
    console.log(`\n[${brand}] (${brandProducts.length}개 제품)`);
    console.log(`  평균: ${brandAvg.toLocaleString()}원`);
    console.log(`  범위: ${brandMin.toLocaleString()}원 ~ ${brandMax.toLocaleString()}원`);
  }
});

// 가격대별 분포
console.log('\n' + '='.repeat(60));
console.log('💰 가격대별 분포:');
console.log('='.repeat(60));

const ranges = [
  { name: '10만원 미만', min: 0, max: 100000 },
  { name: '10만~50만원', min: 100000, max: 500000 },
  { name: '50만~100만원', min: 500000, max: 1000000 },
  { name: '100만~200만원', min: 1000000, max: 2000000 },
  { name: '200만~500만원', min: 2000000, max: 5000000 },
  { name: '500만원 이상', min: 5000000, max: Infinity }
];

ranges.forEach(range => {
  const count = data.filter(p => p.price >= range.min && p.price < range.max).length;
  const percentage = ((count / data.length) * 100).toFixed(1);
  console.log(`${range.name}: ${count}개 (${percentage}%)`);
});

// 의심스러운 가격 패턴
console.log('\n' + '='.repeat(60));
console.log('⚠️  의심스러운 가격 패턴:');
console.log('='.repeat(60));

const suspiciousPatterns = {
  roundNumbers: data.filter(p => p.price > 0 && p.price % 1000000 === 0 && p.price >= 1000000),
  oddLowPrices: data.filter(p => p.price > 0 && p.price < 10000),
  possibleErrors: data.filter(p => {
    const priceStr = p.price.toString();
    return priceStr.length > 7 || priceStr.includes('99999') || priceStr.includes('00000');
  })
};

console.log(`\n정확히 백만원 단위: ${suspiciousPatterns.roundNumbers.length}개`);
if (suspiciousPatterns.roundNumbers.length > 0) {
  suspiciousPatterns.roundNumbers.slice(0, 5).forEach(p => {
    console.log(`  - [${p.brand}] ${p.title}: ${p.price.toLocaleString()}원`);
  });
}

console.log(`\n1만원 미만 저가: ${suspiciousPatterns.oddLowPrices.length}개`);
if (suspiciousPatterns.oddLowPrices.length > 0) {
  suspiciousPatterns.oddLowPrices.forEach(p => {
    console.log(`  - [${p.brand}] ${p.title}: ${p.price.toLocaleString()}원`);
  });
}

console.log(`\n오류 가능성 있는 패턴: ${suspiciousPatterns.possibleErrors.length}개`);
if (suspiciousPatterns.possibleErrors.length > 0) {
  suspiciousPatterns.possibleErrors.slice(0, 10).forEach(p => {
    console.log(`  - [${p.brand}] ${p.title}: ${p.price.toLocaleString()}원`);
  });
}

console.log('\n' + '='.repeat(60));
console.log('✅ 분석 완료');
console.log('='.repeat(60));
