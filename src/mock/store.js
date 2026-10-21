/**
 * Frontend-only mock storage. Everything lives in this browser (localStorage). It is NOT a backend and NOT shared
 * between users or devices. Components never touch it directly: they go through the services layer
 * (the services folder of each portal), which a real API client can replace later without changing any screen.
 */
export const NS = 'sf-demo:';
export const read = (k, d) => {
  try {
    const v = localStorage.getItem(NS + k);
    return v ? JSON.parse(v) : d;
  } catch {
    return d;
  }
};
export const write = (k, v) => localStorage.setItem(NS + k, JSON.stringify(v));
export const delay = (ms = 260) => new Promise((r) => setTimeout(r, ms + Math.random() * 180));
export const rid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10));
export const nowISO = () => new Date().toISOString();
export const clone = (x) => JSON.parse(JSON.stringify(x));
export const clearAll = () => {
  Object.keys(localStorage).filter((k) => k.startsWith(NS)).forEach((k) => localStorage.removeItem(k));
};
