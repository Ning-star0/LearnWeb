import assert from 'node:assert/strict';
import test from 'node:test';
import { decryptSecret, encryptSecret } from './secret-box';

test('API 密钥可以加密后还原，且密文不包含原文', () => {
  const previous = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = 'test-secret-with-at-least-thirty-two-characters';
  try {
    const encrypted = encryptSecret('sk-private-example');
    assert.equal(encrypted.includes('sk-private-example'), false);
    assert.equal(decryptSecret(encrypted), 'sk-private-example');
  } finally {
    if (previous === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = previous;
  }
});
