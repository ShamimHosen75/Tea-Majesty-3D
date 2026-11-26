import './styles/main.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { World } from './scene/World.js';
import { initBlends } from './ui/blends.js';
import { initModal } from './ui/modal.js';
import { $, $$, splitChars, splitWords } from './ui/helpers.js';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------------- Smooth scroll ---------------- */
const lenis = new Lenis({ duration: 1.15, smoothWheel: !reduceMotion, easing: (t) => 1 - Math.pow(1 - t, 4) });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
lenis.stop();

/* ---------------- 3D world ---------------- */
let world = null;
try {
  world = new World($('#webgl'));
  world.start();
} catch (err) {
  // WebGL unavailable: fall back to a painted gradient so the page still reads well.
  console.warn('WebGL disabled, using fallback background.', err);
  $('#webgl').style.background = 'radial-gradient(ellipse at 30% 20%, #ffd89a, #4e8a52 45%, #08170f 85%)';
}
const ws = world?.state ?? {};

/* ---------------- Toast ---------------- */
const toastEl = $('#toast');
const toast = (msg) => {
  toastEl.textContent = msg;
  toastEl.classList.add('is-show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => toastEl.classList.remove('is-show'), 2600);
};

/* ---------------- Modal + blends ---------------- */
const modal = initModal({ lenis, toast });
$$('[data-order]').forEach((b) =>
  b.addEventListener('click', () => {
    closeMenu();
    modal.open();
  }),
);
initBlends({ onOrder: (opts) => modal.open(opts) });

/* ---------------- Navigation ---------------- */
const nav = $('#nav');
const pill = $('.nav__pill');
const links = $$('.nav__link');
const movePill = (link) => {
  if (!link || !pill) return;
  pill.style.width = `${link.offsetWidth}px`;
  pill.style.transform = `translateX(${link.offsetLeft}px)`;
};
const setActive = (id) => {
  links.forEach((l) => l.classList.toggle('is-active', l.dataset.section === id));
  movePill(links.find((l) => l.dataset.section === id));
};
window.addEventListener('resize', () => movePill($('.nav__link.is-active')));
document.fonts?.ready.then(() => movePill($('.nav__link.is-active')));

$$('[data-nav]').forEach((section) =>
  ScrollTrigger.create({
    trigger: section,
    start: 'top 45%',
    end: 'bottom 45%',
    refreshPriority: -1,
    onToggle: (self) => self.isActive && setActive(section.dataset.nav),
  }),
);

$$('a[href^="#"]').forEach((a) =>
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    closeMenu();
    lenis.scrollTo(target, { offset: 0, duration: 1.6 });
  }),
);

let lastY = 0;
lenis.on('scroll', ({ scroll }) => {
  nav.classList.toggle('is-scrolled', scroll > 40);
  const menuOpen = $('#mobileMenu').classList.contains('is-open');
  nav.classList.toggle('is-hidden', !menuOpen && scroll > lastY + 2 && scroll > 400);
  if (scroll < lastY - 2) nav.classList.remove('is-hidden');
  lastY = scroll;
});

const burger = $('#burger');
const menu = $('#mobileMenu');
function closeMenu() {
  menu.classList.remove('is-open');
  menu.setAttribute('aria-hidden', 'true');
  burger.setAttribute('aria-expanded', 'false');
}
burger.addEventListener('click', () => {
  const open = !menu.classList.contains('is-open');
  menu.classList.toggle('is-open', open);
  menu.setAttribute('aria-hidden', String(!open));
  burger.setAttribute('aria-expanded', String(open));
  if (open) gsap.from($$('a, .btn', menu), { y: 40, opacity: 0, stagger: 0.05, duration: 0.7, delay: 0.15, ease: 'expo.out' });
});

gsap.to('.scroll-progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });

/* ---------------- Text splitting ---------------- */
const heroChars = $$('[data-split]').flatMap((el) => splitChars(el));
$$('[data-split-lines]').forEach((el) => {
  const words = splitWords(el);
  gsap.from(words, {
    yPercent: 110,
    rotation: 4,
    duration: 1.1,
    stagger: 0.06,
    ease: 'expo.out',
    scrollTrigger: { trigger: el, start: 'top 85%' },
  });
});
$$('[data-reveal]')
  .filter((el) => !el.closest('.hero'))
  .forEach((el) =>
    gsap.from(el, { y: 30, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } }),
  );
