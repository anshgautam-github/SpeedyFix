/** Client-side validation for fast feedback. The backend must validate again; never rely on this alone. */
export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const phoneDigits = (v) => v.replace(/[\s()+-]/g, '');
export const isPhone = (v) => /^\d{7,15}$/.test(phoneDigits(v));
export const normalizeReg = (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, '');
export const isRegistration = (v) => {
  const n = normalizeReg(v);
  return n.length >= 5 && n.length <= 12 && /[A-Z]/.test(n) && /\d/.test(n);
};
export const passwordProblems = (v) => {
  const out = [];
  if (v.length < 8) out.push('at least 8 characters');
  if (!/[A-Za-z]/.test(v)) out.push('a letter');
  if (!/\d/.test(v)) out.push('a number');
  return out;
};
export const required = (v) => (String(v ?? '').trim() ? '' : 'This field is required.');
export const hasErrors = (errors) => Object.values(errors).some(Boolean);

export function validateVehicle(v) {
  const year = Number(v.year);
  const maxYear = new Date().getFullYear() + 1;
  return {
    registration: !String(v.registration || '').trim() ? 'Enter the registration number.' : !isRegistration(v.registration) ? 'Use letters and numbers only, for example KA01AB1234.' : '',
    make: required(v.make) && 'Enter the make.',
    model: required(v.model) && 'Enter the model.',
    year: !v.year ? 'Enter the year.' : !Number.isInteger(year) || year < 1980 || year > maxYear ? `Enter a year between 1980 and ${maxYear}.` : '',
    type: required(v.type) && 'Choose a vehicle type.',
  };
}

export function validatePickup(p, todayISO) {
  return {
    address: required(p.address) && 'Enter the pickup address.',
    city: required(p.city) && 'Enter the city.',
    postalCode: !p.postalCode?.trim() ? 'Enter the postal code.' : !/^[A-Za-z0-9 -]{3,10}$/.test(p.postalCode.trim()) ? 'Enter a valid postal code.' : '',
    phone: !p.phone?.trim() ? 'Enter a contact phone number.' : !isPhone(p.phone) ? 'Enter a valid phone number.' : '',
    date: !p.date ? 'Choose a pickup date.' : p.date < todayISO ? 'Choose today or a later date.' : '',
    slot: required(p.slot) && 'Choose a time slot.',
  };
}
