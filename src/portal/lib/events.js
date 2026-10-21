/** Tiny event bus so the notification bell refreshes after any action that can create a notification. */
export const notifyChanged = () => window.dispatchEvent(new Event('sf:data-changed'));
export const onDataChanged = (fn) => {
  window.addEventListener('sf:data-changed', fn);
  return () => window.removeEventListener('sf:data-changed', fn);
};
