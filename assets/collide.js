/* Detect overlapping text nodes and text-outside-its-box inside every diagram.
   node /tmp/textcollide.js [chapterIds...]
   Exits non-zero if any figure has a collision. */
const { chromium } = require("/Users/alexgris/.local/lib/node_modules/playwright");
const fs = require("fs");
const path = require("path");
const ROOT = "/Users/alexgris/.mavis/workspace/linux-2";

const FILES = {
  map: "ch00-map", boot: "ch01-boot", kernel: "ch02-kernel", processes: "ch03-processes",
  isolation: "ch04-isolation", filesystem: "ch05-filesystem", systemd: "ch06-systemd",
  packaging: "ch07-packaging", build: "ch08-build", networking: "ch09-networking",
  dns: "ch10-dns", services: "ch11-services", storage: "ch12-storage",
  containers: "ch13-containers", kubernetes: "ch14-kubernetes", security: "ch15-security",
  troubleshooting: "ch16-troubleshooting", cheatsheet: "ch17-cheatsheet"
};

(async () => {
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FILES);

  let html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  html = html.replace(/(<script src="assets\/chapters\/)[^"]+("><\/script>\n?)/g, m => {
    const base = m.match(/ch\d\d-[a-z]+/)[0];
    return ids.some(id => FILES[id] === base) ? m : "";
  });
  const tmp = path.join(ROOT, "__collide.html");
  fs.writeFileSync(tmp, html);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
  const errs = [];
  page.on("pageerror", e => errs.push(e.message));
  await page.goto("file://" + tmp, { waitUntil: "load" });
  await page.waitForTimeout(500);

  const report = await page.evaluate(() => {
    const out = [];
    window.__nfig = document.querySelectorAll("figure.fig").length;
    window.__ntext = document.querySelectorAll("figure.fig svg text").length;
    document.querySelectorAll("figure.fig").forEach(fig => {
      const svg = fig.querySelector("svg");
      const cap = fig.querySelector(".fig-t") ? fig.querySelector(".fig-t").textContent : "";
      const texts = [...svg.querySelectorAll("text")].map(t => {
        const r = t.getBoundingClientRect();
        return { s: (t.textContent || "").trim(), x: r.x, y: r.y, w: r.width, h: r.height };
      }).filter(t => t.s && t.w > 0);
      const hits = [];
      for (let i = 0; i < texts.length; i++) {
        for (let j = i + 1; j < texts.length; j++) {
          const a = texts[i], b = texts[j];
          const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (ox > 2 && oy > 2) {
            hits.push({ a: a.s, b: b.s, ox: Math.round(ox), oy: Math.round(oy) });
          }
        }
      }
      // text whose box escapes the canvas
      const sb = svg.getBoundingClientRect();
      const outOfBounds = texts.filter(t => t.x < sb.x - 1 || t.x + t.w > sb.x + sb.width + 1).map(t => t.s);

      // text crossing the border of a box it does not belong to. A box the label
      // belongs to is fine; a label bisected by an unrelated rect reads as broken.
      const rects = [...svg.querySelectorAll("rect")].map(r => {
        const b = r.getBoundingClientRect();
        return { x: b.x, y: b.y, w: b.width, h: b.height };
      });
      const straddle = [];
      texts.forEach(t => {
        rects.forEach(r => {
          const ox = Math.min(t.x + t.w, r.x + r.w) - Math.max(t.x, r.x);
          const oy = Math.min(t.y + t.h, r.y + r.h) - Math.max(t.y, r.y);
          if (ox <= 2 || oy <= 2) return;
          // ignore if the text sits comfortably INSIDE (a label in its own box)
          const inside = t.x >= r.x - 1 && t.x + t.w <= r.x + r.w + 1;
          // ignore if the text is vertically centred in the rect (same row of labels)
          const cx = (t.x + t.w / 2) - (r.x + r.w / 2);
          const cy = (t.y + t.h / 2) - (r.y + r.h / 2);
          const centred = Math.abs(cx) < r.w / 2 && Math.abs(cy) < r.h / 2;
          if (inside || centred) return;
          straddle.push({ t: t.s, ox: Math.round(ox), oy: Math.round(oy) });
        });
      });

      if (hits.length || outOfBounds.length || straddle.length) {
        out.push({ cap, hits, outOfBounds, straddle: straddle.slice(0, 6) });
      }
    });
    return out;
  });

  const counts = await page.evaluate(() => ({ f: window.__nfig, t: window.__ntext }));
  await browser.close();
  fs.unlinkSync(tmp);

  console.log("figures checked: " + counts.f + "   text nodes: " + counts.t);
  if (errs.length) console.log("PAGE ERRORS: " + errs.slice(0, 3).join(" | "));
  if (!report.length) { console.log("\nNO COLLISIONS FOUND"); process.exit(0); }
  console.log("\n" + report.length + " figure(s) with collisions:\n");
  report.forEach(r => {
    console.log("  \"" + r.cap + "\"");
    r.hits.forEach(h => console.log("      TEXT x TEXT  \"" + h.a + "\" x \"" + h.b + "\"  (" + h.ox + "x" + h.oy + "px)"));
    r.straddle.forEach(s => console.log("      TEXT x BOX   \"" + s.t + "\"  (" + s.ox + "x" + s.oy + "px into a rect)"));
    if (r.outOfBounds.length) console.log("      OUT OF BOUNDS: " + r.outOfBounds.join(" | "));
  });
  process.exit(1);
})();