'use strict';
/**
 * Generates the illustrated product images in /public/images/products/*.svg
 * plus the hero artwork. These are stylised placeholders — replace them with
 * real photos any time (Admin → Products → Change image, or drop a file into
 * /public/images/products and update the product's image path).
 *
 *   node scripts/generate-images.js
 */
const fs = require('node:fs');
const path = require('node:path');

const OUT = path.join(__dirname, '..', 'public', 'images', 'products');
fs.mkdirSync(OUT, { recursive: true });

// ---------- helpers ----------
function rng(seedStr) {
  let h = 2166136261;
  for (const ch of seedStr) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  r = f(r); g = f(g); b = f(b);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
const f1 = (n) => Math.round(n * 10) / 10;
let uid = 0;
const id = (p) => `${p}${++uid}`;

// ---------- scene ----------
function scene(content, { bg = '#f3e6d6', table = '#e7d3bd', defs = '' } = {}) {
  const g1 = id('bg'), g2 = id('tb'), sh = id('sh'), vg = id('vg');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
<defs>
<linearGradient id="${g1}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(bg, 0.35)}"/><stop offset="1" stop-color="${bg}"/></linearGradient>
<linearGradient id="${g2}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${table}"/><stop offset="1" stop-color="${shade(table, -0.12)}"/></linearGradient>
<radialGradient id="${vg}" cx="0.5" cy="0.38" r="0.75"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3b2418" stop-opacity="0.18"/></radialGradient>
<filter id="${sh}" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
${defs}
</defs>
<rect width="800" height="600" fill="url(#${g1})"/>
<circle cx="610" cy="120" r="210" fill="#fff" opacity="0.22"/>
<circle cx="140" cy="90" r="120" fill="#fff" opacity="0.12"/>
<rect y="455" width="800" height="145" fill="url(#${g2})"/>
<rect y="455" width="800" height="2" fill="#fff" opacity="0.35"/>
<g transform="translate(400 410) scale(1.17) translate(-400 -410)">
<ellipse cx="400" cy="545" rx="270" ry="26" fill="#3b2418" opacity="0.22" filter="url(#${sh})"/>
${content}
</g>
<rect width="800" height="600" fill="url(#${vg})"/>
</svg>`;
}

// ---------- decorations ----------
function rosette(x, y, r, color) {
  const d = shade(color, -0.18);
  return `<g transform="translate(${f1(x)} ${f1(y)})">
<ellipse cx="0" cy="${f1(r * 0.35)}" rx="${f1(r * 1.05)}" ry="${f1(r * 0.55)}" fill="${shade(color, -0.25)}" opacity="0.35"/>
<path d="M${-r} 0 C${-r} ${-r * 0.9} ${r} ${-r * 0.9} ${r} 0 C${r} ${r * 0.55} ${-r} ${r * 0.55} ${-r} 0Z" fill="${color}"/>
<path d="M${f1(-r * 0.7)} ${f1(-r * 0.05)} C${f1(-r * 0.6)} ${f1(-r * 0.7)} ${f1(r * 0.6)} ${f1(-r * 0.7)} ${f1(r * 0.55)} ${f1(-r * 0.05)} M${f1(-r * 0.45)} ${f1(-r * 0.3)} C${f1(-r * 0.25)} ${f1(-r * 0.95)} ${f1(r * 0.35)} ${f1(-r * 0.95)} ${f1(r * 0.3)} ${f1(-r * 0.35)}" fill="none" stroke="${d}" stroke-width="${f1(r * 0.12)}" stroke-linecap="round" opacity="0.55"/>
<path d="M${f1(-r * 0.15)} ${f1(-r * 0.75)} Q0 ${f1(-r * 1.15)} ${f1(r * 0.1)} ${f1(-r * 0.7)}" fill="${color}" stroke="${d}" stroke-width="${f1(r * 0.08)}" opacity="0.9"/>
<ellipse cx="${f1(-r * 0.35)}" cy="${f1(-r * 0.45)}" rx="${f1(r * 0.2)}" ry="${f1(r * 0.1)}" fill="#fff" opacity="0.55"/>
</g>`;
}
function strawberry(x, y, s = 1) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">
<path d="M0 22 C-20 8 -20 -12 -10 -16 C-4 -18 4 -18 10 -16 C20 -12 20 8 0 22Z" fill="#c8323f"/>
<path d="M0 22 C-12 10 -14 -8 -8 -14" fill="none" stroke="#e45a64" stroke-width="3" opacity="0.6"/>
${[[-7, -5], [5, -7], [-2, 4], [7, 3], [-8, 6], [1, 12], [10, -2]].map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="1.2" ry="1.8" fill="#f6d77a"/>`).join('')}
<path d="M-11 -15 L-4 -12 L0 -20 L4 -12 L11 -15 L6 -9 L-6 -9Z" fill="#4f8a3c"/>
</g>`;
}
function cherry(x, y, s = 1) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M0 -8 Q4 -22 12 -26" stroke="#5b7a35" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle r="9" fill="#a3162b"/><circle cx="-3" cy="-3" r="2.8" fill="#fff" opacity="0.6"/></g>`;
}
function pineappleRing(x, y, s = 1) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse rx="26" ry="11" fill="#d9a520"/><ellipse rx="24" ry="9.5" fill="#f4cd4f"/><ellipse rx="8" ry="3.5" fill="#d9a520"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = (i / 8) * Math.PI * 2; return `<line x1="${f1(Math.cos(a) * 9)}" y1="${f1(Math.sin(a) * 4)}" x2="${f1(Math.cos(a) * 21)}" y2="${f1(Math.sin(a) * 8.5)}" stroke="#e2b235" stroke-width="1.4"/>`; }).join('')}</g>`;
}
function kiwi(x, y, s = 1) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse rx="16" ry="8" fill="#7a5a2c"/><ellipse rx="14.5" ry="7" fill="#8fbf3f"/><ellipse rx="5" ry="2.5" fill="#e9f0c8"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => { const a = (i / 10) * Math.PI * 2; return `<circle cx="${f1(Math.cos(a) * 8)}" cy="${f1(Math.sin(a) * 4)}" r="0.9" fill="#2a2a1a"/>`; }).join('')}</g>`;
}
function orangeSlice(x, y, s = 1) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M-18 4 A18 14 0 0 1 18 4Z" fill="#e8851f"/><path d="M-15 3 A15 11 0 0 1 15 3Z" fill="#f6a640"/>${[-10, -4, 2, 8].map((a) => `<line x1="0" y1="3" x2="${a + 2}" y2="-8" stroke="#f9c77d" stroke-width="1.2"/>`).join('')}</g>`;
}
function walnut(x, y, s = 1, rot = 0) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><path d="M-14 0 C-14 -10 -6 -11 0 -8 C6 -11 14 -10 14 0 C14 9 6 10 0 7 C-6 10 -14 9 -14 0Z" fill="#9a6a3a"/><path d="M0 -8 L0 7 M-8 -5 Q-4 0 -9 5 M8 -5 Q4 0 9 5" stroke="#6e4524" stroke-width="2" fill="none"/><ellipse cx="-6" cy="-4" rx="3" ry="1.5" fill="#c79563" opacity="0.7"/></g>`;
}
function almond(x, y, s = 1, rot = 0, flake = false) {
  return flake
    ? `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><ellipse rx="9" ry="4.5" fill="#f0dcb5"/><ellipse rx="9" ry="4.5" fill="none" stroke="#c99a5e" stroke-width="1.3"/></g>`
    : `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><path d="M-11 0 C-6 -7 6 -7 11 0 C6 6 -6 6 -11 0Z" fill="#b8814a"/><path d="M-8 0 C-3 -3 3 -3 8 0" stroke="#8d5d30" stroke-width="1.2" fill="none"/></g>`;
}
function cashew(x, y, s = 1, rot = 0) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><path d="M-10 -4 C-6 8 8 8 10 -2 C7 -6 4 -2 2 1 C-2 2 -5 -2 -6 -6Z" fill="#ead2a5" stroke="#c9a773" stroke-width="1"/></g>`;
}
function raisin(x, y, s = 1) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse rx="5.5" ry="4" fill="#4a2338"/><path d="M-3 -1 Q0 1 3 -1" stroke="#6d3a55" stroke-width="1" fill="none"/></g>`;
}
function shard(x, y, s = 1, rot = 0, color = '#3a2016') {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><path d="M-6 14 L-2 -26 L12 -18 L8 16Z" fill="${color}"/><path d="M-2 -26 L12 -18 L8 16 L4 14Z" fill="${shade(color, 0.18)}"/><path d="M-3 -18 L-1 6" stroke="#fff" stroke-width="1.6" opacity="0.25"/></g>`;
}
function curl(x, y, s = 1, rot = 0, color = '#4a2a1b') {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})"><rect x="-22" y="-5" width="44" height="10" rx="5" fill="${color}"/><path d="M-18 -2 L18 -2" stroke="${shade(color, 0.3)}" stroke-width="2" opacity="0.6"/>${[-12, -2, 8].map((a) => `<path d="M${a} -5 Q${a + 4} 0 ${a} 5" stroke="${shade(color, -0.3)}" stroke-width="1.4" fill="none"/>`).join('')}</g>`;
}
function bananaSlice(x, y, s = 1) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><ellipse rx="13" ry="6.5" fill="#e3c06a"/><ellipse rx="11" ry="5.2" fill="#f7e4a6"/><ellipse rx="3" ry="1.5" fill="#d8bf78"/>${[0, 1, 2].map((i) => { const a = (i / 3) * Math.PI * 2; return `<circle cx="${f1(Math.cos(a) * 4)}" cy="${f1(Math.sin(a) * 2)}" r="0.9" fill="#8b6f3a"/>`; }).join('')}</g>`;
}
function sprinkle(x, y, rot, color) {
  return `<rect x="${f1(x - 5)}" y="${f1(y - 1.6)}" width="10" height="3.2" rx="1.6" fill="${color}" transform="rotate(${f1(rot)} ${f1(x)} ${f1(y)})"/>`;
}

/** Points scattered inside an ellipse (sorted back-to-front). */
function scatter(r, n, cx, cy, rx, ry, k = 0.85) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * k;
    pts.push([cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, r()]);
  }
  return pts.sort((a, b) => a[1] - b[1]);
}
/** Points around an elliptical ring (sorted back-to-front). */
function ring(n, cx, cy, rx, ry, k = 0.78, phase = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k, a]);
  }
  return pts.sort((a, b) => a[1] - b[1]);
}

// ---------- cake stand ----------
function stand(cx, y, rx) {
  const g = id('st');
  return `<defs><linearGradient id="${g}" x1="0" x2="1"><stop offset="0" stop-color="#e9e1d6"/><stop offset="0.45" stop-color="#ffffff"/><stop offset="1" stop-color="#d9cfc2"/></linearGradient></defs>
