/* Prose vs SVG word accounting.
   wc -w on the whole file is useless for this project: a chapter can be 60% SVG
   markup, and SVG is being copied verbatim. This strips tags and counts only
   what a human actually reads. */
const fs = require("fs");
const path = require("path");

const NEW = process.argv[2] === "--orig"
  ? "/Users/alexgris/.mavis/workspace/linux-map/assets/chapters"
  : path.join(__dirname, "chapters");

const files = fs.readdirSync(NEW).filter(f => /^ch\d\d-.*\.js$/.test(f)).sort();
const LX = { chapters: [], glossary: {} };
LX.push = function (ch) { LX.chapters.push(ch); };
global.LX = LX;
for (const f of files) {
  try { new Function("LX", fs.readFileSync(path.join(NEW, f), "utf8"))(LX); }
  catch (e) { console.log("LOAD FAIL " + f + ": " + e.message); }
}

const strip = s => String(s == null ? "" : s)
  .replace(/<[^>]*>/g, " ")
  .replace(/&[a-z]+;/g, " ")
  .split(/\s+/).filter(Boolean).length;

let tp = 0, ts = 0, tpO = 0, tsO = 0;
const rows = [];
LX.chapters.forEach(ch => {
  let prose = 0, svgw = 0, d = 0, code = 0;
  (ch.sections || []).forEach(s => {
    if (s.type === "diagram") { d++; svgw += strip(s.svg); svgw += strip(s.h) + strip(s.caption); return; }
    const copy = Object.assign({}, s);
    if (copy.code) { code += String(copy.code).split(/\s+/).filter(Boolean).length; delete copy.code; }
    prose += strip(JSON.stringify(copy));
  });
  prose += strip(JSON.stringify(ch.takeaways || []));
  prose += Object.keys(ch.glossary || {}).length
    + Object.values(ch.glossary || {}).reduce((a, v) => a + strip(v), 0);
  tp += prose; ts += svgw;
  rows.push({ f: ch.id, prose, svgw, d, code });
});

// cross-check against the originals
const ORIG = "/Users/alexgris/.mavis/workspace/linux-map/assets/chapters";
const LO = { chapters: [], glossary: {} };
LO.push = function (ch) { LO.chapters.push(ch); };
const saveLX = global.LX;
global.LX = LO;
for (const f of fs.readdirSync(ORIG).filter(f => /^ch\d\d-.*\.js$/.test(f))) {
  try { new Function("LX", fs.readFileSync(path.join(ORIG, f), "utf8"))(LO); } catch (e) {}
}
global.LX = saveLX;

const origById = {};
LO.chapters.forEach(ch => {
  let prose = 0, svgw = 0, d = 0;
  (ch.sections || []).forEach(s => {
    if (s.type === "diagram") { d++; svgw += strip(s.svg) + strip(s.h) + strip(s.caption); return; }
    const copy = Object.assign({}, s);
    if (copy.code) delete copy.code;
    prose += strip(JSON.stringify(copy));
  });
  prose += strip(JSON.stringify(ch.takeaways || []));
  prose += Object.keys(ch.glossary || {}).length
    + Object.values(ch.glossary || {}).reduce((a, v) => a + strip(v), 0);
  origById[ch.id] = { prose, svgw, d };
  tpO += prose; tsO += svgw;
});

const w = (n, w2) => String(n).padStart(w2);
console.log("file".padEnd(16) + w("prose", 8) + w("svg", 8) + w("figs", 6)
  + w("oProse", 8) + w("oSvg", 8) + w("oFigs", 6) + w("prose%", 8));
console.log("-".repeat(70));
for (const r of rows) {
  const o = origById[r.f];
  if (!o) { console.log(r.f.padEnd(16) + w(r.prose, 8) + w(r.svgw, 8) + w(r.d, 6) + "     (no original)"); continue; }
  const pct = o.prose ? Math.round(100 * r.prose / o.prose) + "%" : "-";
  console.log(r.f.padEnd(16) + w(r.prose, 8) + w(r.svgw, 8) + w(r.d, 6)
    + w(o.prose, 8) + w(o.svgw, 8) + w(o.d, 6) + w(pct, 8));
}
console.log("-".repeat(70));
console.log("readable words : " + (tp + ts));
console.log("  prose        : " + tp);
console.log("  svg (verbatim): " + ts);
console.log("diagrams        : " + rows.reduce((a, r) => a + r.d, 0));
console.log("glossary terms  : " + Object.keys(LX.glossary).length);
console.log("chapters        : " + LX.chapters.length + " / " + files.length + " files");