# ROUND 2 — the hard cut

Round 1 (already written, in `/Users/alexgris/.mavis/workspace/linux-2/assets/chapters/`) landed every
chapter at **63–87% of the original's prose**. That is a 27% cut. It is not enough.

The reader asked for half. This pass gets prose to **~42% of the original**, which with all 93
diagrams kept and code halved puts the whole document at roughly **58% of its original length** —
a genuine, substantial reduction rather than a token one.

## Your job

Take your round-1 chapter(s) and cut them again, hard, to the targets below.

**You are not tightening sentences. You are deleting sections.** Round 1 already compressed what
it kept; what is left is the padding between paragraphs and the low-value blocks. To reach 42%
you must:

- **Merge sections.** Three sections covering one sub-topic become one, headed by the sharpest
  heading. Fewer sections, each carrying two or three times the density.
- **Delete whole blocks.** Not every `kv` reference table, not every `code` block, not every
  `prose` section earns its place at this length. If a table duplicates prose two paragraphs
  above it, the prose is the thing to cut, or both go.
- **Keep every diagram, in place.** They are the payload and they are fixed cost.
- **Cut code blocks to about half their current lines.** Drop the variants, keep the one that
  answers the question. A `code` block that falls below ~10 lines is fine — delete it if it is
  not carrying weight.
- **Glossary to 6–8 terms.** One clause each, no more. Takeaways to 4.

## What must survive — the core principles

The thing that makes this document worth reading is **the mechanism**: what actually happens,
step by step, and why. That capability is the entire point and it must survive.

**You may delete enumerations.** This is the key permission, and round 1 failed because it did
not exist. A list of fourteen hardening directives, ten DNS record types or twenty `systemctl`
verbs is *reference material*, not a principle. Cut it to the three or four entries that best
illustrate the idea, and keep the sentence explaining what the category is for. The reader can
look up the rest; they cannot work out the mechanism for themselves.

Concretely, each of these may go:

- the 6th, 7th, 8th example of the same shape
- a flag or option nothing else in the chapter refers to
- a record type, directive or option that is merely listed, never explained
- a table row that adds no information beyond its label
- a second table covering ground an earlier table already covered

Each of these must stay, compressed as hard as necessary:

- a path, flag, default, unit name, sysctl key, port or magic number that a decision depends on
- an error string
- a distro or version divergence that would change a decision on someone else's machine
- a security warning
- the causal chain — why the mechanism does what it does, in order

A test for each block: *after cutting, could a competent engineer still answer a real question
about this mechanism using this chapter plus the man pages?* If yes, the cut is safe. If they
would still be lost, you cut a principle.

## Do NOT do these

- Do not cut a diagram. Count must match the original exactly.
- Do not lose a security warning or soften it into vagueness.
- Do not convert a specific value into a generalisation. “<code>MaxAuthTries</code> defaults to 6”
  is keepable; “there are configurable retry limits” is not.
- Do not retype or edit SVG. It is spliced in and is byte-identical by construction.
- Do not touch any file outside your assigned chapters.

## Method

The SVGs are already spliced in and byte-identical. Do **not** re-run the splice tool on a file
that no longer contains markers — just edit the prose in place and leave the `svg:` template
literals untouched.

Then check:

```bash
cd /Users/alexgris/.mavis/workspace/linux-2
node --check assets/chapters/chNN-slug.js && echo "SYNTAX OK"
node assets/wordcount.js | grep -E 'file|^<your-chapter-ids>'
python3 -c "import re;t=open('assets/chapters/chNN-slug.js',encoding='utf-8').read();print('CJK:',len(re.findall(r'[一-鿿぀-ヿ]',t)))"
```

`wordcount.js` prints `prose%` — that is your number. Drive it to the target.

If you are over target and cannot see what else to cut, the correct move is to **delete another
whole section** and let the remaining prose stand on its own. Do not keep shaving single
adverbs; that is what produced round 1's disappointing result.

## Final targets — prose as a percentage of the ORIGINAL

| file | orig prose | round-2 prose words |
|---|---|---|
| `ch00-map.js` | 1081 | **455** |
| `ch01-boot.js` | 1740 | **730** |
| `ch02-kernel.js` | 1744 | **730** |
| `ch03-processes.js` | 1800 | **755** |
| `ch04-isolation.js` | 2219 | **930** |
| `ch05-filesystem.js` | 6522 | **2740** |
| `ch06-systemd.js` | 2422 | **1015** |
| `ch07-packaging.js` | 5269 | **2210** |
| `ch08-build.js` | 6616 | **2780** |
| `ch09-networking.js` | 5779 | **2430** |
| `ch10-dns.js` | 4639 | **1950** |
| `ch11-services.js` | 5180 | **2175** |
| `ch12-storage.js` | 8181 | **3435** |
| `ch13-containers.js` | 2454 | **1030** |
| `ch14-kubernetes.js` | 2535 | **1065** |
| `ch15-security.js` | 8452 | **3550** |
| `ch16-troubleshooting.js` | 2448 | **1030** |
| `ch17-cheatsheet.js` | 3296 | **1385** |

## Report back

One line per file: filename, prose words vs round-2 target, `prose%`, diagram count, syntax, CJK count.