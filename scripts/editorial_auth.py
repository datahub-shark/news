"""Environment-only credentials for owner-run editorial imports."""
import os
import re
from pathlib import Path


def get_editorial_token(require_admin=False):
    session = os.environ.get('ROBOT_IDEAS_SESSION_TOKEN', '').strip()
    if session:
        return session
    sync_key = os.environ.get('ROBOT_IDEAS_SYNC_KEY', '').strip()
    if sync_key and not require_admin:
        return sync_key
    raise RuntimeError('Cần ROBOT_IDEAS_SESSION_TOKEN của phiên Google admin hoặc '
                       'ROBOT_IDEAS_SYNC_KEY trong môi trường. Xem GOOGLE-AUTH-SETUP.md; '
                       'không lưu token vào file.')


def get_editorial_api_url():
    configured = os.environ.get('ROBOT_IDEAS_API_URL', '').strip()
    if configured:
        return configured
    config = Path('config.js').read_text(encoding='utf-8')
    match = re.search(r'''apiUrl:\s*['"]([^'"]+)['"]''', config)
    if not match:
        raise RuntimeError('Chưa cấu hình apiUrl trong config.js.')
    return match.group(1)


def assert_editorial_action(action, payload):
    if action not in ('list', 'get', 'save'):
        raise RuntimeError('CLI đồng bộ chỉ cho phép list, get và save bài viết.')
    using_session = bool(os.environ.get('ROBOT_IDEAS_SESSION_TOKEN', '').strip())
    if not using_session and action == 'save' and payload.get('article', {}).get('status') != 'pending':
        raise RuntimeError('SYNC_KEY chỉ đưa bài vào pending. Cần ROBOT_IDEAS_SESSION_TOKEN '
                           'của phiên Google admin để sửa bài đã công khai.')


def redact_editorial_error(error):
    message = str(error)
    for variable in ('ROBOT_IDEAS_SESSION_TOKEN', 'ROBOT_IDEAS_SYNC_KEY'):
        secret = os.environ.get(variable, '').strip()
        if secret:
            message = message.replace(secret, '[đã ẩn]')
    return message
