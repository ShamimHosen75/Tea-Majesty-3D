import gsap from 'gsap';
import { BLENDS, CURRENCY, PACKS, WHATSAPP_NUMBER, WHOLESALE_PACKS, priceFor } from '../data/blends.js';
import { $, $$ } from './helpers.js';

/** Order modal with Personal / Wholesale modes, live total, validation and a WhatsApp hand-off. */
export const initModal = ({ lenis, toast }) => {
  const modal = $('#orderModal');
  const card = $('.modal__card', modal);
  const backdrop = $('.modal__backdrop', modal);
  const form = $('#orderForm');
  const seg = $('.seg', modal);
  const blendSel = $('#fBlend');
  const packSel = $('#fPack');
  const total = $('#fTotal');
  let mode = 'personal';
  let lastFocus = null;

  BLENDS.forEach((b) => blendSel.add(new Option(b.name, b.id)));

  const packs = () => (mode === 'personal' ? PACKS : WHOLESALE_PACKS);

  const fillPacks = (selected) => {
    packSel.replaceChildren(...packs().map((p) => new Option(p.label + (p.id === '500' ? ' · Recommended' : ''), p.id)));
    if (selected && packs().some((p) => p.id === selected)) packSel.value = selected;
    else packSel.value = packs()[mode === 'personal' ? 1 : 0].id;
  };

  const updateTotal = () => {
    const blend = BLENDS.find((b) => b.id === blendSel.value);
    const pack = packs().find((p) => p.id === packSel.value);
    total.textContent = `${CURRENCY}${priceFor(blend, pack).toLocaleString('en-US')}`;
  };

  const setMode = (next) => {
    mode = next;
    seg.classList.toggle('is-wholesale', mode === 'wholesale');
    form.classList.toggle('is-wholesale-form', mode === 'wholesale');
    $$('.seg__btn', modal).forEach((b) => {
      b.classList.toggle('is-active', b.dataset.mode === mode);
      b.setAttribute('aria-selected', b.dataset.mode === mode);
    });
    $('.submit-label', modal).textContent = mode === 'personal' ? 'Submit personal order' : 'Request wholesale quote';
    $('.lbl-pack', modal).textContent = mode === 'personal' ? 'Pack size' : 'Bulk volume';
    $('[name="business"]', form).required = mode === 'wholesale';
    fillPacks();
    updateTotal();
  };

  const open = ({ blend, pack } = {}) => {
    lastFocus = document.activeElement;
    modal.classList.remove('is-success');
    if (blend) blendSel.value = blend;
    if (mode !== 'personal' && pack) setMode('personal');
    fillPacks(pack);
    updateTotal();
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    lenis?.stop();
    gsap.to(backdrop, { opacity: 1, duration: 0.5, ease: 'power2.out' });
    gsap.fromTo(card, { opacity: 0, y: 40, scale: 0.94, rotationX: 12 }, { opacity: 1, y: 0, scale: 1, rotationX: 0, duration: 0.8, ease: 'expo.out' });
    gsap.from($$('.field, .form__total, .form__actions', form), { opacity: 0, y: 14, duration: 0.5, stagger: 0.04, delay: 0.15, ease: 'power3.out' });
    setTimeout(() => blendSel.focus({ preventScroll: true }), 300);
  };

  const close = () => {
    gsap.to(card, { opacity: 0, y: 30, scale: 0.96, duration: 0.35, ease: 'power2.in' });
    gsap.to(backdrop, {
      opacity: 0,
      duration: 0.4,
      onComplete: () => {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        lenis?.start();
        lastFocus?.focus?.({ preventScroll: true });
      },
    });
  };

  const validate = () => {
    let ok = true;
    $$('input', form).forEach((input) => {
      const field = input.closest('.field');
      const bad = input.required && (!input.value.trim() || (input.name === 'phone' && input.value.replace(/\D/g, '').length < 8));
      field.classList.toggle('is-invalid', bad);
      if (bad && ok) {
        input.focus();
        ok = false;
      }
    });
    return ok;
  };

  const summary = () => {
    const data = Object.fromEntries(new FormData(form));
    const blend = BLENDS.find((b) => b.id === data.blend);
    const pack = packs().find((p) => p.id === data.pack);
    return { data, blend, pack };
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate()) return;
    const { data } = summary();
    // No backend yet: this is where the order would be POSTed to an API / form service.
    $('.success__name', modal).textContent = data.name.split(' ')[0];
    modal.classList.add('is-success');
    gsap.from('.success__badge', { scale: 0, rotation: -90, duration: 0.9, ease: 'elastic.out(1, 0.5)' });
    gsap.from('.modal__success > :not(.success__badge)', { opacity: 0, y: 14, stagger: 0.08, delay: 0.2 });
    form.reset();
  });

  $('#waBtn').addEventListener('click', () => {
    const { data, blend, pack } = summary();
    const lines = [
      `Hello Tea Majesty! I'd like to place a ${mode} order.`,
      `Blend: ${blend.name}`,
      `Pack: ${pack.label}`,
      `Total: ${total.textContent}`,
      data.business && `Business: ${data.business}`,
      data.name && `Name: ${data.name}`,
      data.city && `City: ${data.city}`,
      data.note && `Note: ${data.note}`,
    ].filter(Boolean);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
  });

  $$('.seg__btn', modal).forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  blendSel.addEventListener('change', updateTotal);
  packSel.addEventListener('change', updateTotal);
  $$('input', form).forEach((i) => i.addEventListener('input', () => i.closest('.field').classList.remove('is-invalid')));
  $$('[data-close]', modal).forEach((b) => b.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('is-open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const focusables = $$('button, input, select, a[href]', card).filter((el) => el.offsetParent !== null);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  setMode('personal');
  return { open, close, toast };
};