$$('.section-head .eyebrow, .blends__head, .craft__intro .eyebrow, .science__head').forEach((el) =>
  gsap.from(el, { y: 24, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } }),
);

/* ---------------- Hero intro (the "cinematic") ---------------- */
const intro = gsap.timeline({ paused: true });
intro
  .fromTo(ws, { intro: 0 }, { intro: 1, duration: reduceMotion ? 0.01 : 3.4, ease: 'power3.inOut' }, 0)
  .fromTo(ws, { burst: 1 }, { burst: 0, duration: 3, ease: 'power2.out' }, 0)
  .fromTo('.hero__eyebrow', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }, 1.6)
  .fromTo(heroChars, { yPercent: 120, rotation: 8 }, { yPercent: 0, rotation: 0, duration: 1.4, stagger: 0.045, ease: 'expo.out' }, 1.8)
  .fromTo('.hero [data-reveal]', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: 0.12, ease: 'power3.out' }, 2.4)
  .fromTo('.hero__stat, .scroll-cue', { x: -20, opacity: 0 }, { x: 0, opacity: 1, duration: 1, stagger: 0.1, ease: 'power3.out' }, 2.7)
  .fromTo(nav, { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }, 2.2)
  .add(() => {
    $$('[data-count]').forEach((el) => {
      const o = { v: 0 };
      gsap.to(o, { v: +el.dataset.count, duration: 2, ease: 'power2.out', onUpdate: () => (el.textContent = Math.round(o.v).toLocaleString('en-US')) });
    });
  }, 2.7);
gsap.set(['.hero__eyebrow', '.hero [data-reveal]', '.hero__stat', '.scroll-cue', nav], { opacity: 0 });
gsap.set(heroChars, { yPercent: 120 });

// Hero content drifts up and fades as you scroll into the experience.
gsap.to('.hero__inner', {
  yPercent: -40,
  opacity: 0,
  ease: 'none',
  scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 30%', scrub: true },
});
gsap.to('.hero__meta, .scroll-cue', { opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '10% top', end: '40% top', scrub: true } });

$('#replay').addEventListener('click', () => {
  lenis.scrollTo(0, { duration: 2.2 });
  setTimeout(() => intro.restart(), 900);
});

/* ---------------- Scene choreography ---------------- */
if (world) {
  // Hero -> experience: landscape melts into a dark studio around the cup.
  gsap.to(ws, {
    experience: 1,
    ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 },
  });

  // Fade the canvas out behind the solid sections, and back in for the finale.
  const fade = { out: 0, back: 0 };
  const applyFade = () => {
    const o = Math.min(1, Math.max(0, 1 - fade.out + fade.back));
    $('#webgl').style.opacity = o;
    ws.visible = o > 0.01;
  };
  ScrollTrigger.create({
    trigger: '.science',
    start: 'top 80%',
    refreshPriority: -1,
    end: 'top 10%',
    scrub: true,
    onUpdate: (self) => {
      fade.out = self.progress;
      applyFade();
    },
  });
  ScrollTrigger.create({
    trigger: '.finale',
    start: 'top 90%',
    refreshPriority: -1,
    end: 'top 10%',
    scrub: true,
    onUpdate: (self) => {
      fade.back = self.progress;
      ws.finale = self.progress;
      applyFade();
    },
  });
}

/* ---------------- Experience (pinned) ---------------- */
const mm = gsap.matchMedia();
mm.add('(min-width: 861px)', () => {
  const tl = gsap.timeline({
    scrollTrigger: { trigger: '.experience', start: 'top top', end: '+=140%', pin: true, scrub: 1 },
  });
  tl.from('[data-note]', { opacity: 0, y: 60, scale: 0.92, filter: 'blur(8px)', stagger: 0.25, duration: 0.6, ease: 'power2.out' }, 0)
    .fromTo(ws, { ribbon: 0, spin: 0 }, { ribbon: 1, spin: 0.35, duration: 1.4, ease: 'none' }, 0)
    .from('.experience__halo', { scale: 0.6, opacity: 0, duration: 0.8 }, 0);
});
mm.add('(max-width: 860px)', () => {
  gsap.fromTo(ws, { ribbon: 0, spin: 0 }, { ribbon: 1, spin: 0.35, ease: 'none', scrollTrigger: { trigger: '.experience', start: 'top 60%', end: 'bottom bottom', scrub: 1 } });
  $$('[data-note]').forEach((n) => gsap.from(n, { opacity: 0, y: 40, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: n, start: 'top 90%' } }));
});