<path d="M${cx - 34} ${y + 14} L${cx - 22} ${y + 92} L${cx + 22} ${y + 92} L${cx + 34} ${y + 14}Z" fill="url(#${g})"/>
<ellipse cx="${cx}" cy="${y + 96}" rx="${rx * 0.46}" ry="18" fill="#d8cdbf"/>
<ellipse cx="${cx}" cy="${y + 92}" rx="${rx * 0.46}" ry="16" fill="url(#${g})"/>
<ellipse cx="${cx}" cy="${y + 10}" rx="${rx}" ry="${f1(rx * 0.24)}" fill="#d6cbbd"/>
<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${f1(rx * 0.24)}" fill="url(#${g})"/>`;
}

// ---------- round cake ----------
function roundCake(o) {
  const r = rng(o.seed);
  const cx = 400, top = o.top ?? 222, bot = o.bot ?? 400, rx = o.rx ?? 205, ry = o.ry ?? 54;
  const side = o.side, sideId = id('sd'), topId = id('tp'), dripId = id('dr');
  let s = `<defs>
<linearGradient id="${sideId}" x1="0" x2="1"><stop offset="0" stop-color="${shade(side, -0.28)}"/><stop offset="0.22" stop-color="${shade(side, -0.05)}"/><stop offset="0.42" stop-color="${shade(side, 0.12)}"/><stop offset="0.7" stop-color="${side}"/><stop offset="1" stop-color="${shade(side, -0.32)}"/></linearGradient>
<radialGradient id="${topId}" cx="0.4" cy="0.35" r="0.75"><stop offset="0" stop-color="${shade(o.topColor, 0.14)}"/><stop offset="1" stop-color="${shade(o.topColor, -0.06)}"/></radialGradient>
<linearGradient id="${dripId}" x1="0" x2="1"><stop offset="0" stop-color="${shade(o.drip || '#000', -0.25)}"/><stop offset="0.4" stop-color="${shade(o.drip || '#000', 0.12)}"/><stop offset="1" stop-color="${shade(o.drip || '#000', -0.3)}"/></linearGradient>
</defs>`;
  s += stand(cx, bot + 14, rx + 62);
  // side
  s += `<path d="M${cx - rx} ${top} L${cx - rx} ${bot} A${rx} ${ry} 0 0 0 ${cx + rx} ${bot} L${cx + rx} ${top}Z" fill="url(#${sideId})"/>`;
  if (o.glossBand) s += `<path d="M${cx - rx * 0.55} ${top + 30} L${cx - rx * 0.55} ${bot + ry * 0.75} L${cx - rx * 0.38} ${bot + ry * 0.9} L${cx - rx * 0.38} ${top + 40}Z" fill="#fff" opacity="0.13"/>`;
  if (o.sideTexture === 'coconut') {
    for (let i = 0; i < 260; i++) {
      const t = r(), a = Math.PI * (1 - t), x = cx + Math.cos(a) * rx * 0.98, yy = top + 10 + r() * (bot - top) + Math.sin(a) * ry * 0.95;
      s += `<path d="M${f1(x)} ${f1(yy)} l${f1(r() * 6 - 3)} ${f1(r() * 4 - 2)}" stroke="#fffaf0" stroke-width="2.2" stroke-linecap="round" opacity="${f1(0.55 + r() * 0.45)}"/>`;
    }
  }
  if (o.sideTexture === 'crumbs') {
    for (let i = 0; i < 120; i++) {
      const t = r(), a = Math.PI * (1 - t), x = cx + Math.cos(a) * rx * 0.97, yy = bot - r() * 55 + Math.sin(a) * ry * 0.95;
      s += `<ellipse cx="${f1(x)}" cy="${f1(yy)}" rx="${f1(2 + r() * 3)}" ry="${f1(1.5 + r() * 2)}" fill="${r() > 0.5 ? '#c99657' : '#e0b679'}"/>`;
    }
  }
  if (o.sideStripes) {
    for (let k = 1; k <= 2; k++) {
      const y = top + ((bot - top) * k) / 3 + 6;
      s += `<path d="M${cx - rx} ${y} A${rx} ${ry} 0 0 0 ${cx + rx} ${y}" fill="none" stroke="${o.sideStripes}" stroke-width="6" opacity="0.55"/>`;
    }
  }
  // bottom piping beads
  if (o.beads) {
    for (let i = 0; i <= 26; i++) {
      const a = Math.PI * (1 - i / 26), x = cx + Math.cos(a) * (rx + 2), y = bot + Math.sin(a) * ry;
      s += `<circle cx="${f1(x)}" cy="${f1(y - 4)}" r="9" fill="${o.beads}"/><circle cx="${f1(x - 3)}" cy="${f1(y - 7)}" r="2.6" fill="#fff" opacity="0.45"/>`;
    }
  }
  // top
  s += `<ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}" fill="url(#${o.drip ? dripId : topId})"/>`;
  if (o.drip) {
    s += `<ellipse cx="${cx}" cy="${top}" rx="${rx - 4}" ry="${ry - 3}" fill="${o.drip}"/>`;
    // band along front edge
    let band = `M${cx - rx} ${top}`;
    const N = 60;
    for (let i = 0; i <= N; i++) { const a = Math.PI * (1 - i / N); band += ` L${f1(cx + Math.cos(a) * rx)} ${f1(top + Math.sin(a) * ry + 10 * Math.sin(a) + 4)}`; }
    band += ` L${cx + rx} ${top} A${rx} ${ry} 0 0 1 ${cx - rx} ${top}Z`;
    s += `<path d="${band}" fill="url(#${dripId})"/>`;
    const drips = o.dripCount ?? 15;
    for (let i = 0; i < drips; i++) {
      const t = 0.05 + (i + r() * 0.6) / drips * 0.9, a = Math.PI * (1 - t), sinA = Math.sin(a);
      const x = cx + Math.cos(a) * rx, y = top + sinA * ry + 4;
      const w = (9 + r() * 7) * (0.45 + 0.55 * sinA), L = (o.dripLen ?? 55) * (0.45 + r() * 0.8) * (0.5 + 0.5 * sinA);
      s += `<rect x="${f1(x - w / 2)}" y="${f1(y)}" width="${f1(w)}" height="${f1(L + 10)}" rx="${f1(w / 2)}" fill="url(#${dripId})"/>`;
      s += `<rect x="${f1(x - w * 0.18)}" y="${f1(y + 8)}" width="${f1(Math.max(1.5, w * 0.16))}" height="${f1(L * 0.65)}" rx="1" fill="#fff" opacity="0.28"/>`;
    }
    s += `<ellipse cx="${cx - rx * 0.3}" cy="${top - ry * 0.35}" rx="${rx * 0.32}" ry="${ry * 0.16}" fill="#fff" opacity="0.16"/>`;
  } else if (o.glossTop) {
    s += `<ellipse cx="${cx - rx * 0.28}" cy="${top - ry * 0.3}" rx="${rx * 0.42}" ry="${ry * 0.2}" fill="#fff" opacity="0.22"/>`;
  }
  if (o.topTexture === 'coconut') {
    for (const [x, y] of scatter(r, 230, cx, top, rx, ry, 0.96)) s += `<path d="M${f1(x)} ${f1(y)} l${f1(r() * 6 - 3)} ${f1(r() * 3 - 1.5)}" stroke="#fffdf6" stroke-width="2.2" stroke-linecap="round" opacity="${f1(0.6 + r() * 0.4)}"/>`;
  }
  // decorations (back to front)
  s += (o.decorate || (() => ''))({ r, cx, top, rx, ry });
  return s;
}

