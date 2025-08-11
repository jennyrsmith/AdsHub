export function showToast(message, type = 'error') {
  const el = document.createElement('div');
  el.textContent = message;
  el.style.position = 'fixed';
  el.style.top = '16px';
  el.style.right = '16px';
  el.style.padding = '10px 14px';
  el.style.borderRadius = '8px';
  el.style.background = type === 'success' ? '#10b981' : '#ef4444';
  el.style.color = '#fff';
  el.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
  el.style.zIndex = '9999';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}
