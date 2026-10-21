/**
 * Configurable business details. Nothing here is invented: fill in what you want to show.
 * Empty values are simply not rendered, and the "Become a Partner" button falls back to
 * the contact section on the page.
 */
export const SITE = {
  name: 'Speedy Fix Auto Assists',
  contact: {
    personName: '', // e.g. the partnerships contact shown on the page
    email: '',
    phone: '', // digits with country code, e.g. '+91XXXXXXXXXX'
    whatsapp: '', // digits only with country code, e.g. '91XXXXXXXXXX'
  },
  partnerSubject: 'Service center partnership with Speedy Fix',
};

export function getPartnerHref() {
  const { email, whatsapp, phone } = SITE.contact;
  if (email) return `mailto:${email}?subject=${encodeURIComponent(SITE.partnerSubject)}`;
  if (whatsapp) return `https://wa.me/${whatsapp.replace(/\D/g, '')}`;
  if (phone) return `tel:${phone}`;
  return '#contact';
}

export function hasContact() {
  const { email, phone, whatsapp } = SITE.contact;
  return Boolean(email || phone || whatsapp);
}