// ---------- loaf cake ----------
function loafCake(o) {
  const r = rng(o.seed);
  const crust = o.crust || '#c98a3e', crumb = o.crumb || '#f3d797', board = id('bd'), lg = id('lf'), sl = id('sl');
  let s = `<defs>
<linearGradient id="${board}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c49a6c"/><stop offset="1" stop-color="#9c7148"/></linearGradient>
<linearGradient id="${lg}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(crust, -0.22)}"/><stop offset="0.35" stop-color="${crust}"/><stop offset="1" stop-color="${shade(crust, -0.12)}"/></linearGradient>
<radialGradient id="${sl}" cx="0.45" cy="0.4" r="0.7"><stop offset="0" stop-color="${shade(crumb, 0.12)}"/><stop offset="1" stop-color="${shade(crumb, -0.06)}"/></radialGradient>
</defs>`;
  // board
  s += `<path d="M120 452 Q120 430 145 430 L640 430 Q668 430 668 452 L668 470 Q668 492 640 492 L145 492 Q120 492 120 470Z" fill="#8a603b"/>
<path d="M120 446 Q120 424 145 424 L640 424 Q668 424 668 446 L668 458 Q668 480 640 480 L145 480 Q120 480 120 458Z" fill="url(#${board})"/>
${[0, 1, 2, 3].map((i) => `<path d="M160 ${436 + i * 11} Q400 ${432 + i * 11} 630 ${438 + i * 11}" stroke="#8f6540" stroke-width="1.2" fill="none" opacity="0.35"/>`).join('')}`;
  // loaf body
  s += `<path d="M168 430 L172 300 Q182 252 248 244 Q370 226 492 244 Q552 254 560 300 L566 430Z" fill="url(#${lg})"/>
<path d="M172 300 Q182 252 248 244 Q370 226 492 244 Q552 254 560 300 Q520 288 370 286 Q220 288 172 300Z" fill="${shade(crust, -0.3)}" opacity="0.55"/>
<path d="M230 262 Q370 236 510 262" stroke="${shade(crust, 0.45)}" stroke-width="12" fill="none" stroke-linecap="round"/>
<path d="M230 262 Q370 236 510 262" stroke="${shade(crust, 0.15)}" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="26 12"/>
<path d="M190 330 L190 420" stroke="#fff" stroke-width="10" opacity="0.08" stroke-linecap="round"/>`;
  // slice standing in front-right
  s += `<g transform="translate(468 300) rotate(6)">
<path d="M0 132 L4 40 Q12 4 70 0 Q128 4 136 40 L140 132Z" fill="${shade(crust, -0.1)}"/>
<path d="M9 126 L12 44 Q18 13 70 9 Q122 13 128 44 L131 126Z" fill="url(#${sl})"/>`;
  for (let i = 0; i < 70; i++) {
    const x = 18 + r() * 104, y = 22 + r() * 100;
    s += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(1 + r() * 2.2)}" ry="${f1(0.8 + r() * 1.4)}" fill="${shade(crumb, -0.18)}" opacity="0.55"/>`;
  }
  if (o.inclusions) {
    for (let i = 0; i < (o.inclusionCount || 22); i++) {
      const x = 20 + r() * 98, y = 28 + r() * 92, c = o.inclusions[Math.floor(r() * o.inclusions.length)];
      s += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(5 + r() * 5)}" height="${f1(4 + r() * 4)}" rx="1.5" fill="${c}" transform="rotate(${f1(r() * 60 - 30)} ${f1(x)} ${f1(y)})"/>`;
    }
  }
  s += `</g>`;
  s += (o.decorate || (() => ''))({ r });
  return s;
}

