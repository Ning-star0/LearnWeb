import assert from 'node:assert/strict';
import test from 'node:test';
import { strToU8, zipSync } from 'fflate';
import { inspectImportZip, normalizeZipPath, resolveZipImagePath } from './zip.ts';

test('安全读取标准 questions 和 images 目录', () => {
  const archive = zipSync({
    'questions/one.md': strToU8('---\nschema_version: "1.0"\n---\n'),
    'images/one.png': new Uint8Array([137, 80, 78, 71]),
  });
  const result = inspectImportZip(archive);
  assert.equal(result.markdownSources[0].name, 'questions/one.md');
  assert.equal(result.images.has('images/one.png'), true);
});

test('拒绝路径穿越和绝对路径', () => {
  assert.throws(() => normalizeZipPath('../secret.txt'), /路径穿越/);
  assert.throws(() => normalizeZipPath('/etc/passwd'), /不安全路径/);
  assert.throws(() => normalizeZipPath('C:\\secret.txt'), /不安全路径/);
});

test('拒绝规范目录之外的文件', () => {
  const archive = zipSync({ 'other.txt': strToU8('no') });
  assert.throws(() => inspectImportZip(archive), /只允许/);
});

test('解析 Markdown 中相对于 questions 的图片路径', () => {
  assert.equal(resolveZipImagePath('questions/one.md', 'images/one.png'), 'images/one.png');
  assert.throws(() => resolveZipImagePath('questions/one.md', '../images/one.png'), /路径穿越/);
});
