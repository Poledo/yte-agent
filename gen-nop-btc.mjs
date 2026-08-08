// Chuyển 8 tài liệu nộp BTC từ .md sang .docx + .pdf (mỗi thư mục đủ 3 định dạng).
// Node thuần: tự dựng OOXML (docx) + HTML → PDF bằng Chrome headless có sẵn trên máy.
// Chạy: node gen-nop-btc.mjs
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';

const ROOT = 'D:/VNPT/hackathon/nop-btc';

// ---------- tìm Chrome ----------
const CHROME_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const CHROME = CHROME_PATHS.find((p) => p && existsSync(p));

// ---------- markdown mini-parser ----------
// Hỗ trợ: # ## ###, đoạn văn, - bullet, 1. numbered, bảng |..|, ```code```, > quote, ---
function parseMd(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const buf = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++]);
      i++;
      blocks.push({ t: 'code', text: buf.join('\n') });
      continue;
    }
    if (/^---+\s*$/.test(line)) { blocks.push({ t: 'hr' }); i++; continue; }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { blocks.push({ t: 'h' + h[1].length, text: h[2] }); i++; continue; }
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].slice(1).replace(/\|\s*$/, '').split('|').map((c) => c.trim());
        if (!/^[-:\s|]+$/.test(lines[i].replace(/\|/g, ''))) rows.push(cells);
        i++;
      }
      blocks.push({ t: 'table', rows });
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) items.push(lines[i].replace(/^[-*]\s+/, '')), i++;
      blocks.push({ t: 'ul', items });
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) items.push(lines[i].replace(/^\d+\.\s+/, '')), i++;
      blocks.push({ t: 'ol', items });
      continue;
    }
    if (line.startsWith('>')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i].replace(/^>\s?/, '')), i++;
      blocks.push({ t: 'quote', text: buf.join(' ') });
      continue;
    }
    if (line.trim() === '') { i++; continue; }
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== '' && !/^([#>|`-]|\d+\.|\*)/.test(lines[i])) buf.push(lines[i]), i++;
    blocks.push({ t: 'p', text: buf.join(' ') });
  }
  return blocks;
}

// inline: **bold**, `code` → mảng run {t, b, code}
function inline(text) {
  const runs = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push({ t: text.slice(last, m.index) });
    const tok = m[0];
    if (tok.startsWith('**')) runs.push({ t: tok.slice(2, -2), b: 1 });
    else runs.push({ t: tok.slice(1, -1), code: 1 });
    last = m.index + tok.length;
  }
  if (last < text.length) runs.push({ t: text.slice(last) });
  return runs.length ? runs : [{ t: '' }];
}

// ---------- DOCX ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const CYAN = '0E7490';

function runXml(r, base = {}) {
  const b = r.b || base.b, sz = base.sz, color = base.color;
  const font = r.code ? 'Consolas' : 'Segoe UI';
  return `<w:r><w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/>${b ? '<w:b/>' : ''}${color ? `<w:color w:val="${color}"/>` : ''}${sz ? `<w:sz w:val="${sz * 2}"/><w:szCs w:val="${sz * 2}"/>` : ''}${r.code ? '<w:shd w:val="clear" w:fill="EEF3FA"/>' : ''}</w:rPr><w:t xml:space="preserve">${esc(r.t)}</w:t></w:r>`;
}
const paraXml = (runs, opts = {}) =>
  `<w:p><w:pPr>${opts.style ? `<w:pStyle w:val="${opts.style}"/>` : ''}${opts.numId ? `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${opts.numId}"/></w:numPr>` : ''}${opts.ind ? `<w:ind w:left="${opts.ind}"/>` : ''}<w:spacing w:after="${opts.after ?? 100}"/></w:pPr>${runs.map((r) => runXml(r, opts)).join('')}</w:p>`;

