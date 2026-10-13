# SIMPLIFY contract — the concise edition, second pass

The reader's verdict on the first concise edition: *still way too long, and the diagrams are too
complicated.* Both are true and both are measurable.

Measured on the live page (168,445 px tall at a 1440 px viewport):

| block | height | share of page |
|---|---|---|
| **93 diagrams** | **62,963 px** | **37%** |
| prose | 34,533 px | 21% |
| **42 code blocks** | **28,281 px** | **17%** |
| tables + callouts + headings | 17,265 px | 10% |

Diagrams and code blocks together are 54% of the document. Cutting prose alone can never fix
this. That is why the first pass barely moved the page even though it removed half the words.

Your job on each chapter: **cut the prose, cut the code, and redraw the diagrams simpler.**

### Priority order — read this first

The table above is the whole reason this pass exists. Work in this order:

1. **Redraw every diagram.** It is 37% of the page and the single biggest lever.
2. **Then cut prose.** It is 21% of the page — less than half of one diagram's worth.
3. **Then cut code.** It is 17%, and the worst offenders are packaging (100% of original) and
   networking (83%).

Spending your whole budget on prose while the diagrams stay 700 px tall is the failure mode this
pass is trying to fix. The diagram limits in section 1 are non-negotiable; the prose target in
section 2 is a target, not a gate you should fail the chapter over.

---

## 1. Diagrams — redraw them, do not preserve them

The old rule was "copy the original SVG byte-identically". **That rule is over.** Diagrams are
now authored fresh, and the bar is *fewer moving parts*, not fidelity to the old artwork.

The previous diagrams were too dense because they tried to carry a whole chapter's argument.
A diagram's job is to make ONE relationship obvious in three seconds. Everything else is prose.

### Hard limits — a diagram that breaks any of these is wrong

| | limit |
|---|---|
| viewBox height | **240 to 380**. Never more. The old ones ran to 800. |
| boxes (`rect`) | **7 maximum** |
| lines/arrows (`line`, `path` with a marker) | **8 maximum** |
| words in any one label | **5 maximum** (6 only for a path or a flag) |
| text nodes | **14 maximum** |
| distinct box colours | **3 maximum** (`box`, `box-v`, `box-w` are enough for most) |

### What "simpler" means in practice

- **One idea per diagram.** If the title needs an "and", it is two diagrams.
- **A flow, not a map.** Three to five boxes left to right or top to bottom. The old
  three-column "physical / userspace / orchestration" mega-diagrams are exactly what went wrong.
- **Text in the diagram is a label, not a sentence.** `nginx worker`, not
  "nginx forks workers which handle connections". If it needs a sentence, it belongs in the caption.
- **Bigger type.** 17–18 for box titles, 15 for secondary labels. The old 13–14 was too small
  to read at the rendered width.
- **No lists inside a box.** Three stacked keywords in one box is a table wearing a disguise.
- **Two colours means two meanings.** If everything is violet, the colour carries nothing.

### Mechanics

- `<svg viewBox="0 0 1100 H" role="img" aria-label="…">`, **no `width`/`height` attributes**.
- Wrap in a template literal. Inside it `"` is free.
- Marker ids: `lm-arrow`, `lm-arrow-accent`, `lm-arrow-ok`, `lm-arrow-warn`, `lm-arrow-bad`, `lm-dot`.
- Box classes: `box`, `box-a`, `box-v`, `box-ok`, `box-w`, `box-b`, `box-p`.
- Line classes: `ln`, `ln-a`, `ln-v`, `ln-ok`, `ln-w`, `ln-b`; add `dash` for dashed.
- Text classes: `t-title`, `t-sm`, `t-xs`, `t-sans`, `t-mono`; colours `t-accent`, `t-violet`,
  `t-ok`, `t-warn`, `t-bad`, `t-dim`.
- No HTML tags inside SVG — use `<tspan>`. No backticks, no `${`, no raw `&` (write `&amp;`).
- The renderer auto-fits labels, but a diagram that *needs* fitting was drawn wrong.

### Captions

One or two sentences on what to look at. Captions are prose and count against the word budget.

---

## 2. Prose — cut to roughly a third

Target **35–40% of the original chapter's prose**, measured by `node assets/measure.js`
(which excludes SVG and code). The first pass reached 46%; this pass gets it to about 38%.

**On hitting 25%:** it is not honestly reachable while keeping every path, flag, default, sysctl key,
port and error string a decision depends on. The hand-written reference chapter,
`ch02-kernel.js`, lands at 38% and still reads as complete. `measure.js` prints a "prose over" flag
above 32% — treat that as a nudge toward the low 30s, **not** as something to strip required
content to silence. A chapter that keeps its mechanism and misses the number is correct; a chapter
that hits the number by dropping the sysctl keys is wrong.

The previous pass was told it could delete enumerations and it still left filler. Go further:

