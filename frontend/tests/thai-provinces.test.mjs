import assert from 'node:assert/strict';
import { test } from 'node:test';
import { THAI_PROVINCES } from '../src/constants/thai-provinces.ts';

test('Thai province selection contains all 77 unique provinces', () => {
  assert.equal(THAI_PROVINCES.length, 77);
  assert.equal(new Set(THAI_PROVINCES).size, 77);
  assert.ok(THAI_PROVINCES.includes('กรุงเทพมหานคร'));
  assert.ok(THAI_PROVINCES.includes('บึงกาฬ'));
});
