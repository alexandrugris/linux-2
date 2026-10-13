/* ch16 — Troubleshooting: a diagnostic playbook — SIMPLIFIED EDITION
   Source: linux-map/assets/chapters/ch16-troubleshooting.js
   4 diagrams redrawn simple as diagnostic trees: 5 boxes each (was 7, 10, 6, 5),
   viewBox height 330/320/340/320 (was 620/640/600/470), labels of 2-5 words.
   Prose 2067 -> ~640 (31%). Code 318 -> ~60 (19%). */
(function () {
  LX.push({
    id: "troubleshooting",
    title: "When it is broken: a diagnostic playbook",
    tagline: "Symptom → triage → how to read it → fix → why it comes back. Every failure below has a root cause you can name.",
    sections: [
      {
        type: "prose",
        h: "The rules that make diagnosis fast",
        p: [
          "Troubleshooting is a fixed order of operations that stops you guessing. <strong>Read the error, all of it</strong> — the last line is where the program gave up. <strong>Change one variable at a time</strong>: restart, upgrade and change permissions at once and success tells you nothing. <strong>Get the timeline first</strong> — <code>journalctl --since</code>, <code>journalctl -b -1</code>, <code>dmesg -T</code>. <strong>Know the blast radius</strong>: <code>systemctl show nginx -p KillMode</code> says whether a restart evicts every connection."
        ],
        noteTitle: "The first five commands on any broken Linux box",
        note: "<code>systemctl --failed</code> · <code>journalctl -p err -b --no-pager | tail -40</code> · <code>journalctl -k -b | tail -40</code> · <code>df -h</code> and <code>df -i</code> · <code>ps -eo stat,pid,comm | awk '$1 ~ /^D/'</code>. Then <code>free -m</code> and <code>uptime</code>.",
        noteKind: "boss"
      },
      {
        type: "prose",
        h: "The network failure triage — the most valuable flow in this chapter",
        p: [
          "“It doesn't work” is three bugs in the same coat. <strong>Connection refused</strong> means a packet <em>arrived</em> and was rejected — something is listening and said no, usually because the process is down or bound to <code>127.0.0.1</code> instead of <code>0.0.0.0</code>; you will see an <code>RST</code>. <strong>Connection timed out</strong> means packets vanished: firewall, missing route, host down. <strong>No route to host</strong> means your routing or ARP failed."
        ]
      },
      {
        type: "diagram",
        h: "Network triage: which failure is it?",
        caption: "Follow the evidence, not the hypothesis. The three modes are distinguishable from the <b>client side alone</b> with <code>curl -sv</code> plus one <code>ss</code> on the server, so the first two steps need no SSH at all. A 502 from nginx is a fourth case: the packet arrived and the application did not answer.",
        svg: `
<svg viewBox="0 0 1100 330" role="img" aria-label="Network failure triage: refused, timed out or no route to host">
  <rect class="box-a" x="350" y="20" width="400" height="50" rx="9"/>
  <text class="t-accent" x="550" y="50" text-anchor="middle" font-size="17">request fails against host:port</text>

  <path class="ln" d="M550,70 L550,90" marker-end="url(#lm-arrow)"/>

  <rect class="box-w" x="350" y="94" width="400" height="50" rx="9"/>
  <text class="t-warn" x="550" y="124" text-anchor="middle" font-size="17">is anything listening?</text>

  <path class="ln-b" d="M420,144 L195,182" marker-end="url(#lm-arrow-bad)"/>
  <path class="ln-b" d="M550,144 L550,182" marker-end="url(#lm-arrow-bad)"/>
  <path class="ln-b" d="M680,144 L905,182" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-b" x="30" y="186" width="330" height="76" rx="9"/>
  <text class="t-bad" x="195" y="216" text-anchor="middle" font-size="17">REFUSED</text>
  <text class="t-sm" x="195" y="242" text-anchor="middle" font-size="15">the process, not the network</text>

  <rect class="box-b" x="385" y="186" width="330" height="76" rx="9"/>
  <text class="t-bad" x="550" y="216" text-anchor="middle" font-size="17">TIMED OUT</text>
  <text class="t-sm" x="550" y="242" text-anchor="middle" font-size="15">the packet vanished</text>

  <rect class="box-b" x="740" y="186" width="330" height="76" rx="9"/>
  <text class="t-bad" x="905" y="216" text-anchor="middle" font-size="17">NO ROUTE TO HOST</text>
  <text class="t-sm" x="905" y="242" text-anchor="middle" font-size="15">your routing or ARP</text>

  <text class="t-dim" x="550" y="304" text-anchor="middle" font-size="16">refused: bound to 127.0.0.1, or the service is down</text>
</svg>`
      },
      {
        type: "prose",
        h: "A service will not start",
        p: [
          "The exit code tells you which family of failure you are in. Start with <code>systemctl status &lt;unit&gt;</code>: last log lines, exit code, and the timestamp separating a fresh failure from a restart loop. Then <code>journalctl -u &lt;unit&gt; -b -n 100</code>. Note the <code>-b</code> — without it you read last week's failure.",
          "Then classify. <strong>1</strong> is the program's own failure: read the log. <strong>2</strong> is bad usage or a missing unit file. <strong>126</strong> is a non-executable unit. <strong>127</strong> means the executable was not found — wrong <code>ExecStart</code> path, missing interpreter, or a library the loader cannot find. <strong>203/EXEC</strong> is systemd failing to execute it. <strong>200/CHDIR</strong> means the working directory is missing. <strong>OOMKILL</strong> means the kernel killed it: a memory problem in a service costume."
        ]
      },
      {
        type: "diagram",
        h: "“It won't start” — the decision tree",
        caption: "Read top to bottom. The two codes worth memorising are <b>127</b> (the binary itself is not runnable) and <b>OOMKILL</b> (the kernel killed it — a capacity problem wearing a service costume). Everything else is in the log. If the binary runs fine by hand and only fails under systemd, the cause is <b>context</b>, not code.",
        svg: `
<svg viewBox="0 0 1100 320" role="img" aria-label="Decision tree for a service that will not start, by exit code">
  <rect class="box-a" x="350" y="20" width="400" height="50" rx="9"/>
  <text class="t-accent" x="550" y="50" text-anchor="middle" font-size="17">systemctl start x → failed</text>

  <path class="ln" d="M550,70 L550,90" marker-end="url(#lm-arrow)"/>

  <rect class="box-w" x="350" y="94" width="400" height="50" rx="9"/>
  <text class="t-warn" x="550" y="124" text-anchor="middle" font-size="17">read ExecMainStatus, then the log</text>

  <path class="ln-b" d="M420,144 L195,182" marker-end="url(#lm-arrow-bad)"/>
  <path class="ln-b" d="M550,144 L550,182" marker-end="url(#lm-arrow-bad)"/>
  <path class="ln-b" d="M680,144 L905,182" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-b" x="30" y="186" width="330" height="76" rx="9"/>
  <text class="t-bad" x="195" y="216" text-anchor="middle" font-size="17">exit 1</text>
  <text class="t-sm" x="195" y="242" text-anchor="middle" font-size="15">the log says why</text>

  <rect class="box-b" x="385" y="186" width="330" height="76" rx="9"/>
  <text class="t-bad" x="550" y="216" text-anchor="middle" font-size="17">127 or 126</text>
  <text class="t-sm" x="550" y="242" text-anchor="middle" font-size="15">binary not runnable</text>

  <rect class="box-b" x="740" y="186" width="330" height="76" rx="9"/>
  <text class="t-bad" x="905" y="216" text-anchor="middle" font-size="17">OOMKILL</text>
  <text class="t-sm" x="905" y="242" text-anchor="middle" font-size="15">memory, not code</text>

  <text class="t-dim" x="550" y="300" text-anchor="middle" font-size="16">127: readlink -f the ExecStart, then ldd for not found</text>
</svg>`
      },
      {
        type: "prose",
        h: "Slow, full, and out of memory",
        p: [
          "<strong>High load, high CPU</strong> is a process: <code>ps -eo pid,comm,%cpu --sort=-%cpu | head</code> — many is a fork bomb, one is a loop or an interrupt storm charged to <code>irq/</code>. <strong>High load, idle CPU</strong> is blocked I/O, and the evidence is D state: <code>ps -eo stat,wchan:30,comm | awk '$1 ~ /^D/'</code>. A task in D waits on a device that is not answering: dead NFS, degraded RAID, full disk. You cannot kill it, so restarting the app does nothing.",
          "<strong>Out of memory</strong> needs two questions: machine or limit? <code>dmesg -T | grep -i oom</code> showing <code>Out of memory: Killed process N (name)</code> is a host-level OOM; no such line means a cgroup limit — and on 18.04 that is v1: <code>memory.limit_in_bytes</code>, <code>memory.max_usage_in_bytes</code>. On 2 GB, <strong>swap turns an OOM kill into thrash</strong>."
        ]
      },
      {
        type: "diagram",
        h: "The disk is full — and the three ways it lies to you",
        caption: "<code>df</code> lies in exactly three common situations, each with its own tool. The fourth box is the one people forget: a full disk is often a <b>delete that never completed</b> — a rotated log a daemon still holds open, or a journal nobody capped (<code>SystemMaxUse=300M</code> is set here).",
        svg: `
<svg viewBox="0 0 1100 340" role="img" aria-label="Disk full triage: deleted open files, exhausted inodes, nested mounts, uncapped journal">
  <rect class="box-a" x="350" y="20" width="400" height="50" rx="9"/>
  <text class="t-accent" x="550" y="50" text-anchor="middle" font-size="17">the disk is full</text>

  <path class="ln" d="M550,70 L550,90" marker-end="url(#lm-arrow)"/>

  <rect class="box-w" x="350" y="94" width="400" height="50" rx="9"/>
  <text class="t-warn" x="550" y="124" text-anchor="middle" font-size="17">which filesystem? df -hT</text>

  <path class="ln-b" d="M420,144 L160,182" marker-end="url(#lm-arrow-bad)"/>
  <path class="ln-b" d="M500,144 L455,182" marker-end="url(#lm-arrow-bad)"/>
  <path class="ln-b" d="M600,144 L750,182" marker-end="url(#lm-arrow-bad)"/>
  <path class="ln-b" d="M680,144 L1040,182" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-b" x="30" y="186" width="260" height="76" rx="9"/>
  <text class="t-bad" x="160" y="216" text-anchor="middle" font-size="17">deleted, still open</text>
  <text class="t-sm" x="160" y="242" text-anchor="middle" font-size="15">lsof +L1</text>

  <rect class="box-b" x="325" y="186" width="260" height="76" rx="9"/>
  <text class="t-bad" x="455" y="216" text-anchor="middle" font-size="17">inodes exhausted</text>
  <text class="t-sm" x="455" y="242" text-anchor="middle" font-size="15">df -i</text>

  <rect class="box-b" x="620" y="186" width="260" height="76" rx="9"/>
  <text class="t-bad" x="750" y="216" text-anchor="middle" font-size="17">nested mounts</text>
  <text class="t-sm" x="750" y="242" text-anchor="middle" font-size="15">du -x</text>

  <rect class="box-b" x="915" y="186" width="155" height="76" rx="9"/>
  <text class="t-bad" x="992" y="216" text-anchor="middle" font-size="17">journald</text>
  <text class="t-sm" x="992" y="242" text-anchor="middle" font-size="15">--disk-usage</text>

  <text class="t-dim" x="550" y="314" text-anchor="middle" font-size="16">on Debian, check /var first: logs, apt cache, containerd</text>
</svg>`
      },
      {
        type: "diagram",
        h: "The restart loop",
        caption: "Most incidents are this loop re-entered by a human. The right column is the only place worth stopping: a service that works fine on its own and fails only when started by systemd is nearly always a <b>permission, working directory, environment or hardening</b> problem, not a code problem.",
        svg: `
<svg viewBox="0 0 1100 320" role="img" aria-label="The restart loop and how to break it with evidence">
  <rect class="box-b" x="30" y="20" width="230" height="56" rx="10"/>
  <text class="t-bad" x="145" y="53" text-anchor="middle" font-size="17">it broke</text>

  <path class="ln-b" d="M260,48 L340,48" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-w" x="340" y="20" width="230" height="56" rx="10"/>
  <text class="t-warn" x="455" y="53" text-anchor="middle" font-size="17">restart it</text>

  <path class="ln" d="M455,76 L455,116" marker-end="url(#lm-arrow)"/>

  <rect class="box-a" x="340" y="120" width="230" height="56" rx="10"/>
  <text class="t-accent" x="455" y="153" text-anchor="middle" font-size="17">works for 4 minutes</text>

  <path class="ln-b" d="M340,148 L260,148 L260,100" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-p" x="30" y="120" width="230" height="56" rx="10"/>
  <text class="t-sm" x="145" y="153" text-anchor="middle" font-size="17">it breaks again</text>

  <path class="ln-ok" d="M570,48 L660,48" marker-end="url(#lm-arrow-ok)"/>

  <rect class="box-ok" x="660" y="20" width="410" height="156" rx="10"/>
  <text class="t-ok" x="680" y="50" font-size="17">instead, break it with evidence</text>
  <text class="t-sm" x="680" y="80" font-size="15">journalctl -u x -b -1 -n 200</text>
  <text class="t-sm" x="680" y="108" font-size="15">journalctl --since "-1h" -p notice</text>
  <text class="t-sm" x="680" y="136" font-size="15">systemctl show x -p User -p UMask</text>
  <text class="t-sm" x="680" y="160" font-size="15">apt history, last reboot, last login</text>

  <text class="t-dim" x="550" y="228" text-anchor="middle" font-size="16">same user, same cwd, same environment — no unit file</text>
  <text class="t-dim" x="550" y="262" text-anchor="middle" font-size="16">systemd-analyze security x scores the hardening you added</text>
</svg>`
      },
      {
        type: "prose",
        h: "DNS: which layer is lying",
        p: [
          "DNS failures are one of five caches telling a different story, and the fix is to walk the layers rather than flush them: the application, glibc's resolver, <code>/etc/hosts</code>, <code>/etc/resolv.conf</code>, systemd-resolved on 127.0.0.53 with its own cache and split-DNS logic, then your upstream resolver.",
          "The mistake everybody makes is editing <code>/etc/resolv.conf</code> — on systemd-resolved it is a symlink into <code>/run</code> that resolved rewrites. Use <code>resolvectl</code>."
        ]
      },
      {
        type: "code",
        lang: "bash",
        what: "The escalation ladder — each step removes one layer",
        code:
`getent hosts example.com          # resolves via NSS/glibc, honours /etc/hosts
curl -sv https://93.184.216.34/ -H 'Host: example.com'   # bypass DNS
resolvectl query example.com      # never edit /etc/resolv.conf (symlink into /run)
dig example.com        # NOERROR=exists NXDOMAIN=none SERVFAIL=broken
dig example.com +trace # from the root; @ns1.example.com AXFR checks your zone
grep ^search /etc/resolv.conf     # Tailscale adds a search domain here`
      },
      {
        type: "table",
        cols: ["What you observe", "Most likely cause", "Settle it with"],
        rows: [
          ["“Connection timed out”", "Firewall DROP, wrong security group, no NAT return, bad MTU", "<code>curl -sv</code> · <code>tcpdump -ni any</code> · <code>ip route get</code>"],
          ["High load, low CPU", "D state: blocked on dead or slow I/O", "<code>ps -eo stat,wchan:30,comm | awk '$1 ~ /^D/'</code>"],
          ["Killed, nothing in the log", "The kernel OOM killer; userspace logs nothing", "<code>dmesg -T | grep -i 'killed process'</code>"],
          ["Disk full, nothing big found", "Deleted-but-open files, or nested mounts", "<code>lsof +L1</code> · <code>du -x --max-depth=1 /</code>"],
          ["Space free, cannot create files", "Inodes exhausted", "<code>df -i</code>"],
          ["“Too many open files”", "RLIMIT_NOFILE per process, or fs.file-max system-wide", "<code>cat /proc/PID/limits</code> · <code>ulimit -n</code>"],
          ["Permission denied on a readable file", "ACL, LSM, immutable bit, root_squash, no <code>+x</code> on a parent", "<code>getfacl</code> · <code>lsattr</code> · <code>namei -l PATH</code>"],
          ["TLS certificate expired", "Not renewing; the certbot timer is failing", "<code>openssl x509 -enddate -noout</code> · <code>certbot renew --dry-run</code>"],
          ["nginx 502", "Upstream down, wrong path (trailing slash), socket permissions", "<code>curl -sv http://127.0.0.1:PORT/</code> · <code>tail error.log</code>"]
        ]
      },
      {
        type: "callout",
        kind: "danger",
        title: "Before you reboot",
        text: "A reboot destroys the evidence and turns a diagnosable problem into an anecdote. On a Tailscale-only box it can also make things permanently unreachable: if boot fails, the tunnel that is your only route in does not exist yet.<br><br>Capture first: <code>journalctl -b -1 --no-pager &gt; /tmp/prev.log</code> · <code>dmesg -T &gt; /tmp/dmesg.txt</code> · <code>systemctl --failed</code>. Know whether your provider's out-of-band console works <b>before</b> you need it."
      }
    ],
    takeaways: [
      "<strong>Refused vs timed out vs no-route</strong>: process, path, or local problem.",
      "High load with idle CPU means <strong>D state</strong>: blocked I/O. <code>lsof +L1</code> and <code>df -i</code> find the disk-full variants.",
      "Exit 127 means the binary is not runnable; <code>OOMKILL</code> means it was never a service problem.",
      "Works by hand but not under systemd? Compare <strong>User, Group, WorkingDirectory, Environment, UMask</strong>."
    ],
    glossary: {
      "connection refused": "The host received the packet and rejected it (RST).",
      "connection timed out": "Packets went unanswered: firewall, missing route, host down.",
      "D state": "Uninterruptible sleep — blocked on I/O, cannot be killed.",
      "RLIMIT_NOFILE": "Per-process descriptor limit, distinct from system-wide fs.file-max.",
      "lsof +L1": "Open files with link count below 1: deleted, still occupying disk.",
      "journalctl -b -1": "The previous boot's journal — key evidence in a restart loop."
    }
  });
})();