function tableXml(rows) {
  const cols = Math.max(...rows.map((r) => r.length));
  const W = 9350, cw = Math.floor(W / cols);
  const grid = Array.from({ length: cols }, () => `<w:gridCol w:w="${cw}"/>`).join('');
  const trs = rows.map((cells, ri) => {
    const tcs = Array.from({ length: cols }, (_, ci) => {
      const runs = inline(cells[ci] ?? '');
      const shd = ri === 0 ? '<w:shd w:val="clear" w:fill="DDF0F6"/>' : '';
      return `<w:tc><w:tcPr><w:tcW w:w="${cw}" w:type="dxa"/>${shd}</w:tcPr>${paraXml(runs, { after: 40, b: ri === 0 ? 1 : 0, sz: 10.5 })}</w:tc>`;
    }).join('');
    return `<w:tr>${tcs}</w:tr>`;
  }).join('');
  const bd = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map((s) => `<w:${s} w:val="single" w:sz="4" w:color="B7C4D8"/>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${W}" w:type="dxa"/><w:tblBorders>${bd}</w:tblBorders></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${trs}</w:tbl><w:p><w:pPr><w:spacing w:after="60"/></w:pPr></w:p>`;
}

function blocksToDocx(blocks) {
  let numIdSeq = 1;
  const numIds = [];
  const body = [];
  for (const bl of blocks) {
    switch (bl.t) {
      case 'h1': body.push(paraXml(inline(bl.text), { style: 'Heading1' })); break;
      case 'h2': body.push(paraXml(inline(bl.text), { style: 'Heading2' })); break;
      case 'h3': case 'h4': body.push(paraXml(inline(bl.text), { style: 'Heading3' })); break;
      case 'p': body.push(paraXml(inline(bl.text))); break;
      case 'quote': body.push(paraXml(inline(bl.text), { ind: 360, color: '5B6B8C' })); break;
      case 'hr': body.push('<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:color="B7C4D8"/></w:pBdr><w:spacing w:after="140"/></w:pPr></w:p>'); break;
      case 'ul': for (const it of bl.items) body.push(paraXml([{ t: '•  ' }, ...inline(it)], { ind: 360, after: 50 })); break;
      case 'ol': {
        const id = ++numIdSeq; numIds.push(id);
        for (const it of bl.items) body.push(paraXml(inline(it), { numId: id, after: 50 }));
        break;
      }
      case 'code':
        for (const line of bl.text.split('\n'))
          body.push(paraXml([{ t: line || ' ', code: 1 }], { after: 0, sz: 9.5 }));
        body.push('<w:p><w:pPr><w:spacing w:after="100"/></w:pPr></w:p>');
        break;
      case 'table': body.push(tableXml(bl.rows)); break;
    }
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1418"/></w:sectPr></w:body></w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Segoe UI" w:hAnsi="Segoe UI" w:cs="Segoe UI"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="288" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:keepNext/><w:spacing w:before="300" w:after="160"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="${CYAN}"/><w:sz w:val="34"/><w:szCs w:val="34"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:keepNext/><w:spacing w:before="260" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="1F3B63"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style></w:styles>`;

  const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="480" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>${numIds.map((id) => `<w:num w:numId="${id}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`).join('')}</w:numbering>`;

  return { documentXml, stylesXml, numberingXml };
}

// ---------- ZIP ----------
const crcTable = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function makeZip(entries) {
  const locals = [], centrals = []; let off = 0;
  for (const [name, content] of entries) {
    const nb = Buffer.from(name, 'utf8'), data = Buffer.from(content, 'utf8'), crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(nb.length, 26);
    locals.push(lh, nb, data);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24);
    ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(off, 42);
    centrals.push(Buffer.concat([ch, nb]));
    off += 30 + nb.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

function writeDocx(blocks, outPath) {
  const { documentXml, stylesXml, numberingXml } = blocksToDocx(blocks);
  const entries = [
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`],
    ['word/document.xml', documentXml],
    ['word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`],
    ['word/styles.xml', stylesXml],
    ['word/numbering.xml', numberingXml],
  ];
  writeFileSync(outPath, makeZip(entries));
}

// ---------- HTML → PDF ----------
function inlineHtml(text) {
  return esc(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}
function blocksToHtml(blocks) {
  const out = [];
  for (const bl of blocks) {
    switch (bl.t) {
      case 'h1': out.push(`<h1>${inlineHtml(bl.text)}</h1>`); break;
      case 'h2': out.push(`<h2>${inlineHtml(bl.text)}</h2>`); break;
      case 'h3': case 'h4': out.push(`<h3>${inlineHtml(bl.text)}</h3>`); break;
      case 'p': out.push(`<p>${inlineHtml(bl.text)}</p>`); break;
      case 'quote': out.push(`<blockquote>${inlineHtml(bl.text)}</blockquote>`); break;
      case 'hr': out.push('<hr/>'); break;
      case 'ul': out.push('<ul>' + bl.items.map((x) => `<li>${inlineHtml(x)}</li>`).join('') + '</ul>'); break;
      case 'ol': out.push('<ol>' + bl.items.map((x) => `<li>${inlineHtml(x)}</li>`).join('') + '</ol>'); break;
      case 'code': out.push(`<pre>${esc(bl.text)}</pre>`); break;
      case 'table': {
        const [head, ...rows] = bl.rows;
        out.push('<table><thead><tr>' + head.map((c) => `<th>${inlineHtml(c)}</th>`).join('') + '</tr></thead><tbody>'
          + rows.map((r) => '<tr>' + head.map((_, i) => `<td>${inlineHtml(r[i] ?? '')}</td>`).join('') + '</tr>').join('')
          + '</tbody></table>');
        break;
      }
    }
  }
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 18mm 15mm; }
  body { font-family: 'Segoe UI', sans-serif; font-size: 10.5pt; color: #1c2740; line-height: 1.55; }
  h1 { color: #0E7490; font-size: 17pt; border-bottom: 2.5px solid #0E7490; padding-bottom: 5px; }
  h2 { color: #1F3B63; font-size: 13.5pt; margin-top: 18px; }
  h3 { font-size: 11.5pt; margin-top: 14px; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0 12px; font-size: 9.5pt; page-break-inside: auto; }
  th, td { border: 1px solid #b7c4d8; padding: 4.5px 8px; text-align: left; vertical-align: top; }
  th { background: #ddf0f6; }
  tr { page-break-inside: avoid; }
  code { font-family: Consolas, monospace; background: #eef3fa; padding: 0 4px; border-radius: 3px; font-size: 9.5pt; }
  pre { font-family: Consolas, monospace; background: #f2f5fb; border: 1px solid #dbe3f0; border-radius: 6px; padding: 10px 12px; font-size: 8.8pt; white-space: pre-wrap; }
  blockquote { border-left: 3px solid #0E7490; margin: 8px 0; padding: 4px 12px; color: #44536f; background: #f4fafc; }
  hr { border: none; border-top: 1px solid #b7c4d8; margin: 14px 0; }
  li { margin-bottom: 3px; }
  </style></head><body>${out.join('\n')}</body></html>`;
}

// ---------- chạy ----------
let ok = 0;
for (const dir of readdirSync(ROOT)) {
  const full = path.join(ROOT, dir);
  if (!statSync(full).isDirectory()) continue;
  // Một thư mục có thể chứa NHIỀU tài liệu .md (vd mục 02: HDSD người dùng + guide quản trị)
  for (const mdFile of readdirSync(full).filter((f) => f.endsWith('.md'))) {
    const base = mdFile.replace(/\.md$/, '');
    const blocks = parseMd(readFileSync(path.join(full, mdFile), 'utf8'));

    writeDocx(blocks, path.join(full, base + '.docx'));

    const htmlPath = path.join(full, base + '.__tmp.html');
    writeFileSync(htmlPath, blocksToHtml(blocks));
    if (CHROME) {
      execFileSync(CHROME, [
        '--headless=new', '--disable-gpu', '--no-pdf-header-footer',
        `--print-to-pdf=${path.join(full, base + '.pdf')}`,
        'file:///' + htmlPath.replace(/\\/g, '/'),
      ], { stdio: 'ignore' });
    }
    try { execFileSync('cmd', ['/c', 'del', htmlPath.replace(/\//g, '\\')], { stdio: 'ignore' }); } catch {}
    console.log(`OK  ${dir}: ${base}.md → .docx${CHROME ? ' + .pdf' : ' (KHÔNG thấy Chrome/Edge — bỏ qua PDF)'}`);
    ok++;
  }
}
console.log(`Hoàn tất ${ok} tài liệu tại ${ROOT}`);
