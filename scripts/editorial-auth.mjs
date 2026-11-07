import fs from 'node:fs';

const EDITORIAL_ACTIONS = new Set(['list', 'get', 'save']);

// CLI credentials live only in this process. Browser login and role checks stay on the server.
export function getEditorialCredential({ env = process.env, requireAdmin = false } = {}) {
  const session = String(env.ROBOT_IDEAS_SESSION_TOKEN || '').trim();
  if (session) return { token: session, kind: 'session' };
  const syncKey = String(env.ROBOT_IDEAS_SYNC_KEY || '').trim();
  if (syncKey && !requireAdmin) return { token: syncKey, kind: 'sync' };
  const variable = requireAdmin
    ? 'ROBOT_IDEAS_SESSION_TOKEN của phiên Google admin'
    : 'ROBOT_IDEAS_SYNC_KEY hoặc ROBOT_IDEAS_SESSION_TOKEN của phiên Google admin';
  throw new Error(`Cần cấu hình biến môi trường ${variable}. Xem GOOGLE-AUTH-SETUP.md; không lưu token vào file.`);
}

export function assertEditorialAction(action, payload, credential) {
  if (!EDITORIAL_ACTIONS.has(action)) {
    throw new Error('CLI đồng bộ chỉ cho phép list, get và save bài viết.');
  }
  if (credential.kind === 'sync' && action === 'save' && payload?.article?.status !== 'pending') {
    throw new Error('ROBOT_IDEAS_SYNC_KEY chỉ đưa bài vào pending. Cần phiên Google admin để sửa bài đã công khai.');
  }
}

export function getEditorialApiUrl({ env = process.env } = {}) {
  const configured = String(env.ROBOT_IDEAS_API_URL || '').trim();
  if (configured) return configured;
  const config = fs.readFileSync('config.js', 'utf8');
  const url = config.match(/apiUrl:\s*['"]([^'"]+)['"]/)?.[1];
  if (!url) throw new Error('Chưa cấu hình apiUrl trong config.js.');
  return url;
}

export function createEditorialClient({ env = process.env, fetchImpl = globalThis.fetch, apiUrl } = {}) {
  return async function callApi(action, payload = {}) {
    const credential = getEditorialCredential({ env });
    assertEditorialAction(action, payload, credential);
    const response = await fetchImpl(apiUrl || getEditorialApiUrl({ env }), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
      body: JSON.stringify({ action, payload: { ...payload, token: credential.token } })
    });
    if (!response.ok) throw new Error(`Lỗi kết nối máy chủ Google: ${response.status}`);
    const data = await response.json();
    if (!data.ok) {
      let message = String(data.error || 'Thao tác thất bại.');
      for (const value of [env.ROBOT_IDEAS_SESSION_TOKEN, env.ROBOT_IDEAS_SYNC_KEY]) {
        const secret = String(value || '').trim();
        if (secret) message = message.split(String(secret)).join('[đã ẩn]');
      }
      const error = new Error(message);
      error.code = data.code;
      throw error;
    }
    return data;
  };
}
