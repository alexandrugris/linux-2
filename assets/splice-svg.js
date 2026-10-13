/* Splices the original diagram SVGs into a condensed chapter, byte-identically.

   Usage: node splice-svg.js <condensed-file> <original-file>

   The condensed chapter marks each diagram slot with /*SVG_N* / in its
   template literal; this replaces marker N with the Nth diagram's svg string
   taken verbatim from the original chapter file. Doing it programmatically
   means a 400-line SVG cannot be corrupted by retyping it, and it lets the
   whole 93-diagram set stay bit-for-bit identical to the full edition.

   The svg is read as an EVALUATED JS string, so it must be re-escaped before
   being written back into a template literal: a backslash in the original
   (a shell line continuation, say) would otherwise be treated as an escape
   sequence and silently eat a character. verify-svg.js checks for that. */
const fs = require("fs");

const [, , target, source] = process.argv;
if (!target || !source) {
  console.error("usage: node splice-svg.js <condensed-file> <original-file>");
  process.exit(2);
}

const LX = { chapters: [], glossary: {} };
LX.push = c => LX.chapters.push(c);
global.LX = LX;
new Function("LX", fs.readFileSync(source, "utf8"))(LX);

const svgs = LX.chapters[0].sections.filter(s => s.type === "diagram").map(s => s.svg);
if (!svgs.length) { console.error("no diagrams found in " + source); process.exit(2); }

// Re-escape for insertion inside a `template literal`. Order matters:
// backslashes first, then the characters that would otherwise start an escape.
const forTemplate = s => s
  .replace(/\\/g, "\\\\")
  .replace(/`/g, "\\`")
  .replace(/\$\{/g, "\\${");

let out = fs.readFileSync(target, "utf8");
let n = 0;
svgs.forEach((svg, i) => {
  const marker = "/*SVG_" + i + "*/";
  if (!out.includes(marker)) {
    console.error("marker " + marker + " not found in " + target);
    process.exit(2);
  }
  out = out.replace(marker, forTemplate(svg));
  n++;
});

// no marker should survive
const leftover = out.match(/\/\*SVG_\d+\*\//g);
if (leftover) { console.error("unspliced markers remain: " + leftover.join(" ")); process.exit(2); }

fs.writeFileSync(target, out);
console.log("spliced " + n + " diagram(s) into " + target + " from " + source);