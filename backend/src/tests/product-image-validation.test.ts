import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateProductImageContent } from '../services/product-image.service.js'

test('product image validation recognizes supported JPEG, PNG, and WEBP signatures', () => {
  assert.equal(validateProductImageContent({ mimetype: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }), 'image/jpeg')
  assert.equal(validateProductImageContent({ mimetype: 'image/png', buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]) }), 'image/png')
  assert.equal(validateProductImageContent({ mimetype: 'image/webp', buffer: Buffer.from('RIFF0000WEBP') }), 'image/webp')
})

test('product image validation rejects unsupported or mismatched content signatures', () => {
  assert.throws(() => validateProductImageContent({ mimetype: 'image/jpeg', buffer: Buffer.from('not an image') }), /ชนิดไฟล์รูปภาพไม่ตรง/)
  assert.throws(() => validateProductImageContent({ mimetype: 'image/png', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }), /ชนิดไฟล์รูปภาพไม่ตรง/)
})
