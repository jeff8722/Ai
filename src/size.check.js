// Run: node src/size.check.js
import assert from 'node:assert/strict';
import { isSaree, recommendSize } from './size.js';

const top = dept => ({ department: dept, tryon_category: 'tops' });
const man = { height: 175, weight: 70 };
const woman = { height: 160, weight: 55 };

assert.equal(recommendSize(top('men'), man), 'M');
assert.equal(recommendSize(top('men'), { ...man, fit: 'loose' }), 'L');
assert.equal(recommendSize(top('men'), { height: 170, weight: 140 }), '4XL+');
assert.equal(recommendSize({ department: 'men', tryon_category: 'bottoms' }, { ...man, fit: 'loose' }), 'Waist 32');
assert.equal(recommendSize(top('women'), woman), 'S');
assert.equal(recommendSize({ department: 'women', tryon_category: 'bottoms' }, woman), 'S');
assert.equal(recommendSize({ department: 'women', tryon_category: 'one-pieces', category: 'Silk Sarees' }, woman), 'Free size, blouse 34');
assert.equal(recommendSize(top('kids'), { height: 120 }), '6–7 Y');
assert.equal(recommendSize(top('kids'), { height: 120, fit: 'loose' }), '7–8 Y');
assert.equal(recommendSize(top('kids'), { height: 180 }), 'Adult sizes');
assert.equal(recommendSize({ department: 'footwear', tryon_category: null }, man), null);
assert.equal(recommendSize(top('men'), { height: 175 }), null);

assert.ok(isSaree({ category: 'Sarees' }) && isSaree({ category: 'Ethnic', name: 'Kanjivaram sari' }) && isSaree({ category: 'Half-saree' }));
assert.ok(!isSaree({ category: 'Safari jackets' }) && !isSaree({ category: 'Sarongs' }));
console.log('size ok');
