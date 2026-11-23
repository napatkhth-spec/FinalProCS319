import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isValidThaiNationalId } from '../src/features/farmers/farmer-validation.ts';

function createValidThaiNationalId() {
  const firstTwelve = '110170020345';
  const sum = [...firstTwelve].reduce((total, digit, index) => total + Number(digit) * (13 - index), 0);
  return `${firstTwelve}${(11 - (sum % 11)) % 10}`;
}

test('Thai national ID validation checks length, digits, and checksum', () => {
  const validId = createValidThaiNationalId();
  assert.equal(isValidThaiNationalId(validId), true);
  assert.equal(isValidThaiNationalId(`${validId.slice(0, 12)}${(Number(validId[12]) + 1) % 10}`), false);
  assert.equal(isValidThaiNationalId('123456789012'), false);
  assert.equal(isValidThaiNationalId('abcdefghijklm'), false);
});
