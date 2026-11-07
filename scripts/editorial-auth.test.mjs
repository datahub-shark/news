import test from 'node:test';
import assert from 'node:assert/strict';
import { getEditorialCredential, createEditorialClient } from './editorial-auth.mjs';

test('missing CLI credentials fail before any network request', async () => {
  let requests = 0;
  const callApi = createEditorialClient({ env: {}, fetchImpl: async () => { requests++; } });
  await assert.rejects(callApi('list'), /biến môi trường/);
  assert.equal(requests, 0);
});

test('admin session wins over import key and published editing requires a session', () => {
  const env = { ROBOT_IDEAS_SYNC_KEY: 'test-import-key', ROBOT_IDEAS_SESSION_TOKEN: 'test-session' };
  assert.deepEqual(getEditorialCredential({ env }), { kind: 'session', token: 'test-session' });
  assert.throws(() => getEditorialCredential({ env: { ROBOT_IDEAS_SYNC_KEY: 'test-import-key' }, requireAdmin: true }), /phiên Google admin/);
});

test('import credentials cannot call account, project, or publishing actions', async () => {
  let requests = 0;
  const callApi = createEditorialClient({
    env: { ROBOT_IDEAS_SYNC_KEY: 'test-import-key' },
    apiUrl: 'https://example.invalid/exec',
    fetchImpl: async () => { requests++; }
  });
  for (const action of ['saveUser', 'users', 'saveProject', 'googleLogin', 'logout']) {
    await assert.rejects(callApi(action), /chỉ cho phép/);
  }
  for (const status of ['published', 'rejected', undefined]) {
    await assert.rejects(callApi('save', { article: { status } }), /pending/);
  }
  assert.equal(requests, 0);
});

test('pending import sends only configured credentials with JSON envelope', async () => {
  let sent;
  const callApi = createEditorialClient({
    env: { ROBOT_IDEAS_SYNC_KEY: 'test-import-key' },
    apiUrl: 'https://example.invalid/exec',
    fetchImpl: async (url, options) => {
      sent = { url, options, body: JSON.parse(options.body) };
      return { ok: true, json: async () => ({ ok: true, article: { id: 'a1' } }) };
    }
  });
  const result = await callApi('save', { token: 'untrusted-payload-token', article: { status: 'pending' } });
  assert.equal(result.article.id, 'a1');
  assert.equal(sent.url, 'https://example.invalid/exec');
  assert.equal(sent.options.method, 'POST');
  assert.equal(sent.body.payload.token, 'test-import-key');
  assert.equal(sent.body.action, 'save');
});

test('backend auth errors preserve code and redact credentials', async () => {
  const callApi = createEditorialClient({
    env: { ROBOT_IDEAS_SESSION_TOKEN: ' test-session ' },
    apiUrl: 'https://example.invalid/exec',
    fetchImpl: async () => ({ ok: true, json: async () => ({ ok: false, code: 'AUTH_REQUIRED', error: 'Expired test-session' }) })
  });
  await assert.rejects(callApi('list'), error => {
    assert.equal(error.code, 'AUTH_REQUIRED');
    assert.equal(error.message, 'Expired [đã ẩn]');
    return true;
  });
});
