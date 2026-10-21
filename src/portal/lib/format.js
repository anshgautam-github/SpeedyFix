const dtf = (opts) => new Intl.DateTimeFormat('en-IN', opts);
export const fmtDate = (v) => (v ? dtf({ day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v)) : '');
export const fmtTime = (v) => (v ? dtf({ hour: 'numeric', minute: '2-digit' }).format(new Date(v)) : '');
export const fmtDateTime = (v) => (v ? `${fmtDate(v)}, ${fmtTime(v)}` : '');

export function relativeTime(v) {
  if (!v) return '';
  const diff = Date.now() - new Date(v).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 8 ? `${d} d ago` : fmtDate(v);
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export const firstName = (name = '') => name.trim().split(/\s+/)[0] || 'there';
export const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || 'SF';
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const vehicleLabel = (v) => (v ? [v.make, v.model].filter(Boolean).join(' ') : '');
