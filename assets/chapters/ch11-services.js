/* ch11 — Services: units, daemons and what they serve — SIMPLIFIED EDITION
   Prose 4483 -> ~1650. Code 1649 -> ~125.
   All 8 diagrams redrawn simple: viewBox height 260-330 (was 500-660),
   3-6 boxes each (was 10-19), labels of 2-5 words, <=12 text nodes. */
(function () {
  LX.push({
    id: "services",
    title: "Services: units, daemons and what they serve",
    tagline: "A service is three things that can disagree — a unit, a config, and the supervision contract between them. Check all three before changing anything.",
    sections: [
      {
        type: "prose",
        h: "The shape of a network service",
        p: [
          "On a systemd box a service is not one thing. It is a <strong>supervisor relationship</strong> between three parties that each fail independently: systemd owns the unit definition and the lifecycle, the master process owns the listening socket and the worker pool, and the workers own the request handling. Knowing which of the three has stopped is most of the work in any incident.",
          "The master exists to avoid dropping connections: it owns the listening socket, so no client is refused during a restart, and it owns the worker lifecycle, so new workers come up before old ones retire. <strong>systemd tracks one main PID but treats the whole cgroup as the unit</strong> — which is why <code>kill -9</code> on one worker is harmless and <code>kill -9</code> on the master is an outage.",
          "On this box that cgroup is <strong>v1</strong>: separate trees under <code>/sys/fs/cgroup/memory</code> and <code>/sys/fs/cgroup/pids</code>, with <code>MemoryLimitInBytes</code> and <code>PidsLimit</code>. On v2 the same unit has one directory with <code>memory.max</code> and <code>pids.max</code>. The unit file does not change; only the plumbing underneath does."
        ]
      },
      {
        type: "diagram",
        h: "systemd, the master, and the workers",
        caption: "The shape nginx, named and almost every daemonised service have on Linux. Workers are the same binary and interchangeable — they hold no state that survives their death, and each one owns its connections for life, which is why they never lock with each other.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="systemd unit supervising an nginx master which forks identical workers">
  <rect class="box-p" x="300" y="24" width="500" height="70" rx="10"/>
  <text class="t-bad" x="550" y="54" text-anchor="middle" font-size="17">systemd unit</text>
  <text class="t-sm" x="550" y="80" text-anchor="middle">lifecycle, restart count, whole cgroup</text>

  <path class="ln-a" d="M550,94 L550,126" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-w" x="350" y="130" width="400" height="70" rx="10"/>
  <text class="t-warn" x="550" y="160" text-anchor="middle" font-size="17">master, nginx 1.14</text>
  <text class="t-sm" x="550" y="186" text-anchor="middle">owns the listening socket</text>

  <path class="ln-a" d="M550,200 L240,232" marker-end="url(#lm-arrow-accent)"/>
  <path class="ln-a" d="M550,200 L860,232" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-a" x="130" y="236" width="220" height="52" rx="10"/>
  <text class="t-accent" x="240" y="268" text-anchor="middle" font-size="17">workers, 2 of them</text>

  <rect class="box-a" x="750" y="236" width="220" height="52" rx="10"/>
  <text class="t-accent" x="860" y="268" text-anchor="middle" font-size="17">kill -9 is harmless</text>
</svg>`
      },
      {
        type: "prose",
        h: "Reload, restart, and the difference you will be judged on",
        p: [
          "A <strong>reload</strong> asks a running process to re-read its configuration without losing state: the master keeps the listening sockets, brings up new workers on the new config, and lets the old ones drain. No connection is refused, no TLS session is broken, no in-flight request fails. A <strong>restart</strong> closes and reopens the listening socket, and anything that connects in that window is refused, because nothing holds the port.",
          "Every daemon draws that line differently. <code>nginx -s reload</code> is a genuine zero-downtime reload. <code>systemctl reload sshd</code> re-execs the listener while existing sessions continue untouched, because sshd forks a child per connection. <code>rndc reload</code> makes named re-read its zones, and a query in progress completes against the tree it started with.",
          "The sequence that should be muscle memory: <code>nginx -t</code> first, every time. A reload with a broken config is rejected, not applied — the master logs the error and keeps the old one, which is why you will not notice until the next real deploy."
        ]
      },
      {
        type: "diagram",
        h: "Three ways of changing a daemon's mind",
        caption: "Reload keeps the listening socket and the in-memory state, so nothing in flight fails. Restart closes and reopens the port, and anything arriving in the gap is refused. A daemon that re-reads a certificate path per connection needs neither — the third option is the one people forget exists.",
        svg: `
<svg viewBox="0 0 1100 290" role="img" aria-label="Reload, restart and per-connection handover compared side by side">
  <text class="t-title" x="190" y="32" text-anchor="middle">RELOAD</text>
  <text class="t-title" x="550" y="32" text-anchor="middle">RESTART</text>
  <text class="t-title" x="910" y="32" text-anchor="middle">PER-REQUEST</text>

  <rect class="box-ok" x="40" y="52" width="300" height="66" rx="10"/>
  <text class="t-ok" x="190" y="92" text-anchor="middle" font-size="17">socket stays open</text>

  <rect class="box-b" x="400" y="52" width="300" height="66" rx="10"/>
  <text class="t-bad" x="550" y="92" text-anchor="middle" font-size="17">socket is closed</text>

  <rect class="box-v" x="760" y="52" width="300" height="66" rx="10"/>
  <text class="t-violet" x="910" y="92" text-anchor="middle" font-size="17">nothing to restart</text>

  <rect class="box-ok" x="40" y="142" width="300" height="66" rx="10"/>
  <text class="t-ok" x="190" y="182" text-anchor="middle" font-size="17">nothing in flight fails</text>

  <rect class="box-b" x="400" y="142" width="300" height="66" rx="10"/>
  <text class="t-bad" x="550" y="182" text-anchor="middle" font-size="17">arrivals are refused</text>

  <rect class="box-v" x="760" y="142" width="300" height="66" rx="10"/>
  <text class="t-violet" x="910" y="182" text-anchor="middle" font-size="17">cert re-read per conn</text>
</svg>`
      },
      {
        type: "prose",
        h: "Socket activation: accepting connections before the service exists",
        p: [
          "The interesting part of <code>ListenStream=</code> is that systemd does not start the service earlier. It <strong>creates, binds and listens on the socket itself</strong> at boot and holds it open. The service starts only when something connects, and inherits the listener as file descriptor 3 — it never calls <code>bind()</code> or <code>listen()</code> at all.",
          "That ordering is the point. With <code>sshd.socket</code> enabled and <code>sshd.service</code> stopped, the machine is still reachable on port 22: the kernel has a queue with a full backlog and packets are accepted into it before sshd has existed. The first connection starts sshd, which inherits the queue — no window exists in which a connection is refused. On a 2&nbsp;GB VPS it also means an idle machine runs no memory-resident sshd or nginx at all.",
          "<code>Accept=no</code> (the default) means systemd performs the <code>accept()</code> and hands each connected socket to a fresh instance; <code>Accept=yes</code> hands over the listening socket and lets the service accept for itself, which is what any master/worker daemon wants. <code>MaxConnections=</code> bounds concurrent instances, and hitting it refuses rather than queues. So <code>systemctl status sshd</code> reading <em>inactive</em> is not evidence that SSH is down."
        ]
      },
      {
        type: "diagram",
        h: "Socket activation, step by step",
        caption: "systemd owns the port before the service exists, so the queue is the kernel's and there is no refused-connection window. With <code>Accept=no</code> each arriving connection becomes a fresh instance; with <code>Accept=yes</code> the service inherits the listener and runs its own accept loop, which is what a master/worker daemon needs.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="Socket activation: systemd binds the socket at boot and the service starts on first connection">
  <rect class="box-p" x="30" y="50" width="240" height="80" rx="10"/>
  <text class="t-bad" x="150" y="84" text-anchor="middle" font-size="17">boot</text>
  <text class="t-sm" x="150" y="112" text-anchor="middle">sshd.socket binds :22</text>

  <path class="ln-a" d="M270,90 L326,90" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-w" x="330" y="50" width="250" height="80" rx="10"/>
  <text class="t-warn" x="455" y="84" text-anchor="middle" font-size="17">socket queued</text>
  <text class="t-sm" x="455" y="112" text-anchor="middle">kernel backlog, no daemon</text>

  <path class="ln-ok" d="M580,90 L636,90" marker-end="url(#lm-arrow-ok)"/>

  <rect class="box-ok" x="640" y="50" width="230" height="80" rx="10"/>
  <text class="t-ok" x="755" y="84" text-anchor="middle" font-size="17">first connection</text>
  <text class="t-sm" x="755" y="112" text-anchor="middle">accepted, never refused</text>

  <path class="ln-a" d="M755,130 L755,168" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-a" x="640" y="172" width="230" height="80" rx="10"/>
  <text class="t-accent" x="755" y="206" text-anchor="middle" font-size="17">sshd starts</text>
  <text class="t-sm" x="755" y="234" text-anchor="middle">inherits the listener</text>

  <text class="t-dim" x="330" y="200" font-size="15">status: inactive</text>
  <text class="t-dim" x="330" y="226" font-size="15">does not mean SSH is down</text>
</svg>`
      },
      {
        type: "prose",
        h: "Logging: three destinations and only one of them rotates",
        p: [
          "systemd captures the stdout and stderr of every service it starts into the journal. A daemon writing to <code>/var/log/whatever.log</code> is doing something older. Here nginx does both: the unit has <code>StandardError=journal</code> for start-up failures, while <code>access_log</code> and <code>error_log</code> send per-request detail to files. The split is deliberate — the journal is queryable by unit, and per-request volume belongs in a file logrotate owns.",
          "The journal is binary, indexed, size-bounded and it <strong>rate-limits</strong>: <code>RateLimitIntervalSec=30s</code> and <code>RateLimitBurst=10000</code> per service, so a program writing 10,000 lines in a second gets the burst and then has messages dropped, with one <code>Suppressed N messages from …</code> line to tell you.",
          "Where it lives depends on <code>Storage=</code>: <code>auto</code> writes to disk only if <code>/var/log/journal/</code> exists and otherwise keeps logs in RAM where <strong>they are gone on reboot</strong>. This box caps it at <code>SystemMaxUse=300M</code>, vacuum manually with <code>journalctl --vacuum-size=200M</code>, and check with <code>journalctl --disk-usage</code> rather than <code>lsblk</code>."
        ]
      },
      {
        type: "diagram",
        h: "Where each byte of a log line ends up",
        caption: "Three destinations with three different lifecycles. The journal is bounded, rate-limited, and disappears on reboot if it was never made persistent. Files under <code>/var/log</code> are unbounded until logrotate touches them. Forwarding to a remote collector is the only path that survives a destroyed disk.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="A log line going to the journal, to a file under var log, or to a remote collector">
  <rect class="box-a" x="30" y="110" width="210" height="80" rx="10"/>
  <text class="t-accent" x="135" y="144" text-anchor="middle" font-size="17">a log line</text>
  <text class="t-sm" x="135" y="172" text-anchor="middle">stdout or stderr</text>

  <path class="ln-a" d="M240,150 L296,66" marker-end="url(#lm-arrow-accent)"/>
  <path class="ln-a" d="M240,150 L296,150" marker-end="url(#lm-arrow-accent)"/>
  <path class="ln-a" d="M240,150 L296,234" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="300" y="28" width="280" height="76" rx="10"/>
  <text class="t-violet" x="440" y="60" text-anchor="middle" font-size="17">journald</text>
  <text class="t-sm" x="440" y="88" text-anchor="middle">capped at 300M</text>

  <rect class="box-w" x="300" y="112" width="280" height="76" rx="10"/>
  <text class="t-warn" x="440" y="144" text-anchor="middle" font-size="17">files in /var/log</text>
  <text class="t-sm" x="440" y="172" text-anchor="middle">logrotate owns these</text>

  <rect class="box-p" x="300" y="196" width="280" height="76" rx="10"/>
  <text class="t-bad" x="440" y="228" text-anchor="middle" font-size="17">remote collector</text>
  <text class="t-sm" x="440" y="256" text-anchor="middle">survives a dead disk</text>

  <rect class="box-b" x="650" y="112" width="420" height="76" rx="10"/>
  <text class="t-bad" x="860" y="144" text-anchor="middle" font-size="17">RAM only means gone on reboot</text>
  <text class="t-sm" x="860" y="172" text-anchor="middle">Storage=auto with no /var/log/journal</text>
</svg>`
      },
      {
        type: "prose",
        h: "Hardening: what systemd can and cannot lock away",
        p: [
          "Every sandboxing directive removes something the service does not need — a mount namespace that makes a path read-only, a capability bounding set, a seccomp filter. None are magic; all are <em>restrictions</em>, and every restriction has a daemon that legitimately needed what you just removed.",
          "The warning that matters more than any table: <strong><code>ProtectSystem=strict</code> makes the entire filesystem read-only except <code>/dev</code>, <code>/proc</code> and <code>/sys</code></strong>. Any daemon writing a PID file, a cache or a file log outside the journal fails at startup with <code>EROFS</code> — and for a <code>Type=forking</code> daemon that failure is silent at systemd level, because the process dies during its own initialisation. Pair it with <code>ReadWritePaths=</code> for the directories the service owns and <code>RuntimeDirectory=</code>, which has systemd create a writable <code>/run/&lt;name&gt;</code> with the right ownership.",
          "Do the arithmetic before <code>MemoryMax=</code>: it maps to <code>memory.limit_in_bytes</code> on v1 and <code>memory.max</code> on v2, and at the limit the kernel OOM-kills something <em>inside the cgroup</em>."
        ],
        noteKind: "tip",
        noteTitle: "Verify the sandbox the cheap way",
        note: "<code>systemd-analyze security nginx.service</code> scores a unit without restarting anything. Start with the denylist form of <code>SystemCallFilter=</code>, which cannot surprise you with a syscall you did not think of."
      },
      {
        type: "diagram",
        h: "What a hardened unit actually gets you",
        caption: "The sandbox is built out of ordinary kernel mechanisms, each subtracted from what the process can reach. The service does not notice any of it, which is exactly why a wrong directive produces a startup failure rather than a warning.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="A hardened unit losing filesystem, capability and syscall access while keeping the listener">
  <rect class="box-b" x="30" y="50" width="230" height="80" rx="10"/>
  <text class="t-bad" x="145" y="84" text-anchor="middle" font-size="17">ProtectSystem=strict</text>
  <text class="t-sm" x="145" y="112" text-anchor="middle">writes fail with EROFS</text>

  <rect class="box-b" x="30" y="160" width="230" height="80" rx="10"/>
  <text class="t-bad" x="145" y="194" text-anchor="middle" font-size="17">CapabilityBoundingSet</text>
  <text class="t-sm" x="145" y="222" text-anchor="middle">needs NET_BIND_SERVICE</text>

  <rect class="box-p" x="330" y="50" width="250" height="80" rx="10"/>
  <text class="t-bad" x="455" y="84" text-anchor="middle" font-size="17">SystemCallFilter</text>
  <text class="t-sm" x="455" y="112" text-anchor="middle">seccomp, EPERM on a miss</text>

  <rect class="box-p" x="330" y="160" width="250" height="80" rx="10"/>
  <text class="t-bad" x="455" y="194" text-anchor="middle" font-size="17">NoNewPrivileges</text>
  <text class="t-sm" x="455" y="222" text-anchor="middle">no setuid escalation</text>

  <path class="ln-ok" d="M580,145 L646,145" marker-end="url(#lm-arrow-ok)"/>

  <rect class="box-ok" x="650" y="105" width="420" height="80" rx="10"/>
  <text class="t-ok" x="860" y="139" text-anchor="middle" font-size="17">the listener still works</text>
  <text class="t-sm" x="860" y="167" text-anchor="middle">or it will not start</text>
</svg>`
      },
      {
        type: "prose",
        h: "nginx: the model and the arithmetic",
        p: [
          "This box runs nginx 1.14 serving four static sites out of <code>/var/www/html</code>, published by <code>rsync</code> from local git repos. Each worker has its own <code>epoll</code> set and never locks with another, because a connection belongs to exactly one worker for its whole life. The master serves nothing — it reads config, forks, reaps, and on <code>SIGHUP</code> spawns a fresh set and lets the old one drain.",
          "<code>worker_processes auto</code> means one worker per core, so two here. <code>worker_connections 1024</code> is the number of simultaneous connections that worker can hold, and — this is the part that gets missed — <strong>that includes connections to upstream backends</strong>. A reverse proxy serving 600 client requests that each hold a backend connection is using 1200, so processes × connections is a ceiling, not a target.",
          "What <em>is</em> worth tuning is <code>worker_rlimit_nofile</code>, and it is strictly a ceiling rather than a grant — nginx cannot raise <code>RLIMIT_NOFILE</code> above the hard limit it inherited, which is why a too-low <code>LimitNOFILE</code> produces <code>open() failed (24: Too many open files)</code> no matter what nginx is told."
        ]
      },
      {
        type: "diagram",
        h: "Anatomy of a real server block",
        caption: "A static site on this box. The distinction worth internalising is <b>root</b> (the path is appended to the location prefix) versus <b>alias</b> (the prefix is replaced) — the same URI produces two different files depending on which you used and whether a trailing slash is present. <code>rsync</code> writes the files; nginx only reads them.",
        svg: `
<svg viewBox="0 0 1100 320" role="img" aria-label="Server block resolving a request through try_files into the web root on disk">
  <rect class="box-a" x="30" y="50" width="220" height="80" rx="10"/>
  <text class="t-accent" x="140" y="84" text-anchor="middle" font-size="17">GET /</text>
  <text class="t-sm" x="140" y="112" text-anchor="middle">on :443</text>

  <path class="ln-a" d="M250,90 L306,90" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-p" x="310" y="50" width="250" height="80" rx="10"/>
  <text class="t-bad" x="435" y="84" text-anchor="middle" font-size="17">try_files</text>
  <text class="t-sm" x="435" y="112" text-anchor="middle">then index.html, then 404</text>

  <path class="ln-a" d="M560,90 L616,90" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-w" x="620" y="50" width="250" height="80" rx="10"/>
  <text class="t-warn" x="745" y="84" text-anchor="middle" font-size="17">root /var/www/html</text>
  <text class="t-sm" x="745" y="112" text-anchor="middle">four sites live here</text>

  <path class="ln-a" d="M745,130 L745,176" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box" x="620" y="180" width="450" height="70" rx="10"/>
  <text x="845" y="212" text-anchor="middle" font-size="17">on disk, written by rsync</text>
  <text class="t-sm" x="845" y="238" text-anchor="middle">from local git repos</text>

  <text class="t-dim" x="140" y="200" font-size="15">root appends</text>
  <text class="t-dim" x="140" y="226" font-size="15">alias replaces</text>
</svg>`
      },
      {
        type: "code",
        lang: "nginx",
        what: "The four lines that matter, and how certbot renews",
        code:
`listen 443 ssl http2;
ssl_certificate     /etc/letsencrypt/live/alexandrugris.ro/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/alexandrugris.ro/privkey.pem;
try_files $uri $uri/ /index.html =404;

# a reverse proxy terminates TLS and counts against worker_connections twice
proxy_pass http://127.0.0.1:3000;   # backend sees 127.0.0.1 without this
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header Host $host;

# certbot renews from a systemd timer, twice a day
certbot renew --dry-run        # exercises staging, incl. the real network path
systemctl list-timers | grep certbot
nginx -t && systemctl reload nginx   # renew does NOT reload the running nginx

# the verbs that answer a question, in order
systemctl status nginx
systemctl reload nginx        # keeps the listening socket
systemctl restart nginx       # closes and reopens it
journalctl -u nginx -b -n 50 --no-pager
journalctl --disk-usage ; journalctl --vacuum-size=200M`
      },
      {
        type: "prose",
        h: "TLS and the reverse proxy, precisely",
        p: [
          "Certbot renews from a systemd timer, twice a day, running <code>certbot renew</code>. It writes a new file and repoints the symlink in <code>/etc/letsencrypt/live/&lt;domain&gt;/</code> — it does not reload nginx, which keeps the old certificate in memory until <code>systemctl reload nginx</code>. <code>certbot renew --dry-run</code> exercises the whole path against staging, and is the check to run when a renewal is silently failing.",
          "A reverse proxy changes three things and leaves everything else alone. It <strong>terminates TLS</strong>, so the certificate lives on the proxy and the backend speaks plain HTTP on loopback. It is the <strong>client's address</strong>, so the backend sees <code>127.0.0.1</code> unless you read <code>X-Forwarded-For</code> — a real bug source in any access log. And it uses <code>worker_connections</code> twice: client and upstream.",
          "What it does <em>not</em> change: the source IP reputation your firewall sees, the fact that the backend port is now reachable by anything that can reach the proxy, and anything the backend does after the response. A proxy is not a firewall."
        ]
      },
      {
        type: "prose",
        h: "BIND: configure once, then leave it alone",
        p: [
          "Chapter 10 covers the protocol and the zone file. Operationally an authoritative-only BIND is close to the ideal systemd service: it forks into the background, writes <code>/run/named/named.pid</code>, and answers from memory in microseconds.",
          "First, <strong>BIND on Debian and Ubuntu does not log to journald by default</strong> — it logs through syslog, so <code>journalctl -u named</code> shows only systemd's view of the lifecycle. To get named's own logging, especially the <code>security</code> category which records refused updates and zone transfers, run it with <code>-g</code>. Second, <code>rndc</code> listens on TCP 953 with the key from <code>/etc/bind/rndc.key</code>, and the Debian default allows only localhost — so <code>rndc status</code> from another machine fails with a refusal that looks like a firewall problem. Run it locally first in any DNS incident.",
          "On views: split-horizon is useful, but a view is a second parallel copy of the zone tree with its own file and serial, each needing its own signing, and a client matching no view gets REFUSED for everything. On a single-purpose nameserver, do not use views without a specific reason."
        ]
      },
      {
        type: "diagram",
        h: "BIND in service: the query path and the secondaries loop",
        caption: "Queries are answered from the in-memory zone, never from disk. The two loops that keep secondaries current are NOTIFY from the primary when the serial changes, and SOA refresh polling as the fallback — neither is a DNS query in the recursion sense, and neither is covered by an A record.",
        svg: `
<svg viewBox="0 0 1100 320" role="img" aria-label="BIND answering from memory while NOTIFY and SOA refresh keep the secondary current">
  <rect class="box-a" x="30" y="50" width="200" height="80" rx="10"/>
  <text class="t-accent" x="130" y="84" text-anchor="middle" font-size="17">a resolver</text>
  <text class="t-sm" x="130" y="112" text-anchor="middle">any A or AAAA</text>

  <path class="ln-a" d="M230,90 L286,90" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-p" x="290" y="50" width="250" height="80" rx="10"/>
  <text class="t-bad" x="415" y="84" text-anchor="middle" font-size="17">named, in memory</text>
  <text class="t-sm" x="415" y="112" text-anchor="middle">BIND 9.11.3, no disk read</text>

  <path class="ln-ok" d="M540,90 L596,90" marker-end="url(#lm-arrow-ok)"/>

  <rect class="box-ok" x="600" y="50" width="200" height="80" rx="10"/>
  <text class="t-ok" x="700" y="84" text-anchor="middle" font-size="17">answer</text>
  <text class="t-sm" x="700" y="112" text-anchor="middle">AA=1, RA=0</text>

  <rect class="box-b" x="830" y="50" width="240" height="80" rx="10"/>
  <text class="t-bad" x="950" y="84" text-anchor="middle" font-size="17">rndc reload</text>
  <text class="t-sm" x="950" y="112" text-anchor="middle">port 953, localhost only</text>

  <path class="ln-w" d="M415,130 L415,206" marker-end="url(#lm-arrow-warn)"/>

  <rect class="box-w" x="290" y="210" width="510" height="80" rx="10"/>
  <text class="t-warn" x="545" y="244" text-anchor="middle" font-size="17">NOTIFY and SOA refresh</text>
  <text class="t-sm" x="545" y="272" text-anchor="middle">serial change pulls the secondary</text>

  <text class="t-bad" x="900" y="244" font-size="15">a dynamic address</text>
  <text class="t-bad" x="900" y="270" font-size="15">means a zone that</text>
  <text class="t-bad" x="900" y="296" font-size="15">never updates</text>
</svg>`
      },
      {
        type: "prose",
        h: "sshd: the configuration you think you wrote is not the configuration",
        p: [
          "<code>sshd -T</code> prints the <strong>effective</strong> configuration — every keyword after defaults, includes and <code>Match</code> evaluation resolved — for the user you name. <code>sshd -T -C user=alice,addr=203.0.113.5,host=x,laddr=10.0.0.4,lport=22</code> evaluates the match blocks for a hypothetical connection, which is the only reliable way to know what a given user gets. A commented line is not an inactive setting; it is a setting whose value is whatever the binary was compiled with.",
          "That distinction is where the security surprises live. On OpenSSH 7.6, which is what Ubuntu 18.04 ships, <code>MaxAuthTries</code> defaults to 6, <code>MaxStartups</code> is <code>10:30:100</code>, and <code>PermitRootLogin</code> compiles to <code>prohibit-password</code> — a change made in OpenSSH 7.0 that Ubuntu's config leaves commented out. The trap everyone walks into: <code>PasswordAuthentication no</code> alone does <strong>not</strong> disable password authentication, because with <code>UsePAM yes</code> <code>keyboard-interactive</code> is still offered and PAM will authenticate through it. Both must be off.",
          "The structural rule that catches everyone: <strong>for most keywords the first obtained value wins</strong>, and <code>Match</code> blocks are evaluated after the global section. So <code>Match User deploy</code> with <code>AllowTcpForwarding no</code> works, while the same block with <code>PasswordAuthentication no</code> does nothing if the global section already set it. <code>AllowUsers</code>, <code>AllowGroups</code> and <code>AuthorizedKeysFile</code> accumulate instead of overriding.",
          "The strongest control here is not a keyword. sshd is bound to the Tailscale address only, ufw allows 22/tcp only from <code>100.64.0.0/10</code> and the LAN, and the password path is off — three independent layers, because a firewall rule can be rewritten by a package install while a listening socket cannot be forgotten. <code>ClientAliveInterval</code> 300 with <code>ClientAliveCountMax 2</code> reaps dead sessions in about ten minutes."
        ]
      },
      {
        type: "diagram",
        h: "sshd: from SYN to a shell",
        caption: "The order is the point: the firewall sees the packet before sshd exists, sshd's own <code>AllowUsers</code> check happens after the TCP handshake and the protocol banner, and a <code>Match</code> block cannot override a global keyword because the first obtained value wins. Three independent layers, each with a different failure mode.",
        svg: `
<svg viewBox="0 0 1100 320" role="img" aria-label="sshd connection passing the listening address, firewall, password authentication and Match policy before the shell">
  <rect class="box-b" x="30" y="40" width="210" height="80" rx="10"/>
  <text class="t-bad" x="135" y="74" text-anchor="middle" font-size="17">is it listening?</text>
  <text class="t-sm" x="135" y="102" text-anchor="middle">Tailscale address only</text>

  <path class="ln-b" d="M240,80 L286,80" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-w" x="290" y="40" width="210" height="80" rx="10"/>
  <text class="t-warn" x="395" y="74" text-anchor="middle" font-size="17">ufw, port 22</text>
  <text class="t-sm" x="395" y="102" text-anchor="middle">100.64.0.0/10 only</text>

  <path class="ln-a" d="M500,80 L546,80" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="550" y="40" width="240" height="80" rx="10"/>
  <text class="t-violet" x="670" y="74" text-anchor="middle" font-size="17">password auth off</text>
  <text class="t-sm" x="670" y="102" text-anchor="middle">keyboard-interactive too</text>

  <path class="ln-a" d="M790,80 L836,80" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-p" x="840" y="40" width="230" height="80" rx="10"/>
  <text class="t-bad" x="955" y="74" text-anchor="middle" font-size="17">Match block</text>
  <text class="t-sm" x="955" y="102" text-anchor="middle">first obtained wins</text>

  <path class="ln-ok" d="M955,120 L955,172" marker-end="url(#lm-arrow-ok)"/>

  <rect class="box-ok" x="700" y="176" width="370" height="66" rx="10"/>
  <text class="t-ok" x="885" y="216" text-anchor="middle" font-size="17">a shell</text>

  <text class="t-dim" x="350" y="216" font-size="15">a Match block</text>
  <text class="t-dim" x="350" y="242" font-size="15">cannot override</text>
  <text class="t-dim" x="350" y="268" font-size="15">a global keyword</text>
</svg>`
      },
      {
        type: "callout",
        kind: "boss",
        title: "mental model to keep",
        text: "A service is three things that can disagree: a <strong>unit</strong>, a <strong>config</strong>, and the <strong>supervision contract</strong> between them. <code>systemctl status</code> tells you what systemd believes, the daemon's own logs what it believes, and <code>ss</code> what the kernel can see. Run all three before changing anything — and prefer the daemon's own test command (<code>nginx -t</code>, <code>sshd -t</code>, <code>named-checkconf -z</code>) over restarting into a broken configuration to find out."
      }
    ],
    takeaways: [
      "systemd tracks one main PID but treats the whole cgroup as the unit. Killing a worker is harmless, killing the master is an outage.",
      "Reload never drops a connection; restart closes and reopens the listening socket, and anything arriving in the gap is refused. Socket activation means systemd owns the port before the service exists, so <code>systemctl status sshd</code> reading inactive is not evidence that SSH is down.",
      "<code>ProtectSystem=strict</code> makes the whole filesystem read-only and silently kills any daemon writing a PID file or cache. Pair it with <code>ReadWritePaths=</code> and <code>RuntimeDirectory=</code>, and verify with <code>systemd-analyze security</code>.",
      "certbot renews the file and repoints the symlink; nginx keeps the old certificate in memory until <code>systemctl reload nginx</code>. Check the timer with <code>certbot renew --dry-run</code>.",
      "<code>worker_connections</code> counts upstream connections too, so a reverse proxy's real ceiling is roughly half of processes × connections, and <code>worker_rlimit_nofile</code> is a ceiling rather than a grant.",
      "<code>PasswordAuthentication no</code> does not stop password authentication when <code>UsePAM yes</code> — <code>keyboard-interactive</code> must also be off, and <code>sshd -T</code> is the effective configuration, not the file."
    ],
    glossary: {
      "unit": "The systemd file describing a service: how to start it, what to restart it on, what limits it runs under.",
      "Type=forking": "The unit expects the service to daemonise and write a PID file; systemd waits for that file rather than tracking a child it spawned.",
      "cgroup": "The kernel resource and lifecycle boundary systemd applies to a unit. v1 has separate controller trees, v2 one unified hierarchy.",
      "socket activation": "systemd creates, binds and listens on the socket, then passes the descriptor to the service when a connection arrives. No refused-connection window.",
      "ProtectSystem=": "Mount-namespace hardening: full makes /usr and /boot read-only, strict makes everything read-only except /dev, /proc and /sys.",
      "worker_connections": "Simultaneous connections one nginx worker can hold — including connections to upstream backends, which is routinely forgotten.",
      "Match block": "A conditional section in sshd_config, valid only at the end of the file. The first obtained value wins, so it cannot override a global setting."
    }
  });
})();