/* ---------------- Botanical science (pinned slides) ---------------- */
const slides = $$('.slide');
const benefits = $$('.benefit');
let currentSlide = -1;
const showSlide = (i) => {
  if (i === currentSlide) return;
  const prev = slides[currentSlide];
  const dir = i > currentSlide ? 1 : -1;
  currentSlide = i;
  $('.science__current').textContent = String(i + 1).padStart(2, '0');
  if (prev) gsap.to(prev, { opacity: 0, y: -30 * dir, duration: 0.45, ease: 'power2.in', onComplete: () => prev.classList.remove('is-active') });
  const next = slides[i];
  next.classList.add('is-active');
  gsap.fromTo(next.children, { opacity: 0, y: 40 * dir }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, delay: prev ? 0.25 : 0, ease: 'power3.out' });
  gsap.set(next, { opacity: 1, y: 0 });
  benefits.forEach((b) => b.classList.toggle('is-on', b.dataset.group.split(' ').includes(String(i))));
  gsap.to('.sprig', { rotation: [-4, 3, -1][i], duration: 1.4, ease: 'power3.out', transformOrigin: '50% 90%' });
};
showSlide(0);

// Sprig draws itself in.
const sprigLines = $$('.sprig__stem, .sprig__veins path, .sprig__leaf');
sprigLines.forEach((p) => {
  const len = p.getTotalLength();
  p.style.strokeDasharray = len;
  p.style.strokeDashoffset = len;
});
gsap
  .timeline({ scrollTrigger: { trigger: '.science', start: 'top 70%' } })
  .to('.sprig__stem', { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' })
  .to('.sprig__leaf', { strokeDashoffset: 0, duration: 1.2, stagger: 0.12, ease: 'power2.inOut' }, 0.4)
  .from('.sprig__leaf', { fillOpacity: 0, duration: 1, stagger: 0.12 }, 1)
  .to('.sprig__veins path', { strokeDashoffset: 0, duration: 1, stagger: 0.1 }, 1.2)
  .from('.sprig__dew circle', { scale: 0, transformOrigin: 'center', stagger: 0.1, duration: 0.6, ease: 'back.out(3)' }, 1.8)
  .from('.benefit', { opacity: 0, scale: 0.6, stagger: 0.08, duration: 0.6, ease: 'back.out(2)', clearProps: 'opacity,transform' }, 1.2);

mm.add('(min-width: 1025px)', () => {
  ScrollTrigger.create({
    trigger: '.science',
    start: 'top top',
    end: '+=220%',
    pin: '.science__pin',
    scrub: true,
    snap: { snapTo: [0, 0.5, 1], duration: 0.6, ease: 'power2.inOut' },
    onUpdate: (self) => {
      showSlide(Math.min(2, Math.floor(self.progress * 2.999)));
      gsap.set('.science__bar span', { scaleX: self.progress });
    },
  });
  return () => gsap.set('.science__bar span', { scaleX: 0 });
});
mm.add('(max-width: 1024px)', () => {
  // On smaller screens slides auto-rotate while the section is in view.
  let timer = null;
  const st = ScrollTrigger.create({
    trigger: '.science',
    start: 'top 60%',
    end: 'bottom 40%',
    onToggle: (self) => {
      clearInterval(timer);
      if (self.isActive) timer = setInterval(() => showSlide((currentSlide + 1) % 3), 4200);
    },
  });
  return () => {
    clearInterval(timer);
    st.kill();
  };
});

/* ---------------- Our craft (horizontal) ---------------- */
mm.add('(min-width: 861px)', () => {
  const track = $('.craft__track');
  const distance = () => track.scrollWidth - window.innerWidth;
  const tween = gsap.to(track, {
    x: () => -distance(),
    ease: 'none',
    scrollTrigger: {
      trigger: '.craft',
      start: 'top top',
      end: () => `+=${distance()}`,
      pin: '.craft__pin',
      scrub: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => gsap.set('.craft__progress span', { scaleX: self.progress }),
    },
  });
  gsap.to('.craft__intro', { opacity: 0.12, x: -60, ease: 'none', scrollTrigger: { trigger: '.craft', start: 'top top', end: '+=40%', scrub: true } });
  $$('.step').forEach((step) =>
    gsap.from(step, {
      y: 120,
      rotation: 6,
      opacity: 0.2,
      ease: 'power2.out',
      scrollTrigger: { trigger: step, containerAnimation: tween, start: 'left 100%', end: 'left 60%', scrub: true },
    }),
  );
});

/* ---------------- Blends entrance ---------------- */
gsap.from('.blends__tabs .tab', { x: -30, opacity: 0, stagger: 0.07, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.blends__body', start: 'top 75%' } });
gsap.from('.pouch-wrap', { y: 120, rotationY: -40, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.blends__body', start: 'top 75%' } });
gsap.from('.blends__info > *', { y: 30, opacity: 0, stagger: 0.06, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.blends__body', start: 'top 70%' } });

/* ---------------- Footer ---------------- */
gsap.from('.footer__giant', { yPercent: 60, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });
$('#year').textContent = new Date().getFullYear();
$('#newsletter').addEventListener('submit', (e) => {
  e.preventDefault();
  e.target.reset();
  toast('Welcome to the estate letters ✦');
});

/* ---------------- Cursor + magnetic buttons ---------------- */
if (finePointer) {
  const cursor = $('.cursor');
  const label = $('.cursor__label');
  const dotX = gsap.quickTo('.cursor__dot', 'x', { duration: 0.1 });
  const dotY = gsap.quickTo('.cursor__dot', 'y', { duration: 0.1 });
  const ringX = gsap.quickTo('.cursor__ring', 'x', { duration: 0.45, ease: 'power3.out' });
  const ringY = gsap.quickTo('.cursor__ring', 'y', { duration: 0.45, ease: 'power3.out' });
  window.addEventListener('pointermove', (e) => {
    cursor.classList.add('is-ready');
    dotX(e.clientX);
    dotY(e.clientY);
    ringX(e.clientX);
    ringY(e.clientY);
  });
  document.addEventListener('pointerover', (e) => {
    const target = e.target.closest('a, button, [data-cursor], select, input');
    cursor.classList.toggle('is-hover', !!target);
    const text = target?.closest('[data-cursor]')?.dataset.cursor;
    cursor.classList.toggle('has-label', !!text);
    if (text) label.textContent = text;
  });

  $$('[data-magnetic]').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.3);
      y((e.clientY - r.top - r.height / 2) * 0.4);
    });
    el.addEventListener('pointerleave', () => {
      x(0);
      y(0);
    });
  });
}

/* ---------------- Preloader ---------------- */
const loaderCount = $('#loaderCount');
const fill = $('.loader__fill');
const wave = $('.loader__wave');
const progress = { v: 0 };
const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

const loaderTl = gsap.timeline();
loaderTl.to(progress, {
  v: 100,
  duration: reduceMotion ? 0.2 : 2,
  ease: 'power2.inOut',
  onUpdate: () => {
    loaderCount.textContent = Math.round(progress.v);
    const y = 104 - progress.v * 0.66;
    fill.setAttribute('y', y);
    wave.style.translate = `0 ${y - 104}px`;
  },
});

// Triggers were created out of page order (pins last); sort by position so pin spacing is accounted for.
ScrollTrigger.sort();
ScrollTrigger.refresh();

Promise.all([fontsReady, new Promise((r) => loaderTl.eventCallback('onComplete', r))]).then(() => {
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  movePill($('.nav__link.is-active'));
  gsap
    .timeline()
    .to('.loader__cup, .loader__brand, .loader__count, .loader__hint', { y: -30, opacity: 0, stagger: 0.05, duration: 0.5, ease: 'power2.in' })
    .to('#loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=0.1')
    .add(() => {
      $('#loader').remove();
      document.body.classList.remove('is-loading');
      lenis.start();
    })
    .add(() => intro.play(0), 0.5);
});
