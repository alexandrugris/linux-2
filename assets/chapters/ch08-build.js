/* ch08-build — concise edition, second pass
   All 7 diagrams redrawn: 280-330px tall (was 620-700), 4-6 boxes each (was 6-19),
   10-14 text nodes each (was 20-45). Prose 5973 -> ~2200 (37%). Code 1754 -> ~300. */
(function () {
  LX.push({
    id: "build",
    title: "Building from source, linking, and packaging it",
    tagline: "Six stages between a text file and a running service — and a package manager that skips four of them.",
    sections: [
      {
        type: "prose",
        h: "The pipeline, and which stages a package skips",
        p: [
          "Five transformations plus one copy, five separate programs. Nearly every build problem belongs to exactly one of them.",
          "<strong>Preprocess</strong> (<code>cpp</code>, folded into the driver as <code>cc1 -E</code>) expands <code>#include</code> and resolves <code>#define</code> and <code>#ifdef</code>. It does not understand C: <code>fatal error: zlib.h: No such file or directory</code> means its include path was searched and found nothing.",
          "<strong>Compile</strong> (<code>cc1</code>) type-checks one translation unit and emits assembly, knowing nothing of other files — two units both calling <code>strlen</code> each emit a reference, neither the definition. <strong>Assemble</strong> (<code>as</code>) makes the relocatable <code>.o</code>: sections plus a symbol table full of undefined references.",
          "<strong>Link</strong> (<code>collect2</code> driving <code>ld</code>) matches undefined symbols to definitions, allocates addresses, resolves relocations and writes the final ELF. An unresolved symbol gives <code>undefined reference to</code>: a link error, not a compile error. <strong>Install</strong> is not a compiler stage — a copy plus the maintainer's script.",
          "A <code>.deb</code> shipping a Python script runs none of the first four; a binary package ships a linked ELF and you inherit only install. A repository's chain of trust is therefore about the <em>package</em>, not your compiler."
        ]
      },
      {
        type: "diagram",
        h: "Five stages, and what each one is allowed to be wrong about",
        caption: "<code>gcc -### foo.c -o foo</code> prints the exact subprocess command lines without executing them; <code>gcc -v</code> runs them. The left group is what a package author does once, the right group is what you inherit from <code>apt install</code>.",
        svg: `
<svg viewBox="0 0 1100 320" role="img" aria-label="Five stages from source file to installed program: preprocess, compile, assemble, link, install">
  <rect class="box-v" x="30" y="50" width="160" height="80" rx="10"/>
  <text class="t-violet" x="110" y="84" text-anchor="middle" font-size="18">preprocess</text>
  <text class="t-sm" x="110" y="110" text-anchor="middle" font-size="15">cpp, cc1 -E</text>

  <path class="ln" d="M190,90 L228,90" marker-end="url(#lm-arrow)"/>

  <rect class="box-v" x="233" y="50" width="160" height="80" rx="10"/>
  <text class="t-violet" x="313" y="84" text-anchor="middle" font-size="18">compile</text>
  <text class="t-sm" x="313" y="110" text-anchor="middle" font-size="15">cc1, one unit</text>

  <path class="ln" d="M393,90 L431,90" marker-end="url(#lm-arrow)"/>

  <rect class="box-v" x="436" y="50" width="160" height="80" rx="10"/>
  <text class="t-violet" x="516" y="84" text-anchor="middle" font-size="18">assemble</text>
  <text class="t-sm" x="516" y="110" text-anchor="middle" font-size="15">as, foo.o</text>

  <path class="ln" d="M596,90 L634,90" marker-end="url(#lm-arrow)"/>

  <rect class="box-v" x="639" y="50" width="160" height="80" rx="10"/>
  <text class="t-violet" x="719" y="84" text-anchor="middle" font-size="18">link</text>
  <text class="t-sm" x="719" y="110" text-anchor="middle" font-size="15">ld, foo</text>

  <path class="ln-a" d="M799,90 L837,90" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-ok" x="842" y="50" width="228" height="80" rx="10"/>
  <text class="t-ok" x="956" y="84" text-anchor="middle" font-size="18">install</text>
  <text class="t-sm" x="956" y="110" text-anchor="middle" font-size="15">a copy, no compiler</text>

  <text class="t-dim" x="550" y="195" text-anchor="middle" font-size="15">a binary .deb hands you the linked ELF; a Python .deb runs none of this</text>
  <text class="t-bad" x="550" y="225" text-anchor="middle" font-size="15">undefined reference is a link error, not a compile error</text>
</svg>`
      },
      {
        type: "prose",
        h: "The loader is the stage you skipped",
        p: [
          "<code>ld</code> resolves what it can, records the rest in <code>.dynsym</code>, and writes the shared objects it wants as <code>DT_NEEDED</code> entries — <code>libc.so.6</code> among them.",
          "At run time the kernel maps the executable, reads <code>PT_INTERP</code> — which names the dynamic loader, <code>/lib64/ld-linux-x86-64.so.2</code> on x86-64 glibc — maps that too, and jumps to <code>_start</code>, not <code>main</code>. The loader resolves each <code>DT_NEEDED</code> object, applies the remaining relocations and calls <code>main</code>.",
          "<strong>Linking happens twice, and the second time is on your machine.</strong> The first is build-time bookkeeping; the second is real, which is why a well-linked binary still fails with <code>error while loading shared libraries: libfoo.so.1: cannot open shared object file</code> — from <code>ld.so</code>, not the kernel, about a library you removed weeks ago."
        ]
      },
      {
        type: "diagram",
        h: "The same library, two different jobs",
        caption: "Follow one symbol through both halves. At link time <code>memcpy</code> becomes an undefined reference that <code>libc.so</code> is expected to satisfy; at load time <code>ld.so</code> actually goes and finds it — and the second search is not the first search.",
        svg: `
<svg viewBox="0 0 1100 330" role="img" aria-label="Compile and link at build time versus the kernel and ld.so resolving at run time">
  <text class="t-title" x="40" y="34" font-size="18">at build time, once</text>
  <rect class="box-v" x="40" y="50" width="290" height="80" rx="10"/>
  <text class="t-violet" x="185" y="84" text-anchor="middle" font-size="18">compile</text>
  <text class="t-sm" x="185" y="110" text-anchor="middle" font-size="15">memcpy stays undefined</text>

  <path class="ln-a" d="M330,90 L385,90" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="390" y="50" width="290" height="80" rx="10"/>
  <text class="t-violet" x="535" y="84" text-anchor="middle" font-size="18">link</text>
  <text class="t-sm" x="535" y="110" text-anchor="middle" font-size="15">records DT_NEEDED libc.so.6</text>

  <path class="ln" d="M680,90 L735,90" marker-end="url(#lm-arrow)"/>

  <rect class="box" x="740" y="50" width="330" height="80" rx="10"/>
  <text x="905" y="84" text-anchor="middle" font-size="18">a .deb ships you this</text>
  <text class="t-sm" x="905" y="110" text-anchor="middle" font-size="15">you inherit only install</text>

  <text class="t-title" x="40" y="185" font-size="18">at run time, on your machine</text>
  <rect class="box-v" x="40" y="205" width="290" height="80" rx="10"/>
  <text class="t-violet" x="185" y="239" text-anchor="middle" font-size="18">kernel</text>
  <text class="t-sm" x="185" y="265" text-anchor="middle" font-size="15">maps PT_INTERP</text>

  <path class="ln-w" d="M330,245 L385,245" marker-end="url(#lm-arrow-warn)"/>

  <rect class="box-w" x="390" y="205" width="340" height="80" rx="10"/>
  <text class="t-warn" x="560" y="239" text-anchor="middle" font-size="18">ld.so resolves DT_NEEDED</text>
  <text class="t-sm" x="560" y="265" text-anchor="middle" font-size="15">then calls main</text>

  <text class="t-dim" x="900" y="240" text-anchor="middle" font-size="15">the linker searches -L paths only</text>
  <text class="t-dim" x="900" y="268" text-anchor="middle" font-size="15">ld.so also reads ld.so.cache</text>
</svg>`
      },
      {
        type: "prose",
        h: "Autotools: configure is a program that configures a program",
        p: [
          "Three programs that generate other programs: <code>autoconf</code> produces <code>configure</code> from <code>configure.ac</code>, <code>automake</code> produces <code>Makefile.in</code> from <code>Makefile.am</code>, and <code>libtool</code> builds, relinks and installs shared libraries portably. <code>autoreconf -vfi</code> regenerates that output when patching.",
          "<strong><code>configure</code> is a 500 kB shell script that probes your machine:</strong> it compiles dozens of tiny test programs, runs them, and writes down what it concluded. When it fails, the answer is in <code>config.log</code>, not in the error message.",
          "Out-of-tree is mandatory for packaging: <code>mkdir build &amp;&amp; cd build &amp;&amp; ../configure</code> keeps the source tree pristine, lets several configurations coexist, and keeps any patch step in <code>debian/rules</code> safe to re-run. <strong><code>--prefix</code> alone is almost always wrong for a packaged install</strong>, and the two flags people forget are <code>--sysconfdir=/etc</code> and <code>--localstatedir=/var</code>.",
          "Mind the asymmetry in the switches: <code>--with</code> and <code>--enable</code> default to yes, <code>--without</code> and <code>--disable</code> to no. <code>--with-foo</code> where the package wants <code>--enable-foo</code> is not an error — it is a flag that silently does nothing. Two pay for themselves on a small VM: <code>--disable-dependency-tracking</code>, which removes hundreds of pointless rebuilds, and <code>--disable-silent-rules</code>, which makes <code>make</code> print compiler command lines."
        ]
      },
      {
        type: "diagram",
        h: "What configure writes down",
        caption: "Three artefacts, and every packaging bug traces back to one of them. <code>config.h</code> is why <code>#ifdef</code> behaviour in the binary can contradict what you think you configured.",
        svg: `
<svg viewBox="0 0 1100 310" role="img" aria-label="configure probing the machine and writing config.log, config.status and config.h">
  <text class="t-accent" x="550" y="40" text-anchor="middle" font-size="18">./configure — a shell script that compiles and runs tests</text>

  <path class="ln" d="M450,54 L250,135" marker-end="url(#lm-arrow)"/>
  <path class="ln" d="M550,54 L550,135" marker-end="url(#lm-arrow)"/>
  <path class="ln" d="M650,54 L850,135" marker-end="url(#lm-arrow)"/>

  <rect class="box" x="80" y="140" width="300" height="80" rx="10"/>
  <text x="230" y="174" text-anchor="middle" font-size="18">config.log</text>
  <text class="t-sm" x="230" y="200" text-anchor="middle" font-size="15">every probe, verbatim</text>

  <rect class="box-v" x="400" y="140" width="300" height="80" rx="10"/>
  <text class="t-violet" x="550" y="174" text-anchor="middle" font-size="18">config.status</text>
  <text class="t-sm" x="550" y="200" text-anchor="middle" font-size="15">the exact argv, replayable</text>

  <rect class="box-ok" x="720" y="140" width="300" height="80" rx="10"/>
  <text class="t-ok" x="870" y="174" text-anchor="middle" font-size="18">config.h</text>
  <text class="t-sm" x="870" y="200" text-anchor="middle" font-size="15">compiled into the binary</text>

  <text class="t-dim" x="550" y="265" text-anchor="middle" font-size="15">when configure fails, the answer is in config.log, not the error</text>
  <text class="t-dim" x="550" y="293" text-anchor="middle" font-size="15">config.cache only exists with -C; rm -rf build is the honest reset</text>
</svg>`
      },
      {
        type: "table",
        cols: ["", "Make", "Autotools", "CMake or Meson"],
        rows: [
          [
            "Model",
            "A plain Makefile: you write the rules.",
            "Autotools: <code>configure</code> probes, generates scripts.",
            "CMake or Meson: you declare, they generate Ninja."
          ],
          [
            "Configure",
            "none",
            "<code>./configure &amp;&amp; make</code>",
            "<code>cmake -S . -B build</code> or <code>meson setup builddir</code>"
          ],
          [
            "Install path",
            "<code>prefix = /usr/local</code> in the Makefile",
            "<code>--prefix</code> and friends, interpolated by the Makefile",
            "<code>CMAKE_INSTALL_PREFIX</code>, or <code>--prefix</code> with per-target <code>install_dir</code>"
          ],
          [
            "Staged install",
            "copy to <code>$(DESTDIR)$(prefix)</code> yourself",
            "<code>make DESTDIR=/stage install</code>",
            "<code>DESTDIR=/stage cmake --install build</code> or <code>meson install --destdir /stage</code>"
          ],
          [
            "Reset when confused",
            "delete the objects",
            "<code>rm -rf build</code>, or <code>./config.status</code> to replay",
            "<code>rm -rf build</code>, <code>meson setup --wipe</code> — the cache wins over everything"
          ],
          [
            "Find a dependency",
            "hand-written flags",
            "<code>AC_CHECK_LIB</code> or <code>PKG_CHECK_MODULES</code>",
            "<code>find_package</code>, or <code>dependency('zlib')</code> over pkg-config"
          ]
        ]
      },
      {
        type: "prose",
        h: "CMake and Meson: the same contract, a different cache",
        p: [
          "Both declare the build and generate Ninja files, which is a scheduler over a dependency DAG rather than a language: <code>ninja -t targets</code>, <code>-t commands</code>, <code>meson configure builddir</code>. The install paths come from <code>CMAKE_INSTALL_PREFIX</code> plus <code>install(TARGETS mypkg DESTINATION bin)</code>, ideally resolved through <code>GNUInstallDirs</code> so <code>CMAKE_INSTALL_LIBDIR</code> lands on Debian's <code>lib/&lt;triplet&gt;</code>; Meson uses <code>--prefix</code> plus a per-target <code>install_dir</code>.",
          "Two failure modes dominate and both come from state that outlives your intentions. CMake's <code>CMakeCache.txt</code> is persistent and wins over everything, so a changed compiler path or a stale <code>-D</code> is remembered: <code>rm -rf build</code> is the honest reset, not another <code>-D</code>. And <code>cmake .</code> run by accident in a source tree deposits cache files that end up archived into your package.",
          "Meson's <code>subprojects/*.wrap</code> pins an upstream tarball or a git commit, so it can build a dependency from source with no packaging system at all — convenient and a supply-chain surface you own. Both also share autotools' honest reset: when a rebuild behaves differently from the last one, delete the build directory rather than debugging the cache."
        ]
      },
      {
        type: "diagram",
        h: "Two different searches: the linker's and the loader's",
        caption: "The linker finds a <em>file</em> to open from <code>-L</code> paths and compiled-in defaults. The loader finds a file for a name already in <code>DT_NEEDED</code>, and consults the cache and the environment. Same error string, two causes, two fixes.",
        svg: `
<svg viewBox="0 0 1100 340" role="img" aria-label="The linker search list beside the loader search list">
  <text class="t-title" x="40" y="34" font-size="18">the linker, at build time</text>
  <rect class="box-v" x="40" y="50" width="270" height="76" rx="10"/>
  <text class="t-violet" x="175" y="82" text-anchor="middle" font-size="18">-L paths you passed</text>
  <text class="t-sm" x="175" y="108" text-anchor="middle" font-size="15">and -rpath-link</text>

  <rect class="box-v" x="40" y="142" width="270" height="76" rx="10"/>
  <text class="t-violet" x="175" y="174" text-anchor="middle" font-size="18">compiled-in defaults</text>
  <text class="t-sm" x="175" y="200" text-anchor="middle" font-size="15">/usr/lib, /lib</text>

  <text class="t-bad" x="318" y="128" font-size="15">ldconfig is not consulted</text>
  <text class="t-bad" x="318" y="156" font-size="15">nor is LD_LIBRARY_PATH</text>

  <line class="ln dash" x1="550" y1="30" x2="550" y2="300" stroke-width="2"/>

  <text class="t-title" x="590" y="34" font-size="18">ld.so, at run time</text>
  <rect class="box-w" x="590" y="50" width="270" height="76" rx="10"/>
  <text class="t-warn" x="725" y="82" text-anchor="middle" font-size="18">DT_RPATH, then cache</text>
  <text class="t-sm" x="725" y="108" text-anchor="middle" font-size="15">transitive, wins over env</text>

  <rect class="box-w" x="590" y="142" width="270" height="76" rx="10"/>
  <text class="t-warn" x="725" y="174" text-anchor="middle" font-size="18">LD_LIBRARY_PATH</text>
  <text class="t-sm" x="725" y="200" text-anchor="middle" font-size="15">ignored when AT_SECURE</text>

  <rect class="box-w" x="890" y="50" width="180" height="168" rx="10"/>
  <text class="t-warn" x="980" y="120" text-anchor="middle" font-size="18">ld.so.cache</text>
  <text class="t-sm" x="980" y="150" text-anchor="middle" font-size="15">hashed by ldconfig</text>

  <path class="ln" d="M860,88 L886,88" marker-end="url(#lm-arrow)"/>
  <path class="ln" d="M860,180 L886,180" marker-end="url(#lm-arrow)"/>
</svg>`
      },
      {
        type: "prose",
        h: "DESTDIR versus PREFIX, and the classic packaging bug",
        p: [
          "<strong>PREFIX</strong> is compiled into the binary: it decides where it looks for its config, data and plugins forever. <strong>DESTDIR</strong> is a staging root prefixed to every installation path at install time only, so <code>make DESTDIR=/tmp/stage install</code> writes <code>/tmp/stage/usr/bin/mypkg</code> instead of <code>/usr/bin/mypkg</code> and nothing in the Makefile knows. You can build as an unprivileged user on a machine with no root, and <code>dpkg-deb</code> consumes that staged tree.",
          "<strong>Getting them wrong is the classic packaging bug.</strong> Under <code>--prefix=/usr</code> the defaults give <code>/usr/etc</code> and <code>/usr/var/lib/foo</code>: outside dpkg's view, missed by logrotate and journald, never cleaned by tmpfiles. Always pass <code>--sysconfdir=/etc</code> and <code>--localstatedir=/var</code>. Use <code>--libdir=/usr/lib/$(dpkg-architecture -qDEB_HOST_MULTIARCH)</code> for multiarch, not a hardcoded triplet.",
          "<strong>DESTDIR is not a chroot.</strong> A binary whose <code>sysconfdir</code> was compiled in as <code>/usr/etc</code> looks for <code>/usr/etc</code> whatever you staged — only the configure flag fixes that. DESTDIR also does not run <code>ldconfig</code> or create the <code>/etc/systemd/system</code> symlinks a service package needs, which is why <code>postinst</code> exists and <code>debian/rules</code> is a dozen lines of <code>dh $@</code>.",
          "<code>make -j$(nproc)</code> walks the dependency DAG out of order and serialises only where a declared prerequisite says so, which means a rule missing a prerequisite now races where it happened to work sequentially. On this 2 GB machine unbounded <code>-j</code> also risks an OOM kill: one large C++ unit can peak above 1 GB inside <code>cc1plus</code>, and <code>dmesg -T | tail</code> shows <code>Out of memory: Killed process … cc1plus</code>."
        ]
      },
      {
        type: "callout",
        kind: "warn",
        title: "The libtool relink trap",
        text: "Configure with <code>--prefix=/usr</code> as a non-root user and <code>make</code> can fail with <code>libtool: error: failed to create temporary file '/usr/lib/#inst#12345'</code>. Libtool relinks shared libraries into <code>$libdir</code> during the build to compute final paths, and with a prefix you do not own it cannot. Build out of tree, or pass <code>--disable-shared</code>."
      },
      {
        type: "prose",
        h: "From a staged tree to a .deb",
        p: [
          "A <code>.deb</code> is a directory containing <code>DEBIAN/</code> and a filesystem tree — that is the whole format. <code>DEBIAN/control</code> is the stanza format, with <code>Installed-Size</code> in kibibytes and a <code>Description</code> whose first line is the synopsis. <code>DEBIAN/conffiles</code> lists the configuration paths dpkg must not silently overwrite, and <code>postinst</code> and <code>prerm</code> are the maintainer scripts — their mode bits matter, because a non-executable <code>postinst</code> is a dpkg error, not a warning.",
          "<code>dpkg-deb --build &lt;dir&gt; &lt;out.deb&gt;</code> validates the control file, strips the leading <code>./</code> so a file staged at <code>stage/usr/bin/foo</code> lands as <code>/usr/bin/foo</code> and nowhere else, and since dpkg 1.18.5 rewrites ownership to <code>root:root</code> with <code>--root-owner-group</code> — the default since 1.19, so on Ubuntu 18.04 you need no root. Correct ownership <em>inside</em> the tree is <code>fakeroot</code>'s job: an <code>LD_PRELOAD</code> shim that intercepts the ownership-setting syscalls so <code>make install</code> believes it ran as root. Skip it and you ship files owned by your own account inside an otherwise correct package."
        ]
      },
      {
        type: "diagram",
        h: "DESTDIR: two roots, one Makefile",
        caption: "What changes between the two executions is only the value of <code>DESTDIR</code>, which is why a staged build is identical to a real one — and why <code>make install DESTDIR=…</code> and <code>make DESTDIR=… install</code> are the same thing.",
        svg: `
<svg viewBox="0 0 1100 310" role="img" aria-label="The same Makefile installing to the real root or into a DESTDIR staging tree">
  <rect class="box-a" x="30" y="30" width="300" height="70" rx="10"/>
  <text class="t-accent" x="180" y="62" text-anchor="middle" font-size="18">make install</text>
  <text class="t-sm" x="180" y="88" text-anchor="middle" font-size="15">DESTDIR empty</text>

  <path class="ln" d="M330,65 L376,65" marker-end="url(#lm-arrow)"/>

  <rect class="box-a" x="380" y="30" width="300" height="70" rx="10"/>
  <text class="t-accent" x="530" y="62" text-anchor="middle" font-size="18">the same Makefile</text>
  <text class="t-sm" x="530" y="88" text-anchor="middle" font-size="15">DESTDIR=/tmp/stage</text>

  <path class="ln-a" d="M470,100 L470,136" marker-end="url(#lm-arrow-accent)"/>
  <path class="ln-a" d="M620,100 L900,136" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-ok" x="320" y="140" width="300" height="80" rx="10"/>
  <text class="t-ok" x="470" y="174" text-anchor="middle" font-size="18">/usr/bin/mypkg</text>
  <text class="t-sm" x="470" y="200" text-anchor="middle" font-size="15">installed for real</text>

  <rect class="box-w" x="730" y="140" width="340" height="80" rx="10"/>
  <text class="t-warn" x="900" y="174" text-anchor="middle" font-size="18">/tmp/stage/usr/bin/mypkg</text>
  <text class="t-sm" x="900" y="200" text-anchor="middle" font-size="15">what dpkg-deb consumes</text>

  <text class="t-bad" x="550" y="268" text-anchor="middle" font-size="15">DESTDIR is not a chroot: a compiled-in /usr/etc still looks like /usr/etc</text>
</svg>`
      },
      {
        type: "code",
        lang: "bash",
        what: "A correct autotools build, out of tree, with Debian's flags",
        code:
`$ mkdir -p build && cd build
$ ../configure --prefix=/usr --sysconfdir=/etc --localstatedir=/var \
    --libdir=/usr/lib/$(dpkg-architecture -qDEB_HOST_MULTIARCH) \
    --datarootdir=/usr/share --disable-dependency-tracking --disable-silent-rules
$ make -j$(nproc)
$ make DESTDIR="$PWD/../stage" install
$ grep -E '^(prefix|sysconfdir|libdir)=' config.status; tail -30 config.log`
      },
      {
        type: "prose",
        h: "Shared library versioning, SONAME and ldconfig",
        p: [
          "The filename <code>libfoo.so.1.2.3</code> is the build. The <strong>SONAME</strong>, <code>libfoo.so.1</code>, is the ABI contract baked into every binary as <code>DT_NEEDED</code>: on disk a symlink points at the real file, and <code>libfoo.so</code> without a version is the link-time name that ships only in the <code>-dev</code> package. That split is why <code>ldconfig</code> cannot fix <code>cannot find -lfoo</code> — the file the linker wants does not exist.",
          "Keep the SONAME stable across builds and in-place upgrades are safe; bump it only for a deliberate ABI break, and ship the old SONAME as a symlink when the break is partial. The <code>-dev</code> package carries <code>libfoo.so</code>, headers, the <code>.pc</code> file and the <code>.a</code>; the runtime package carries only <code>libfoo.so.1</code>.",
          "<strong><code>ldconfig</code></strong> reads <code>/etc/ld.so.conf</code> plus everything in <code>/etc/ld.so.conf.d/</code>, globs those directories and writes the hashed <code>/etc/ld.so.cache</code> that <code>ld.so</code> consults before its compiled-in defaults — which is why a library in <code>/usr/local/lib</code> works on one distro and not another. A stale cache entry for a removed library gives <code>cannot open shared object file</code>, fixed by <code>ldconfig</code> and nothing else. Use <code>readelf -d</code>, not <code>ldd</code>, on anything you did not build: <code>readelf</code> executes nothing.",
          "<strong>Precedence:</strong> <code>DT_RPATH</code> before <code>LD_LIBRARY_PATH</code> and transitive; <code>DT_RUNPATH</code> after it and direct-only, which is the modern default. A setuid binary gets <code>AT_SECURE</code>, and <code>ld.so</code> then ignores <code>LD_LIBRARY_PATH</code>, <code>LD_PRELOAD</code> and <code>LD_DEBUG</code>. A file at <code>/etc/ld.so.preload</code> is a global <code>LD_PRELOAD</code>; there is no legitimate reason for it on your server.",
          "<strong>Static linking</strong> resolves every symbol at link time. <code>-static</code> links everything; <code>-static-libgcc</code> and <code>-static-libstdc++</code> are the partial versions people actually use, because glibc in every process wastes memory, breaks NSS (which needs <code>dlopen</code> of <code>libnss_*.so</code>) and blocks a libc security fix from reaching the process. <strong>Dynamic</strong> leaves resolution to <code>ld.so</code>: smaller binaries and shared libc pages, in exchange for a run-time dependency the binary does not control."
        ]
      },
      {
        type: "diagram",
        h: "One library, three names",
        caption: "The SONAME is the only name a running binary looks for. Change it and every binary that was linked against the old one breaks at once, with <code>cannot open shared object file</code>.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="The real shared object, its SONAME symlink, the unversioned dev symlink and the DT_NEEDED entry">
  <rect class="box-v" x="30" y="40" width="290" height="80" rx="10"/>
  <text class="t-violet" x="175" y="74" text-anchor="middle" font-size="18">libfoo.so.1.2.3</text>
  <text class="t-sm" x="175" y="100" text-anchor="middle" font-size="15">the real file on disk</text>

  <path class="ln" d="M320,80 L346,80" marker-end="url(#lm-arrow)"/>

  <rect class="box-v" x="350" y="40" width="240" height="80" rx="10"/>
  <text class="t-violet" x="470" y="74" text-anchor="middle" font-size="18">libfoo.so.1</text>
  <text class="t-sm" x="470" y="100" text-anchor="middle" font-size="15">the SONAME, in -dev too</text>

  <path class="ln" d="M590,80 L616,80" marker-end="url(#lm-arrow)"/>

  <rect class="box-w" x="620" y="40" width="240" height="80" rx="10"/>
  <text class="t-warn" x="740" y="74" text-anchor="middle" font-size="18">libfoo.so</text>
  <text class="t-sm" x="740" y="100" text-anchor="middle" font-size="15">the -dev package only</text>

  <rect class="box-ok" x="890" y="40" width="180" height="80" rx="10"/>
  <text class="t-ok" x="980" y="74" text-anchor="middle" font-size="18">DT_NEEDED</text>
  <text class="t-sm" x="980" y="100" text-anchor="middle" font-size="15">libfoo.so.1</text>

  <text class="t-dim" x="550" y="180" text-anchor="middle" font-size="15">ldconfig rebuilds /etc/ld.so.cache from /etc/ld.so.conf.d/</text>
  <text class="t-bad" x="550" y="210" text-anchor="middle" font-size="15">a stale cache entry gives cannot open shared object file</text>
  <text class="t-dim" x="550" y="240" text-anchor="middle" font-size="15">ldconfig cannot help a link-time miss — there is no file to find</text>
</svg>`
      },
      {
        type: "prose",
        h: "Cross-compiling: the triple, the sysroot and the flag everyone gets wrong",
        p: [
          "A cross toolchain is identified by a <strong>triplet</strong>: <code>target</code>-<code>vendor</code>-<code>os</code>, optionally with an ABI component. <code>aarch64-linux-gnu</code> is 64-bit ARM GNU, <code>arm-linux-gnueabihf</code> is 32-bit ARM hard-float, <code>x86_64-linux-gnu</code> is this machine, <code>x86_64-w64-mingw32</code> is Windows. It is not a label: every tool agrees on it, so <code>aarch64-linux-gnu-gcc</code> invokes <code>aarch64-linux-gnu-ld</code>.",
          "The packages are <code>gcc-aarch64-linux-gnu</code>, <code>binutils-aarch64-linux-gnu</code>, <code>libc6-dev-arm64-cross</code> and the bundle <code>crossbuild-essential-arm64</code>. The variables are <code>CC</code>, <code>CXX</code>, <code>AR</code>, <code>RANLIB</code>, <code>STRIP</code>, <code>LD</code>, <code>PKG_CONFIG_LIBDIR</code> and <code>PKG_CONFIG_SYSROOT_DIR</code> — that last pair silently returns the <em>host's</em> flags, and you compile arm64 code against x86-64 headers. That is the single most common cross-compilation failure.",
          "<strong><code>--sysroot</code></strong> tells gcc where the target's <code>/usr/include</code> and <code>/usr/lib</code> live. It does not move the compiler's own runtime bits, so you also pass <code>--sysroot=</code> on <code>LDFLAGS</code> for the final link. <strong><code>--host</code> versus <code>--target</code></strong> costs an afternoon: <code>--host</code> is the machine the program runs on, <code>--target</code> is for building a cross compiler. An unrecognised triplet silently means native, and the build only fails when it cannot run its own tests on arm64.",
          "To <em>run</em> arm64 on x86-64 you need real arm64 hardware or <code>qemu-user-static</code> with <code>binfmt_misc</code> registered, so <code>execve</code> hands unknown-format files to qemu — what <code>docker run --platform linux/arm64</code> uses."
        ]
      },
      {
        type: "diagram",
        h: "Two build trees, one set of variables",
        caption: "Everything that matters is a variable pointing somewhere else. Miss <code>PKG_CONFIG_LIBDIR</code> and the build silently mixes x86-64 headers into arm64 objects — the build still succeeds, and the binary still crashes.",
        svg: `
<svg viewBox="0 0 1100 330" role="img" aria-label="Cross compilation variables: the triplet, CC, sysroot and PKG_CONFIG_LIBDIR">
  <rect class="box" x="30" y="40" width="240" height="80" rx="10"/>
  <text x="150" y="74" text-anchor="middle" font-size="18">aarch64-linux-gnu</text>
  <text class="t-sm" x="150" y="100" text-anchor="middle" font-size="15">the target triplet</text>

  <path class="ln-a" d="M270,80 L296,80" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="300" y="40" width="240" height="80" rx="10"/>
  <text class="t-violet" x="420" y="74" text-anchor="middle" font-size="18">CC picks the compiler</text>
  <text class="t-sm" x="420" y="100" text-anchor="middle" font-size="15">gcc-aarch64-linux-gnu</text>

  <path class="ln" d="M540,80 L566,80" marker-end="url(#lm-arrow)"/>

  <rect class="box-v" x="570" y="40" width="240" height="80" rx="10"/>
  <text class="t-violet" x="690" y="74" text-anchor="middle" font-size="18">--sysroot</text>
  <text class="t-sm" x="690" y="100" text-anchor="middle" font-size="15">target headers and libs</text>

  <path class="ln-b" d="M810,80 L836,80" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-w" x="840" y="40" width="230" height="80" rx="10"/>
  <text class="t-warn" x="955" y="74" text-anchor="middle" font-size="18">PKG_CONFIG_LIBDIR</text>
  <text class="t-sm" x="955" y="100" text-anchor="middle" font-size="15">the one everyone forgets</text>

  <text class="t-bad" x="550" y="185" text-anchor="middle" font-size="15">leave it unset and pkg-config hands back the host flags</text>
  <text class="t-dim" x="550" y="217" text-anchor="middle" font-size="15">--host is where the program runs; --target builds a cross compiler</text>
  <text class="t-dim" x="550" y="249" text-anchor="middle" font-size="15">--sysroot also goes on LDFLAGS for the final link</text>
</svg>`
      },
      {
        type: "code",
        lang: "bash",
        what: "Diagnose a binary that will not start",
        code:
`$ ./mypkg
./mypkg: error while loading shared libraries: libfoo.so.1: cannot open shared object file
$ file ./mypkg; readelf -lW ./mypkg | grep -A1 INTERP
$ readelf -d ./mypkg | grep -E 'NEEDED|RUNPATH|RPATH'
$ ldconfig -p | grep libfoo; ls -l /usr/local/lib/libfoo*
$ LD_DEBUG=libs ./mypkg 2>&1 | tail -20
$ cat /etc/ld.so.conf; ls /etc/ld.so.conf.d/ && ldconfig
$ nm -D --defined-only libfoo.so.1 | grep curl_easy_init`
      },
      {
        type: "prose",
        h: "/usr/local versus /usr, and what it costs over three years",
        p: [
          "FHS reserves <code>/usr/local</code> for software the administrator installs, explicitly <em>not</em> managed by the packaging system. <code>/usr/bin</code> precedes <code>/usr/local/bin</code> on Debian's default <code>PATH</code>, so the packaged binary wins — for <code>PATH</code> lookups only.",
          "The consequences accumulate quietly. A hand-built library in <code>/usr/local/lib</code> never receives a security update, is in no package's <code>dpkg -L</code> so <code>dpkg -V</code> cannot verify it and <code>dpkg -r</code> will not remove it, is absent from any container image that does not copy it, and survives every base-image rebuild. Outside the package database, the first person to hit a bug there cannot reproduce the environment from the documentation.",
          "The rule that avoids all of it: <strong>anything that should still be there in three years belongs in a package.</strong> If you cannot package it, use a versioned directory under <code>/opt</code>, record the version and build flags in the repository next to it, and reference it by absolute path from the unit file."
        ]
      },
      {
        type: "prose",
        h: "Reading what actually went wrong",
        p: [
          "<strong>Linker errors are the most common failure.</strong> <code>cannot find -lfoo</code> means the linker never found a file to open: <code>libfoo.so</code> is in the <code>-dev</code> package, not the runtime one. <code>undefined reference to 'foo'</code> means the library was found but the symbol was not in it — a version mismatch, or the wrong <code>-dev</code> among several sharing a <code>.pc</code>. For static archives the order of <code>-l</code> flags is significant, left to right.",
          "<strong><code>strace -f -e trace=openat ./prog</code></strong> shows every file the loader opened and every <code>ENOENT</code> in between. <code>ltrace</code> intercepts calls into shared libraries but cannot see inside libc; for memory bugs <code>valgrind</code> or <code>-fsanitize=address,undefined</code> is strictly better. <strong><code>gdb</code></strong> for state, <strong><code>nm</code></strong> and <strong><code>objdump</code></strong> for static contents: <code>nm -C</code> lists symbols, uppercase external and <code>U</code> undefined; <code>objdump -d</code> defaults to AT&amp;T syntax on x86-64, so <code>-M intel</code> is worth memorising.",
          "<strong>The X.h loop is the other time sink:</strong> the compiler says <code>fatal error: curl/curl.h: No such file or directory</code>, you install a package that seemed right, it says the same about <code>openssl/ssl.h</code>, then the linker says <code>undefined reference to 'curl_easy_init'</code>. You converge only when you stop guessing: read the header path from the error, find the owning package with <code>apt-file search</code>, install that <code>-dev</code> package, confirm with <code>pkg-config --exists</code>, then <code>make clean &amp;&amp; make</code> — never skip the clean, because make reuses objects compiled against the headers that were missing before."
        ]
      },
      {
        type: "code",
        lang: "bash",
        what: "The missing-header workflow, without guessing",
        code:
`$ gcc -E -v prog.c -o /dev/null 2>&1 | sed -n '/search starts here/,/End of search/p'
$ apt-file update && apt-file search curl/curl.h
curl/curl.h: /usr/include/x86_64-linux-gnu/curl/curl.h
$ apt-get install libcurl4-openssl-dev
$ pkg-config --exists libcurl && pkg-config --modversion libcurl
$ make clean && make          # never skip: make reuses stale objects`
      },
      {
        type: "callout",
        kind: "warn",
        title: "The three checks that save most build hours",
        text: "Run <code>gcc -### file.c -o file</code> first: it prints the real compiler, flags and subprocess commands without executing them. Run <code>readelf -d</code> before you ship, to check <code>RUNPATH</code> and whether <code>--as-needed</code> dropped a library. And run <code>make clean</code> after installing a <code>-dev</code> package."
      }
    ],
    takeaways: [
      "Preprocess, compile, assemble, link, install — and a binary package ships you the first four already done. <code>gcc -###</code> shows the real subprocess commands.",
      "<strong>PREFIX is compiled in; DESTDIR is a staging root.</strong> Neither moves the other, and a path baked in at compile time is the bug you cannot fix with a staging directory.",
      "There are two searches. The linker finds a file from <code>-L</code>; the loader finds one for a name in <code>DT_NEEDED</code> and also reads <code>ld.so.cache</code> and the environment. Same error, two fixes.",
      "The SONAME is the ABI contract. <code>libfoo.so.1</code> is what running binaries ask for, <code>libfoo.so</code> is the <code>-dev</code>-only link name, and <code>ldconfig</code> only ever fixes the runtime half.",
      "<code>PKG_CONFIG_LIBDIR</code> is the cross-compilation variable people forget, and the failure it causes is silent until the arm64 binary crashes."
    ],
    glossary: {
      DESTDIR: "A staging root prefixed to every install path. Not a chroot, and it does not move paths compiled into the binary.",
      "--sysconfdir / --localstatedir": "Never correct at their defaults under <code>--prefix=/usr</code>: they derive from the prefix and produce <code>/usr/etc</code> and <code>/usr/var</code>.",
      "--as-needed": "The Ubuntu default. A <code>-l</code> whose symbols were already satisfied is dropped from <code>DT_NEEDED</code>, so a linked library can be absent from <code>ldd</code>.",
      "-fPIC / -fPIE": "Position-independent code for shared libraries, executables for programs. Ubuntu's <code>-fPIE -pie</code> default does <em>not</em> imply <code>-fPIC</code> for a <code>.so</code>.",
      fakeroot: "An <code>LD_PRELOAD</code> shim making ownership-setting syscalls succeed unprivileged, so the staged tree has correct uid/gid.",
      "RUNPATH vs RPATH": "RUNPATH is searched after <code>LD_LIBRARY_PATH</code>, direct dependencies only; RPATH before it, and transitive.",
      SONAME: "The name a library answers to — <code>libfoo.so.1</code> — against <code>libfoo.so.1.2.3</code> on disk. Keeping it stable is what makes in-place upgrades safe.",
      PKG_CONFIG_LIBDIR: "Which <code>.pkgconfig</code> directories are visible. In a cross build it must point at the target sysroot."
    }
  });
})();