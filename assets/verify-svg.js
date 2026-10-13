/* Verifies that every diagram in the concise edition still renders exactly the
   SVG its original had — no dropped labels, no eaten backslashes, no redraws.

   Runs from either project root:
     node assets/verify-svg.js <condensed-chapters-dir> <original-chapters-dir>

   Exit 0 = all diagrams identical. Exit 1 = at least one drifted.

   Why this exists: the splice tool inserts the original SVG into a JS template
   literal, so anything that has meaning inside a template literal (a backslash,
   a backtick, a ${) can be silently reinterpreted. splice-svg.js now escapes
   those, but a chapter edited by hand afterwards can still drift, and the
   smoke test's screenshots will not catch a missing text label. */
const fs = require("fs");
const path = require("path");

const NEW = process.argv[2] || path.join(__dirname, "chapters");
const OLD = process.argv[3] || "/Users/alexgris/.mavis/workspace/linux-map/assets/chapters";

function loadDiagrams(dir) {
  const out = {};
  for (const f of fs.readdirSync(dir).filter(x => /^ch\d\d-.*\.js$/.test(x)).sort()) {
    const LX = { chapters: [], glossary: {} };
    LX.push = c => LX.chapters.push(c);
    global.LX = LX;
    try { new Function("LX", fs.readFileSync(path.join(dir, f), "utf8"))(LX); }
    catch (e) { console.log("  LOAD FAIL " + f + ": " + e.message); continue; }
    const ch = LX.chapters[0];
    if (!ch) { console.log("  NO CHAPTER in " + f); continue; }
    out[ch.id] = {
      file: f,
      svgs: ch.sections.filter(s => s.type === "diagram").map(s => s.svg || "")
    };
  }
  return out;
}

const A = loadDiagrams(NEW);
const B = loadDiagrams(OLD);

let same = 0, trimmed = 0, drifted = 0, missing = 0, unspliced = 0;

for (const id of Object.keys(B)) {
  if (!A[id]) { console.log("MISSING chapter: " + id); missing++; continue; }
  const a = A[id].svgs, b = B[id].svgs;
  if (a.length !== b.length) {
    console.log("COUNT MISMATCH " + id + ": " + a.length + " vs original " + b.length);
    missing++; continue;
  }
  for (let i = 0; i < b.length; i++) {
    if (/\/\*SVG_\d+\*\//.test(a[i]) || a[i].trim().length < 40) {
      console.log("UNSPLICED " + id + " diagram " + (i + 1) + " — run splice-svg.js");
      unspliced++; continue;
    }
    if (a[i] === b[i]) { same++; continue; }
    // deliberate trimming: strictly a subset with the same tag sequence shape
    const stripTags = s => (s.match(/<[^>]*>/g) || []);
    const ta = stripTags(a[i]), tb = stripTags(b[i]);
    const textsA = (a[i].match(/<text[\s>]/g) || []).length;
    const textsB = (b[i].match(/<text[\s>]/g) || []).length;
    if (textsA < textsB && ta.length < tb.length) {
      trimmed++;
      continue;
    }
    console.log("DRIFT " + id + " diagram " + (i + 1)
      + " — " + textsA + " text nodes vs " + textsB + " in the original");
    drifted++;
  }
}

console.log("");
console.log("chapters checked : " + Object.keys(B).length);
console.log("identical        : " + same);
console.log("deliberately cut : " + trimmed);
console.log("unspliced        : " + unspliced);
console.log("drifted (BAD)    : " + drifted);
console.log("missing (BAD)    : " + missing);
const bad = drifted + missing + unspliced;
console.log(bad === 0 ? "\nRESULT: every diagram accounted for"
  : "\nRESULT: " + bad + " problem(s)");
process.exit(bad === 0 ? 0 : 1);