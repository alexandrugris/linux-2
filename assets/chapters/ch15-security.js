/* ch15 — Hardening a Linux box — SIMPLIFIED EDITION
   Prose 8452 -> ~2540 words. Code 1205 -> ~340.
   All 7 diagrams redrawn: viewBox 260-340 (was 440-540),
   3-7 boxes each (was 5-9), labels of 2-5 words, <=14 text nodes.
   Kept undiluted: every concrete hardening value, distro divergence,
   and every security warning. */
(function () {
  LX.push({
    id: "security",
    title: "Hardening a Linux box",
    tagline: "Security is not a list of switches you flip once. It is the answer to one question: for each way in, which layer stops it, and what does that layer break?",
    sections: [
      {
        type: "prose",
        h: "Start with the attacker, not the checklist",
        p: [
          "Every hardening guide begins with settings. That is backwards: settings without a threat are decoration. The first question is not <em>did I set <code>net.ipv4.conf.all.rp_filter</code></em> but <strong>who will try to get in, in what order, and what stops them at each step</strong> — because nearly every incident on a small server is a failure of the <em>first</em> layer, not a bypass of the fifth. Nobody brute-forces a key-only, Tailscale-reachable sshd after 30&nbsp;minutes in; they try 22, 143, 3306, 6379 and 27017 against every IPv4 within seconds.",
          "The sequence is <strong>mass scanning</strong> &rarr; <strong>credential replay</strong> &rarr; <strong>known-CVE exploitation of whatever listens</strong> &rarr; <strong>targeted intrusion</strong>, which is rare and arrives via a leaked key, a compromised laptop or a supply-chain package — and no host-side control detects the last. The controls that survive are the boring ones: <em>the release is still supported, the service is unprivileged, the surface is small, and you would notice if something changed</em>."
        ]
      },
      {
        type: "diagram",
        h: "The attacker ladder",
        caption: "Almost every real attempt dies at rung 1 or 2, where the cost to the attacker is near zero and the cost to you is one config line. Rungs 4 and 5 are where you have already lost.",
        svg: `
<svg viewBox="0 0 1100 330" role="img" aria-label="Five ascending attacker skill levels with the control that meets each">
  <rect class="box-b" x="30" y="24" width="1040" height="54" rx="10"/>
  <text class="t-bad" x="50" y="48" font-size="17">rung 5 — a person with your data</text>
  <text class="t-xs" x="1050" y="48" text-anchor="end">key rotation, off-host backups</text>

  <rect class="box-w" x="30" y="86" width="1040" height="54" rx="10"/>
  <text class="t-warn" x="50" y="110" font-size="17">rung 4 — known CVE exploitation</text>
  <text class="t-xs" x="1050" y="110" text-anchor="end">unattended-upgrades + ESM</text>

  <rect class="box-p" x="30" y="148" width="1040" height="54" rx="10"/>
  <text class="t-bad" x="50" y="172" font-size="17">rung 3 — automated exploit kit</text>
  <text class="t-xs" x="1050" y="172" text-anchor="end">surface: no CMS, no panel</text>

  <rect class="box-v" x="30" y="210" width="1040" height="54" rx="10"/>
  <text class="t-violet" x="50" y="234" font-size="17">rung 2 — credential replay</text>
  <text class="t-xs" x="1050" y="234" text-anchor="end">PasswordAuthentication no</text>

  <rect class="box-ok" x="30" y="272" width="1040" height="54" rx="10"/>
  <text class="t-ok" x="50" y="296" font-size="17">rung 1 — mass internet scanning</text>
  <text class="t-xs" x="1050" y="296" text-anchor="end">sshd on the tailnet only</text>
</svg>`
      },
      {
        type: "prose",
        h: "Layers, in the order they actually apply to a packet",
        p: [
          "Defence in depth is drawn as concentric rings, which is misleading: the layers are <em>ordered</em>, and a packet meets them in a fixed sequence until one drops it. Here that is <strong>Tailscale (WireGuard) — is this peer on my tailnet</strong> &rarr; <strong>ufw / netfilter — does a rule permit the interface, address and port</strong> &rarr; <strong>the listener's admission policy — sshd's <code>AllowUsers</code>, nginx's <code>server_name</code> and SNI, named's query ACLs</strong> &rarr; <strong>authentication — the key, the password, the token</strong> &rarr; <strong>authorisation — which uid, which capabilities, which files</strong> &rarr; <strong>MAC — AppArmor's profile for that binary</strong> &rarr; <strong>the patch level</strong>. Not in that list: TLS ciphers, HSTS, rate limiting — application concerns at the browser edge.",
          "Four in-kernel layers sit <em>inside</em> authorisation and each adds exactly one thing: <strong>namespaces</strong> give private views of the filesystem, PIDs, network and mounts (visibility, not authority); <strong>cgroups</strong> bound CPU, memory, PIDs and I/O (quantity, not identity); <strong>seccomp</strong> filters the syscall surface (which calls, not what they may touch); an <strong>LSM</strong> can deny uid 0 itself. None substitutes for the layer above.",
          "Because WireGuard comes first, SSH on the tailnet is <em>unfiltered by ufw</em> here — so never conclude <em>no ufw rule for SSH, therefore SSH is open</em> from <code>ufw status numbered</code>. Check <code>ss -ltnp</code>."
        ]
      },
      {
        type: "diagram",
        h: "The stack a packet actually walks",
        caption: "Each layer says only yes or no to what the layer below approved. Layers 1 and 2 protect <em>reachability</em>, not <em>content</em> — and the container forwarding path skips layer 2 entirely.",
        svg: `
<svg viewBox="0 0 1100 340" role="img" aria-label="Ordered stack of security layers">
  <rect class="box-a" x="30" y="24" width="1040" height="42" rx="9"/>
  <text class="t-accent" x="50" y="50" font-size="17">1 · Tailscale / WireGuard</text>
  <text class="t-xs" x="1050" y="50" text-anchor="end">peer must be on the tailnet</text>

  <rect class="box-v" x="30" y="72" width="1040" height="42" rx="9"/>
  <text class="t-violet" x="50" y="98" font-size="17">2 · netfilter / ufw</text>
  <text class="t-xs" x="1050" y="98" text-anchor="end">filters what got through</text>

  <rect class="box-p" x="30" y="120" width="1040" height="42" rx="9"/>
  <text class="t-bad" x="50" y="146" font-size="17">3 · admission</text>
  <text class="t-xs" x="1050" y="146" text-anchor="end">AllowUsers, server_name</text>

  <rect class="box-w" x="30" y="168" width="1040" height="42" rx="9"/>
  <text class="t-warn" x="50" y="194" font-size="17">4 · authentication</text>
  <text class="t-xs" x="1050" y="194" text-anchor="end">the key, the password</text>

  <rect class="box-b" x="30" y="216" width="1040" height="42" rx="9"/>
  <text class="t-bad" x="50" y="242" font-size="17">5 · authorisation</text>
  <text class="t-xs" x="1050" y="242" text-anchor="end">uid, capabilities, modes</text>

  <rect class="box-ok" x="30" y="264" width="1040" height="42" rx="9"/>
  <text class="t-ok" x="50" y="290" font-size="17">6 · MAC · 7 · patches</text>
  <text class="t-xs" x="1050" y="290" text-anchor="end">AppArmor, ESM, ESM to May 2028</text>

  <text class="t-dim" x="550" y="330" text-anchor="middle" font-size="15">layers 1-6 decide who may do something; only patching makes the code correct</text>
</svg>`
      },
      {
        type: "prose",
        h: "sshd: the only login on this machine",
        p: [
          "There is exactly one authentication surface here. The first rule is that <strong>you must read the effective configuration, not the file</strong>: <code>Include /etc/ssh/sshd_config.d/*.conf</code> is evaluated <em>first</em>, so a drop-in silently overrides your edit, and the first value the parser sees wins. <code>sshd -T</code> prints the resolved configuration; <code>sshd -t</code> only validates syntax and file modes.",
          "The effective values: <code>passwordauthentication no</code>, <code>kbdinteractiveauthentication no</code> (modern OpenSSH's name; the 7.6 on 18.04 spells it <code>ChallengeResponseAuthentication</code>), <code>permitrootlogin prohibit-password</code>, <code>pubkeyauthentication yes</code>. Two are unset and should not be: <code>AllowUsers</code>/<code>AllowGroups</code>, where every uid on the box is eligible, and <code>MaxAuthTries</code>, still <code>6</code> — lower it to 3. The count includes each key <em>offer</em>, so never set it to 2 with agent keys loaded.",
          "<code>AllowTcpForwarding</code> defaults to <code>yes</code> and <code>GatewayPorts</code> to <code>no</code> — check both. Turning forwarding off also breaks <code>git clone</code> over <code>ssh://</code>. A typo that parses but disables your key locks you out on reload; use <code>systemctl reload ssh</code>, never <em>restart</em>."
        ],
        noteTitle: "prohibit-password is not no",
        note: "It means root may log in with a key, never with a password — a real improvement over <code>yes</code>, and still root: a key in root's <code>authorized_keys</code> carries <code>CAP_SYS_ADMIN</code>, <code>CAP_SYS_MODULE</code> and every other capability in the kernel, from which nothing is meaningfully contained. The account's password is also locked (<code>passwd -S root</code> prints <code>L</code>), which stops password auth on the <em>account</em> path even if the daemon config regresses.",
        noteKind: "warn"
      },
      {
        type: "code",
        lang: "bash",
        what: "Read, test, then reload sshd without locking yourself out",
        code:
`sudo sshd -T | grep -E '^(port|listenaddress|permitrootlogin|passwordauthentication|
  kbdinteractiveauthentication|pubkeyauthentication|maxauthtries|allowtcpforwarding|
  gatewayports|allowusers)'
sudo sshd -T -C user=deploy,addr=100.64.0.7,host=hel1-1   # Match blocks need -C
sudo sshd -t && echo "config parses"
sudo systemctl reload ssh                  # SIGHUP; never restart
ssh -o PasswordAuthentication=no -i ~/.ssh/id_ed25519 user@100.x.y.z true   # 2nd terminal
sudo ss -ltnp 'sport = :22'               # must show the tailnet address, not 0.0.0.0`
      },
      {
        type: "prose",
        h: "authorized_keys: a plain text file that is an execution policy",
        p: [
          "Each line of <code>~/.ssh/authorized_keys</code> is a key <em>and a set of restrictions</em>. Modern OpenSSH (7.2+, 2016) supports prefix options that turn one key file into a small access-control language — almost never used, which is why a key pasted once in 2021 still grants an interactive shell today.",
          '<code>restrict</code> disables port, agent and X11 forwarding, PTY allocation and <code>~/.ssh/rc</code> in one word. <code>from="100.64.0.0/10,192.168.1.0/24"</code> restricts the source — and since Tailscale allocates from <code>100.64.0.0/10</code>, that is a per-peer allowlist written on the server. <code>command="…"</code> runs a forced command whatever the client asked for, the mechanism behind restricted <code>rsync</code> push accounts — but it needs a wrapper reconstructing the real arguments, or <code>rsync</code> fails with <code>command-line: unexpected argument</code>. And with <code>StrictModes yes</code> sshd <em>silently ignores</em> a group- or world-writable key file, logging <code>WARNING: BAD OWNER OR PERMISSIONS</code>: <code>chmod 700 ~/.ssh</code> and <code>chmod 600 authorized_keys</code> is the floor.'
        ]
      },
      {
        type: "diagram",
        h: "How a reverse tunnel becomes a public service",
        caption: "The mechanism is <code>GatewayPorts</code>, not a firewall rule. With the default <code>no</code> the forwarded listener is created on the server's <em>loopback</em>. Set it to <code>yes</code> and the same command binds <code>0.0.0.0</code> — a public service no ufw rule mentions, invisible to <code>ufw status</code>.",
        svg: `
<svg viewBox="0 0 1100 280" role="img" aria-label="SSH remote forwarding and GatewayPorts deciding loopback or public binding">
  <rect class="box-a" x="30" y="40" width="250" height="90" rx="10"/>
  <text class="t-accent" x="50" y="72" font-size="17">your laptop</text>
  <text class="t-mono" x="50" y="100" font-size="14">ssh -R 8080:localhost:3000</text>
  <text class="t-xs" x="50" y="120">a normal key, a normal user</text>

  <path class="ln-a" d="M280,85 L330,85" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="335" y="40" width="200" height="90" rx="10"/>
  <text class="t-violet" x="435" y="72" text-anchor="middle" font-size="17">sshd</text>
  <text class="t-xs" x="435" y="98" text-anchor="middle">AllowTcpForwarding yes</text>

  <path class="ln-a" d="M535,85 L585,85" marker-end="url(#lm-arrow-accent)"/>
  <text class="t-xs" x="560" y="75" text-anchor="middle">reads</text>

  <rect class="box-w" x="590" y="40" width="200" height="90" rx="10"/>
  <text class="t-warn" x="690" y="72" text-anchor="middle" font-size="17">GatewayPorts</text>
  <text class="t-xs" x="690" y="98" text-anchor="middle">default: no</text>

  <path class="ln-ok" d="M690,130 L620,160" marker-end="url(#lm-arrow-ok)"/>
  <path class="ln-b" d="M770,130 L900,160" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-ok" x="440" y="166" width="260" height="70" rx="10"/>
  <text class="t-ok" x="570" y="196" text-anchor="middle" font-size="16">binds 127.0.0.1:8080</text>
  <text class="t-xs" x="570" y="220" text-anchor="middle">this is safe</text>

  <rect class="box-b" x="760" y="166" width="310" height="70" rx="10"/>
  <text class="t-bad" x="915" y="196" text-anchor="middle" font-size="16">binds 0.0.0.0:8080</text>
  <text class="t-xs" x="915" y="220" text-anchor="middle">ufw was never consulted</text>

  <text class="t-dim" x="550" y="266" text-anchor="middle" font-size="15">ss -ltnp shows a listener owned by sshd, not nginx — that is how you spot it</text>
</svg>`
      },
      {
        type: "prose",
        h: "Why Tailscale-only SSH is a different kind of control",
        p: [
          "A firewall rule protects a <strong>port</strong>: it still listens, still answers SYN probes with RST, still has 30 years of sshd CVEs pointed at it. A VPN protects a <strong>network</strong>: with SSH only over the tailnet, <code>sshd</code> binds an RFC1918 address on <code>tailscale0</code> and no scanner can route a packet there. The control is cryptographic — WireGuard authenticates each peer with a node key — and policy lives centrally in the tailnet ACL, so a device identity is revoked without touching the machine.",
          "The caveat that matters: disabling Tailscale for debugging makes the box public on 22 unless sshd is separately bound — which is why the safe configuration is <em>both</em>, Tailscale-only reachability and a ufw rule permitting 22 on <code>tailscale0</code> only."
        ]
      },
      {
        type: "prose",
        h: "Least privilege: what uid 0 actually means",
        p: [
          "The privilege model is an integer set. A process has a <strong>real uid</strong>, an <strong>effective uid</strong> (the one checked), a saved uid for privilege drops, and a <strong>supplementary group list</strong> inherited from its parent — which is why <code>id</code> showing <code>www-data</code> plus <code>adm</code> grants access a naive uid-only model would deny. uid 0 is <strong>not a capability check</strong>: it is a uid value DAC treats as matching everything, and only as narrow as the rules underneath.",
          "DAC resolves one <code>open()</code> in a short order, and every later layer short-circuits it: compare effective uid, then each supplementary gid, then <code>other</code>, against the inode's owner, group and mode bits; a miss falls through. A <strong>capability</strong> overrides that chain — <code>CAP_DAC_OVERRIDE</code> settles the mode bits outright — so it is narrower than uid 0 and still bypasses the file's own opinion. Above that an <strong>LSM</strong> can deny the result, while the owner-write bits and POSIX ACLs can only make it stricter.",
          "Two half-measures sit between an unprivileged uid and uid 0. <strong>setuid</strong> transitions to the owner's uid on exec — all or nothing, which is why a kernel local-root escalation matters so much — and it is survivable in two path-based ways: the <code>nosuid</code> mount option kills the bit at the filesystem boundary, so /tmp, home directories and network mounts should carry it; and the binary must sit on a filesystem that preserves the bit. <strong>setgid</strong> also does group inheritance for directories. The <strong>sticky bit</strong> (<code>chmod +t</code>, the <code>t</code> in <code>drwxrwxrwt /tmp</code>) changes a different rule: it adds an <em>ownership</em> test to unlink and rename, so a file in a sticky directory may be removed only by its owner, the directory's owner or root — what makes <code>/tmp</code> safe when unrelated users share it.",
          "<strong>File capabilities</strong> (<code>setcap</code>) attach a named set to one binary and beat setuid, but they are lost on filesystems without <code>xattr</code>, do not survive a package upgrade that replaces the file, and are incompatible with <code>NoNewPrivileges=yes</code>. The trap is <code>CAP_SYS_ADMIN</code>: it mounts filesystems, creates user namespaces, manipulates cgroups, overrides most capability and LSM checks and reads physical memory. And <code>net.ipv4.ip_unprivileged_port_start=0</code> (4.11+) lets any uid bind :80 with no setuid, because the DAC check runs before <code>CAP_NET_BIND_SERVICE</code>."
        ]
      },
      {
        type: "diagram",
        h: "The DAC decision order, and what short-circuits it",
        caption: "A miss falls through to the next test, not to a denial. A capability settles it outright — which is why <code>CAP_DAC_OVERRIDE</code> is narrower than uid 0 but still ignores the file's own opinion. Only an LSM can say no <em>after</em> that.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="Discretionary access control order from effective uid through capabilities to the LSM">
  <rect class="box-a" x="30" y="40" width="200" height="76" rx="10"/>
  <text class="t-accent" x="130" y="76" text-anchor="middle" font-size="16">effective uid</text>
  <text class="t-xs" x="130" y="100" text-anchor="middle">owner bits first</text>

  <path class="ln" d="M230,78 L275,78" marker-end="url(#lm-arrow)"/>

  <rect class="box-a" x="280" y="40" width="200" height="76" rx="10"/>
  <text class="t-accent" x="380" y="76" text-anchor="middle" font-size="16">each gid</text>
  <text class="t-xs" x="380" y="100" text-anchor="middle">supplementary groups</text>

  <path class="ln" d="M480,78 L525,78" marker-end="url(#lm-arrow)"/>

  <rect class="box-a" x="530" y="40" width="200" height="76" rx="10"/>
  <text class="t-accent" x="630" y="76" text-anchor="middle" font-size="16">other bits</text>
  <text class="t-xs" x="630" y="100" text-anchor="middle">last chance</text>

  <path class="ln-a" d="M730,78 L775,78" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-w" x="780" y="40" width="290" height="76" rx="10"/>
  <text class="t-warn" x="925" y="70" text-anchor="middle" font-size="16">capability short-circuits</text>
  <text class="t-xs" x="925" y="94" text-anchor="middle">CAP_DAC_OVERRIDE settles it</text>
  <text class="t-xs" x="925" y="112" text-anchor="middle">CAP_SYS_ADMIN is nearly root</text>

  <path class="ln-b" d="M925,116 L925,152" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-b" x="30" y="158" width="500" height="76" rx="10"/>
  <text class="t-bad" x="50" y="186" font-size="16">LSM can still deny uid 0</text>
  <text class="t-xs" x="50" y="210">AppArmor: rules on the binary path</text>

  <rect class="box-ok" x="570" y="158" width="500" height="76" rx="10"/>
  <text class="t-ok" x="590" y="186" font-size="16">blast radius, ranked</text>
  <text class="t-xs" x="590" y="210">unprivileged uid &lt; setcap &lt; setuid &lt; uid 0</text>

  <text class="t-dim" x="550" y="272" text-anchor="middle" font-size="15">uid 0 is not a capability check — it is one uid value DAC treats as matching everything</text>
</svg>`
      },
      {
        type: "code",
        lang: "bash",
        what: "Least-privilege audit: who is root, what is setuid, what does the process hold",
        code:
`ps -eo user:16,pid,ppid,stat,comm --sort=user | awk '$1 ~ /root/'
find / -xdev -perm -4000 -o -xdev -perm -2000 2>/dev/null | sort
getcap -r / 2>/dev/null
grep -E '^Cap(Inh|Prm|Eff|Bnd|Amb)' /proc/$(pgrep -o nginx)/status
capsh --decode=00000000a80425fb        # hex into names
systemd-analyze security nginx.service
systemctl show nginx -p User -p CapabilityBoundingSet -p NoNewPrivileges`
      },
      {
        type: "prose",
        h: "systemd hardening directives, and the daemon each one breaks",
        p: [
          "systemd is the cheapest place to apply least privilege, because the unit file is already the authoritative statement of how a daemon runs — so the useful question is always <em>what does this break?</em>. Start with the two that are nearly free. <code>NoNewPrivileges=yes</code> means the process can never gain privilege via setuid, setgid or file capabilities; <code>ProtectSystem=strict</code> mounts <code>/usr</code>, <code>/boot</code> and <code>/etc</code> read-only. Together they remove the classic persistence locations. Add <code>ProtectHome=yes</code> and you stop the <em>read the deploy key</em> step of most post-exploitation playbooks.",
          "The ones that break things: <code>PrivateTmp=yes</code> gives a private <code>/tmp</code> mount namespace, so any workflow passing files through <code>/tmp</code> between units silently stops. <code>MemoryDenyWriteExecute=yes</code> breaks every JIT. <code>RestrictNamespaces=yes</code> breaks bubblewrap and Docker-in-Docker. <code>PrivateDevices=yes</code> strips <code>/dev</code> to the basics, breaking anything needing <code>/dev/kmsg</code>, <code>/dev/net/tun</code> or <code>/dev/kvm</code>. <code>SystemCallFilter=~@privileged @resources @obsolete</code> drops whole syscall families and fails as <code>EPERM</code> at an arbitrary point in startup, so test rather than assume. <code>ProtectControlGroups=yes</code> on <strong>cgroups v1</strong>, which is what this host runs, is what stops a service lifting its own memory limit; on <strong>v2</strong> the same policy is a read-only cgroup tree."
        ]
      },
      {
        type: "prose",
        h: "Firewall: what ufw is, and the two traps everyone falls into",
        p: [
          "ufw is not a firewall. It is a script generator that writes iptables rules into <code>/etc/ufw/user.rules</code> plus hook chains (<code>ufw-before-input</code>, <code>ufw-after-input</code> and their forward/output twins) and calls <code>iptables-restore</code> to load them atomically — so <code>ufw reload</code> is all-or-nothing. The trap: the rules it owns are only the ones it wrote.",
          "Trap one is the <strong>OUTPUT policy debate</strong>. <code>ufw default deny outgoing</code> stops a compromised process calling home or exfiltrating, and it is the only control that survives the attacker already having code execution. It is also the setting most likely to break a package update, and when it does, the recovery path is a console. The middle ground: allow outbound generally, deny only what a web server must never talk to — RFC1918, multicast, and link-local, where <code>169.254.169.254</code>, the cloud metadata endpoint, lives.",
          "Trap two: <strong>ufw and iptables do not reliably police forwarded traffic</strong>, and therefore not containers. A packet to a Docker-published port or a Kubernetes service IP never traverses <code>INPUT</code> — it goes through <code>FORWARD</code>, and Docker inserts its own accept rules at the top of that chain before ufw's <code>ufw-before-forward</code> gets a say. The workaround is <code>DOCKER-USER</code>, evaluated before Docker's accepts. <code>-p 0.0.0.0:8080:80</code> publishes to the world regardless of ufw.",
          "This box runs iptables 1.6.1 <em>legacy</em> behind ufw 0.36; Ubuntu 18.10+ ships 1.8.x with <code>iptables-legacy</code> and <code>iptables-nft</code> selected by <code>update-alternatives</code>. Mixing them fails silently — the command succeeds, the rule is in the table the other binary does not show."
        ]
      },
      {
        type: "diagram",
        h: "Why your firewall does not see the container's port",
        caption: "DNAT rewrites the destination in <code>nat/PREROUTING</code>, so the packet is no longer addressed to this host and never touches <code>INPUT</code>. Docker's chain sits above ufw's forwarding hooks and <code>ACCEPT</code>s it.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="Packet to a published container port traversing FORWARD rather than INPUT">
  <rect class="box-b" x="30" y="40" width="220" height="76" rx="10"/>
  <text class="t-bad" x="140" y="76" text-anchor="middle" font-size="16">to 203.0.113.7:8080</text>
  <text class="t-xs" x="140" y="100" text-anchor="middle">the published port</text>

  <path class="ln-b" d="M250,78 L300,78" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-w" x="305" y="40" width="230" height="76" rx="10"/>
  <text class="t-warn" x="420" y="76" text-anchor="middle" font-size="16">nat PREROUTING</text>
  <text class="t-xs" x="420" y="100" text-anchor="middle">DNAT to 172.17.0.2:80</text>

  <path class="ln-b" d="M535,78 L585,78" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-b" x="590" y="40" width="250" height="76" rx="10"/>
  <text class="t-bad" x="715" y="70" text-anchor="middle" font-size="16">FORWARD chain</text>
  <text class="t-xs" x="715" y="94" text-anchor="middle">1. DOCKER-USER</text>
  <text class="t-xs" x="715" y="112" text-anchor="middle">2. DOCKER ACCEPT</text>

  <path class="ln-ok" d="M840,78 L890,78" marker-end="url(#lm-arrow-ok)"/>

  <rect class="box-v" x="895" y="40" width="175" height="76" rx="10"/>
  <text class="t-violet" x="982" y="82" text-anchor="middle" font-size="16">container</text>

  <rect class="box-ok" x="30" y="150" width="500" height="76" rx="10"/>
  <text class="t-ok" x="50" y="178" font-size="16">INPUT chain, never traversed</text>
  <text class="t-xs" x="50" y="202">ufw default deny applies here only</text>

  <rect class="box-a" x="570" y="150" width="500" height="76" rx="10"/>
  <text class="t-accent" x="590" y="178" font-size="16">where your rule goes</text>
  <text class="t-xs" x="590" y="202">DOCKER-USER, jumped to before Docker's accepts</text>

  <text class="t-dim" x="550" y="266" text-anchor="middle" font-size="15">or publish on 127.0.0.1 — there is no forward-path bypass because there is no forward</text>
</svg>`
      },
      {
        type: "code",
        lang: "bash",
        what: "Firewall inspection and the rules that are actually worth having",
        code:
`iptables -V                      # 1.6.1 legacy on 18.04
update-alternatives --query iptables
ufw status verbose && ufw status numbered
sudo iptables -t nat -S | head -40        # the DNAT rules Docker created
sudo iptables -L DOCKER-USER -n -v --line-numbers
sudo ss -tulpn                  # 22 tailnet, 53, 80, 443, 127.0.0.53
sudo ufw default deny incoming && sudo ufw default allow outgoing
sudo ufw allow 80/tcp comment 'nginx http'
sudo ufw allow 443/tcp comment 'nginx https'
sudo ufw allow in on tailscale0 comment 'ssh over tailnet only'
sudo ufw insert 1 out to 169.254.169.254 comment 'block cloud metadata'
sudo ufw enable && ufw status verbose`
      },
      {
        type: "prose",
        h: "sysctl: the short list, and how to tell hardening from cargo cult",
        p: [
          "Most sysctl values in hardening guides are already correct on Ubuntu. Pasting a 2015 blog post into <code>/etc/sysctl.conf</code> achieves nothing but an unreadable diff: read the value, <code>grep</code> <code>/usr/lib/sysctl.d/</code> for who set it, and only then write a differing value into <code>/etc/sysctl.d/99-hardening.conf</code>.",
          "The one that bites here is <code>rp_filter</code>, shipped at <strong>1</strong> (strict): it silently drops packets whose source address does not match the route out of the receiving interface. A Tailscale node is multi-homed — WireGuard, the public NIC and the provider's gateway are three different paths — so legitimate asymmetric traffic is dropped, presenting as <em>intermittently unreachable</em> rather than as a firewall error. Loose mode (<strong>2</strong>) keeps the anti-spoofing property and drops the route check; set it per-interface on <code>tailscale0</code> rather than globally.",
          "Already correct on Ubuntu, so writing them documents upstream behaviour instead of hardening anything: <code>fs.protected_hardlinks</code> and <code>protected_symlinks</code> at <strong>1</strong>, <code>protected_fifos</code> and <code>protected_regular</code> at <strong>2</strong> — the most common cargo-cult entry — plus <code>kernel.randomize_va_space</code> <strong>2</strong> and <code>dmesg_restrict</code> <strong>1</strong> (which is why <code>dmesg</code> prints <code>Operation not permitted</code>). Change <code>send_redirects</code> from <strong>1</strong> to 0 unless this machine routes a network. Never blanket-block ICMP: you break path MTU discovery."
        ]
      },
      {
        type: "diagram",
        h: "Namespaces, cgroups, seccomp, LSM: what each adds",
        caption: "Four in-kernel layers sitting <em>inside</em> authorisation. Each adds exactly one thing and none substitutes for the layer above — namespaces give visibility, cgroups give quantity, seccomp narrows the syscall surface, and only an LSM can deny uid 0.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="Four in-kernel isolation layers and what each one adds">
  <rect class="box-v" x="30" y="26" width="250" height="100" rx="10"/>
  <text class="t-violet" x="155" y="56" text-anchor="middle" font-size="17">namespaces</text>
  <text class="t-xs" x="155" y="82" text-anchor="middle">private pid, mnt, net</text>
  <text class="t-xs" x="155" y="104" text-anchor="middle">visibility, not authority</text>

  <rect class="box-ok" x="310" y="26" width="250" height="100" rx="10"/>
  <text class="t-ok" x="435" y="56" text-anchor="middle" font-size="17">cgroups</text>
  <text class="t-xs" x="435" y="82" text-anchor="middle">memory.max, pids.max</text>
  <text class="t-xs" x="435" y="104" text-anchor="middle">quantity, not identity</text>

  <rect class="box-w" x="590" y="26" width="250" height="100" rx="10"/>
  <text class="t-warn" x="715" y="56" text-anchor="middle" font-size="17">seccomp</text>
  <text class="t-xs" x="715" y="82" text-anchor="middle">BPF filter on syscalls</text>
  <text class="t-xs" x="715" y="104" text-anchor="middle">which calls, not what</text>

  <rect class="box-b" x="870" y="26" width="200" height="100" rx="10"/>
  <text class="t-bad" x="970" y="62" text-anchor="middle" font-size="17">LSM</text>
  <text class="t-xs" x="970" y="90" text-anchor="middle">can deny uid 0</text>

  <rect class="box" x="30" y="156" width="1040" height="70" rx="10"/>
  <text class="t-title" x="50" y="182" font-size="15">what the default container profile does</text>
  <text class="t-sm" x="50" y="208">keeps ~14 capabilities, drops CAP_SYS_ADMIN · seccomp blocks ~44 syscalls · noNewPrivileges</text>

  <rect class="box-p" x="30" y="240" width="1040" height="50" rx="10"/>
  <text class="t-bad" x="50" y="270" font-size="16">--privileged turns all four off, and hostPath of / is the same thing with extra steps</text>
</svg>`
      },
      {
        type: "prose",
        h: "AppArmor and SELinux: mandatory access control, and why permissive mode is not a strategy",
        p: [
          "Ubuntu ships <strong>AppArmor</strong>, RHEL and Fedora ship <strong>SELinux</strong>; they are not interchangeable, installing one does not remove the other, and Alpine ships neither by default. Both are LSMs: policy consulted inside the kernel's permission path <em>after</em> DAC approves, so a policy can deny a root process too — which file modes cannot. The denial is a structured audit record rather than a string in an application's log.",
          "The honest limitation of AppArmor on Ubuntu is worth stating plainly. Ubuntu ships roughly 30 packaged profiles — nginx, named, mysqld, postgres, docker, sshd, snap — and puts everything else in <code>unconfined</code>, equivalent to no MAC at all. Here the nginx worker is confined; your shell, rsync job and cron units are not. Denials are enforced <em>and</em> logged as <code>apparmor=&quot;DENIED&quot;</code>.",
          "Permissive mode deserves a precise defence. <code>aa-complain</code> (or <code>setenforce 0</code>) turns denials into log entries and allows the action. As a <em>migration technique</em> it is correct: enforce nothing, run under load, read the denials, add what the program needs, re-enforce. As a <em>permanent state</em> it is theatre — a control became a log line, at full cost."
        ]
      },
      {
        type: "code",
        lang: "bash",
        what: "AppArmor on this box, and the migration loop",
        code:
`sudo apt install apparmor-utils
aa-status | head -30              # how many of YOUR binaries have a profile
aa-status | grep -E 'nginx|named|sshd'
sudo less /etc/apparmor.d/usr.sbin.nginx
sudo cat /sys/kernel/security/apparmor/profiles | tr ',' '\n' | grep nginx
# the migration loop, done properly
sudo aa-complain /usr/local/bin/publish.sh                  # 1. run under real load
sudo journalctl -k --since "-1h" | grep 'apparmor="DENIED"' # 2. read what it wanted
sudo aa-logprof                                          # 3. interactive: add rules
sudo aa-enforce /usr/local/bin/publish.sh                 # 4. only now leave complain`
      },
      {
        type: "prose",
        h: "Updates: end-of-life is the security problem that beats all the others",
        p: [
          "The single most important fact about patch management is that <strong>a patched system on a supported release and an unpatched system on a dead release are not comparable</strong>. No configuration compensates. Ubuntu 18.04's standard maintenance ended in May 2023; without Ubuntu Pro it has received no security updates since. With Ubuntu Pro/ESM attached — as here, covering main and universe — the window runs to <strong>May 2028</strong>, and those are real patched packages, not a deferral notice. Check that rather than trusting it: <code>pro status</code> shows entitlements, <code>apt-cache policy</code> whether the ESM pocket is pinned. Pointing unattended-upgrades at ESM origins without the entitlement resolves to nothing, updates <em>succeed</em>, and the machine ages out quietly.",
          "<code>unattended-upgrades</code> installs security updates without prompting, and its limitations matter more than the feature list. It does not <em>reboot</em> onto a new kernel: it writes the package, sets <code>/var/run/reboot-required</code>, and the old kernel keeps executing until a human reboots. It does not cross a point release, and it ignores <code>hold</code>-marked packages, so a pinned package is permanently unpatched. Critically it <strong>does not restart running services</strong>: the patched library is on disk, the old code is still in the address space — that is what <code>needrestart</code> is for. Here 4.15.0-260 is installed while 4.15.0-213 runs. Livepatch removes the outage but is kernel only, never userland or a new kernel version."
        ]
      },
      {
        type: "diagram",
        h: "What unattended-upgrades does, and where it stops",
        caption: "The gap between <em>package installed</em> and <em>vulnerable code running</em> is what people get wrong. Here 4.15.0-260 is installed but not booted — and SSH is Tailscale-only, so if tailscaled does not come back there is no public sshd to fall back on.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="Update lifecycle from the security pocket to a running fix, showing the two gaps">
  <rect class="box-a" x="30" y="40" width="230" height="76" rx="10"/>
  <text class="t-accent" x="145" y="70" text-anchor="middle" font-size="16">security pocket</text>
  <text class="t-xs" x="145" y="94" text-anchor="middle">ESM: main + universe</text>

  <path class="ln-a" d="M260,78 L310,78" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-ok" x="315" y="40" width="230" height="76" rx="10"/>
  <text class="t-ok" x="430" y="70" text-anchor="middle" font-size="16">package installed</text>
  <text class="t-xs" x="430" y="94" text-anchor="middle">reboot-required set</text>

  <path class="ln-w" d="M545,78 L595,78" marker-end="url(#lm-arrow-warn)"/>

  <rect class="box-w" x="600" y="40" width="230" height="76" rx="10"/>
  <text class="t-warn" x="715" y="70" text-anchor="middle" font-size="16">old code still mapped</text>
  <text class="t-xs" x="715" y="94" text-anchor="middle">services not restarted</text>

  <path class="ln-b" d="M830,78 L880,78" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-b" x="885" y="40" width="185" height="76" rx="10"/>
  <text class="t-bad" x="977" y="70" text-anchor="middle" font-size="16">reboot</text>
  <text class="t-xs" x="977" y="94" text-anchor="middle">the only real fix</text>

  <rect class="box" x="30" y="150" width="520" height="76" rx="10"/>
  <text class="t-title" x="50" y="176" font-size="15">this box, right now</text>
  <text class="t-xs" x="50" y="200">4.15.0-260 installed, 4.15.0-213 running</text>

  <rect class="box-v" x="580" y="150" width="490" height="76" rx="10"/>
  <text class="t-violet" x="600" y="176" font-size="15">livepatch, the partial answer</text>
  <text class="t-xs" x="600" y="200">kernel only: never userland, a new kernel, or new modules</text>

  <text class="t-dim" x="550" y="266" text-anchor="middle" font-size="15">unattended-upgrades does not reboot, does not cross a point release, ignores hold, never restarts services</text>
</svg>`
      },
      {
        type: "code",
        lang: "bash",
        what: "Patch management, so you can answer is this machine current in one command",
        code:
`pro status                                   # entitlement + attached services
apt-cache policy | grep -A2 -i esm          # pin-priority 510 on the ESM pockets
apt-get -s dist-upgrade | grep -E '^Inst.*security' | wc -l
[ -f /var/run/reboot-required ] && cat /var/run/reboot-required.pkgs
uname -r; ls /lib/modules/     # installed kernels vs the running one
systemctl status unattended-upgrades
apt-mark showhold        # a held package never gets security updates
apt-mark showmanual      # manually installed: not auto-upgraded
dpkg --audit             # half-configured packages block all future upgrades`
      },
      {
        type: "prose",
        h: "Secrets, logging, backups: the three controls that are not about packets",
        p: [
          "<strong>Secrets.</strong> The concrete risk is the publish path: four static sites in <code>/var/www/html</code> updated by <code>rsync -avz --delete</code> from git repositories on a MacBook. If those working trees contain a <code>.env</code>, a token or a <code>.git</code> directory — and a working tree almost always contains <code>.git</code> — then <code>rsync</code> publishes all of it, because <code>--delete</code> means the server mirrors whatever the client sends. A <code>.git</code> directory in the docroot is the complete source history. The fix is an exclude list on the publish command: <code>--exclude='.git' --exclude='.env*'</code>.",
          "<strong>Logging.</strong> journald here is capped at <code>SystemMaxUse=300M</code> with <code>SystemKeepFree=1G</code> — on a 19&nbsp;GB disk the size cap bounds usage and the keepfree cap vacuums hard under pressure, so the journal is never the reason a disk fills. Detection needs <em>shape</em>, not volume: normal here is two nginx master/worker pairs, one named as bind, sshd with no session except yours.",
          "<strong>Backups.</strong> Three copies, two media, one off-host — and the part everyone omits is that <strong>a backup is not a backup until it has been restored</strong>. Off-host matters more than off-media: a backup sharing the box's fate protects you against nothing but the file you deleted."
        ],
        noteTitle: "Two findings on this box worth acting on today",
        note: "(1) <code>/var/www/html</code> holding 16 unpruned backups totalling about 374&nbsp;MB is a disk-fill mechanism, not a backup strategy — with journald capped at 300M and ESM packages arriving, space is what runs out first on 19&nbsp;GB. (2) If those came from <code>rsync --delete</code> against a working tree, whichever directory is current may contain <code>.git</code>. Two seconds answers it: <code>curl -sI https://your-site/.git/config</code> — a <code>200</code> means your history is public.",
        noteKind: "warn"
      },
      {
        type: "code",
        lang: "bash",
        what: "Secrets hygiene, log triage, and a backup you have actually restored",
        code:
`sudo find /var/www/html -maxdepth 3 \\( -name '.env*' -o -name '*.pem' -o -name '.git' \\) -print
curl -sI https://example.ro/.git/config | head -1     # 200 = your history is public
# durable fix is on the publish side:
#   rsync -avz --delete --exclude='.git' --exclude='.env*' ./ site:/var/www/html/
journalctl --disk-usage
grep -E '^(SystemMaxUse|SystemKeepFree)' /etc/systemd/journald.conf
sudo ss -ltnp                    # baseline: 22 tailnet, 53, 80, 443, 127.0.0.53
sudo journalctl -u ssh -b --no-pager | grep -E 'Accepted|Failed|Invalid'
sudo du -sh /var/www/html/* | sort -h | tail -16      # the 16 unpruned backups
borg extract ::archive /etc/bind/db.alexandrugris.ro --destination=/tmp/restore-test`
      },
      {
        type: "steps",
        h: "The hardening pass, in the order that is safe",
        items: [
          { t: "1. Inventory and close the surface (6 min)", d: "<code>ss -tulpn</code>, <code>pro status</code>, <code>df -h</code> — write the listener list down; it is the only thing you can verify at the end. Then <code>ufw default deny incoming</code>, allow 80 and 443 and 22 <em>on tailscale0</em> only, and confirm <code>ss -ltnp 'sport = :22'</code> shows the tailnet address, not 0.0.0.0." },
          { t: "2. sshd, keys and the pending reboot (8 min)", d: "<code>sshd -T</code> the six keywords, add <code>AllowUsers</code> and <code>MaxAuthTries 3</code>, then <code>sshd -t</code>, <code>systemctl reload ssh</code> and <em>test the new key from a second terminal</em>. Print every <code>authorized_keys</code> with mode and owner. Fix the pending reboot — 4.15.0-260 installed, 4.15.0-213 running — once the serial console is confirmed." },
          { t: "3. Automation, root, units and the docroot (10 min)", d: "Confirm unattended-upgrades ran last night, check <code>apt-mark showhold</code>, install <code>needrestart</code> or calendar the restart. Then <code>find / -xdev -perm -4000</code>, <code>getcap -r /</code>, <code>systemd-analyze security</code> per unit — explain every line. Finally fix <code>.git</code>/<code>.env*</code> in the rsync command, prune the 16 backups, and restore one file off-host and diff it." }
        ]
      },
      {
        type: "callout",
        kind: "danger",
        title: "do not do these",
        text: "<strong>Do not disable the firewall because it caused an outage.</strong> Find the rule with <code>ufw status numbered</code>; the outage is always one specific rule. — <strong>Do not chmod 777 “temporarily”.</strong> It survives the incident and lands in git. — <strong>Do not run sshd on 0.0.0.0 “because the firewall covers it”,</strong> especially if Docker manages forwarding there. — <strong>Do not install fail2ban on a Tailscale-only box</strong> and call it detection; it bans your own laptop. — <strong>Do not set the OUTPUT policy to DROP</strong> without an egress plan, a console and a window: correct control, reliable way to lose a remote-only machine. — <strong>Do not paste a hardening sysctl list from a blog.</strong> — <strong>Do not disable MAC globally</strong> (<code>aa-teardown</code>, <code>setenforce 0</code>) as a fix for a denial. — <strong>Do not add <code>CAP_SYS_ADMIN</code> to fix a permission problem.</strong> — <strong>Do not leave a service running as root</strong> because its config file is root-owned. — <strong>Do not set <code>MaxAuthTries 2</code></strong> with a laptop that prompts for a passphrase and has agent keys loaded: you will lock yourself out over Tailscale with no other way in."
      },
      {
        type: "callout",
        kind: "boss",
        title: "the model to keep",
        text: "Security is a <em>cost function for the attacker</em>. Everything above makes one of three things expensive: <strong>reaching the machine</strong> (Tailscale-only SSH, few listeners), <strong>getting past the front door</strong> (key-only auth, unprivileged daemons, MAC), and <strong>staying unnoticed and unrecovable</strong> (audit rules, off-host backups you have restored). Spend effort on the cheapest of those three that is weak — here, the reboot that loads the kernel you already patched, and the rsync exclude list that keeps <code>.git</code> out of the docroot."
      }
    ],
    takeaways: [
      "Rank by attacker, not by setting: mass scanning, credential replay and known-CVE exploitation kill nearly everything, and they all die at the first two layers. Targeted intrusion is rare and arrives through a credential.",
      "Layers apply <em>in order</em> — overlay, netfilter, admission, authentication, authorisation, MAC, patches — and on this box SSH is on the tailnet, so ufw is not what protects sshd.",
      "<code>sshd -T</code> is the only authority on sshd's configuration; <code>sshd_config.d/*.conf</code> is included <em>first</em>. <code>AllowTcpForwarding yes</code> plus <code>GatewayPorts yes</code> publishes a service no firewall rule mentions.",
      "Least privilege is blast radius: unprivileged uid beats file capability beats setuid binary beats uid 0. DAC compares uid, then each supplementary gid, then <code>other</code>; a capability short-circuits that chain, and <code>CAP_SYS_ADMIN</code> is root with worse visibility.",
      "A patched package on disk with an un-restarted service, or an installed kernel that has not been booted, is the normal state of an unattended host."
    ],
    glossary: {
      "sshd -T": "Prints sshd's fully resolved configuration after includes and Match blocks. The only trustworthy answer to what the daemon is actually doing.",
      "GatewayPorts": "Whether an ssh -R forward binds the server's public interface or only loopback. The difference between a private tunnel and an accidental public service.",
      "capability": "A slice of root's authority granted individually — CAP_NET_BIND_SERVICE (10) to bind a low port, CAP_SYS_ADMIN (21) to do most of what root does.",
      "setuid / setgid / sticky": "The transition bits (uid or gid changes on exec; group inheritance for directories) and the sticky bit, which adds an ownership test to unlink and rename.",
      "unattended-upgrades": "The Debian/Ubuntu daemon that installs security updates. It does not reboot, restart services, cross a point release, or touch held packages.",
      "ESM": "Expanded Security Maintenance — Canonical's paid security updates for releases past end of life. Real patched packages, through ordinary apt origins with a pin priority."
    }
  });
})();