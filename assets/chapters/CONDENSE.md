# CONDENSE contract — Linux, from the inside, concise edition

You are producing **condensed** versions of existing chapter files.

- Unabridged originals (read-only): `/Users/alexgris/.mavis/workspace/linux-map/assets/chapters/`
- Your output goes to: `/Users/alexgris/.mavis/workspace/linux-2/assets/chapters/`

**You author prose only.** Do not edit `index.html`, `assets/style.css`, `assets/app.js`,
`assets/splice-svg.js`, or any chapter file you were not assigned. Do not create extra files.

Read `linux-2/assets/chapters/ch02-kernel.js` first — it is the finished reference. Its prose is
56% of the original's and its 4 diagrams are byte-identical to the originals. Match that.

## What this is

The same 18-chapter map of how Linux works, with the **prose halved** and **every diagram
kept**. The reader found the full edition too long. So repetition, hedging, example overflow
and long derivations go; principles, mechanisms and concrete values stay.

The hard requirement: a reader who has only this edition must still be able to answer a
competent question about any mechanism in your chapter. If they could not, you cut too much.
The other hard requirement: **no diagram is lost, altered, redrawn or merged.**

## How the diagrams are handled — you do NOT retype them

A condensed chapter contains one `diagram` block per original diagram, in the **same order**,
with `h` and `caption` written fresh (captions trimmed) and the `svg` field containing only
the marker for that diagram's index:

```js
{
  type: "diagram",
  h: "Figure title, possibly reworded",
  caption: "One or two sentences on what to look at.",
  svg: `/*SVG_0*/`
}
```

Then run the splice tool, which replaces each marker with the original SVG **byte for byte**:

```bash
cd /Users/alexgris/.mavis/workspace/linux-2
node assets/splice-svg.js assets/chapters/chNN-slug.js \
  /Users/alexgris/.mavis/workspace/linux-map/assets/chapters/chNN-slug.js
```

The tool fails loudly if a marker is missing or a marker survives, so a mismatch cannot pass
silently. **Never copy, retype, reformat or "improve" SVG content.** It is not yours to edit.

Count the diagrams you must produce before you start:

```bash
grep -c 'type: "diagram"' /Users/alexgris/.mavis/workspace/linux-map/assets/chapters/chNN-slug.js
```

If that prints 7, your file needs exactly 7 diagram blocks with markers `/*SVG_0*/` … `/*SVG_6*/`,
in the order they appear in the original.

## The cut strategy — apply in this order

1. **Merge prose blocks.** Three `prose` blocks on one sub-topic become one, headed by the
   strongest of their headings. Fewer, denser sections beat many thin ones.
2. **One worked example per mechanism, not three.** Where the original shows the same command
   three ways, keep the most concrete or most surprising and name the others in a clause.
3. **Keep the result and the mechanism, drop the derivation.** If the original walks four steps
   to reach a conclusion, the condensed version gives the conclusion and the two-step reason
   in three sentences.
4. **Compress caveats into inline clauses.** "Default on Debian, Fedora uses X, changed in Y"
   becomes "(Debian default; Fedora uses X)". Keep every *factual* divergence — drop the padding.
5. **Trim code blocks to the lines that answer the question.** Drop setup lines, the
   "# what this shows" restatement, and redundant variants. Keep real flags, paths and error
   strings. A 40-line block trimmed to 12 is a win; one trimmed to three lines of `ls -la` is a
   loss — keep the substance. Aim for ~60% of the original's code words.
6. **Trim tables** by deleting rows that merely restate adjacent prose. Never delete a row that
   is the only place a specific value, flag or divergence appears.
7. **Takeaways: 5-8 becomes 4-5.** Sharpest and most falsifiable. Never a platitude.
8. **Glossary: 8-16 becomes 6-9 terms**, definitions one line and under ~14 words. Drop terms
   the condensed prose no longer references; never drop one it does.

### Must survive

Every concrete value: paths, flags, defaults, error strings, sysctl names, unit names, numbers.
Every diagram. Every security warning — a `warn`/`danger` callout keeps its teeth. Every
distro or version divergence that would change a decision on someone else's machine. The
explanation of *why* a mechanism works, not just that it does.

### Must go

"In modern systems…", "It's worth noting…", "This is a common misconception…", "Let's dive in".
A heading restated as its own first sentence. Two examples of the same shape. Parenthetical
asides that belong in a footnote nobody reads. Any sentence that survives deletion without the
paragraph losing meaning — delete it.

## Targets

Measured as **prose words** by `node assets/wordcount.js` (prose excludes SVG, which is copied
verbatim, and code). Aim within 10% of your target.

