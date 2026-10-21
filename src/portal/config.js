/**
 * Portal mode. "demo" (default) uses src/portal/services/demoAdapter.js: data lives in this browser only.
 * "remote" uses src/portal/services/remoteAdapter.js, which you connect to your real backend.
 * Set VITE_PORTAL_MODE=remote in your environment once the adapter is implemented.
 */
export const PORTAL_MODE = import.meta.env.VITE_PORTAL_MODE || 'demo';
export const IS_DEMO = PORTAL_MODE !== 'remote';
