import gsap from 'gsap';
import { BLENDS, PACKS, priceFor } from '../data/blends.js';
import { $, $$ } from './helpers.js';

/** The product showcase: tabs, a tiltable 3D pouch, pack sizes and an animated price. */
export const initBlends = ({ onOrder }) => {
  const section = $('#blends');
  const tabsEl = $('.blends__tabs', section);
  const pouch = $('#pouch');
  const face = $('.pouch__face', pouch);
  const wrap = $('.pouch-wrap', section);
  const info = $('.blends__info', section);
  const priceVal = $('.price__val', section);
  const priceUnit = $('.price__unit', section);
  const count = $('.blends__count', section);

  let index = 0;
  let pack = PACKS[1];
  let busy = false;
  const priceState = { v: priceFor(BLENDS[0], pack) };

  BLENDS.forEach((b, i) => {
    const btn = document.createElement('button');
    btn.className = 'tab';
    btn.setAttribute('role', 'tab');
    btn.dataset.index = i;

    const icon = document.createElement('span');
    icon.className = 'tab__icon';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#${b.icon}`);
    svg.appendChild(use);
    icon.appendChild(svg);

    const label = document.createElement('span');
    const small = document.createElement('small');
    small.textContent = `0${i + 1}`;
    label.append(small, document.createTextNode(b.short));

    btn.append(icon, label);
    btn.addEventListener('click', () => go(i));
    tabsEl.appendChild(btn);
  });

  const renderPrice = (animate = true) => {
    const target = priceFor(BLENDS[index], pack);
    priceUnit.textContent = pack.label;
    if (!animate) {
      priceState.v = target;
      priceVal.textContent = target.toLocaleString('en-US');
      return;
    }
    gsap.to(priceState, {
      v: target,
      duration: 0.8,
      ease: 'power3.out',
      onUpdate: () => (priceVal.textContent = Math.round(priceState.v).toLocaleString('en-US')),
    });
  };

  const renderContent = () => {
    const b = BLENDS[index];
    section.style.setProperty('--blend-accent', b.accent);
    section.style.setProperty('--blend-glow', b.glow);
    face.style.setProperty('--p1', b.pouch[0]);
    face.style.setProperty('--p2', b.pouch[1]);
    face.style.setProperty('--cup', b.cup);
    $('.pouch__name', face).textContent = b.name;
    $('.pouch__sub', face).textContent = b.tag.split(' · ')[0] + ' blend';
    $('.pouch__weight', face).textContent = pack.label.replace('g', ' g');
    $('.blend__tag', info).textContent = b.tag;
    $('.blend__name', info).textContent = b.name;
    $('.blend__desc', info).textContent = b.desc;
    $('.blend__note span', info).textContent = b.note;
    const notes = $('.blend__notes', info);
    notes.replaceChildren(
      ...b.notes.map((n) => {
        const s = document.createElement('span');
        s.textContent = n;
        return s;
      }),
    );
    count.textContent = `${index + 1} / ${BLENDS.length}`;
    $$('.tab', tabsEl).forEach((t, i) => {
      t.classList.toggle('is-active', i === index);
      t.setAttribute('aria-selected', i === index);
    });
  };

  const infoItems = () => [$('.blend__tag', info), $('.blend__name', info), $('.blend__desc', info), $('.blend__note', info), $('.blend__notes', info)];

  const go = (next, dir = next > index ? 1 : -1) => {
    if (busy || next === index) return;
    busy = true;
    const tl = gsap.timeline({ onComplete: () => (busy = false) });
    tl.to(pouch, { rotationY: -70 * dir, x: -60 * dir, opacity: 0, scale: 0.9, duration: 0.45, ease: 'power2.in' })
      .to(infoItems(), { y: -16, opacity: 0, duration: 0.3, stagger: 0.03, ease: 'power2.in' }, 0)
      .add(() => {
        index = next;
        renderContent();
        renderPrice();
      })
      .fromTo(pouch, { rotationY: 70 * dir, x: 60 * dir, opacity: 0, scale: 0.9 }, { rotationY: 0, x: 0, opacity: 1, scale: 1, duration: 0.9, ease: 'expo.out' })
      .fromTo(infoItems(), { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.06, ease: 'power3.out' }, '<0.05');
  };

  $('[data-prev]', section).addEventListener('click', () => go((index - 1 + BLENDS.length) % BLENDS.length, -1));
  $('[data-next]', section).addEventListener('click', () => go((index + 1) % BLENDS.length, 1));

  $$('.pack', section).forEach((btn) =>
    btn.addEventListener('click', () => {
      pack = PACKS.find((p) => p.id === btn.dataset.pack);
      $$('.pack', section).forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-checked', b === btn);
      });
      $('.pouch__weight', face).textContent = pack.label.replace('g', ' g');
      gsap.fromTo(pouch, { scale: 0.96 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.5)' });
      renderPrice();
    }),
  );

  $('[data-order-blend]', section).addEventListener('click', () => onOrder({ blend: BLENDS[index].id, pack: pack.id }));

  // Tilt on hover, free-spin on drag.
  const rotY = gsap.quickTo(wrap, 'rotationY', { duration: 0.8, ease: 'power3.out' });
  const rotX = gsap.quickTo(wrap, 'rotationX', { duration: 0.8, ease: 'power3.out' });
  let drag = null;
  wrap.addEventListener('pointermove', (e) => {
    const r = wrap.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    face.style.setProperty('--shine', `${px * 60}%`);
    if (drag) {
      rotY(drag.start + (e.clientX - drag.x) * 0.6);
      return;
    }
    rotY(px * 26);
    rotX(-py * 18);
  });
  wrap.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, start: gsap.getProperty(wrap, 'rotationY') };
    wrap.setPointerCapture(e.pointerId);
  });
  const release = () => {
    drag = null;
    rotY(0);
    rotX(0);
  };
  wrap.addEventListener('pointerup', release);
  wrap.addEventListener('pointerleave', release);

  // Idle float.
  gsap.to(pouch, { y: -12, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });

  // Keyboard support on tabs.
  tabsEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') go((index + 1) % BLENDS.length, 1);
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') go((index - 1 + BLENDS.length) % BLENDS.length, -1);
  });

  renderContent();
  renderPrice(false);
};