| file | orig prose | your target | diagrams |
|---|---|---|---|
| `ch01-boot.js` | 1740 | **870** | 2 |
| `ch03-processes.js` | 1800 | **900** | 4 |
| `ch04-isolation.js` | 2219 | **1110** | 4 |
| `ch05-filesystem.js` | 6522 | **3260** | 7 |
| `ch06-systemd.js` | 2422 | **1210** | 2 |
| `ch07-packaging.js` | 5269 | **2635** | 7 |
| `ch08-build.js` | 6616 | **3310** | 7 |
| `ch09-networking.js` | 5779 | **2890** | 9 |
| `ch10-dns.js` | 4639 | **2320** | 8 |
| `ch11-services.js` | 5180 | **2590** | 8 |
| `ch12-storage.js` | 8181 | **4090** | 8 |
| `ch15-security.js` | 8452 | **4230** | 7 |
| `ch16-troubleshooting.js` | 2448 | **1225** | 4 |
| `ch17-cheatsheet.js` | 3296 | **1650** | 1 |

`ch17-cheatsheet` is a command reference: cut rows that are obvious or that the chapter
already explains, keep the ones that answer a real question.

## Mechanical rules — these break the page if broken

1. **English only. Zero CJK characters anywhere in the file.**
2. **No backticks or `${` inside content strings.** Use `<code>foo</code>` for inline code.
3. **Quoting trap.** A prose string containing `"` (e.g. `<span class="x">`) must use **single
   quotes** as its delimiter, or a template literal. `"…<span class="x">…"` is a syntax
   error. This is the single most common failure.
4. Escape `&` as `&amp;` and `<` as `&lt;` inside **prose HTML strings only**.
5. `data-jump="chapterid"` inside a diagram links elsewhere; that `id` must still exist.
   Ids: map, boot, kernel, processes, isolation, filesystem, packaging, build, networking,
   dns, services, storage, containers, kubernetes, security, troubleshooting, cheatsheet.
6. Keep the same `id` and `title`. Update the tagline only if the original is now wrong.

## Block types — unchanged

```js
{ type: "prose", h: "Heading", note: "tip|warn|danger|fact|boss", noteTitle: "…",
  p: ["<p> html", "…"], ul: ["…"], ol: ["…"] }

{ type: "callout", kind: "tip|warn|danger|fact|boss", title: "…", text: "html" }

{ type: "diagram", h: "Figure title", caption: "What to look at.", svg: `/*SVG_N*/` }

{ type: "code", lang: "bash|nginx|conf|yaml|json|diff|go|c", what: "What it answers", code: "multi\nline" }

{ type: "table", cols: ["…"], rows: [["<code>cell</code>", "…"]] }

{ type: "cards", items: [ { title: "Name", tag: "KERNEL", tone: "violet|ok|warn|bad|pink", text: "html" } ] }

{ type: "kv", items: [ { k: "/proc", v: "html" } ] }

{ type: "steps", items: [ { t: "Step title", d: "what happens" } ] }
```

## Facts about the reference machine — do not contradict

Ubuntu 18.04.6, kernel 4.15.0-213, systemd 237, **cgroups v1**, iptables 1.6 legacy,
systemd-resolved on 127.0.0.53 (Tailscale search domain), nginx 1.14, BIND 9.11.3
authoritative-only (`ns.alexandrugris.ro`), ufw 0.36, 2 GB RAM / 19 GB disk, SSH key-only and
Tailscale-only, static sites in `/var/www/html` published by `rsync` from local git repos.
Baseline elsewhere is Debian/Ubuntu + systemd; say explicitly when macOS, Arch, Fedora, Alpine
or BusyBox differ, and show cgroups v1 and v2 where it matters.

## Before you finish — run all of these and show the output

```bash
cd /Users/alexgris/.mavis/workspace/linux-2

# 1. splice the diagrams in (must print "spliced N diagram(s)")
node assets/splice-svg.js assets/chapters/chNN-slug.js \
  /Users/alexgris/.mavis/workspace/linux-map/assets/chapters/chNN-slug.js

# 2. syntax — must print nothing
node --check assets/chapters/chNN-slug.js && echo "SYNTAX OK"

# 3. prose words vs target, diagram count — must match the original
node assets/wordcount.js | grep -E 'file|^[a-z]'

# 4. CJK sweep — must print 0
python3 -c "import re,sys;t=open('assets/chapters/chNN-slug.js',encoding='utf-8').read();print('CJK:',len(re.findall(r'[一-鿿぀-ヿ]',t)))"
```

Report the `wordcount.js` line for each of your files. If prose is more than 10% over target,
cut further and re-check. Diagrams must match the original count exactly.

## Report back

One line per file: file, prose words vs target, diagram count, `node --check` status, CJK count.