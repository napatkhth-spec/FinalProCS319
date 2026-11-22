import assert from 'node:assert/strict';
import { test } from 'node:test';
import { uploadProductImages, validateProductImageContent } from '../services/product-image.service.js';

test('product image validation recognizes supported JPEG, PNG, and WEBP signatures', () => {
  assert.equal(
    validateProductImageContent({ mimetype: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }),
    'image/jpeg',
  );
  assert.equal(
    validateProductImageContent({
      mimetype: 'image/png',
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    }),
    'image/png',
  );
  assert.equal(
    validateProductImageContent({ mimetype: 'image/webp', buffer: Buffer.from('RIFF0000WEBP') }),
    'image/webp',
  );
});

test('product image validation rejects unsupported or mismatched content signatures', () => {
  assert.throws(
    () => validateProductImageContent({ mimetype: 'image/jpeg', buffer: Buffer.from('not an image') }),
    /ชนิดไฟล์รูปภาพไม่ตรง/,
  );
  assert.throws(
    () =>
      validateProductImageContent({ mimetype: 'image/png', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }),
    /ชนิดไฟล์รูปภาพไม่ตรง/,
  );
});

test('product image upload rejects files larger than 5 MB before accessing the database', async () => {
  await assert.rejects(
    uploadProductImages('user-id', 'product-id', [
      { mimetype: 'image/jpeg', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) },
    ]),
    (error: unknown) => error instanceof Error && error.message === 'รูปภาพต้องมีขนาดไม่เกิน 5 MB ต่อไฟล์',
  );
});

test('product image upload rejects a primary index outside the selected file list', async () => {
  await assert.rejects(
    uploadProductImages(
      'user-id',
      'product-id',
      [{ mimetype: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff]) }],
      1,
    ),
    /Invalid primary image selection/,
  );
});
