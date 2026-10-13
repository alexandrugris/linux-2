/* Prints a chapter with SVG bodies replaced by a marker, so the prose can be
   read without hauling 400 lines of markup per diagram through context. */
const fs = require("fs");
const f = process.argv[2];
const LX = { chapters: [], glossary: {} };
LX.push = c => LX.chapters.push(c);
global.LX = LX;
new Function("LX", fs.readFileSync(f, "utf8"))(LX);
const ch = LX.chapters[0];
console.log("id: " + ch.id + "\ntitle: " + ch.title + "\ntagline: " + ch.tagline + "\n");
let i = 0;
ch.sections.forEach(s => {
  if (s.type === "diagram") {
    console.log(`--- [${i++}] DIAGRAM  h: ${s.h}`);
    console.log(`        caption: ${s.caption}`);
    console.log(`        svg: /*SVG_${i - 1}*/  (${String(s.svg).replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length} words of labels)\n`);
    return;
  }
  const c = Object.assign({}, s);
  let code = null;
  if (c.code) { code = c.code; delete c.code; }
  console.log(`--- [${i++}] ${s.type.toUpperCase()}  ${s.h ? "h: " + s.h : ""}${s.title ? "title: " + s.title : ""}`);
  const body = JSON.stringify(c, null, 1);
  if (body !== "{}") console.log(body);
  if (code) console.log("CODE(" + s.lang + ") what: " + s.what + "\n" + code);
  console.log("");
});
console.log("=== TAKEAWAYS ===");
ch.takeaways.forEach(t => console.log(" - " + t));
console.log("\n=== GLOSSARY (" + Object.keys(ch.glossary).length + ") ===");
Object.entries(ch.glossary).forEach(([k, v]) => console.log(" " + k + ": " + v));