// ---------- three milk slice ----------
function threeMilkSlice(o) {
  const r = rng(o.seed), sp = '#f2d49a', pl = id('pl'), mk = id('mk');
  let s = `<defs><radialGradient id="${pl}" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e8e0d4"/></radialGradient>
<radialGradient id="${mk}" cx="0.5" cy="0.5" r="0.6"><stop offset="0" stop-color="${o.milk || '#f8ecd2'}"/><stop offset="1" stop-color="${shade(o.milk || '#f8ecd2', -0.08)}"/></radialGradient></defs>`;
  s += `<ellipse cx="400" cy="452" rx="300" ry="78" fill="#d9cfc1"/><ellipse cx="400" cy="444" rx="300" ry="76" fill="url(#${pl})"/>
<ellipse cx="400" cy="440" rx="236" ry="54" fill="#efe7da"/>
<path d="M188 440 C200 405 300 400 400 404 C520 400 610 412 612 440 C606 474 500 488 400 486 C290 488 194 474 188 440Z" fill="url(#${mk})"/>
<ellipse cx="320" cy="455" rx="60" ry="8" fill="#fff" opacity="0.45"/>`;
  // cube: front face 255..515 x, 280..430 y; depth offset (50,-38)
  const L = 250, R = 510, T = 282, B = 432, dx = 52, dy = -40;
  s += `<path d="M${R} ${T} L${R + dx} ${T + dy} L${R + dx} ${B + dy} L${R} ${B}Z" fill="${shade(sp, -0.16)}"/>
<path d="M${L} ${T} L${R} ${T} L${R} ${B} L${L} ${B}Z" fill="${sp}"/>
<path d="M${L} ${B - 46} L${R} ${B - 46} L${R} ${B} L${L} ${B}Z" fill="${shade(sp, -0.1)}" opacity="0.8"/>
<path d="M${L} ${B - 8} Q${(L + R) / 2} ${B + 6} ${R} ${B - 8} L${R} ${B} L${L} ${B}Z" fill="${o.milk || '#f8ecd2'}"/>`;
  for (let i = 0; i < 90; i++) s += `<ellipse cx="${f1(L + 8 + r() * (R - L - 16))}" cy="${f1(T + 36 + r() * (B - T - 50))}" rx="${f1(1 + r() * 2)}" ry="${f1(0.8 + r() * 1.3)}" fill="#d4ae6c" opacity="0.6"/>`;
  // cream layer
  s += `<path d="M${L} ${T - 8} L${R} ${T - 8} L${R} ${T + 26} Q${(L + R) / 2} ${T + 34} ${L} ${T + 26}Z" fill="#fffaf1"/>
<path d="M${R} ${T - 8} L${R + dx} ${T + dy - 8} L${R + dx} ${T + dy + 24} L${R} ${T + 26}Z" fill="#efe5d4"/>
<path d="M${L} ${T - 8} L${L + dx} ${T + dy - 8} L${R + dx} ${T + dy - 8} L${R} ${T - 8}Z" fill="#fffdf8"/>`;
  s += (o.decorate || (() => ''))({ r, L, R, T: T - 8, dx, dy });
  return s;
}

