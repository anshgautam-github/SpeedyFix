/** Shared helpers for the scene timelines. Everything is reversible so scrubbing backwards works. */
export const fmtINR = (n) => `\u20B9${new Intl.NumberFormat('en-IN').format(Math.round(n))}`;

export const makeQuery = (root) => ({
  q: (sel) => root.querySelector(sel),
  qa: (sel) => Array.from(root.querySelectorAll(sel)),
});

/** Types the text stored in data-type into the element, driven by timeline progress. */
export function typeInto(tl, el, at, dur) {
  if (!el) return;
  const full = el.dataset.type || '';
  const p = { n: 0 };
  el.textContent = '';
  tl.fromTo(
    p,
    { n: 0 },
    {
      n: full.length,
      duration: dur,
      ease: 'none',
      onUpdate() {
        el.textContent = full.slice(0, Math.round(p.n));
      },
    },
    at
  );
}

export function restoreTyped(root) {
  root.querySelectorAll('[data-type]').forEach((el) => {
    el.textContent = el.dataset.type;
  });
}

export const sceneIn = (tl, root, at, dur = 1.4) =>
  tl.fromTo(root, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: dur, ease: 'power2.out' }, at);

export const sceneOut = (tl, root, at, dur = 1) =>
  tl.to(root, { autoAlpha: 0, y: -18, duration: dur, ease: 'power1.in' }, at);

export const partIn = (tl, el, at, dur = 1.1) =>
  tl.fromTo(el, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: dur, ease: 'power2.out' }, at);

export const partOut = (tl, el, at, dur = 0.9) =>
  tl.to(el, { autoAlpha: 0, y: -14, duration: dur, ease: 'power1.in' }, at);

/** Lights up a status row: dot fills, label brightens, check scales in. */
export function activateRow(tl, row, at, dur = 0.9) {
  if (!row) return;
  const dot = row.querySelector('[data-dot]');
  const check = row.querySelector('[data-check]');
  tl.fromTo(row, { opacity: 0.4 }, { opacity: 1, duration: dur, ease: 'power2.out' }, at);
  if (dot) tl.fromTo(dot, { backgroundColor: '#1a2850', borderColor: '#2b3f70' }, { backgroundColor: '#1F6BFF', borderColor: '#5BA2FF', duration: dur, ease: 'power2.out' }, at);
  if (check) tl.fromTo(check, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: dur, ease: 'back.out(2)' }, at);
}

/** Six digit boxes: digits appear in turn, then the boxes turn green and the chip appears. */
export function otpSequence(tl, root, at, { digitGap = 0.45, verifyAt } = {}) {
  const boxes = Array.from(root.querySelectorAll('[data-otp-box]'));
  const digits = Array.from(root.querySelectorAll('[data-otp-digit]'));
  const waiting = root.querySelector('[data-otp-wait]');
  const ok = root.querySelector('[data-otp-ok]');
  boxes.forEach((box, i) => {
    tl.fromTo(box, { borderColor: 'rgba(255,255,255,.14)' }, { borderColor: '#5BA2FF', duration: 0.3 }, at + i * digitGap);
  });
  boxes.forEach((box) => { box.style.backgroundColor = 'rgba(255,255,255,.04)'; });
  digits.forEach((d, i) => {
    tl.fromTo(d, { autoAlpha: 0, y: 8, scale: 0.7 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(2.4)' }, at + i * digitGap);
  });
  const vAt = verifyAt ?? at + digits.length * digitGap + 0.5;
  tl.fromTo(
    boxes,
    { backgroundColor: 'rgba(255,255,255,.04)', borderColor: '#5BA2FF' },
    { backgroundColor: 'rgba(52,211,153,.12)', borderColor: '#34D399', duration: 0.5, stagger: 0.05, immediateRender: false },
    vAt
  );
  if (waiting) tl.fromTo(waiting, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.4 }, vAt);
  if (ok) tl.fromTo(ok, { autoAlpha: 0, y: 8, scale: 0.92 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.7, ease: 'back.out(2)' }, vAt + 0.2);
  return vAt + 1;
}
