/* ch17 — Cheatsheet — SIMPLIFIED EDITION
   Source: linux-map/assets/chapters/ch17-cheatsheet.js
   The single diagram redrawn simple: 4 boxes (was 6),
   viewBox height 360 (was 500), labels of 2-5 words, 9 text nodes (was 18).
   Prose 3026 -> ~965 (32%). Code 295 -> ~60 (20%). */
(function () {
  LX.push({
    id: "cheatsheet",
    title: "The commands, and what each one is telling you",
    tagline: "Organised by the task you are doing, not by the tool. Each entry: what it answers, and the one thing to look at in the output.",
    sections: [
      {
        type: "diagram",
        h: "The one-page orientation: which layer answers which question",
        caption: "Almost every confusion in a terminal comes from asking a lower layer a question only a higher layer can answer. <code>df</code> cannot tell you why the disk is full (ch12), <code>free</code> cannot tell you why you were OOM-killed (ch04), <code>curl</code> cannot tell you whether DNS is lying (ch10). Ask the lowest layer that can actually answer, and escalate only when it says “I don't know”.",
        svg: `
<svg viewBox="0 0 1100 360" role="img" aria-label="Four layers of the system, each with the commands that answer questions at that level">
  <rect class="box-b" x="30" y="24" width="1040" height="64" rx="10"/>
  <text class="t-bad" x="50" y="52" font-size="17">is it reachable?</text>
  <text class="t-sm" x="50" y="76" font-size="15">ping · nc · tcpdump · ip route get</text>

  <rect class="box-w" x="30" y="104" width="1040" height="64" rx="10"/>
  <text class="t-warn" x="50" y="132" font-size="17">is it listening, does DNS resolve?</text>
  <text class="t-sm" x="50" y="156" font-size="15">ss -tanp · dig · resolvectl · curl -sv</text>

  <rect class="box-a" x="30" y="184" width="1040" height="64" rx="10"/>
  <text class="t-accent" x="50" y="212" font-size="17">is it healthy, did it start?</text>
  <text class="t-sm" x="50" y="236" font-size="15">systemctl status · journalctl -u -b · crictl ps</text>

  <rect class="box" x="30" y="264" width="1040" height="64" rx="10"/>
  <text x="50" y="292" font-size="17">what is it actually doing?</text>
  <text class="t-sm" x="50" y="316" font-size="15">strace -f · lsof -p · /proc/PID · coredumpctl</text>

  <text class="t-dim" x="550" y="356" text-anchor="middle" font-size="16">escalate only on “I don't know”</text>
</svg>`
      },
      {
        type: "kv",
        h: "System, kernel, boot",
        items: [
          { k: "cat /proc/cmdline", v: "Every argument the kernel booted with: root device, console, interface naming, rescue target. The most revealing single command on a misbehaving machine." },
          { k: "uptime", v: "Load averages and uptime. Load is runnable plus uninterruptible tasks, <strong>not</strong> CPU — compare against the core count first." },
          { k: "free -m", v: "Memory. Read <code>available</code>, not <code>free</code>: cached memory is available memory." },
          { k: "cat /proc/pressure/{cpu,memory,io}", v: "PSI: the share of the last 10/60/300 s that tasks stalled on each resource. Rising <code>some</code> with idle CPU means throttling." },
          { k: "findmnt -T /path", v: "Which filesystem a path lives on, and with which options. Faster and more correct than reasoning from <code>df</code>." }
        ]
      },
      {
        type: "kv",
        h: "Processes: who is doing what",
        items: [
          { k: "ps -eo stat,pid,comm | awk '$1 ~ /^D/'", v: "The D-state hunt. Run first on any machine described as “frozen” — the answer is usually a dead mount, not load." },
          { k: "ls -l /proc/PID/fd", v: "Every file, socket and device the process holds — one symlink per descriptor. <code>lsof</code> does the same for one process." },
          { k: "cat /proc/PID/cmdline | tr '\\0' ' '", v: "argv exactly as passed. <code>ps aux | grep</code> matches its own grep; this does not, and it survives spaces." },
          { k: "cat /proc/PID/status", v: "Threads, state, UID/GID, <code>CapEff</code>, seccomp mode, VmRSS. The capability line shows whether a process really dropped root." },
          { k: "strace -f -tt -T -e trace=%file ./cmd", v: "Every syscall with timestamps and real error numbers. <code>-f</code> follows forks, <code>-T</code> shows latency." },
          { k: "coredumpctl list / info / gdb", v: "Crashes the kernel caught. <code>journalctl</code> may rate-limit the rest of a crash loop away; the coredump is kept." }
        ]
      },
      {
        type: "kv",
        h: "Services and logs",
        items: [
          { k: "systemctl status UNIT --no-pager -l", v: "State, uptime, process tree and last log lines on one screen. The correct first command for any service question." },
          { k: "systemctl show UNIT -p PROP", v: "<strong>Effective</strong> values, not the file: <code>MemoryCurrent</code>, <code>NRestarts</code>, <code>ExecMainStatus</code>, <code>DropInPaths</code>." },
          { k: "systemctl cat UNIT", v: "The unit plus every drop-in, merged, with paths. Proves whether the file you edited is the one in effect." },
          { k: "journalctl -u UNIT -f", v: "Follow one unit live. The command you will type most often in a career." },
          { k: "journalctl -b -1 -p warning", v: "The <em>previous</em> boot's warnings. Why did it restart? Almost always answered here." },
          { k: "journalctl -k -b", v: "The kernel ring buffer for this boot: hardware probe, driver messages, OOM kills, blocked requests." },
          { k: "systemctl reload vs restart", v: "<code>reload</code> lets in-flight requests finish; <code>restart</code> is a hard stop then start. Prefer reload." }
        ]
      },
      {
        type: "kv",
        h: "Packages and building",
        items: [
          { k: "dpkg -L PACKAGE", v: "Every file a package installed. First question when something is installed but misbehaving: is there a conffile or unit you did not know about?" },
          { k: "apt-get -s install PKG", v: "<strong>Simulate.</strong> Exactly what would be installed, upgraded and removed. Run it before every risky change in production." },
          { k: "ldd /path/to/binary", v: "Which shared libraries it loads and which are <code>not found</code>. Explains a binary that will not start after a library upgrade." },
          { k: "DESTDIR=/tmp/pkg make install", v: "Install into a staging directory instead of /. <strong>This is how packaging works</strong> — and why a manual <code>make install</code> cannot be cleanly removed." }
        ]
      },
      {
        type: "kv",
        h: "Networking and DNS",
        items: [
          { k: "ss -tanp state listening", v: "What is listening, on which address, owned by which process. The <strong>bind address</strong> is the thing: <code>127.0.0.1</code> means unreachable from anywhere else." },
          { k: "ip route get DEST", v: "The route the kernel would actually use, including the source address it picks. <code>ip route</code> alone does not tell you that." },
          { k: "tcpdump -ni any 'tcp port 443'", v: "The ground truth. Did the SYN arrive at all? Was there an RST? This ends arguments <code>ss</code> cannot." },
          { k: "nft list ruleset", v: "The same on nftables systems. On an old box check <code>update-alternatives --display iptables</code> — legacy and nft coexist silently." },
          { k: "resolvectl status / query NAME", v: "The resolver's real configuration and its answer. Never edit <code>/etc/resolv.conf</code> on a systemd-resolved system; it is a symlink into <code>/run</code>." },
          { k: "curl -sv URL", v: "The whole conversation: DNS, TCP, TLS, request, response. <code>-w '%{time_namelookup} %{time_starttransfer}'</code> splits latency by phase." }
        ]
      },
      {
        type: "kv",
        h: "Storage and capacity",
        items: [
          { k: "df -hT", v: "Space by filesystem with type. <code>df</code> counts deleted-but-open files, <code>du</code> does not; trust <code>du</code> for what to delete." },
          { k: "df -i", v: "Inode usage. 100% with free space means every new file fails — a different failure that <code>df -h</code> hides." },
          { k: "du -x --max-depth=1 / | sort -h | tail", v: "Where the space is. <code>-x</code> stops at filesystem boundaries so nested mounts do not double-count." },
          { k: "lsof +L1", v: "Open files whose name has been deleted. Invisible to <code>df</code> and <code>du</code>, still occupying blocks. Restart the holder to reclaim." },
          { k: "vmstat 1 5", v: "<code>r</code> runnable vs <code>b</code> blocked is the load story. <code>si</code>/<code>so</code> non-zero means swap thrash — never healthy on 2 GB." },
          { k: "resize2fs /dev/sda1 · xfs_growfs /", v: "Grow a filesystem after the partition was resized. xfs cannot shrink, and grows only mounted." }
        ]
      },
      {
        type: "kv",
        h: "Users, permissions, containers",
        items: [
          { k: "namei -l /path/to/file", v: "Permissions on every component of the path. A missing execute bit on a parent directory blocks access to a readable file." },
          { k: "find / -perm -4000 -type f", v: "Every setuid binary. Audit it on any machine you did not build; each is a privilege-escalation surface." },
          { k: "setcap 'cap_net_bind_service=+ep' BIN", v: "Grant one capability to a binary on disk. The correct way to let a daemon bind port 80 without being root." },
          { k: "nsenter -t PID -n -m -u -i -p -a -- CMD", v: "Enter another process's view of the world. The container escape hatch that is also the debugging tool." }
        ]
      },
      {
        type: "kv",
        h: "Kubernetes",
        items: [
          { k: "kubectl describe pod POD", v: "The <strong>Events at the bottom</strong> answer most pod questions. Everything above them is spec restatement." },
          { k: "kubectl logs POD --previous", v: "The output of the container run <em>before</em> the last restart. The only place a crash loop's real message survives." },
          { k: "kubectl get events --sort-by=.lastTimestamp", v: "Cluster events in order. The best first command when something that recently started is misbehaving." }
        ]
      },
      {
        type: "prose",
        h: "Shell things that actually matter",
        p: [
          '<strong>Quote everything</strong>: <code>$var</code> splits on whitespace and expands globs, <code>"$var"</code> does neither — and unquoted expansion is behind most injection bugs, so this is a security rule too.',
          "<strong>Know when <code>set -e</code> will not save you.</strong> It skips <code>if</code>, <code>while</code>, <code>&amp;&amp;</code>/<code>||</code> chains, and a pipeline unless the last command fails. Use <code>set -euo pipefail</code> — and remember <code>-e</code> still will not catch a <em>wrong answer</em>.",
          "<strong>Handle failure where it happens</strong>: <code>trap cleanup EXIT</code> makes a script idempotent instead of debris-generating. <strong>Handle names correctly</strong>: <code>find . -print0 | xargs -0</code> is the only safe way over filenames with spaces or newlines. <strong>Prefer the structured parser</strong>: <code>jq</code>, <code>awk</code>, <code>sort -h</code>."
        ]
      },
      {
        type: "code",
        lang: "bash",
        what: "Shell patterns worth memorising whole",
        code:
`set -euo pipefail
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
find /var/log -name '*.gz' -print0 | xargs -0 -r zcat -- | grep -i error
rsync -av -- "$src" "$dst/"          # "--" ends option parsing
if ! out=$(systemctl is-active nginx); then echo "$out"; exit 1; fi
awk '$3 > 100 {print $1}'            # filter a field, not a match
rsync -avznc --delete src/ dst/      # -n dry-run, -c checksum
while read -r line; do ...; done < <(command that can fail)`
      },
      {
        type: "kv",
        h: "Paths worth knowing by heart",
        items: [
          { k: "/etc/fstab", v: "Mounts, and the generator that turns them into <code>*.mount</code> units. A bad entry can stop boot; use <code>nofail</code> and <code>_netdev</code>." },
          { k: "/proc/PID/", v: "status, stat, cmdline, exe, cwd, root, fd, maps, limits, ns/, cgroup, mountinfo. The kernel's view of a process, free and always current." },
          { k: "/sys/fs/cgroup/", v: "Resource limits. <code>tmpfs</code> at the root means cgroups v1 (your 18.04 box); <code>cgroup2fs</code> means v2, with <code>memory.max</code> and <code>cpu.max</code>." },
          { k: "/run/systemd/resolve/stub-resolv.conf", v: "What <code>/etc/resolv.conf</code> points at on a systemd-resolved system. Edit <code>/etc/systemd/resolved.conf</code>, never this." },
          { k: "/etc/ssh/sshd_config", v: "<code>sshd -T</code> is the <em>effective</em> configuration including Match blocks — and there is usually a second file in <code>sshd_config.d/</code> overriding it." },
          { k: "/var/lib/containerd/", v: "content, snapshots, runtime metadata, per-pod shim sockets. Where the disk goes when containers eat a server." }
        ]
      },
      {
        type: "callout",
        kind: "tip",
        title: "The habit that outlasts every command on this page",
        text: "Before you type, ask <em>which layer owns this question</em>, and reach for the lowest tool that can actually answer it. <code>free</code> cannot explain an OOM kill, <code>df</code> cannot explain a full disk, <code>curl</code> cannot explain a DNS failure, and a <code>systemctl restart</code> cannot explain anything at all."
      }
    ],
    takeaways: [
      "<strong>State, duration, log.</strong> <code>systemctl status</code>, <code>show -p</code> and <code>journalctl -u -b</code> answer most service questions.",
      "Refused / timed out / no-route separates process, path and local problems — and costs nothing to check.",
      "<code>df -h</code> lies about deleted-open files; <code>df -i</code> catches inode exhaustion; <code>du -x</code> stops double-counting.",
      "<code>set -euo pipefail</code>, <code>trap</code>, <code>--</code>, <code>-print0 | xargs -0</code>, and a parser instead of a regex."
    ],
    glossary: {
      "pipefail": "set -o pipefail — a pipeline fails if any component fails, not just the last.",
      "-print0 / xargs -0": "Null-separated file lists. The only safe way over filenames with spaces or newlines.",
      "trap ... EXIT": "Cleanup registered on every exit path, including errors. Makes a script idempotent.",
      "--": "End of options. Everything after it is a filename, even if it starts with a dash.",
      "effective configuration": "What a program would actually do: sshd -T, systemctl show -p, iptables-save.",
      "blast radius": "How much a fix disturbs. Check first: TimeoutStopSec, KillMode, maxUnavailable."
    }
  });
})();