// ---------- mousse cake ----------
function mousseCake(o) {
  return roundCake({
    seed: o.seed, side: '#4a2a1b', topColor: '#3d2216', glossBand: true, glossTop: true, top: 236, bot: 398,
    sideStripes: null,
    decorate: ({ r, cx, top, rx, ry }) => {
      let s = `<path d="M${cx - rx} 384 L${cx - rx} 398 A${rx} ${ry} 0 0 0 ${cx + rx} 398 L${cx + rx} 384 A${rx} ${ry} 0 0 1 ${cx - rx} 384Z" fill="#2a160e"/>`;
      s += `<ellipse cx="${cx - 60}" cy="${top - 12}" rx="70" ry="10" fill="#fff" opacity="0.2"/>`;
      const pts = scatter(r, 9, cx + 10, top - 4, 80, 22, 1);
      for (const [x, y, k] of pts) s += curl(x, y, 0.85 + k * 0.4, -30 + k * 60, k > 0.5 ? '#5a3424' : '#3a2016');
      for (const [x, y] of ring(14, cx, top, rx, ry, 0.86)) s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="4.5" fill="#d7a64e"/><circle cx="${f1(x - 1.2)}" cy="${f1(y - 1.2)}" r="1.4" fill="#fff" opacity="0.6"/>`;
      return s;
    },
  });
}

// ---------- tub cake ----------
function tubCake(o) {
  const r = rng(o.seed), cx = 400, t = 240, b = 440, trx = 168, brx = 132, cl = id('cl');
  const yAt = (y) => trx + ((brx - trx) * (y - t)) / (b - t);
  let s = `<defs><clipPath id="${cl}"><path d="M${cx - trx} ${t} L${cx - brx} ${b} A${brx} 30 0 0 0 ${cx + brx} ${b} L${cx + trx} ${t}Z"/></clipPath></defs>`;
  s += `<ellipse cx="${cx}" cy="${b + 8}" rx="${brx + 10}" ry="30" fill="#3b2418" opacity="0.15"/>`;
  s += `<g clip-path="url(#${cl})"><rect x="${cx - trx}" y="${t - 50}" width="${trx * 2}" height="${b - t + 90}" fill="#3b2015"/>`;
  const layers = [[262, '#2f1a12'], [292, '#b9835a'], [330, '#4a2a1b'], [362, '#c69469'], [398, '#4a2a1b'], [420, '#d2a77c']];
  for (const [y, c] of layers) {
    const w = yAt(y);
    s += `<path d="M${cx - w - 10} ${y} Q${cx} ${y + 26} ${cx + w + 10} ${y} L${cx + w + 10} ${b + 40} L${cx - w - 10} ${b + 40}Z" fill="${c}"/>`;
  }
  for (let i = 0; i < 60; i++) s += `<circle cx="${f1(cx - 120 + r() * 240)}" cy="${f1(330 + r() * 30)}" r="${f1(1 + r() * 1.5)}" fill="#2a160e" opacity="0.5"/>`;
  s += `<rect x="${cx - trx * 0.55}" y="${t}" width="16" height="${b - t}" fill="#fff" opacity="0.22"/><rect x="${cx - trx * 0.38}" y="${t}" width="6" height="${b - t}" fill="#fff" opacity="0.18"/>
<rect x="${cx + trx * 0.55}" y="${t}" width="10" height="${b - t}" fill="#fff" opacity="0.12"/></g>`;
  s += `<ellipse cx="${cx}" cy="${t + 4}" rx="${trx - 6}" ry="38" fill="#2f1a12"/>
<ellipse cx="${cx - 40}" cy="${t - 6}" rx="70" ry="10" fill="#fff" opacity="0.14"/>`;
  for (const [x, y, k] of scatter(r, 40, cx, t + 4, trx - 20, 30, 0.95)) s += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(4 + k * 6)}" height="2.5" rx="1" fill="${k > 0.6 ? '#7a4b30' : '#a8744f'}" transform="rotate(${f1(k * 180)} ${f1(x)} ${f1(y)})"/>`;
  s += rosette(cx + 6, t - 6, 26, '#6b3f29') + rosette(cx - 70, t + 4, 15, '#f5e9d6') + rosette(cx + 80, t + 6, 15, '#f5e9d6');
  s += `<ellipse cx="${cx}" cy="${t}" rx="${trx}" ry="40" fill="none" stroke="#fff" stroke-width="4" opacity="0.6"/>`;
  // spoon
  s += `<g transform="translate(610 448) rotate(-18)"><rect x="-6" y="-80" width="12" height="80" rx="6" fill="#e6e1d9"/><ellipse cx="0" cy="-92" rx="18" ry="24" fill="#f4f1ec"/><ellipse cx="-5" cy="-98" rx="5" ry="9" fill="#fff"/></g>`;
  return s;
}

// ---------- dream cake (tray) ----------
function dreamCake(o) {
  const r = rng(o.seed);
  const L = 145, R = 575, T = 300, B = 432, dx = 58, dy = -52, tr = id('tr'), gl = id('gl');
  let s = `<defs><linearGradient id="${tr}" x1="0" x2="1"><stop offset="0" stop-color="#b9b3ab"/><stop offset="0.5" stop-color="#efebe5"/><stop offset="1" stop-color="#a9a29a"/></linearGradient>
<linearGradient id="${gl}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a2a1b"/><stop offset="0.5" stop-color="#2e190f"/><stop offset="1" stop-color="#3a2016"/></linearGradient></defs>`;
  // right side face
  s += `<path d="M${R} ${T} L${R + dx} ${T + dy} L${R + dx} ${B + dy} L${R} ${B}Z" fill="#3a2016"/>`;
  const layers = [[T, 18, '#2e190f'], [T + 18, 28, '#fbf3e6'], [T + 46, 30, '#f2c94c'], [T + 76, 26, '#fbf3e6'], [T + 102, 30, '#4a2a1b']];
  for (const [y, h, c] of layers) {
    s += `<rect x="${L}" y="${y}" width="${R - L}" height="${h}" fill="${c}"/>`;
    s += `<path d="M${R} ${y} L${R + dx} ${y + dy} L${R + dx} ${y + h + dy} L${R} ${y + h}Z" fill="${shade(c, -0.18)}"/>`;
  }
  for (let i = 0; i < 40; i++) s += `<circle cx="${f1(L + 6 + r() * (R - L - 12))}" cy="${f1(T + 106 + r() * 22)}" r="${f1(1 + r() * 1.6)}" fill="#2a160e" opacity="0.6"/>`;
  s += `<path d="M${L} ${T + 46} Q${(L + R) / 2} ${T + 52} ${R} ${T + 46}" stroke="#e1b232" stroke-width="2" fill="none"/>`;
  // top
  s += `<path d="M${L} ${T} L${L + dx} ${T + dy} L${R + dx} ${T + dy} L${R} ${T}Z" fill="url(#${gl})"/>
<path d="M${L + 40} ${T - 8} L${L + 70} ${T + dy + 10} L${L + 200} ${T + dy + 10} L${L + 170} ${T - 8}Z" fill="#fff" opacity="0.08"/>`;
  for (let i = 0; i < 220; i++) {
    const u = r(), w = r();
    s += `<circle cx="${f1(L + u * (R - L) + w * dx)}" cy="${f1(T + w * dy)}" r="${f1(0.8 + r() * 1.3)}" fill="#8a5a3a" opacity="0.55"/>`;
  }
  const pts = [];
  for (let i = 0; i < 5; i++) pts.push([L + 50 + i * 88 + dx * 0.5, T + dy * 0.5]);
  for (const [x, y] of pts) s += rosette(x, y, 17, '#fbf3e6');
  for (const [x, y] of pts.slice(0, 4)) s += shard(x + 44, y - 4, 0.6, 20, '#3a2016');
  // foil tray
  s += `<path d="M${L - 10} ${B - 30} L${R + 10} ${B - 30} L${R + 2} ${B + 8} L${L - 2} ${B + 8}Z" fill="url(#${tr})"/>
<path d="M${R + 10} ${B - 30} L${R + dx + 10} ${B + dy - 30} L${R + dx + 4} ${B + dy + 6} L${R + 2} ${B + 8}Z" fill="#9c958c"/>
${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => `<path d="M${L + i * 43} ${B - 28} L${L + i * 43 + 1} ${B + 6}" stroke="#a8a198" stroke-width="2"/>`).join('')}`;
  return s;
}

// ---------- donuts ----------
function donut(x, y, s, glaze, rr, sprinkles = true) {
  const gid = id('dn');
  let out = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><defs><radialGradient id="${gid}" cx="0.45" cy="0.4" r="0.7"><stop offset="0" stop-color="#e9b77a"/><stop offset="1" stop-color="#b9783d"/></radialGradient></defs>
<ellipse cx="0" cy="14" rx="118" ry="80" fill="#a8652e"/>
<path fill-rule="evenodd" d="M-118 0 A118 84 0 1 0 118 0 A118 84 0 1 0 -118 0Z M-30 -6 A30 20 0 1 0 30 -6 A30 20 0 1 0 -30 -6Z" fill="url(#${gid})"/>`;
  if (glaze) {
    let p = '';
    const N = 40;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2, k = 0.86 + 0.06 * Math.sin(a * 5 + rr() * 2) + (rr() - 0.5) * 0.04;
      p += `${i ? 'L' : 'M'}${f1(Math.cos(a) * 118 * k)} ${f1(Math.sin(a) * 84 * k - 4)} `;
    }
    out += `<path fill-rule="evenodd" d="${p}Z M-40 -8 A40 27 0 1 0 40 -8 A40 27 0 1 0 -40 -8Z" fill="${glaze}" stroke="${shade(glaze, -0.12)}" stroke-width="2"/>
<path d="M-70 -44 Q-20 -66 40 -54" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.28"/>`;
    if (sprinkles) {
      const cols = ['#fff6e8', '#f2b6b6', '#e3a35a', '#6b3f29', '#f7d9a3'];
      for (let i = 0; i < 46; i++) {
        const a = rr() * Math.PI * 2, d = 0.48 + rr() * 0.36;
        out += sprinkle(Math.cos(a) * 118 * d, Math.sin(a) * 84 * d - 4, rr() * 180, cols[i % cols.length]);
      }
    }
  }
  return out + '</g>';
}
function donutsScene(o) {
  const r = rng(o.seed);
  let s = `<ellipse cx="400" cy="452" rx="320" ry="74" fill="#d9cfc1"/><ellipse cx="400" cy="444" rx="320" ry="72" fill="#fbf8f3"/><ellipse cx="400" cy="440" rx="270" ry="56" fill="#f3ede4"/>`;
  s += donut(265, 330, 0.95, '#f2b6b6', r) + donut(540, 322, 0.95, '#f7efe2', r) + donut(400, 400, 1.15, '#4a2a1b', r);
  return s;
}
function filledDonuts(o) {
  const r = rng(o.seed);
  const ball = (x, y, s) => {
    const gid = id('bl');
    let out = `<g transform="translate(${x} ${y}) scale(${s})"><defs><radialGradient id="${gid}" cx="0.4" cy="0.35" r="0.75"><stop offset="0" stop-color="#ecc187"/><stop offset="1" stop-color="#b8763a"/></radialGradient></defs>
<ellipse cx="0" cy="8" rx="104" ry="86" fill="#9e5f2c"/><ellipse rx="104" ry="86" fill="url(#${gid})"/>
<path d="M-104 4 Q0 30 104 4" stroke="#f4dfba" stroke-width="10" fill="none" opacity="0.7"/>`;
    for (let i = 0; i < 90; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.95; out += `<rect x="${f1(Math.cos(a) * 104 * d)}" y="${f1(Math.sin(a) * 86 * d)}" width="2.6" height="2.6" fill="#fffaf0" opacity="${f1(0.6 + r() * 0.4)}" transform="rotate(${f1(r() * 90)} ${f1(Math.cos(a) * 104 * d)} ${f1(Math.sin(a) * 86 * d)})"/>`; }
    return out + '</g>';
  };
  let s = `<ellipse cx="400" cy="452" rx="320" ry="74" fill="#d9cfc1"/><ellipse cx="400" cy="444" rx="320" ry="72" fill="#fbf8f3"/>`;
  s += ball(270, 330, 0.95) + ball(520, 322, 0.9);
  // cut half
  s += `<g transform="translate(410 405)"><ellipse cx="0" cy="12" rx="128" ry="52" fill="#9e5f2c"/>
<path d="M-128 0 A128 52 0 0 0 128 0 L128 -6 A128 52 0 0 0 -128 -6Z" fill="#c4874a"/>
<ellipse cx="0" cy="-6" rx="128" ry="50" fill="#f6dcae"/><ellipse cx="0" cy="-6" rx="118" ry="44" fill="#fbe8c4"/>
${Array.from({ length: 50 }, () => `<ellipse cx="${f1((r() - 0.5) * 210)}" cy="${f1(-6 + (r() - 0.5) * 70)}" rx="${f1(1 + r() * 2.5)}" ry="${f1(0.8 + r() * 1.5)}" fill="#e2bf87" opacity="0.7"/>`).join('')}
<path d="M-62 -14 C-60 -46 60 -46 62 -12 C64 18 30 26 0 26 C-34 26 -64 18 -62 -14Z" fill="#3a1f14"/>
<path d="M30 20 C44 26 52 34 52 48 C52 58 40 58 40 48 C40 38 34 32 22 26Z" fill="#3a1f14"/><path d="M-20 24 C-16 32 -14 40 -18 46 C-22 52 -30 48 -28 40 C-27 34 -26 30 -30 24Z" fill="#3a1f14"/>
<ellipse cx="-18" cy="-24" rx="22" ry="7" fill="#fff" opacity="0.22"/></g>`;
  return s;
}

// ---------- brownies ----------
function brownieBlock(x, y, w, h, d, o, r) {
  const top = o.top || '#5a3424', front = o.front || '#3d2216';
  let s = `<g transform="translate(${f1(x)} ${f1(y)})">
<path d="M${w} 0 L${w + d} ${-d * 0.75} L${w + d} ${h - d * 0.75} L${w} ${h}Z" fill="${shade(front, -0.25)}"/>
<path d="M0 0 L${w} 0 L${w} ${h} L0 ${h}Z" fill="${front}"/>
<path d="M0 0 L${d} ${-d * 0.75} L${w + d} ${-d * 0.75} L${w} 0Z" fill="${top}"/>`;
  for (let i = 0; i < 40; i++) s += `<circle cx="${f1(4 + r() * (w - 8))}" cy="${f1(6 + r() * (h - 10))}" r="${f1(0.8 + r() * 1.8)}" fill="#24120b" opacity="0.6"/>`;
  if (o.crinkle) {
    for (let i = 0; i < 9; i++) {
      const u = 0.1 + r() * 0.8, v = 0.15 + r() * 0.7, x0 = u * w + v * d, y0 = -v * d * 0.75;
      s += `<path d="M${f1(x0 - 14)} ${f1(y0)} l${f1(9 + r() * 6)} ${f1(-3 + r() * 6)} l${f1(9 + r() * 6)} ${f1(-3 + r() * 6)}" stroke="#a8795a" stroke-width="1.6" fill="none" opacity="0.8"/>`;
    }
    s += `<path d="M${f1(d * 0.3)} ${f1(-d * 0.25)} L${f1(w * 0.55)} ${f1(-d * 0.25)}" stroke="#fff" stroke-width="3" opacity="0.18" stroke-linecap="round"/>`;
  }
  if (o.chunks) {
    for (let i = 0; i < 8; i++) {
      const u = 0.1 + r() * 0.75, v = 0.2 + r() * 0.6, x0 = u * w + v * d, y0 = -v * d * 0.75;
      const c = ['#f4ead8', '#b07a4f', '#2a160e'][i % 3];
      s += `<path d="M${f1(x0)} ${f1(y0)} l8 -4 l8 4 l-8 4Z" fill="${c}"/><path d="M${f1(x0)} ${f1(y0)} l8 4 l0 6 l-8 -4Z" fill="${shade(c, -0.2)}"/>`;
    }
    s += `<path d="M${f1(d * 0.2)} ${f1(-d * 0.5)} q20 12 40 -2 t40 2 t40 -2 t30 4" stroke="#f4ead8" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  }
  return s + '</g>';
}
function brownieScene(o) {
  const r = rng(o.seed);
  let s = `<path d="M150 440 L650 440 L690 476 L110 476Z" fill="#efe4d4"/><path d="M150 440 L650 440 L650 446 L150 446Z" fill="#fff" opacity="0.4"/>
<path d="M170 452 L630 452" stroke="#d9c7ad" stroke-width="2" stroke-dasharray="6 6"/>`;
  s += brownieBlock(250, 300, 190, 70, 70, o, r) + brownieBlock(270, 232, 170, 64, 64, o, r);
  s += brownieBlock(470, 360, 150, 66, 56, o, r);
  s += brownieBlock(170, 378, 140, 60, 50, o, r);
  return s;
}
function brownieCups(o) {
  const r = rng(o.seed);
  const cup = (x, y, s) => {
    let out = `<g transform="translate(${x} ${y}) scale(${s})">
<path d="M-70 0 L-52 110 L52 110 L70 0Z" fill="#7a4a2c"/>`;
    for (let i = 0; i <= 12; i++) out += `<path d="M${f1(-70 + i * 11.66)} 0 L${f1(-52 + i * 8.66)} 110" stroke="${i % 2 ? '#5e371f' : '#9a6440'}" stroke-width="5"/>`;
    out += `<path d="M-74 2 C-72 -40 72 -40 74 2 C60 14 -60 14 -74 2Z" fill="#3a2016"/>
<path d="M-60 -6 C-52 -30 50 -32 60 -8" stroke="#5b3523" stroke-width="5" fill="none"/>`;
    for (let i = 0; i < 18; i++) out += `<circle cx="${f1(-55 + r() * 110)}" cy="${f1(-18 + r() * 18)}" r="${f1(1 + r() * 2)}" fill="#24120b" opacity="0.6"/>`;
    out += rosette(0, -26, 28, '#4a2a1b') + shard(26, -44, 0.55, 25, '#2a160e');
    return out + '</g>';
  };
  let s = `<ellipse cx="400" cy="452" rx="320" ry="60" fill="#e4d5c1"/>`;
  s += cup(255, 300, 0.95) + cup(545, 296, 0.95) + cup(400, 335, 1.15);
  return s;
}

// ---------- product art definitions ----------
const cream = '#fbf3e6', caramel = '#c7843c', choc = '#4a2a1b', chocLight = '#6b3f29';

const ART = {
  'fresh-vanilla-cake': () => scene(roundCake({
    seed: 'vanilla', side: '#fbf3e6', topColor: '#fffaf1', beads: '#fffaf2', sideStripes: '#f1e2c8',
    decorate: ({ cx, top, rx, ry }) => ring(12, cx, top, rx, ry, 0.8).map(([x, y]) => rosette(x, y - 6, 18, '#fffaf2')).join('') +
      ring(8, cx, top, rx, ry, 0.38, 0.4).map(([x, y], i) => `<circle cx="${f1(x)}" cy="${f1(y - 2)}" r="${i % 2 ? 4 : 5.5}" fill="#efd9a8"/><circle cx="${f1(x - 1.5)}" cy="${f1(y - 3.5)}" r="1.6" fill="#fff"/>`).join('') +
      curl(cx - 10, top - 4, 0.9, -15, '#f6e7c9') + curl(cx + 18, top + 2, 0.75, 25, '#efd9a8'),
  }), { bg: '#efe4d4' }),

  'simple-chocolate-cake': () => scene(roundCake({
    seed: 'simplechoc', side: '#6b3f29', topColor: '#5a3424', beads: '#5a3424',
    decorate: ({ cx, top, rx, ry }) => ring(12, cx, top, rx, ry, 0.8).map(([x, y]) => rosette(x, y - 6, 17, '#6b3f29')).join('') +
      ring(6, cx, top, rx, ry, 0.3).map(([x, y]) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="5" fill="#3a2016"/>`).join(''),
  }), { bg: '#ecd9c6' }),

  'rich-chocolaty-cream-cake': () => scene(roundCake({
    seed: 'richchoc', side: '#5a3424', topColor: '#4a2a1b', beads: '#3a2016', drip: '#2e190f', dripLen: 45,
    decorate: ({ r, cx, top, rx, ry }) => ring(10, cx, top, rx, ry, 0.8).map(([x, y]) => rosette(x, y - 6, 17, '#f0dcc0')).join('') +
      scatter(r, 6, cx, top - 8, 60, 16, 1).map(([x, y, k]) => shard(x, y - 10, 1, -20 + k * 40, k > 0.5 ? '#2a160e' : '#6b3f29')).join(''),
  }), { bg: '#e7d2bd' }),

  'fudge-cake': () => scene(roundCake({
    seed: 'fudge', side: '#3d2216', topColor: '#2e190f', drip: '#2a150c', dripLen: 85, dripCount: 18, glossBand: true,
    decorate: ({ r, cx, top, rx, ry }) => `<ellipse cx="${cx - 50}" cy="${top - 14}" rx="90" ry="12" fill="#fff" opacity="0.14"/>` +
      ring(9, cx, top, rx, ry, 0.72).map(([x, y]) => rosette(x, y - 4, 15, '#3a1f14')).join('') +
      scatter(r, 14, cx, top, 60, 14, 1).map(([x, y]) => `<rect x="${f1(x)}" y="${f1(y)}" width="9" height="9" rx="2" fill="#5a3424" transform="rotate(${f1(r() * 90)} ${f1(x)} ${f1(y)})"/>`).join(''),
  }), { bg: '#e6cfb8' }),

  'pineapple-cake': () => scene(roundCake({
    seed: 'pineapple', side: '#fbf3e6', topColor: '#fff8ea', beads: '#fff7e6', sideStripes: '#f5d77a',
    decorate: ({ cx, top, rx, ry }) => ring(8, cx, top, rx, ry, 0.74).map(([x, y]) => pineappleRing(x, y - 4) + cherry(x, y - 12, 0.75)).join('') +
      rosette(cx, top - 6, 22, '#fff7e6') + cherry(cx, top - 20, 0.9),
  }), { bg: '#f1e4c8' }),

  'mix-fruit-cake': () => scene(roundCake({
    seed: 'mixfruit', side: '#fbf3e6', topColor: '#fff8ea', beads: '#fff7e6',
    decorate: ({ r, cx, top, rx, ry }) => {
      const fns = [strawberry, kiwi, orangeSlice, cherry, pineappleRing];
      return ring(10, cx, top, rx, ry, 0.78).map(([x, y], i) => rosette(x, y - 2, 13, '#fff7e6') + fns[i % 5](x, y - 10, i % 5 === 4 ? 0.6 : 0.85)).join('') +
        scatter(r, 7, cx, top, 90, 22, 0.9).map(([x, y], i) => fns[(i + 2) % 4](x, y - 4, 0.8)).join('');
    },
  }), { bg: '#efe2cf' }),

  'strawberry-cake': () => scene(roundCake({
    seed: 'strawberry', side: '#f6cdd0', topColor: '#fbe1e2', beads: '#fff1f1', drip: '#d9505e', dripLen: 40,
    decorate: ({ cx, top, rx, ry }) => ring(10, cx, top, rx, ry, 0.78).map(([x, y]) => rosette(x, y - 2, 15, '#fff4f3') + strawberry(x, y - 16, 0.9)).join('') +
      strawberry(cx - 20, top - 8, 1.2) + strawberry(cx + 26, top - 2, 1.1),
  }), { bg: '#f3e0db' }),

  'caramel-cake': () => scene(roundCake({
    seed: 'caramel', side: '#f5e6cf', topColor: '#fbf0dc', beads: '#f8ead4', drip: caramel, dripLen: 60,
    decorate: ({ cx, top, rx, ry }) => ring(11, cx, top, rx, ry, 0.8).map(([x, y]) => rosette(x, y - 6, 16, '#f8ead4')).join('') +
      `<path d="M${cx - 80} ${top - 4} q20 -14 40 0 t40 0 t40 0 t40 0" stroke="#e1a858" stroke-width="5" fill="none" stroke-linecap="round"/>` +
      rosette(cx, top - 10, 24, '#d99a4f'),
  }), { bg: '#f0dfc6' }),

  'caramel-crunch-peanut-cake': () => scene(roundCake({
    seed: 'peanut', side: '#f2dfc2', topColor: '#f8e9cf', sideTexture: 'crumbs', drip: caramel, dripLen: 50,
    decorate: ({ r, cx, top, rx, ry }) => scatter(r, 70, cx, top, rx, ry, 0.82).map(([x, y]) => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(4 + r() * 3)}" ry="${f1(3 + r() * 2)}" fill="${r() > 0.5 ? '#d8a964' : '#c48c45'}" transform="rotate(${f1(r() * 180)} ${f1(x)} ${f1(y)})"/><circle cx="${f1(x - 1)}" cy="${f1(y - 1)}" r="1.2" fill="#f6dfb2"/>`).join('') +
      ring(8, cx, top, rx, ry, 0.8).map(([x, y]) => rosette(x, y - 6, 15, '#f8e9cf')).join(''),
  }), { bg: '#efdcc2' }),

  'chocolate-caramel-cake': () => scene(roundCake({
    seed: 'chocaramel', side: '#5a3424', topColor: '#4a2a1b', beads: '#4a2a1b', drip: caramel, dripLen: 62,
    decorate: ({ r, cx, top, rx, ry }) => ring(10, cx, top, rx, ry, 0.8).map(([x, y], i) => rosette(x, y - 6, 16, i % 2 ? '#6b3f29' : '#e3a85c')).join('') +
      scatter(r, 5, cx, top - 6, 50, 12, 1).map(([x, y, k]) => shard(x, y - 8, 0.9, -20 + k * 40, '#2e190f')).join(''),
  }), { bg: '#ead4bd' }),

  'caramel-crunch-walnuts-cake': () => scene(roundCake({
    seed: 'walnut', side: '#f2dfc2', topColor: '#f8e9cf', beads: '#efd7b2', drip: '#b8742f', dripLen: 55,
    decorate: ({ r, cx, top, rx, ry }) => ring(10, cx, top, rx, ry, 0.78).map(([x, y]) => rosette(x, y - 2, 13, '#f8e9cf') + walnut(x, y - 14, 0.85, r() * 40 - 20)).join('') +
      scatter(r, 8, cx, top, 80, 20, 0.9).map(([x, y]) => walnut(x, y - 4, 0.75, r() * 60 - 30)).join(''),
  }), { bg: '#efdcc2' }),

  'three-milk-pistachio-cake': () => scene(threeMilkSlice({
    seed: 'tmpist', milk: '#f6f0dc',
    decorate: ({ r, L, R, T, dx, dy }) => {
      let s = '';
      for (let i = 0; i < 160; i++) {
        const u = r(), w = r(), x = L + u * (R - L) + w * dx, y = T + w * dy;
        s += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(3 + r() * 4)}" height="${f1(2 + r() * 3)}" rx="1" fill="${r() > 0.35 ? '#93b14b' : '#c9d97a'}" transform="rotate(${f1(r() * 90)} ${f1(x)} ${f1(y)})"/>`;
      }
      return s + rosette((L + R) / 2 + dx / 2, T + dy / 2 - 4, 20, '#fffaf1') + `<path d="M${(L + R) / 2 + dx / 2 - 14} ${T + dy / 2 - 22} l10 -4 l8 6 l-10 4Z" fill="#7d9b3b"/>`;
    },
  }), { bg: '#e9e6d2', table: '#ddd6c2' }),

  'three-milk-caramel-cake': () => scene(threeMilkSlice({
    seed: 'tmcar', milk: '#f6e3c3',
    decorate: ({ L, R, T, dx, dy }) => {
      let s = '';
      for (let i = 0; i < 7; i++) {
        const x0 = L + 20 + i * 36;
        s += `<path d="M${x0} ${T} q${dx * 0.25} ${dy * 0.25 - 6} ${dx * 0.5} ${dy * 0.5} t${dx * 0.5} ${dy * 0.5}" stroke="#c7843c" stroke-width="5" fill="none" stroke-linecap="round"/>`;
      }
      s += `<path d="M${R - 30} ${T} q4 20 2 44" stroke="#c7843c" stroke-width="6" stroke-linecap="round"/><path d="M${L + 40} ${T} q-2 16 0 30" stroke="#c7843c" stroke-width="5" stroke-linecap="round"/>`;
      return s + rosette((L + R) / 2 + dx / 2, T + dy / 2 - 4, 20, '#e3a85c');
    },
  }), { bg: '#efdfc6' }),

  'coconut-cake': () => scene(roundCake({
    seed: 'coconut', side: '#fbf6ec', topColor: '#fffcf5', sideTexture: 'coconut', topTexture: 'coconut',
    decorate: ({ cx, top, rx, ry }) => ring(8, cx, top, rx, ry, 0.78).map(([x, y]) => rosette(x, y - 6, 15, '#fffdf8')).join('') +
      rosette(cx, top - 8, 26, '#fffdf8'),
  }), { bg: '#eae4d8' }),

  'chocolate-mousse-cake': () => scene(mousseCake({ seed: 'mousse' }), { bg: '#e8d3bf' }),
  'chocolate-tub-cake': () => scene(tubCake({ seed: 'tub' }), { bg: '#ecd8c3' }),
  'dream-cake': () => scene(dreamCake({ seed: 'dream' }), { bg: '#eedcc8' }),

  'dry-fruits-cake': () => scene(loafCake({
    seed: 'dryfruit', crust: '#b8742f', crumb: '#ecc77e', inclusions: ['#4a2338', '#c49b5e', '#9a5a2c', '#5e7a32', '#7a1f2b'], inclusionCount: 30,
    decorate: ({ r }) => [[240, 256], [290, 247], [340, 242], [390, 240], [440, 243], [490, 249], [530, 262]]
      .map(([x, y], i) => [almond, cashew, raisin, walnut][i % 4](x, y, 0.9, r() * 40 - 20)).join(''),
  }), { bg: '#eedcc4' }),

  'banana-cake': () => scene(loafCake({
    seed: 'banana', crust: '#a8692f', crumb: '#e7c27b', inclusions: ['#8b6a3a'], inclusionCount: 10,
    decorate: () => [[250, 253], [305, 245], [360, 240], [415, 240], [470, 245], [520, 255]].map(([x, y]) => bananaSlice(x, y, 1.1)).join(''),
  }), { bg: '#f0e1c4' }),

  'milky-dry-cake': () => scene(loafCake({
    seed: 'milky', crust: '#d9a35a', crumb: '#f8e6b8',
    decorate: ({ r }) => Array.from({ length: 140 }, () => { const x = 200 + r() * 340, y = 240 + r() * 40 + Math.abs(x - 370) * 0.12; return `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(0.8 + r() * 1.6)}" fill="#fffaf0" opacity="${f1(0.6 + r() * 0.4)}"/>`; }).join(''),
  }), { bg: '#f1e6d2' }),

  'almond-cake': () => scene(loafCake({
    seed: 'almond', crust: '#c98a3e', crumb: '#f3d797', inclusions: ['#f0dcb5'], inclusionCount: 12,
    decorate: ({ r }) => Array.from({ length: 30 }, (_, i) => { const x = 215 + (i % 15) * 22 + r() * 8, y = 252 - Math.sin(((x - 200) / 340) * Math.PI) * 18 + (i > 14 ? 10 : 0); return almond(x, y, 0.9, r() * 60 - 30, true); }).join(''),
  }), { bg: '#efdfc6' }),

  'tutty-fruity-dry-cake': () => scene(loafCake({
    seed: 'tutti', crust: '#c98a3e', crumb: '#f5dc9e', inclusions: ['#d7263d', '#3f9e4d', '#f2a91c', '#e86fa0', '#f7e04a'], inclusionCount: 34,
    decorate: ({ r }) => Array.from({ length: 16 }, (_, i) => { const x = 230 + i * 19, y = 254 - Math.sin(((x - 200) / 340) * Math.PI) * 16; const c = ['#d7263d', '#3f9e4d', '#f2a91c', '#e86fa0'][i % 4]; return `<rect x="${f1(x)}" y="${f1(y + r() * 6)}" width="7" height="6" rx="1.5" fill="${c}" transform="rotate(${f1(r() * 50)} ${f1(x)} ${f1(y)})"/>`; }).join(''),
  }), { bg: '#f1e1c8' }),

  donuts: () => scene(donutsScene({ seed: 'donut' }), { bg: '#f2e0d9' }),
  'chocolate-filled-donuts': () => scene(filledDonuts({ seed: 'filled' }), { bg: '#efdccb' }),
  'brownie-cup': () => scene(brownieCups({ seed: 'cup' }), { bg: '#ecd8c3' }),
  'triple-chocolate-brownie': () => scene(brownieScene({ seed: 'triple', chunks: true, top: '#4a2a1b', front: '#341c12' }), { bg: '#e9d4bf' }),
  'crinkle-top-brownie': () => scene(brownieScene({ seed: 'crinkle', crinkle: true, top: '#6b4029', front: '#3d2216' }), { bg: '#eedcc8' }),
};

