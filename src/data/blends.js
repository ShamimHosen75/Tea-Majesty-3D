// Currency and pack sizes live here so they are easy to change in one place.
export const CURRENCY = '৳';

export const PACKS = [
  { id: '250', label: '250g', factor: 0.55 },
  { id: '500', label: '500g', factor: 1 },
  { id: '1000', label: '1kg', factor: 1.9 },
];

export const WHOLESALE_PACKS = [
  { id: '5000', label: '5 kg bulk sack', factor: 8.8 },
  { id: '10000', label: '10 kg bulk sack', factor: 17 },
  { id: '25000', label: '25 kg café crate', factor: 40 },
];

export const WHATSAPP_NUMBER = '8801000000000'; // replace with the real business number

export const BLENDS = [
  {
    id: 'ctc',
    short: 'CTC',
    name: 'Royal Breakfast CTC',
    tag: 'Rich · Brisk · Golden',
    desc: 'Whole-grain CTC woven with golden tips for a bright, full-bodied morning cup that stands up beautifully to milk.',
    note: 'First-flush highland CTC with golden orthodox tips',
    notes: ['Malt', 'Honey', 'Bright'],
    price: 280,
    pouch: ['#1f6b3a', '#0d3a1f'],
    accent: '#e8c66a',
    glow: 'rgba(66, 160, 92, .35)',
    cup: '#b8743d',
    icon: 'i-sparkle',
  },
  {
    id: 'kadak',
    short: 'Kadak',
    name: 'Kadak Crown',
    tag: 'Bold · Strong · Smoky',
    desc: 'Our strongest leaf, slow-oxidised to a deep copper for a fearless, punchy brew that wakes the whole household.',
    note: 'Extra-bold Assam-style leaf for a dark, robust liquor',
    notes: ['Bold', 'Smoky', 'Deep'],
    price: 260,
    pouch: ['#5a1c1c', '#260808'],
    accent: '#f0b35b',
    glow: 'rgba(170, 50, 40, .32)',
    cup: '#7a3f1d',
    icon: 'i-flame',
  },
  {
    id: 'adrak',
    short: 'Adrak',
    name: 'Ginger Sovereign',
    tag: 'Warm · Spiced · Zesty',
    desc: 'Sun-dried mountain ginger folded into brisk highland tea for a warming, gently fiery chai that soothes from within.',
    note: 'Real sun-dried ginger root for deep digestive warmth',
    notes: ['Ginger', 'Warm', 'Zesty'],
    price: 320,
    pouch: ['#d98a1e', '#8a4a07'],
    accent: '#fff1c4',
    glow: 'rgba(230, 140, 30, .38)',
    cup: '#c07a3e',
    icon: 'i-heart',
  },
  {
    id: 'elaichi',
    short: 'Elaichi',
    name: 'Elaichi Empress',
    tag: 'Floral · Sweet · Regal',
    desc: 'Hand-crushed green cardamom pods give a perfumed, royal sweetness to brisk leaves. The blend of celebrations.',
    note: 'Whole green cardamom crushed for a royal fragrance',
    notes: ['Cardamom', 'Floral', 'Sweet'],
    price: 360,
    pouch: ['#127a5e', '#06362a'],
    accent: '#f3dc8a',
    glow: 'rgba(30, 170, 130, .32)',
    cup: '#c58a52',
    icon: 'i-crown',
  },
  {
    id: 'tulsi',
    short: 'Tulsi',
    name: 'Tulsi Jade Green',
    tag: 'Light · Herbal · Pure',
    desc: 'Delicate steamed green leaf with holy basil and a whisper of lemongrass. Caffeine-light, calm and clean.',
    note: 'Steamed green tea with holy basil and lemongrass',
    notes: ['Herbal', 'Fresh', 'Calm'],
    price: 390,
    pouch: ['#7fae3c', '#2f5a15'],
    accent: '#fbf6d8',
    glow: 'rgba(150, 200, 70, .30)',
    cup: '#b9a547',
    icon: 'i-leaf',
  },
];

export const priceFor = (blend, pack) => Math.round((blend.price * pack.factor) / 5) * 5;