- **Delete the sentence, not the clause.** If a paragraph survives losing one sentence, that
  sentence was filler. Most paragraphs here lose one.
- **Merge ruthlessly.** A chapter of 40 blocks should become one of 15–20.
- **One worked example per idea, not three.** The other two are the same shape.
- **No throat-clearing.** No "It's worth noting", "This is important to understand",
  "Let's look at", "As we saw earlier", "In practice this means that".
- **No restating a heading as its first sentence.**
- **Sentences under 25 words.** If you need a semicolon, you may need two sentences.

### What survives — the mechanism

- every path, flag, default, unit name, sysctl key, port and error string a decision depends on
- every distro/version divergence that would change a decision on someone else's machine
- every security warning, undiluted
- the causal chain: what happens, in what order, and why

**Test:** could a competent engineer answer a real question about this mechanism using this
chapter plus the man pages? If yes, the cut was safe.

### Reference points already in the target

**`ch02-kernel.js` is the model.** It was rewritten by hand to this exact spec: prose at 38%, code at
25%, all four diagrams redrawn to 210–340 px viewBox heights with 3–6 boxes and 9–12 text nodes each.
Copy its register, its density, and its diagram proportions.

**The acceptance bar for your chapters:** `node assets/measure.js` must show no `figure too tall`,
`too many boxes` or `too many labels` flag. Those three are hard. The `prose over` flag is soft.

---

## 3. Code blocks — cut to a third

Target **30% of the original chapter's code words**. These are 17% of the page height and are
the second-biggest thing you can fix.

- One block per chapter is usually enough. Two only if they answer genuinely different questions.
- Keep the **flags, paths and error strings**; drop the comments explaining what the reader can
  already see, the setup lines, and the "here is another way to do it" variants.
- A 25-line block becomes 8 lines. A block under 5 lines should be deleted or turned into prose.
- The `what:` caption is prose too — one short line.

---

## Machine facts — verified, never contradict

Ubuntu 18.04.6 LTS · kernel 4.15.0-213 (4.15.0-260 installed, not booted) · systemd 237 ·
**cgroups v1** · iptables 1.6 legacy behind ufw 0.36 · systemd-resolved on 127.0.0.53 with a
Tailscale search domain · nginx 1.14 serving four static sites from `/var/www/html`, published
by `rsync` from local git repos · BIND 9.11.3 authoritative-only as `ns.alexandrugris.ro` ·
SSH key-only and Tailscale-only · 2 GB RAM, 19 GB disk · Ubuntu Pro/ESM attached (patches until
May 2028) · journald capped at `SystemMaxUse=300M`.

Baseline elsewhere is Debian/Ubuntu + systemd. Name macOS/Arch/Fedora/Alpine differences inline
where they matter, and show cgroups v1 and v2 side by side where they do.

---

## Mechanical traps

1. English only. **Zero CJK characters** anywhere.
2. A prose string containing `"` must use **single quotes** or a template literal.
3. `${` inside a template literal interpolates — escape it or use single quotes.
4. One `p` key per prose block. A duplicate silently overwrites the first.
5. `note`/`noteTitle`/`noteKind` render only on a `prose` block. For a standalone callout use
   `{ type: "callout", kind, title, text }`.
6. Run `node --check` on every file. It must print nothing.

## Verify before reporting — show the output of each

```bash
cd /Users/alexgris/.mavis/workspace/linux-2
node --check assets/chapters/chNN-slug.js && echo "SYNTAX OK"
node assets/measure.js <your-chapter-ids>   # the per-chapter budget report
node assets/collide.js <your-chapter-ids>   # renders in Chromium, finds overlapping labels
node assets/validate.js | tail -4
python3 -c "import re;t=open('assets/chapters/chNN-slug.js',encoding='utf-8').read();print('CJK:',len(re.findall(r'[一-鿿぀-ヿ]',t)))"
```

**`collide.js` matters more than it looks.** A diagram can satisfy every limit in section 1 and still
be *unreadable*, because a label wider than the gap between two boxes gets bisected by a box border,
or two edge labels collide. The limits cannot see that; only a real render can. It reports:

- `TEXT x TEXT` — two labels overlapping each other
- `TEXT x BOX` — a label crossing the border of a box it does not belong to
- `OUT OF BOUNDS` — a label running past the edge of the canvas

Fixes that work: shorten the label, move it to a clear band, or re-anchor it
(`text-anchor="start"` / `"end"`). Widening the viewBox is the last resort — it costs page height.

`validate.js` checks block **shape**, not just block type. A `table` with no `cols` array passes a
type-only check but throws inside `R.table` and kills rendering of every chapter after it, so shape
checks are mandatory and `validate.js` must end in `RESULT: all checks passed`.

Report one line per chapter: prose %, code %, diagrams drawn, diagram max viewBox height, max boxes,
max text nodes, collision count, syntax, CJK.