// ---------- hero (transparent, tall) ----------
function hero() {
  const cake = roundCake({
    seed: 'hero', side: '#fbf3e6', topColor: '#fffaf1', beads: '#fffaf2', drip: '#c7843c', dripLen: 58, top: 230, bot: 410,
    decorate: ({ cx, top, rx, ry }) => ring(10, cx, top, rx, ry, 0.8).map(([x, y], i) => rosette(x, y - 4, 16, '#fffaf2') + (i % 2 ? strawberry(x, y - 18, 0.8) : cherry(x, y - 14, 0.7))).join('') +
      curl(cx - 20, top - 8, 1, -20, '#4a2a1b') + curl(cx + 22, top - 2, 0.9, 30, '#6b3f29') + rosette(cx, top - 16, 26, '#e3a85c'),
  });
  const r = rng('herodonut');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="60 120 680 470" width="680" height="470">
<defs><filter id="hs" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="12"/></filter></defs>
<ellipse cx="400" cy="540" rx="300" ry="26" fill="#3b2418" opacity="0.25" filter="url(#hs)"/>
${cake}
<g transform="translate(150 520) scale(0.62)">${donut(0, 0, 1, '#f2b6b6', r)}</g>
<g transform="translate(640 512) scale(0.55)">${brownieBlock(-90, -30, 150, 66, 56, { crinkle: true, top: '#6b4029', front: '#3d2216' }, r)}</g>
</svg>`;
}

function favicon() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#3b2418"/><path d="M14 40 L14 30 Q32 22 50 30 L50 40 Q32 48 14 40Z" fill="#f7e9d4"/><path d="M14 30 Q32 22 50 30 Q32 36 14 30Z" fill="#c7843c"/><circle cx="32" cy="22" r="5" fill="#d9505e"/><path d="M32 17 q2 -5 6 -6" stroke="#7d9b3b" stroke-width="2" fill="none"/></svg>`;
}

let count = 0;
for (const [slug, fn] of Object.entries(ART)) {
  fs.writeFileSync(path.join(OUT, `${slug}.svg`), fn().replace(/\n+/g, '\n'));
  count++;
}
fs.writeFileSync(path.join(__dirname, '..', 'public', 'images', 'hero-cake.svg'), hero());
fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'), favicon());
console.log(`Generated ${count} product images + hero + favicon.`);
module.exports = { ART };
