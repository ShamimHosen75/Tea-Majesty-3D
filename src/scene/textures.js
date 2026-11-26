import * as THREE from 'three';

const canvasTexture = (canvas, { repeat = false, srgb = true } = {}) => {
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
};

const makeCanvas = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

/** Tileable value-noise texture, used for steam and mist. */
export const createNoiseTexture = (size = 128, octaves = 5) => {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const field = new Float32Array(size * size);

  for (let o = 0; o < octaves; o++) {
    const cells = 4 * 2 ** o;
    const grid = Array.from({ length: cells * cells }, () => Math.random());
    const amp = 0.5 ** o;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const gx = (x / size) * cells;
        const gy = (y / size) * cells;
        const x0 = Math.floor(gx);
        const y0 = Math.floor(gy);
        const fx = gx - x0;
        const fy = gy - y0;
        const sx = fx * fx * (3 - 2 * fx);
        const sy = fy * fy * (3 - 2 * fy);
        const g = (ix, iy) => grid[((iy % cells) * cells + (ix % cells))];
        const a = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * sx;
        const b = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * sx;
        field[y * size + x] += (a + (b - a) * sy) * amp;
      }
    }
  }
  let min = Infinity;
  let max = -Infinity;
  for (const v of field) {
    min = Math.min(min, v);
    max = Math.max(max, v);
  }
  for (let i = 0; i < field.length; i++) {
    const v = ((field[i] - min) / (max - min)) * 255;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvasTexture(c, { repeat: true, srgb: false });
};

/** Painted tea leaf: gradient body, glossy midrib and veins. */
export const createLeafTexture = () => {
  const w = 256;
  const h = 512;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');

  const body = ctx.createLinearGradient(0, h, w, 0);
  body.addColorStop(0, '#2f7d33');
  body.addColorStop(0.5, '#5fae3f');
  body.addColorStop(1, '#a9d65a');
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, w, h);

  const edge = ctx.createRadialGradient(w / 2, h / 2, w * 0.1, w / 2, h / 2, w * 0.75);
  edge.addColorStop(0, 'rgba(255,255,220,0.12)');
  edge.addColorStop(1, 'rgba(10,40,10,0.45)');
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(225, 245, 170, 0.85)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(w / 2, h);
  ctx.quadraticCurveTo(w / 2 + 6, h / 2, w / 2, 0);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(210, 240, 160, 0.45)';
  for (let i = 1; i < 11; i++) {
    const y = h - (i / 11) * h * 0.95;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(w / 2, y);
      ctx.quadraticCurveTo(w / 2 + dir * w * 0.22, y - 30, w / 2 + dir * w * 0.46, y - 70);
      ctx.stroke();
    }
  }
  return canvasTexture(c);
};

/** Hand-thrown terracotta for the kulhad, with speckles and throwing rings. */
export const createClayTexture = () => {
  const w = 512;
  const h = 512;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#a9482a');
  grad.addColorStop(0.5, '#c0643a');
  grad.addColorStop(1, '#9d4325');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 60; i++) {
    const y = Math.random() * h;
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '255,200,160' : '80,25,10'},${0.04 + Math.random() * 0.06})`;
    ctx.fillRect(0, y, w, 1 + Math.random() * 4);
  }
  for (let i = 0; i < 9000; i++) {
    const light = Math.random() > 0.55;
    ctx.fillStyle = light ? `rgba(255,215,180,${Math.random() * 0.25})` : `rgba(60,20,8,${Math.random() * 0.3})`;
    const s = Math.random() * 2.2;
    ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
  return canvasTexture(c, { repeat: true });
};

/** Soft round sprite for pollen / dust motes. */
export const createGlowTexture = () => {
  const s = 64;
  const c = makeCanvas(s, s);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,240,200,.6)');
  g.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return canvasTexture(c);
};
