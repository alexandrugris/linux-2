/* ch04 — Users, permissions, and the isolation stack — SIMPLIFIED EDITION
   Source: linux-map/assets/chapters/ch04-isolation.js
   4 diagrams redrawn simple: 6, 6, 3 and 4 boxes (was 8, 9, 3 and 11),
   viewBox height 360/360/350/350 (was 720/560/640/660), labels of 2-5 words.
   Prose 1776 -> ~530 (30%). Code 302 -> ~55 (18%). */
(function () {
  LX.push({
    id: "isolation",
    title: "Users, permissions, and the isolation stack",
    tagline: "Ownership stops mistakes, capabilities stop escalation, namespaces hide, cgroups bound. A container is all four at once — and that is the whole trick.",
    sections: [
      {
        type: "prose",
        h: "The model most people half-remember",
        p: [
          "The kernel consults <strong>exactly one permission row</strong> — user, group or other. If you own the file, the group bits are irrelevant: no union, no “most permissive match”.",
          "The exception is uid 0: <code>root</code> is not privileged as a number, but <em>holds capabilities</em> that override the checks — <code>CAP_DAC_OVERRIDE</code>, <code>CAP_DAC_READ_SEARCH</code>, <code>CAP_FOWNER</code>, <code>CAP_KILL</code>. Handed out one at a time, which is how a web server binds port 80 without being root."
        ]
      },
      {
        type: "diagram",
        h: "The isolation stack: six layers, each solving a different problem",
        caption: "Read bottom-up for enforcement, top-down for blast radius. A <b>VM</b> at line 6 replaces the stack with a hypervisor boundary — stronger, heavier, and the right answer for genuinely hostile code. Everything a container does is lines 1–5 composed, which is why “a container is just a process” is true and useless: the interesting part is which lines you turned on.",
        svg: `
<svg viewBox="0 0 1100 360" role="img" aria-label="Six isolation layers from permission bits up to a hypervisor boundary">
  <rect class="box" x="30" y="36" width="340" height="120" rx="10"/>
  <text x="50" y="72" font-size="17">1 · identity</text>
  <text class="t-sm" x="50" y="102" font-size="15">uid/gid + rwx bits</text>

  <rect class="box" x="380" y="36" width="340" height="120" rx="10"/>
  <text x="400" y="72" font-size="17">2 · capabilities</text>
  <text class="t-sm" x="400" y="128" font-size="15">CAP_NET_BIND_SERVICE</text>

  <rect class="box-a" x="730" y="36" width="340" height="120" rx="10"/>
  <text class="t-accent" x="750" y="72" font-size="17">3 · cgroups</text>
  <text class="t-sm" x="750" y="128" font-size="15">memory.max · cpu.max</text>

  <rect class="box-a" x="30" y="176" width="340" height="120" rx="10"/>
  <text class="t-accent" x="50" y="212" font-size="17">4 · namespaces</text>
  <text class="t-sm" x="50" y="268" font-size="15">pid · mnt · net · user</text>

  <rect class="box-a" x="380" y="176" width="340" height="120" rx="10"/>
  <text class="t-accent" x="400" y="212" font-size="17">5 · seccomp + LSM</text>
  <text class="t-sm" x="400" y="268" font-size="15">AppArmor path policy</text>

  <rect class="box-b" x="730" y="176" width="340" height="120" rx="10"/>
  <text class="t-bad" x="750" y="212" font-size="17">6 · hypervisor</text>
  <text class="t-sm" x="750" y="242" font-size="15">a different kernel</text>

  <text class="t-dim" x="550" y="336" text-anchor="middle" font-size="16">a container is lines 1–5 composed</text>
</svg>`
      },
      {
        type: "prose",
        h: "How a permission check actually resolves",
        p: [
          "First: <strong>does the caller hold a matching capability?</strong> <code>CAP_DAC_OVERRIDE</code> ends the check with yes — which is why root reads <code>/etc/shadow</code> at mode <code>640 root:shadow</code>.",
          "Otherwise <strong>DAC runs</strong>: owner bits if your <em>effective</em> uid owns the file, else group bits if the file's group is in your supplementary groups, else the other bits. First match wins — mode <code>0400</code> owned by another user is unreadable even when a group grants read.",
          "Then POSIX <strong>ACLs</strong>, AppArmor or <strong>SELinux</strong>, <strong>seccomp</strong>, then cgroup limits — a write can fail <code>ENOSPC</code> on a terabyte-free filesystem. <code>x</code> on a directory is <em>search</em>; deleting a file needs <code>w</code> and <code>x</code> on the <em>directory</em>."
        ]
      },
      {
        type: "diagram",
        h: "One permission check, in order",
        caption: "Every access to every file goes through this, in this order. The capability short-circuit at the top is why <code>root</code> works — and why <b>dropping <code>CAP_DAC_OVERRIDE</code> is the single highest-value hardening move in the stack</b>: the process then obeys the permission bits like everybody else.",
        svg: `
<svg viewBox="0 0 1100 360" role="img" aria-label="The kernel permission check in five ordered stages">
  <rect class="box-w" x="300" y="20" width="480" height="48" rx="9"/>
  <text class="t-warn" x="320" y="42" font-size="17">1 · CAP_DAC_OVERRIDE?</text>
  <text class="t-sm" x="320" y="62" font-size="15">then yes, immediately</text>
  <path class="ln" d="M540,68 L540,86" marker-end="url(#lm-arrow)"/>

  <rect class="box-v" x="300" y="90" width="480" height="48" rx="9"/>
  <text class="t-violet" x="320" y="112" font-size="17">2 · DAC</text>
  <text class="t-sm" x="320" y="132" font-size="15">owner, then group, then other</text>
  <path class="ln" d="M540,138 L540,156" marker-end="url(#lm-arrow)"/>

  <rect class="box-v" x="300" y="160" width="480" height="48" rx="9"/>
  <text class="t-violet" x="320" y="182" font-size="17">3 · POSIX ACL</text>
  <text class="t-sm" x="320" y="202" font-size="15">replaces the three rows entirely</text>
  <path class="ln" d="M540,208 L540,226" marker-end="url(#lm-arrow)"/>

  <rect class="box-w" x="300" y="230" width="480" height="48" rx="9"/>
  <text class="t-warn" x="320" y="252" font-size="17">4 · LSM</text>
  <text class="t-sm" x="320" y="272" font-size="15">AppArmor or SELinux denies</text>
  <path class="ln" d="M540,278 L540,296" marker-end="url(#lm-arrow)"/>

  <rect class="box-w" x="300" y="300" width="480" height="48" rx="9"/>
  <text class="t-warn" x="320" y="322" font-size="17">5 · cgroup quota</text>
  <text class="t-sm" x="320" y="342" font-size="15">ENOSPC on a terabyte-free disk</text>

  <path class="ln-b" d="M780,254 L850,254" marker-end="url(#lm-arrow-bad)"/>
  <rect class="box-b" x="855" y="230" width="215" height="48" rx="9"/>
  <text class="t-bad" x="962" y="260" text-anchor="middle" font-size="17">EACCES</text>
</svg>`
      },
      {
        type: "prose",
        h: "Capabilities: the end of root as a unit",
        p: [
          "The old way was the <strong>setuid bit</strong>: a binary marked <code>u+s</code> runs as its owner — hence <code>find / -perm -4000</code>. Capabilities are finer: a process carries <strong>permitted</strong>, <strong>effective</strong>, <strong>inheritable</strong> and the <strong>bounding set</strong>, a ceiling never regainable. A binary can carry them in its <code>xattr</code>, so any user can run it with <code>CAP_NET_BIND_SERVICE</code>.",
          "<code>CAP_SYS_ADMIN</code> (= 21) is not most of root, it is effectively all of it: mount, namespaces, cgroups, ptrace. Holding it usually means escaping a container, so <code>--cap-add=SYS_ADMIN</code> is root with extra steps. nginx is the pattern: the master starts as root, binds the privileged sockets, then <code>setgid</code>s and <code>setuid</code>s its workers to <code>www-data</code>."
        ]
      },
      {
        type: "prose",
        h: "Namespaces: one kernel, many parallel universes",
        p: [
          "A namespace turns one global kernel thing into a per-task copy: the mount table is global, yet a container has its own <code>/</code>; the PID counter is global, yet its init is PID 1. Escapes come from what each does <em>not</em> hide: POSIX shm and mqueue are <strong>not</strong> namespaced, and inside-UID 0 is not outside-root."
        ]
      },
      {
        type: "diagram",
        h: "What a container can and cannot see",
        caption: "Same kernel, different view. Every line crossing the boundary is a deliberate re-share performed by the runtime — <code>--net=host</code>, <code>--pid=host</code>, a <code>CAP_SYS_ADMIN</code> that slipped through, a bind mount of a host path. <b>Runtime misconfiguration, not kernel weakness, is how containers stop being isolated.</b>",
        svg: `
<svg viewBox="0 0 1100 350" role="img" aria-label="What a container sees versus the host it shares a kernel with">
  <rect class="box-b" x="30" y="20" width="1040" height="100" rx="10"/>
  <text class="t-bad" x="50" y="48" font-size="17">HOST</text>
  <text class="t-sm" x="50" y="76" font-size="15">every process and every fd</text>
  <text class="t-sm" x="50" y="102" font-size="15">eth0 · tailscale0 · docker0</text>
  <text class="t-sm" x="500" y="76" font-size="15">2 GB, 19 GB disk</text>
  <text class="t-sm" x="500" y="102" font-size="15">root's full capabilities</text>

  <path class="ln-b" d="M550,120 L550,148" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-a" x="30" y="152" width="1040" height="100" rx="10"/>
  <text class="t-accent" x="50" y="180" font-size="17">CONTAINER</text>
  <text class="t-sm" x="50" y="208" font-size="15">only its own PIDs</text>
  <text class="t-sm" x="50" y="234" font-size="15">eth0 on 10.244.1.7</text>
  <text class="t-sm" x="500" y="208" font-size="15">512 MiB, 1 core</text>
  <text class="t-sm" x="500" y="234" font-size="15">1024 PIDs enforced</text>

  <rect class="box-w" x="30" y="280" width="1040" height="50" rx="10"/>
  <text class="t-warn" x="550" y="311" text-anchor="middle" font-size="16">--net=host · --pid=host · privileged</text>
</svg>`
      },
      {
        type: "prose",
        h: "cgroups: isolation by accounting",
        p: [
          "Namespaces hide; cgroups <strong>account</strong>. A cgroup is a directory where the kernel tracks every task, page, second of CPU and block of IO; cross a limit and the kernel throttles or kills. <code>ulimit -v</code> is no substitute: it caps <em>virtual</em> address space, a promise the process makes about itself.",
          "<strong>v1</strong> has one hierarchy per controller — <code>/sys/fs/cgroup/memory/</code>, <code>cpu/</code>, <code>pids/</code>. <strong>v2</strong> has one tree at <code>/sys/fs/cgroup/</code>, controllers enabled through <code>cgroup.subtree_control</code>, knobs <code>memory.max</code>, <code>cpu.max</code> (quota/period, <code>200000 100000</code> = 2 cores), <code>pids.max</code>. Your 18.04 box is v1, so copied limits hit “no such file”.",
          "The difference that bites is <strong>the scope of the OOM killer</strong>: a cgroup-level OOM looks inside that cgroup, but a host-level OOM kills the largest process on the machine regardless.."
        ]
      },
      {
        type: "diagram",
        h: "The cgroup hierarchy: v1 against v2, and the limit",
        caption: "Every task sits in exactly one leaf cgroup, and the leaf is where limits are written. <b>Your 18.04 box is v1</b>, so the paths and filenames differ and copied configs hit “no such file”. <code>memory.high</code> is the soft limit — reclaim and throttle, nobody dies. <code>memory.max</code> is the hard one.",
        svg: `
<svg viewBox="0 0 1100 350" role="img" aria-label="cgroup v1 and v2 paths side by side, with the soft and hard memory limits">
  <rect class="box-v" x="30" y="24" width="330" height="150" rx="10"/>
  <text class="t-violet" x="50" y="54" font-size="17">cgroup v1 · your 18.04</text>
  <text class="t-sm" x="50" y="84" font-size="15">/sys/fs/cgroup/memory/</text>
  <text class="t-sm" x="50" y="136" font-size="15">memory.limit_in_bytes</text>
  <text class="t-sm" x="50" y="160" font-size="15">memory.oom_control</text>

  <rect class="box-a" x="385" y="24" width="330" height="150" rx="10"/>
  <text class="t-accent" x="405" y="54" font-size="17">cgroup v2 · one tree</text>
  <text class="t-sm" x="405" y="84" font-size="15">/sys/fs/cgroup/</text>
  <text class="t-sm" x="405" y="110" font-size="15">cgroup.subtree_control</text>
  <text class="t-sm" x="405" y="136" font-size="15">memory.max · cpu.max</text>

  <rect class="box-b" x="740" y="24" width="330" height="150" rx="10"/>
  <text class="t-bad" x="760" y="54" font-size="17">at the limit</text>
  <text class="t-sm" x="760" y="84" font-size="15">memory.high reclaims</text>
  <text class="t-sm" x="760" y="110" font-size="15">memory.max OOM-kills</text>
  <text class="t-sm" x="760" y="160" font-size="15">page cache counts too</text>

  <path class="ln-a" d="M195,174 L195,208" marker-end="url(#lm-arrow-accent)"/>
  <path class="ln-a" d="M905,174 L905,208" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box" x="30" y="212" width="1040" height="112" rx="10"/>
  <text x="50" y="246" font-size="17">one leaf cgroup per task</text>
  <text class="t-sm" x="50" y="292" font-size="15">systemd-cgtop, or cat memory.max memory.current</text>
</svg>`
      },
      {
        type: "code",
        lang: "bash",
        what: "Working with isolation directly",
        code:
`grep -E 'Cap(Inh|Prm|Eff|Bnd|Amb)' /proc/self/status
setcap 'cap_net_bind_service=+ep' /usr/sbin/nginx
unshare -p -f --mount-proc bash      # new pid + mount ns
nsenter -t 1234 -n -m -u -i -p -a ls
systemctl set-property nginx.service MemoryMax=512M TasksMax=200
find / -perm -4000 -type f          # every setuid binary
systemd-analyze security nginx.service
systemd-run --scope -p MemoryMax=256M -p NoNewPrivileges=yes -- CMD`
      },
      {
        type: "callout",
        kind: "fact",
        title: "What “root” means on your own server",
        text: "Your VPS is single-tenant, sshd is Tailscale-only, <code>PasswordAuthentication no</code> is set. The real privilege boundary is not the permission model — it is <b>who holds an SSH key</b>. DAC matters only once something is authenticated.<br><br>Ranking: (1) SSH reachability, (2) key integrity, (3) patch level, (4) everything else."
      }
    ],
    takeaways: [
      "Permission checks are <strong>one row, not a union</strong>; root bypasses them with capabilities, not a magic number.",
      "<strong>Capabilities replaced setuid</strong>. Drop <code>CAP_DAC_OVERRIDE</code> and a process obeys the permission bits like anyone else.",
      "Never give a process <code>CAP_SYS_ADMIN</code>: root with extra steps, and it removes a container's containment.",
      "<code>ulimit</code> is a promise; a cgroup is a fact. Limits that must hold are cgroup limits."
    ],
    glossary: {
      "DAC": "Discretionary Access Control — the owner/group/other model.",
      "ACL": "POSIX access control list: per-user permissions beyond the three rows.",
      "capability": "One separately grantable privilege, such as CAP_NET_BIND_SERVICE.",
      "capability bounding set": "The ceiling a process can never regain.",
      "namespace": "A per-task copy of a kernel global: PIDs, mounts, network, IPC, UIDs.",
      "cgroup v2": "The single unified cgroup tree, against v1's per-controller trees."
    }
  });
})();