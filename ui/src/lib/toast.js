let container;

function ensureContainer() {
  if (!container) {
    container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = 'var(--space-lg)';
    container.style.right = 'var(--space-lg)';
    container.style.zIndex = '1000';
    document.body.appendChild(container);
  }
}

export function toast(msg, type = 'info') {
  ensureContainer();
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.background = type === 'error' ? 'var(--color-danger)' : 'var(--color-primary)';
  el.style.color = '#fff';
  el.style.padding = 'var(--space-sm) var(--space-md)';
  el.style.marginTop = 'var(--space-sm)';
  el.style.borderRadius = 'var(--radius-sm)';
  el.style.boxShadow = 'var(--shadow-sm)';
  container.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s';
    el.style.opacity = '0';
    setTimeout(() => container.removeChild(el), 300);
  }, 3000);
}
