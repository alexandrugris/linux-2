/* Repairs any diagram that drifted from its original.

   Why: the SVGs live inside JS template literals, so a backslash in the
   original source (`\n` in "4 bytes: 2.0\n", `\$\$`) is consumed when the
   string is read and then re-interpreted when it is written back. The result
   renders subtly wrong — a missing glyph, a swallowed `$`, a newline in the
   middle of a <text> element — and a screenshot will not always catch it.

   splice-svg.js now escapes on the way in. This tool fixes files that were
   spliced before that fix, or spliced into a template literal by other means.

   Usage: node assets/repair-svg.js <condensed-chapters-dir> <original-chapters-dir>

   Any chapter needing repair is REWRITTEN from its parsed object with
   JSON.stringify, which escapes backslashes correctly. That makes the file
   machine-generated rather than hand-formatted — the content is identical and
   renders the same, but do not expect the original layout. */
const fs = require("fs");
const path = require("path");

const NEW = process.argv[2] || path.join(__dirname, "chapters");
const OLD = process.argv[3] || "/Users/alexgris/.mavis/workspace/linux-map/assets/chapters";

function loadAll(dir) {
  const out = {};
  for (const f of fs.readdirSync(dir).filter(x => /^ch\d\d-.*\.js$/.test(x)).sort()) {
    const LX = { chapters: [], glossary: {} };
    LX.push = c => LX.chapters.push(c);
    global.LX = LX;
    try { new Function("LX", fs.readFileSync(path.join(dir, f), "utf8"))(LX); }
    catch (e) { continue; }
    const ch = LX.chapters[0];
    if (ch) out[ch.id] = { file: f, ch };
  }
  return out;
}

const A = loadAll(NEW);
const B = loadAll(OLD);

let repairedFiles = 0, repairedDiagrams = 0;

for (const id of Object.keys(A)) {
  if (!B[id]) continue;
  const mine = A[id].ch.sections.filter(s => s.type === "diagram");
  const orig = B[id].ch.sections.filter(s => s.type === "diagram");
  let changed = false;

  for (let i = 0; i < orig.length && i < mine.length; i++) {
    if (mine[i].svg === orig[i].svg) continue;
    // only replace when the node count matches, i.e. this is an escaping
    // artefact rather than a deliberate edit by the author
    const t = s => (s.match(/<text[\s>]/g) || []).length;
    if (t(mine[i].svg) !== t(orig[i].svg)) {
      console.log("SKIP " + id + " diagram " + (i + 1) + " — text-node count differs, not an escaping artefact");
      continue;
    }
    mine[i].svg = orig[i].svg;
    changed = true;
    repairedDiagrams++;
    console.log("REPAIRED " + id + " diagram " + (i + 1));
  }

  if (!changed) continue;
  const header = "/* " + A[id].file.replace(".js", "") + " — concise edition\n"
    + "   Diagram SVGs restored byte-identically from linux-map/assets/chapters/ by\n"
    + "   assets/repair-svg.js (JSON.stringify escaping; content identical). */\n";
  fs.writeFileSync(path.join(NEW, A[id].file), header + "(function () {\n  LX.push("
    + JSON.stringify(A[id].ch, null, 2) + ");\n})();\n");
  repairedFiles++;
  console.log("rewrote " + A[id].file);
}

console.log("\nrepaired " + repairedDiagrams + " diagram(s) across " + repairedFiles + " file(s)");
process.exit(0);