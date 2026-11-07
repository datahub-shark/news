(function () {
  'use strict';
  const STORAGE_KEY = 'robot_ideas_user_session';
  const listeners = new Set();
  let verifiedSession = null, readyPromise, expiryTimer, gisPromise, configPromise;

  function emit() { for (const listener of listeners) { try { listener(verifiedSession); } catch (error) { console.error('Account listener failed', error); } } }
  function readSaved() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; } }
  function clear() {
    clearTimeout(expiryTimer); verifiedSession = null;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    emit();
  }
  function normalize(result, token) {
    const user = result.user;
    if (typeof token !== 'string' || !token || !Number.isFinite(result.expiresAt) || result.expiresAt <= Date.now() || !user || typeof user.email !== 'string' || !['admin', 'vip', 'member'].includes(user.role) || user.active !== true) throw Error('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
    return { token, expiresAt: result.expiresAt, user: { ...user } };
  }
  function accept(result, token) {
    const session = normalize(result, token);
    verifiedSession = session;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)); localStorage.removeItem('robot_ideas_admin_session'); } catch {}
    clearTimeout(expiryTimer);
    function arm() { const remaining = session.expiresAt - Date.now(); if (remaining <= 0) { clear(); return; } expiryTimer = setTimeout(arm, Math.min(remaining, 2147483647)); }
    arm(); readyPromise = Promise.resolve(session); emit(); return session;
  }
  async function request(action, payload = {}) {
    let result;
    if (window.google?.script?.run) {
      result = await new Promise((resolve, reject) => window.google.script.run.withSuccessHandler(resolve).withFailureHandler(error => reject(Error(error.message || 'Không kết nối được máy chủ.'))).adminApi(action, payload));
    } else {
      const api = window.NEWS_CONFIG?.apiUrl;
      if (!api) throw Error('Chưa cấu hình kết nối tài khoản.');
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 90000);
      try {
        const response = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ action, payload }), redirect: 'follow', signal: controller.signal });
        if (!response.ok) throw Error('Không kết nối được máy chủ tài khoản.');
        result = await response.json();
      } catch (error) { if (error.name === 'AbortError') throw Error('Hết thời gian chờ máy chủ. Vui lòng thử lại.'); throw error; }
      finally { clearTimeout(timer); }
    }
    if (!result?.ok) { const error = Error(result?.error || 'Thao tác tài khoản thất bại.'); error.code = result?.code; throw error; }
    return result;
  }
  function ready() {
    if (!readyPromise) readyPromise = (async () => {
      const saved = readSaved();
      if (!saved || typeof saved.token !== 'string' || !saved.token || !Number.isFinite(saved.expiresAt) || saved.expiresAt <= Date.now()) { clear(); return null; }
      try { const result = await request('session', { token: saved.token }); if (readSaved()?.token !== saved.token) return verifiedSession; return accept(result, saved.token); }
      catch (error) { verifiedSession = null; if (error.code === 'AUTH_REQUIRED' || error.code === 'ACCOUNT_DISABLED' || !error.code && /không hợp lệ/.test(error.message)) clear(); else emit(); throw error; }
    })().catch(error => { readyPromise = null; throw error; });
    return readyPromise;
  }
  async function call(action, payload = {}) {
    await ready();
    if (!verifiedSession) { const error = Error('Vui lòng đăng nhập Google để tiếp tục.'); error.code = 'AUTH_REQUIRED'; throw error; }
    if (verifiedSession.expiresAt <= Date.now()) { clear(); const error = Error('Phiên đăng nhập đã hết hạn.'); error.code = 'AUTH_REQUIRED'; throw error; }
    const requestToken = verifiedSession.token;
    try {
      const result = await request(action, { ...payload, token: requestToken });
      if (verifiedSession?.token !== requestToken) { const error = Error('Phiên đăng nhập đã thay đổi. Vui lòng thử lại.'); error.code = 'AUTH_REQUIRED'; throw error; }
      return result;
    }
    catch (error) { if (verifiedSession?.token === requestToken && (error.code === 'AUTH_REQUIRED' || error.code === 'ACCOUNT_DISABLED')) clear(); throw error; }
  }
  async function logout() {
    const token = verifiedSession?.token;
    clear(); readyPromise = Promise.resolve(null);
    window.google?.accounts?.id?.disableAutoSelect();
    if (token) await request('logout', { token });
  }
  function subscribe(listener) { listeners.add(listener); listener(verifiedSession); return () => listeners.delete(listener); }
  function getConfig() {
    if (!configPromise) configPromise = (async () => {
      if (window.NEWS_CONFIG?.googleClientId) return { googleClientId: window.NEWS_CONFIG.googleClientId };
      const api = window.NEWS_CONFIG?.apiUrl;
      if (!api) throw Error('Chưa cấu hình kết nối tài khoản.');
      const url = new URL(api); url.searchParams.set('action', 'authConfig');
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000);
      try { const response = await fetch(url.href, { redirect: 'follow', signal: controller.signal }); if (!response.ok) throw Error('Không tải được cấu hình đăng nhập Google.'); const config = await response.json(); if (!config?.ok) throw Error(config?.error || 'Không tải được cấu hình đăng nhập Google.'); return config; }
      finally { clearTimeout(timer); }
    })().catch(error => { configPromise = null; throw error; });
    return configPromise;
  }
  function loadGoogle() {
    if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
    if (!gisPromise) gisPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client?hl=vi'; script.async = true; script.defer = true;
      const timer = setTimeout(() => { script.remove(); gisPromise = null; reject(Error('Không tải được Google Sign-In. Kiểm tra kết nối và thử lại.')); }, 30000);
      script.onload = () => { clearTimeout(timer); if (window.google?.accounts?.id) resolve(window.google.accounts.id); else { gisPromise = null; reject(Error('Google Sign-In chưa sẵn sàng.')); } };
      script.onerror = () => { clearTimeout(timer); script.remove(); gisPromise = null; reject(Error('Không tải được Google Sign-In. Kiểm tra kết nối và thử lại.')); };
      document.head.append(script);
    });
    return gisPromise;
  }
  function node(tag, text, className) { const item = document.createElement(tag); if (text !== undefined) item.textContent = text; if (className) item.className = className; return item; }
  async function mount(element) {
    if (!element || typeof element.replaceChildren !== 'function') throw Error('Không tìm thấy vùng tài khoản.');
    element.classList.add('robot-account');
    if (window.google?.script?.run) {
      const message = node('p', 'Đăng nhập Google tại trang quản trị chính của Robot Ideas.', 'account-message');
      const link = node('a', 'Mở trang đăng nhập Google ↗', 'account-canonical-link');
      link.href = 'https://datahub-shark.github.io/news/admin.html'; link.target = '_blank'; link.rel = 'noopener noreferrer';
      element.replaceChildren(message, link); return;
    }
    let sequence = 0, signingIn = false;
    async function render(session) {
      const current = ++sequence; element.replaceChildren();
      if (session) {
        const identity = node('div', undefined, 'account-identity'); identity.append(node('strong', session.user.name || session.user.email), node('span', session.user.email), node('small', { admin: 'Quản trị viên', vip: 'VIP', member: 'Thành viên' }[session.user.role]));
        const button = node('button', 'Đăng xuất', 'account-logout'); button.type = 'button'; button.onclick = async () => { button.disabled = true; try { await logout(); } catch (error) { element.append(node('p', error.message, 'account-message')); } };
        element.append(identity, button); return;
      }
      const status = node('p', 'Đang chuẩn bị đăng nhập Google…', 'account-message'); status.setAttribute('role', 'status'); element.append(status);
      try {
        const config = await getConfig(); if (current !== sequence) return;
        if (!config.googleClientId) { status.textContent = 'Đăng nhập Google chưa được cấu hình. Chủ website cần tạo OAuth Client ID loại Web và cấu hình ứng dụng trước khi sử dụng.'; return; }
        const [googleId, challenge] = await Promise.all([loadGoogle(), request('googleChallenge')]); if (current !== sequence) return;
        if (typeof challenge.nonce !== 'string' || !challenge.nonce) throw Error('Máy chủ chưa cấp mã xác thực Google. Vui lòng thử lại.');
        const holder = node('div', undefined, 'account-google-button'); status.textContent = 'Đăng nhập hoặc tạo tài khoản bằng Google. Tài khoản mới có quyền Thành viên.'; element.append(holder);
        googleId.initialize({ client_id: config.googleClientId, nonce: challenge.nonce, auto_select: false, ux_mode: 'popup', callback: async response => {
          if (signingIn || current !== sequence) return; signingIn = true; status.textContent = 'Đang xác minh tài khoản…';
          try { if (!response?.credential) throw Error('Google chưa cung cấp thông tin đăng nhập.'); const result = await request('googleLogin', { idToken: response.credential, nonce: challenge.nonce }); if (current !== sequence) return; const session = accept(result, result.token); readyPromise = Promise.resolve(session); }
          catch (error) { await render(null); if (current < sequence) { const feedback = node('p', error.message, 'account-message account-error'); feedback.setAttribute('role', 'alert'); element.prepend(feedback); } }
          finally { signingIn = false; }
        } });
        googleId.renderButton(holder, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', locale: 'vi', width: 280 });
      } catch (error) { if (current !== sequence) return; status.textContent = error.message; const retry = node('button', 'Thử lại', 'account-retry'); retry.type = 'button'; retry.onclick = () => render(null); element.append(retry); }
    }
    try { await ready(); } catch (error) { element.replaceChildren(node('p', error.message, 'account-message')); }
    listeners.add(session => { void render(session); });
    await render(verifiedSession);
  }
  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY) return;
    clearTimeout(expiryTimer); verifiedSession = null; emit(); readyPromise = null;
    if (event.newValue) void ready().catch(() => {}); else readyPromise = Promise.resolve(null);
  });
  window.RobotAccount = Object.freeze({ ready, mount, call, get session() { return verifiedSession ? { ...verifiedSession, user: { ...verifiedSession.user } } : null; }, subscribe, logout });
})();
