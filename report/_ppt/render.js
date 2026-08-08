/*
 * QA renderer: chạy lại gen.js qua một mock pptxgenjs để bắt mọi lệnh addText/addImage/addShape,
 * rồi ghép từng slide thành 1 ảnh PNG (1333x750) để soát bố cục bằng mắt.
 * Chạy: node render.js  → slide-1.png ... slide-10.png trong thư mục này.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PX = 100; // 1 inch = 100px  → canvas 1333x750
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---- mock pptxgenjs ----
class Slide {
  constructor() { this.els = []; this._bg = 'FFFFFF'; }
  set background(v) { this._bg = (v && v.color) || 'FFFFFF'; }
  addText(text, o = {}) { this.els.push({ t: 'text', text, o }); }
  addImage(o = {}) { this.els.push({ t: 'image', o }); }
  addShape(kind, o = {}) { this.els.push({ t: 'shape', kind, o }); }
  addNotes() {}
}
class MockPptx {
  constructor() { this.slides = []; }
  defineLayout() {}
  set layout(_) {}
  set theme(_) {}
  addSlide() { const s = new Slide(); this.slides.push(s); return s; }
  async writeFile() { /* captured instead */ }
}

// runs after we load gen source
async function main() {
  global.__deck = null;
  // patch require so gen.js gets our mock
  const Module = require('module');
  const origLoad = Module._load;
  const mock = new MockPptx();
  Module._load = function (request, parent, isMain) {
    if (request === 'pptxgenjs') return function () { return mock; };
    return origLoad.apply(this, arguments);
  };
  // gen.js is an async IIFE that resolves when writeFile done; require and wait
  require(path.join(__dirname, 'gen.js'));
  // wait until all 10 slides captured and last slide has elements
  for (let i = 0; i < 200; i++) {
    if (mock.slides.length >= 10) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  await new Promise((r) => setTimeout(r, 400)); // let last awaits flush
  Module._load = origLoad;

  const flatten = (runs) => Array.isArray(runs) ? runs.map((r) => r.text).join('') : String(runs);
  // wrap text into lines by approximate width
  function wrap(text, wIn, fsPt) {
    const wPx = wIn * PX;
    const fsPx = fsPt * PX / 72;
    const chPx = fsPx * 0.5; // avg glyph width factor
    const cpl = Math.max(1, Math.floor((wPx - 8) / chPx));
    const out = [];
    for (const para of String(text).split('\n')) {
      if (para.length === 0) { out.push(''); continue; }
      const words = para.split(' ');
      let line = '';
      for (const w of words) {
        const cand = line ? line + ' ' + w : w;
        if (cand.length > cpl && line) { out.push(line); line = w; }
        else line = cand;
      }
      if (line) out.push(line);
    }
    return { lines: out, fsPx };
  }

  let outFiles = [];
  for (let si = 0; si < mock.slides.length; si++) {
    const s = mock.slides[si];
    let inner = `<rect x="0" y="0" width="1333" height="750" fill="#${s._bg}"/>`;
    const composites = [];
    for (const el of s.els) {
      const o = el.o || {};
      const x = (o.x || 0) * PX, y = (o.y || 0) * PX, w = (o.w || 0) * PX, h = (o.h || 0) * PX;
      if (el.t === 'image') {
        // o.data = 'image/png;base64,....'  → decode, composite at x,y sized w,h
        const b64 = String(o.data).replace(/^image\/png;base64,/, '');
        const buf = Buffer.from(b64, 'base64');
        composites.push({ input: buf, x, y, w, h });
      } else if (el.t === 'shape') {
        const fill = (o.fill && o.fill.color) || 'FFFFFF';
        inner += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#${fill}"/>`;
      } else if (el.t === 'text') {
        const str = flatten(el.text);
        const fs2 = o.fontSize || 18;
        const { lines, fsPx } = wrap(str, o.w || 3, fs2);
        const color = o.color || '2B2B2B';
        const anchor = o.align === 'center' ? 'middle' : (o.align === 'right' ? 'end' : 'start');
        const tx = anchor === 'middle' ? x + w / 2 : (anchor === 'end' ? x + w : x + 3);
        const lineH = fsPx * 1.2;
        // draw a faint box outline so we can see the text frame bounds
        inner += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#EAB3A0" stroke-width="1" stroke-dasharray="4 4"/>`;
        let ty = y + fsPx; // top-aligned baseline of first line
        for (const ln of lines) {
          inner += `<text x="${tx}" y="${ty}" font-family="Segoe Print, Comic Sans MS, Comic Neue, cursive" font-size="${fsPx}" fill="#${color}" text-anchor="${anchor}" font-weight="${o.bold ? 'bold' : 'normal'}" font-style="${o.italic ? 'italic' : 'normal'}">${esc(ln)}</text>`;
          ty += lineH;
        }
      }
    }
    const baseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1333" height="750" viewBox="0 0 1333 750">${inner}</svg>`;
    let img = sharp(Buffer.from(baseSvg));
    // composite images on top (resize each to target box)
    const layers = [];
    for (const c of composites) {
      const resized = await sharp(c.input).resize(Math.max(1, Math.round(c.w)), Math.max(1, Math.round(c.h)), { fit: 'fill' }).png().toBuffer();
      layers.push({ input: resized, left: Math.round(c.x), top: Math.round(c.y) });
    }
    // images must sit UNDER text? In deck, bg+frames added first, text later, some images (doodles) added before text.
    // For QA we render text on top of base svg, then doodles composited — but that hides text under doodles.
    // Instead: composite doodles first onto white, then overlay the text-svg. Rebuild:
    const bgOnly = `<svg xmlns="http://www.w3.org/2000/svg" width="1333" height="750"><rect width="1333" height="750" fill="#${s._bg}"/></svg>`;
    let canvas = sharp(Buffer.from(bgOnly));
    canvas = canvas.composite(layers);
    const withDoodles = await canvas.png().toBuffer();
    // now overlay text/shape-only svg
    let textInner = '';
    for (const el of s.els) {
      const o = el.o || {};
      const x = (o.x || 0) * PX, y = (o.y || 0) * PX, w = (o.w || 0) * PX, h = (o.h || 0) * PX;
      if (el.t === 'shape') {
        const fill = (o.fill && o.fill.color) || 'FFFFFF';
        textInner += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#${fill}"/>`;
      } else if (el.t === 'text') {
        const str = flatten(el.text);
        const fs2 = o.fontSize || 18;
        const { lines, fsPx } = wrap(str, o.w || 3, fs2);
        const color = o.color || '2B2B2B';
        const anchor = o.align === 'center' ? 'middle' : (o.align === 'right' ? 'end' : 'start');
        const tx = anchor === 'middle' ? x + w / 2 : (anchor === 'end' ? x + w : x + 3);
        const lineH = fsPx * 1.2;
        textInner += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#EAB3A0" stroke-width="1" stroke-dasharray="5 4"/>`;
        let ty = y + fsPx;
        for (const ln of lines) {
          textInner += `<text x="${tx}" y="${ty}" font-family="Comic Sans MS, Comic Neue, cursive" font-size="${fsPx}" fill="#${color}" text-anchor="${anchor}" font-weight="${o.bold ? 'bold' : 'normal'}" font-style="${o.italic ? 'italic' : 'normal'}">${esc(ln)}</text>`;
          ty += lineH;
        }
      }
    }
    const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1333" height="750" viewBox="0 0 1333 750">${textInner}</svg>`;
    const finalBuf = await sharp(withDoodles).composite([{ input: Buffer.from(textSvg), left: 0, top: 0 }]).png().toBuffer();
    const fn = path.join(__dirname, `slide-${si + 1}.png`);
    fs.writeFileSync(fn, finalBuf);
    outFiles.push(fn);
  }
  console.log('RENDERED:\n' + outFiles.join('\n'));
}
main().catch((e) => { console.error(e); process.exit(1); });
