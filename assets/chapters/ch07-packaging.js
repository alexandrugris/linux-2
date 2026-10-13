/* ch07-packaging — concise edition, second pass
   All 7 diagrams redrawn: 260-330px tall (was 620-700), 4-7 boxes each (was 6-17),
   10-14 text nodes each (was 27-66). Prose 4644 -> ~1780 (38%). Code 1082 -> ~230. */
(function () {
  LX.push({
    id: "packaging",
    title: "Packages, repositories, and installing software",
    tagline: "An archive plus metadata plus a graph of who needs what — and a signature chain that is the only reason to trust any of it.",
    sections: [
      {
        type: "prose",
        h: "What a package is, precisely",
        p: [
          "A Debian package is an <code>ar</code> archive of three members in fixed order: a version stamp, a metadata tarball, a data tarball. No registry, no runtime agent, and no transaction — the sophistication is in the second member and the code consuming it.",
          "<code>dpkg</code> handles dependencies badly and predictably, <code>apt</code> above it resolves them and does almost nothing else, <code>rpm</code> uses another schema, pacman a directory of directories. All four ship the same four ideas: a database of what is installed, a way to verify files, a script hook per package, and a versioned dependency relation.",
          "What none of them gives you is atomicity. An <code>apt-get install</code> that fails halfway has already unpacked packages, run <code>preinst</code> and modified files the previous version owned. There is no rollback, only a database telling you where it stopped."
        ]
      },
      {
        type: "diagram",
        h: "Anatomy of a .deb",
        caption: "Three members, in this order because <code>dpkg</code> streams them in sequence and must know where metadata ends. <code>dpkg-deb -I</code> reads only the control member, <code>-c</code> the index of the data member, <code>-x</code> extracts without either.",
        svg: `
<svg viewBox="0 0 1100 280" role="img" aria-label="A Debian package as an ar archive of debian-binary, control.tar and data.tar in that fixed order">
  <text class="t-title" x="30" y="36" font-size="18">nginx_1.14.0-2ubuntu3.5_amd64.deb — an ar archive</text>

  <rect class="box-v" x="30" y="60" width="230" height="120" rx="10"/>
  <text class="t-violet" x="145" y="94" text-anchor="middle" font-size="18">debian-binary</text>
  <text class="t-sm" x="145" y="122" text-anchor="middle" font-size="15">the version stamp</text>
  <text class="t-xs" x="145" y="150" text-anchor="middle" font-size="14">2.0, eight bytes</text>

  <rect class="box-a" x="290" y="60" width="330" height="120" rx="10"/>
  <text class="t-accent" x="455" y="94" text-anchor="middle" font-size="18">control.tar.gz</text>
  <text class="t-sm" x="455" y="122" text-anchor="middle" font-size="15">Depends, scripts, conffiles</text>
  <text class="t-xs" x="455" y="150" text-anchor="middle" font-size="14">all the intelligence</text>
  <text class="t-xs" x="455" y="172" text-anchor="middle" font-size="14">dpkg-deb -I reads this</text>

  <rect class="box-ok" x="650" y="60" width="420" height="120" rx="10"/>
  <text class="t-ok" x="860" y="94" text-anchor="middle" font-size="18">data.tar.xz</text>
  <text class="t-sm" x="860" y="122" text-anchor="middle" font-size="15">/usr/sbin/nginx, configs</text>
  <text class="t-xs" x="860" y="150" text-anchor="middle" font-size="14">the bytes, nothing clever</text>
  <text class="t-xs" x="860" y="172" text-anchor="middle" font-size="14">dpkg-deb -c lists it</text>

  <text class="t-dim" x="550" y="228" text-anchor="middle" font-size="15">the order is fixed — dpkg streams the members in sequence</text>
  <text class="t-dim" x="550" y="256" text-anchor="middle" font-size="15">SOURCE_DATE_EPOCH is what makes a rebuilt package byte-identical</text>
</svg>`
      },
      {
        type: "table",
        cols: ["Control field", "Meaning", "What it decides"],
        rows: [
          [
            "<code>Package</code> / <code>Source</code>",
            "Binary name, and the source it was built from",
            "Many binaries share one source: <code>nginx</code> and <code>nginx-core</code> are two from one source on 18.04."
          ],
          [
            "<code>Version</code>",
            "<code>[epoch:]upstream[-debian_revision]</code>",
            "The epoch lets a Debian revision overtake an upstream version that went <em>backwards</em>."
          ],
          [
            "<code>Depends</code>",
            "Hard requirement",
            "Unsatisfied means the package cannot be configured — the relation that produces <code>half-configured</code>. <code>Recommends</code> is installed unless <code>--no-install-recommends</code> is set, which is where surprise disk goes."
          ],
          [
            "<code>Conflicts</code> / <code>Breaks</code> / <code>Replaces</code>",
            "Cannot be co-installed / takes over another package's files",
            "Hard refusal at resolve time, usually two packages shipping the same path. <code>Replaces</code> is the escape hatch that lets them swap files across an upgrade."
          ],
          [
            "<code>Architecture</code>",
            "<code>amd64</code>, <code>all</code>, <code>i386</code>",
            "<code>all</code> is one file shared by every architecture; <code>Multi-Arch: same</code> allows it to be installed twice in parallel."
          ]
        ]
      },
      {
        type: "prose",
        h: "dpkg: the database and the state machine",
        p: [
          "dpkg keeps its state in one text file, <code>/var/lib/dpkg/status</code>, in the RFC822-ish stanza format you know from <code>/etc/passwd</code>, one stanza per package with a <code>Status:</code> field. Alongside it: <code>/var/lib/dpkg/info/&lt;pkg&gt;.list</code> with every file it owns, <code>&lt;pkg&gt;.md5sums</code>, <code>&lt;pkg&gt;.conffiles</code>, the scripts, and the lock. Because it is plain text you can read dpkg's mind without dpkg.",
          "The states are <code>not-installed</code>, <code>config-files</code>, <code>unpacked</code>, <code>half-configured</code> (postinst failed), <code>triggers-awaited</code>, <code>triggers-pending</code>, <code>ok installed</code> — the only healthy state — <code>half-installed</code>, <code>not-halved-installed</code>. A <code>hold</code> is not a state; it is a flag that makes the resolver refuse to move the package.",
          "Every transition runs scripts, and the scripts are where everything goes wrong. <code>preinst</code> before the files are unpacked, <code>postinst</code> after; <code>prerm</code> and <code>postrm</code> bracket removal. All four get <code>$1</code> as <code>install</code>, <code>upgrade</code>, <code>remove</code> or <code>deconfigure</code>. <strong>conffiles</strong> keeps upgrades from eating configuration: a listed file you have edited is not overwritten, and the maintainer's version arrives as <code>foo.dpkg-new</code>."
        ]
      },
      {
        type: "diagram",
        h: "The dpkg state machine, and the way back",
        caption: "dpkg does one transition at a time and records each in <code>/var/lib/dpkg/status</code>. A failure leaves you <code>half-configured</code>, which is recoverable precisely because the files are already on disk.",
        svg: `
<svg viewBox="0 0 1100 330" role="img" aria-label="The dpkg package state machine from not-installed through unpacked to ok installed, with a half-configured branch">
  <rect class="box" x="30" y="40" width="180" height="70" rx="10"/>
  <text x="120" y="80" text-anchor="middle" font-size="18">not-installed</text>

  <path class="ln-a" d="M210,75 L262,75" marker-end="url(#lm-arrow-accent)"/>
  <text class="t-xs" x="236" y="62" text-anchor="middle" font-size="14">unpack</text>

  <rect class="box" x="267" y="40" width="200" height="70" rx="10"/>
  <text x="367" y="72" text-anchor="middle" font-size="18">unpacked</text>
  <text class="t-sm" x="367" y="96" text-anchor="middle" font-size="15">files on disk</text>

  <path class="ln-a" d="M467,75 L520,75" marker-end="url(#lm-arrow-accent)"/>
  <text class="t-xs" x="496" y="30" text-anchor="middle" font-size="14">postinst</text>

  <rect class="box-ok" x="525" y="40" width="250" height="70" rx="10"/>
  <text class="t-ok" x="650" y="72" text-anchor="middle" font-size="18">ok installed</text>
  <text class="t-sm" x="650" y="96" text-anchor="middle" font-size="15">the only healthy state</text>

  <path class="ln" d="M775,75 L828,75" marker-end="url(#lm-arrow)"/>
  <text class="t-xs" x="801" y="62" text-anchor="middle" font-size="14">remove</text>

  <rect class="box" x="833" y="40" width="237" height="70" rx="10"/>
  <text x="951" y="72" text-anchor="middle" font-size="18">config-files</text>
  <text class="t-sm" x="951" y="96" text-anchor="middle" font-size="15">configs kept without purge</text>

  <path class="ln-w" d="M367,110 L367,158" marker-end="url(#lm-arrow-warn)"/>

  <rect class="box-w" x="247" y="163" width="240" height="70" rx="10"/>
  <text class="t-warn" x="367" y="195" text-anchor="middle" font-size="18">half-configured</text>
  <text class="t-sm" x="367" y="219" text-anchor="middle" font-size="15">postinst failed</text>

  <path class="ln-ok" d="M487,198 L560,198" marker-end="url(#lm-arrow-ok)"/>
  <text class="t-xs" x="523" y="186" text-anchor="middle" font-size="14">retry</text>

  <text class="t-dim" x="550" y="282" text-anchor="middle" font-size="15">dpkg --configure -a walks every half-configured package in dependency order</text>
</svg>`
      },
      {
        type: "prose",
        h: "What apt adds above dpkg",
        p: [
          "<code>apt-get install foo</code> does three jobs. It <strong>resolves</strong> — packages and versions satisfying every <code>Depends</code>, through its own solver over the indexes. It <strong>acquires</strong> — downloading the <code>.deb</code> files into <code>/var/cache/apt/archives/</code> after checking each SHA256 against the signed index. It <strong>installs</strong> — handing them to <code>dpkg</code>, the only component that touches disk.",
          "Because apt never modifies the filesystem itself, the failure modes are cleanly separated. A resolver failure prints <code>E: Unable to correct problems, you have held broken packages.</code> and changes nothing. A dpkg failure prints script output and leaves a half-configured package, which is why <code>dpkg -i git.deb</code> without <code>libcurl</code> is a footgun: dpkg resolves nothing, so it unpacks, runs the scripts and leaves <code>iU</code>. Recovery is <code>apt-get -f install</code>.",
          "The solver orders candidates by pin priority, then version. It does not know about ABI — that <code>libfoo.so.1</code> and <code>libfoo.so.2</code> are binary-incompatible — and it does not know that a <code>postinst</code> will fail. <strong>And it will never remove a package it did not install.</strong> Something you unpacked with a bare <code>dpkg -i</code> sits outside the index graph, so it is not an orphan: <code>autoremove</code> leaves it alone, which is why a hand-installed binary outlives three <code>full-upgrade</code>s with no owner."
        ]
      },
      {
        type: "diagram",
        h: "From a line in sources.list to a running service",
        caption: "Five separate programs with five separate caches. A wrong URL fails at the first stage, a bad key at the second, a hash mismatch at the download, a bad postinst at dpkg — and each stage is inspectable on its own.",
        svg: `
<svg viewBox="0 0 1100 350" role="img" aria-label="The apt pipeline from sources.list through a signed index and downloaded packages to dpkg and a running service">
  <rect class="box-a" x="30" y="40" width="160" height="90" rx="10"/>
  <text class="t-accent" x="110" y="76" text-anchor="middle" font-size="18">sources.list</text>
  <text class="t-sm" x="110" y="106" text-anchor="middle" font-size="15">bionic main</text>

  <path class="ln-a" d="M190,85 L228,85" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="233" y="40" width="160" height="90" rx="10"/>
  <text class="t-violet" x="313" y="76" text-anchor="middle" font-size="18">InRelease</text>
  <text class="t-sm" x="313" y="106" text-anchor="middle" font-size="15">signed, keyring</text>

  <path class="ln" d="M393,85 L431,85" marker-end="url(#lm-arrow)"/>

  <rect class="box-v" x="436" y="40" width="160" height="90" rx="10"/>
  <text class="t-violet" x="516" y="76" text-anchor="middle" font-size="18">Packages</text>
  <text class="t-sm" x="516" y="106" text-anchor="middle" font-size="15">the dependency graph</text>

  <path class="ln" d="M596,85 L634,85" marker-end="url(#lm-arrow)"/>

  <rect class="box" x="639" y="40" width="160" height="90" rx="10"/>
  <text x="719" y="76" text-anchor="middle" font-size="18">.deb files</text>
  <text class="t-sm" x="719" y="106" text-anchor="middle" font-size="15">SHA256 verified</text>

  <path class="ln-a" d="M799,85 L837,85" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-w" x="842" y="40" width="228" height="90" rx="10"/>
  <text class="t-warn" x="956" y="76" text-anchor="middle" font-size="18">dpkg</text>
  <text class="t-sm" x="956" y="106" text-anchor="middle" font-size="15">unpacks, runs scripts</text>

  <rect class="box" x="30" y="195" width="1040" height="70" rx="10"/>
  <text x="550" y="225" text-anchor="middle" font-size="18">a running service, and /var/lib/dpkg/status as the record</text>
  <text class="t-sm" x="550" y="251" text-anchor="middle" font-size="15">apt only resolves and downloads; dpkg is the only writer</text>

  <text class="t-bad" x="550" y="305" text-anchor="middle" font-size="15">a bad postinst stops at the last box and leaves half-configured</text>
</svg>`
      },
      {
        type: "code",
        lang: "bash",
        what: "The questions you actually have about an installed package",
        code:
`$ dpkg -l nginx | tail -1
ii  nginx  1.14.0-2ubuntu3.5  amd64  nginx web server
$ dpkg -S /usr/sbin/nginx
nginx: /usr/sbin/nginx
$ dpkg -V nginx
??5??????   /etc/nginx/sites-available/default
$ apt-cache policy nginx | sed -n '2,4p'
$ apt-mark showmanual; apt-get autoremove --dry-run
$ dpkg-deb -I nginx-core_*.deb | head -20`
      },
      {
        type: "prose",
        h: "Sources, suites, components and keyrings",
        p: [
          "A one-line source has four fields: <code>deb</code> (binary; <code>deb-src</code> for sources), the <strong>URI</strong>, the <strong>distribution</strong> — a suite or codename, not a URL path, so <code>bionic</code>, <code>bionic-updates</code> and <code>bionic-security</code> are three separate archives — and the <strong>components</strong>: <code>main</code>, <code>universe</code>, <code>restricted</code>, <code>multiverse</code> on Ubuntu, <code>main</code>/<code>contrib</code>/<code>non-free</code> on Debian.",
          "<code>main</code> is free software the distribution ships and supports. <code>universe</code> is free but community-maintained and not a security-update priority, which decides both whether a <code>-dev</code> package exists at all and whether a CVE gets patched. <code>bionic</code> always means 18.04; <code>bionic-backports</code> holds packages built against it but not installed by default.",
          "The keyring is the trust root and the only thing apt takes on faith. Since apt 1.1 — which 18.04 has — <strong>deb822</strong> works in <code>/etc/apt/sources.list.d/*.sources</code>, with named fields per line and a stanza carrying its own <code>Signed-By:</code> path. That is the correct way to trust a third-party repository: the key applies to one file and nothing else."
        ]
      },
      {
        type: "code",
        lang: "conf",
        what: "A sources.list that survives unattended-upgrades",
        code:
`deb http://archive.ubuntu.com/ubuntu/ bionic main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu/ bionic-updates main restricted universe multiverse
deb http://security.ubuntu.com/ubuntu bionic-security main restricted universe multiverse

# /etc/apt/sources.list.d/docker.sources  (deb822, apt 1.1+)
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: bionic
Components: stable
Architectures: amd64
Signed-By: /etc/apt/keyrings/docker.gpg
$ install -m 0755 -d /etc/apt/keyrings && curl -fsSL URL/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg`
      },
      {
        type: "diagram",
        h: "The chain of trust, link by link",
        caption: "One signature over the Release file, then arithmetic. That is why one 4096-bit RSA signature defeats a stolen mirror, a hostile CDN node or a MITM — and why losing the private key, or pinning the wrong one, is a real outage.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="A keyring verifying the InRelease file, whose SHA256 list then authenticates the downloaded package bytes">
  <rect class="box-v" x="30" y="50" width="200" height="90" rx="10"/>
  <text class="t-violet" x="130" y="88" text-anchor="middle" font-size="18">your keyring</text>
  <text class="t-sm" x="130" y="116" text-anchor="middle" font-size="15">a public key, nothing more</text>

  <path class="ln-a" d="M230,95 L272,95" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-a" x="277" y="50" width="240" height="90" rx="10"/>
  <text class="t-accent" x="397" y="88" text-anchor="middle" font-size="18">InRelease</text>
  <text class="t-sm" x="397" y="116" text-anchor="middle" font-size="15">the only signature step</text>

  <path class="ln" d="M517,95 L562,95" marker-end="url(#lm-arrow)"/>

  <rect class="box-v" x="567" y="50" width="240" height="90" rx="10"/>
  <text class="t-violet" x="687" y="88" text-anchor="middle" font-size="18">Packages SHA256</text>
  <text class="t-sm" x="687" y="116" text-anchor="middle" font-size="15">arithmetic from here on</text>

  <path class="ln" d="M807,95 L852,95" marker-end="url(#lm-arrow)"/>

  <rect class="box-ok" x="857" y="50" width="213" height="90" rx="10"/>
  <text class="t-ok" x="963" y="88" text-anchor="middle" font-size="18">the .deb bytes</text>
  <text class="t-sm" x="963" y="116" text-anchor="middle" font-size="15">match, or reject</text>

  <text class="t-dim" x="550" y="200" text-anchor="middle" font-size="15">Signed-By pins the keyring to one file</text>
  <text class="t-bad" x="550" y="228" text-anchor="middle" font-size="15">[trusted=yes] skips verification entirely and makes the chain decorative</text>
</svg>`
      },
      {
        type: "callout",
        kind: "warn",
        title: "What 'not signed' actually means",
        text: "It means apt could not verify the index with <em>any</em> key it holds, so it refuses to use the repository at all — not that it found a bad signature, but that it found none it trusts. The fix is to obtain the right key into a keyring <em>you</em> chose."
      },
      {
        type: "prose",
        h: "Pinning, priorities and holds",
        p: [
          "Apt picks a candidate per package by sorting versions by <strong>pin priority</strong>, then version; the default is 500. The numbers where behaviour changes qualitatively are the ones you put in <code>/etc/apt/preferences.d/*.pref</code>: above 1000 apt will even downgrade a working package to satisfy something else, 990 is the sane maximum, 100 never installs on its own but an explicit <code>apt install pkg/suite</code> takes it.",
          "A <strong>hold</strong> is the blunt instrument: <code>apt-mark hold nginx</code> pins the installed version at 1001, so nothing displaces it and apt refuses to remove it. It does not stop dependencies moving underneath — holding a library while everything else upgrades forward gives a machine where the held package works and nothing else does.",
          "A <strong>pin</strong> is the precise instrument, matching on package name, release (<code>release a=bionic-backports</code>) or an <code>origin</code>/<code>label</code>/<code>site</code> string from the Release file. The backports idiom is one file: match the suite, give it 100, and it never installs itself.",
          "<code>apt-get update</code> touches nothing — it re-downloads the signed indexes into <code>/var/lib/apt/lists/</code> and verifies them; <code>Valid-Until</code> is what makes apt say so instead of serving a three-month-old graph. <code>apt-get upgrade</code> installs new versions of installed packages and will <em>not</em> add or remove anything, ever; if upgrading A requires removing B it refuses and points at <code>full-upgrade</code>. <code>do-release-upgrade</code> is a different program for the suite change itself."
        ]
      },
      {
        type: "diagram",
        h: "Where upgrade stops and full-upgrade starts",
        caption: "The graph has one incompatibility: the new <code>libfoo</code> needs <code>libc6 &gt;= 2.30</code>, which conflicts with the pinned <code>legacy-agent</code>. <code>upgrade</code> says no by design; <code>full-upgrade</code> removes the legacy agent.",
        svg: `
<svg viewBox="0 0 1100 330" role="img" aria-label="apt-get upgrade refusing to remove a package while full-upgrade removes it">
  <text class="t-title" x="40" y="34" font-size="18">apt-get upgrade</text>
  <rect class="box" x="40" y="50" width="240" height="80" rx="10"/>
  <text x="160" y="84" text-anchor="middle" font-size="18">only installed packages</text>
  <text class="t-sm" x="160" y="110" text-anchor="middle" font-size="15">never adds, never removes</text>

  <rect class="box-w" x="40" y="155" width="240" height="80" rx="10"/>
  <text class="t-warn" x="160" y="189" text-anchor="middle" font-size="18">refuses, and points at</text>
  <text class="t-sm" x="160" y="215" text-anchor="middle" font-size="15">full-upgrade instead</text>

  <line class="ln dash" x1="320" y1="34" x2="320" y2="290" stroke-width="2"/>

  <text class="t-title" x="360" y="34" font-size="18">apt-get full-upgrade</text>
  <rect class="box-ok" x="360" y="50" width="240" height="80" rx="10"/>
  <text class="t-ok" x="480" y="84" text-anchor="middle" font-size="18">may add and remove</text>
  <text class="t-sm" x="480" y="110" text-anchor="middle" font-size="15">carries bionic to focal</text>

  <rect class="box" x="640" y="50" width="430" height="80" rx="10"/>
  <text x="658" y="84" font-size="17">new libfoo needs libc6 &gt;= 2.30</text>
  <text class="t-sm" x="658" y="110" font-size="15">which conflicts with pinned legacy-agent</text>

  <path class="ln-b" d="M600,90 L636,90" marker-end="url(#lm-arrow-bad)"/>

  <text class="t-bad" x="850" y="185" text-anchor="middle" font-size="15">full-upgrade removes something you may depend on</text>
  <text class="t-dim" x="850" y="215" text-anchor="middle" font-size="15">always read the removal list from apt-get -s first</text>
</svg>`
      },
      {
        type: "prose",
        h: "Why mixing Debian and Ubuntu repositories ruins a machine slowly",
        p: [
          "Adding a Debian repository to an Ubuntu system is not a version mismatch apt can catch. Ubuntu carries systematic patches to <code>libc6</code>, <code>libstdc++6</code>, <code>systemd</code> and <code>util-linux</code>, expressed only as a version suffix: <code>1:2.27-3ubuntu1.6</code> against Debian's <code>2.28-10</code>. The versions compare, every <code>Depends</code> is met, and what apt cannot see is that the two trees expect different struct layouts.",
          "It surfaces days later as <code>Segmentation fault</code> in a daemon that worked yesterday, <code>symbol lookup error</code> at <code>dlopen</code>, or <code>Bus error</code> — none pointing back at the repository you added. Meanwhile apt's state is self-consistent, so <code>apt-get -f install</code> reports success and changes nothing. Recovery is restoring the base image: you cannot enumerate which packages now hold foreign code."
        ]
      },
      {
        type: "diagram",
        h: "Where the Debian/Ubuntu mix actually breaks",
        caption: "Nothing errors at install time, which is exactly why the damage is not self-announcing. The libc and libstdc++ layer is load-bearing — every C and C++ binary on the box, including python3 and systemd, sits on it.",
        svg: `
<svg viewBox="0 0 1100 320" role="img" aria-label="A Debian repository added to Ubuntu satisfying dependencies on paper while producing a segmentation fault at run time">
  <rect class="box-v" x="30" y="40" width="240" height="80" rx="10"/>
  <text class="t-violet" x="150" y="74" text-anchor="middle" font-size="18">Debian repo added</text>
  <text class="t-sm" x="150" y="100" text-anchor="middle" font-size="15">apt resolves it happily</text>

  <path class="ln-a" d="M270,80 L315,80" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box" x="320" y="40" width="250" height="80" rx="10"/>
  <text x="445" y="74" text-anchor="middle" font-size="18">2.28-10 beats 1:2.27</text>
  <text class="t-sm" x="445" y="100" text-anchor="middle" font-size="15">every Depends is satisfied</text>

  <path class="ln" d="M570,80 L615,80" marker-end="url(#lm-arrow)"/>

  <rect class="box-b" x="620" y="40" width="250" height="80" rx="10"/>
  <text class="t-bad" x="745" y="74" text-anchor="middle" font-size="18">foreign libstdc++</text>
  <text class="t-sm" x="745" y="100" text-anchor="middle" font-size="15">different struct layouts</text>

  <path class="ln-b" d="M745,120 L745,175" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-b" x="560" y="180" width="310" height="80" rx="10"/>
  <text class="t-bad" x="715" y="214" text-anchor="middle" font-size="18">Segmentation fault</text>
  <text class="t-sm" x="715" y="240" text-anchor="middle" font-size="15">days later, pointing nowhere</text>

  <text class="t-dim" x="300" y="190" text-anchor="middle" font-size="15">apt-get -f install reports success</text>
  <text class="t-dim" x="300" y="218" text-anchor="middle" font-size="15">recovery is a new image</text>
</svg>`
      },
      {
        type: "table",
        cols: ["", "dpkg and apt", "rpm and dnf", "pacman and apk"],
        rows: [
          [
            "Database",
            "<code>/var/lib/dpkg/status</code>, one text file, with <code>/var/lib/dpkg/info/*.list</code> as the file index. <code>grep</code> is a legitimate query tool.",
            "<code>/var/lib/rpm/</code>, then <code>/usr/lib/sysimage/rpm</code> from Fedora 31. Binary — <code>rpm -qa --qf</code> is the only sane way in.",
            "A directory: <code>/var/lib/pacman/local/&lt;pkg&gt;/</code> with <code>desc</code> and <code>files</code>. Alpine's <code>apk</code> is the same idea with a resolver bolted on."
          ],
          [
            "Dependency solving",
            "apt's own versioned solver: alternatives, virtual packages, pinning.",
            "libsolv via dnf. Better at multilib and modular streams.",
            "<strong>None.</strong> Providers only, no version comparison — why Arch versions move in lockstep."
          ],
          [
            "Config files",
            "<code>conffiles</code>; unedited updated silently, edited become <code>.dpkg-new</code>.",
            "<code>%config(noreplace)</code>, same via <code>rpmdiff</code>.",
            "<code>foo.conf.pacnew</code> alongside yours, if you edited it. No merging, ever."
          ],
          [
            "Rollback",
            "None. <code>/var/backups</code> keeps a few days of pre-upgrade binaries.",
            "<strong><code>dnf history undo &lt;id&gt;</code></strong> — the only mainstream rollback; the rpmdb is content-addressed.",
            "None, cache wiped on upgrade. <strong>Partial upgrades explicitly unsupported.</strong>"
          ]
        ]
      },
      {
        type: "prose",
        h: "Snap, Flatpak, Nix: three answers to 'the package broke'",
        p: [
          "All three exist because one shared <code>/usr</code> means one library version per machine and any upgrade is machine-wide. They differ in what they make immutable. <strong>Snap</strong> makes the <em>application</em> immutable — a squashfs per revision loop-mounted from <code>/var/lib/snapd/snaps/</code>, confined by AppArmor, seccomp and an interface list — and pays in disk plus background refreshes you do not control.",
          "<strong>Flatpak</strong> makes the app <em>and its runtime</em> immutable, and is the only one using namespaces as the primitive: bubblewrap builds mount and PID namespaces, then <code>pivot_root</code>s into an OSTree checkout in <code>/var/lib/flatpak</code>. It pays in duplication. <strong>Nix</strong> inverts the model: nothing is ever overwritten, every build produces a content-addressed <code>/nix/store/&lt;hash&gt;-name-version</code>, and switching profiles is a symlink swap — install, upgrade and rollback are one operation."
        ]
      },
      {
        type: "diagram",
        h: "Where each model puts the files",
        caption: "The FHS split between <code>/usr</code> (the operating system) and <code>/var</code> (the state) is what makes a traditional upgrade a machine-wide event. Every immutable model answers it by refusing to share a writable location at all.",
        svg: `
<svg viewBox="0 0 1100 320" role="img" aria-label="Four packaging models compared by where they place files: dpkg, snap, flatpak and nix">
  <rect class="box" x="30" y="40" width="240" height="80" rx="10"/>
  <text x="150" y="74" text-anchor="middle" font-size="18">dpkg and rpm</text>
  <text class="t-sm" x="150" y="100" text-anchor="middle" font-size="15">one writable /usr</text>

  <rect class="box-v" x="300" y="40" width="240" height="80" rx="10"/>
  <text class="t-violet" x="420" y="74" text-anchor="middle" font-size="18">snap</text>
  <text class="t-sm" x="420" y="100" text-anchor="middle" font-size="15">squashfs per revision</text>

  <rect class="box-v" x="570" y="40" width="240" height="80" rx="10"/>
  <text class="t-violet" x="690" y="74" text-anchor="middle" font-size="18">flatpak</text>
  <text class="t-sm" x="690" y="100" text-anchor="middle" font-size="15">OSTree, own runtime</text>

  <rect class="box-ok" x="840" y="40" width="230" height="80" rx="10"/>
  <text class="t-ok" x="955" y="74" text-anchor="middle" font-size="18">nix</text>
  <text class="t-sm" x="955" y="100" text-anchor="middle" font-size="15">content-addressed store</text>

  <path class="ln" d="M150,120 L150,170" marker-end="url(#lm-arrow)"/>
  <path class="ln" d="M420,120 L420,170" marker-end="url(#lm-arrow)"/>
  <path class="ln" d="M690,120 L690,170" marker-end="url(#lm-arrow)"/>
  <path class="ln-a" d="M955,120 L955,170" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box" x="30" y="175" width="240" height="62" rx="10"/>
  <text class="t-sm" x="150" y="212" text-anchor="middle" font-size="15">an upgrade is machine-wide</text>

  <rect class="box" x="300" y="175" width="510" height="62" rx="10"/>
  <text class="t-sm" x="555" y="212" text-anchor="middle" font-size="15">namespaces; one copy per runtime version</text>

  <rect class="box-ok" x="840" y="175" width="230" height="62" rx="10"/>
  <text class="t-sm" x="955" y="212" text-anchor="middle" font-size="15">profile swap = rollback</text>

  <text class="t-dim" x="550" y="290" text-anchor="middle" font-size="15">every model pays in disk — on 19 GB that decides the answer</text>
</svg>`
      },
      {
        type: "code",
        lang: "bash",
        what: "The maintenance cycle, and the two questions that make it safe",
        code:
`$ sudo apt-get update && apt-get -s full-upgrade | grep -E '^(Remv|Inst)'
$ sudo apt-get full-upgrade && sudo apt-get autoremove --dry-run
$ apt-mark showhold; test -f /var/run/reboot-required && cat /var/run/reboot-required.pkgs
$ sudo apt-get install nginx=1.14.0-2ubuntu3.5 && sudo apt-mark hold nginx`
      },
      {
        type: "callout",
        kind: "warn",
        title: "The rule that prevents most package incidents",
        text: "Never run a package command on a production host as a reflex. Run <code>apt-get -s</code> first and read two lines: what will be <strong>REMOVED</strong>, and whether any of it owns files you did not know about."
      },
      {
        type: "kv",
        items: [
          {
            k: "deb vs deb-src",
            v: "Binary packages versus source. Only <code>deb-src</code> lines give you <code>apt-get source</code>; commented out on Ubuntu for bandwidth."
          },
          {
            k: "conffiles",
            v: "The paths dpkg will not overwrite. An edited one arrives as <code>.dpkg-new</code> — evidence of drift you have not merged."
          },
          {
            k: "ok installed",
            v: "The only fully healthy dpkg state. Anything else has a letter in the second column of <code>dpkg -l</code> telling you where it stopped."
          },
          {
            k: "full-upgrade",
            v: "May install and remove to satisfy the graph. The current name for what apt 1.1 called <code>dist-upgrade</code>."
          },
          {
            k: "autoremove",
            v: "Removes packages installed only as dependencies. Always simulate: it deletes what nobody remembered installing."
          }
        ]
      }
    ],
    takeaways: [
      "A .deb is an <code>ar</code> archive of a version stamp, a metadata tarball and a data tarball. Everything intelligent is in the control member and the scripts.",
      "apt resolves and downloads, dpkg installs. Every confusing message belongs to one of the two — and apt will never remove a package it did not install, so a hand-<code>dpkg -i</code>'d package survives every upgrade.",
      "dpkg's state machine is plain text in <code>/var/lib/dpkg/status</code>. <code>ok installed</code> is the only good state, and <code>dpkg --configure -a</code> is the universal repair for everything else.",
      "The trust chain is one signature over the Release file, then arithmetic. The keyring is the only thing taken on faith, which is why <code>Signed-By</code> matters and <code>[trusted=yes]</code> does not.",
      "Mixing Debian and Ubuntu repositories produces a machine apt calls correct and that segfaults. Recovery is a new image, because you cannot enumerate which packages now hold foreign code."
    ],
    glossary: {
      deb: "A binary Debian package: an <code>ar</code> archive of <code>debian-binary</code>, <code>control.tar</code> and <code>data.tar</code>, in that order.",
      conffiles: "Paths dpkg will not overwrite during an upgrade. An edited one is preserved and the new one arrives as <code>.dpkg-new</code>.",
      "ok installed": "The dpkg state meaning unpacked, configured and triggers fired. The only fully healthy state.",
      hold: "A per-package flag stored as a pin priority of 1001, making apt refuse both upgrades and removal.",
      InRelease: "An inline clear-signed Release file carrying the SHA256 of every index file in the suite.",
      deb822: "The multi-line sources format in <code>/etc/apt/sources.list.d/*.sources</code>, which can carry its own <code>Signed-By</code>. Since apt 1.1.",
      pin: "A numeric priority in <code>/etc/apt/preferences.d/*.pref</code> deciding which candidate version apt offers."
    }
  });
})();