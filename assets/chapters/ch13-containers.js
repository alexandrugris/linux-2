/* ch13 — Containers and containerd, behind the scenes — SIMPLIFIED EDITION
   Prose 2454 -> ~740 words. Code 146 -> ~40.
   All 5 diagrams redrawn: viewBox 260-320 (was 560-700),
   3-5 boxes each (was 16-22), labels of 2-5 words, <=14 text nodes.
   The containerd anatomy becomes the chain kubelet -> CRI -> containerd -> shim -> runc. */
(function () {
  LX.push({
    id: "containers",
    title: "Containers and containerd, behind the scenes",
    tagline: "A container is a rootfs, some namespaces, a cgroup and a credential profile. containerd is the daemon that assembles those four things from an image and a config, on behalf of whatever asked.",
    sections: [
      {
        type: "prose",
        h: "A container is a process — true, and useless on its own",
        p: [
          "Every container is a Linux process; that is exactly what is true. But <em>process</em> describes what it is, not what the runtime does to it. Four things make it a container: <strong>a rootfs</strong> assembled from read-only image layers under an overlay; <strong>its own namespaces</strong>, so the PIDs, mounts and interfaces it sees are copies rather than globals; <strong>a cgroup</strong>, so the kernel bounds what it consumes; and <strong>a credential profile</strong> deciding what it may attempt."
        ]
      },
      {
        type: "diagram",
        h: "The four layers",
        caption: "One line each. The part people miss is what stays shared: the kernel, the wall clock, the page cache, and every device node you exposed. For your own code that is a non-issue; for genuinely hostile code it is the whole risk, and the answer is a VM.",
        svg: `
<svg viewBox="0 0 1100 320" role="img" aria-label="The four layers that make a container">
  <rect class="box-a" x="30" y="24" width="1040" height="58" rx="10"/>
  <text class="t-accent" x="50" y="48" font-size="17">1 · rootfs</text>
  <text class="t-sm" x="220" y="48">overlay of read-only layers, one writable layer</text>
  <text class="t-xs" x="1050" y="48" text-anchor="end">hides the host filesystem</text>

  <rect class="box-v" x="30" y="92" width="1040" height="58" rx="10"/>
  <text class="t-violet" x="50" y="116" font-size="17">2 · namespaces</text>
  <text class="t-sm" x="220" y="116">pid · mnt · net · uts · ipc · user · cgroup · time</text>
  <text class="t-xs" x="1050" y="116" text-anchor="end">hides other processes</text>

  <rect class="box-ok" x="30" y="160" width="1040" height="58" rx="10"/>
  <text class="t-ok" x="50" y="184" font-size="17">3 · cgroup</text>
  <text class="t-sm" x="220" y="184">memory.max · cpu.max · pids.max · io.max</text>
  <text class="t-xs" x="1050" y="184" text-anchor="end">bounds consumption, not identity</text>

  <rect class="box-p" x="30" y="228" width="1040" height="58" rx="10"/>
  <text class="t-bad" x="50" y="252" font-size="17">4 · credentials</text>
  <text class="t-sm" x="220" y="252">capabilities · seccomp · noNewPrivileges · maskedPaths</text>
  <text class="t-xs" x="1050" y="252" text-anchor="end">restricts what it may attempt</text>
</svg>`
      },
      {
        type: "prose",
        h: "The image, and the daemon that assembles it",
        p: [
          "An OCI image is <strong>a content-addressed list of blobs</strong>: a manifest naming the layers, a config JSON describing how to run it, and each layer named by the SHA-256 of its own contents. Because the digest <em>is</em> the identity, layers shared by digest are stored once — the answer to “why is my 40 MB app 1.2 GB”. And <strong>pulling is not starting</strong>: pull verifies digests and downloads blobs into the content store, then the snapshotter <em>unpacks</em> each layer into a snapshot directory by applying its diffs.",
          "containerd is deliberately small — a gRPC API on a Unix socket, no pods, no scheduler — and four stores explain most of its errors: the <strong>content store</strong> knows only digests and sizes, the <strong>metadata store</strong> is BoltDB holding the object graph, the <strong>snapshotter</strong> is a pluggable filesystem driver (overlayfs by default) turning content into trees, and the <strong>runtime</strong> layer makes processes happen. The <strong>shim</strong> explains the rest: before starting a task, containerd forks <code>containerd-shim-runc-v2</code>, which becomes the parent of the container's processes, so <strong>a running container survives containerd restarting</strong> — which is why <code>SIGKILL</code>ing containerd does not stop your containers."
        ]
      },
      {
        type: "diagram",
        h: "Pull is not start: three stores, one direction",
        caption: "The content store holds compressed blobs by digest, deduplicated across images. The snapshotter holds unpacked trees, shared as overlay lowerdirs. The writable upper layer is created only when the container runs.",
        svg: `
<svg viewBox="0 0 1100 250" role="img" aria-label="Registry to content store to snapshotter to running container">
  <rect class="box-a" x="30" y="50" width="215" height="90" rx="10"/>
  <text class="t-accent" x="137" y="88" text-anchor="middle" font-size="17">registry</text>
  <text class="t-xs" x="137" y="114" text-anchor="middle">manifest, config, layers</text>

  <path class="ln-a" d="M245,95 L305,95" marker-end="url(#lm-arrow-accent)"/>
  <text class="t-xs" x="275" y="85" text-anchor="middle">pull</text>

  <rect class="box-v" x="310" y="50" width="215" height="90" rx="10"/>
  <text class="t-violet" x="417" y="88" text-anchor="middle" font-size="17">content store</text>
  <text class="t-xs" x="417" y="114" text-anchor="middle">compressed, by digest</text>

  <path class="ln-a" d="M525,95 L585,95" marker-end="url(#lm-arrow-accent)"/>
  <text class="t-xs" x="555" y="85" text-anchor="middle">unpack</text>

  <rect class="box-ok" x="590" y="50" width="215" height="90" rx="10"/>
  <text class="t-ok" x="697" y="88" text-anchor="middle" font-size="17">snapshotter</text>
  <text class="t-xs" x="697" y="114" text-anchor="middle">overlay trees on disk</text>

  <path class="ln-a" d="M805,95 L865,95" marker-end="url(#lm-arrow-accent)"/>
  <text class="t-xs" x="835" y="85" text-anchor="middle">run</text>

  <rect class="box-b" x="870" y="50" width="200" height="90" rx="10"/>
  <text class="t-bad" x="970" y="88" text-anchor="middle" font-size="17">container</text>
  <text class="t-xs" x="970" y="114" text-anchor="middle">one writable layer</text>

  <text class="t-dim" x="550" y="190" text-anchor="middle" font-size="15">“the image is there but it will not start” is a snapshot problem, not a pull problem</text>
  <text class="t-dim" x="550" y="214" text-anchor="middle" font-size="15">ctr containers ls against ctr tasks ls tells image, container and task apart</text>
</svg>`
      },
      {
        type: "diagram",
        h: "containerd's anatomy: the chain, one line each",
        caption: "One client contract, one daemon, one indirection per process. Everything privileged here runs as <b>root</b>. The shim is the reason <code>kill -9 containerd</code> leaves your containers running: it is their parent, and containerd reconnects to it.",
        svg: `
<svg viewBox="0 0 1100 260" role="img" aria-label="The chain from kubelet through CRI, containerd, the shim and runc">
  <rect class="box-v" x="30" y="46" width="185" height="82" rx="10"/>
  <text class="t-violet" x="122" y="82" text-anchor="middle" font-size="17">kubelet</text>
  <text class="t-xs" x="122" y="106" text-anchor="middle">on the node, as root</text>

  <path class="ln-a" d="M215,87 L255,87" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-a" x="260" y="46" width="185" height="82" rx="10"/>
  <text class="t-accent" x="352" y="82" text-anchor="middle" font-size="17">CRI</text>
  <text class="t-xs" x="352" y="106" text-anchor="middle">gRPC, any runtime</text>

  <path class="ln-a" d="M445,87 L485,87" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="490" y="46" width="185" height="82" rx="10"/>
  <text class="t-violet" x="582" y="82" text-anchor="middle" font-size="17">containerd</text>
  <text class="t-xs" x="582" y="106" text-anchor="middle">daemon, four stores</text>

  <path class="ln-a" d="M675,87 L715,87" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-ok" x="720" y="46" width="185" height="82" rx="10"/>
  <text class="t-ok" x="812" y="82" text-anchor="middle" font-size="17">shim</text>
  <text class="t-xs" x="812" y="106" text-anchor="middle">becomes the parent</text>

  <path class="ln-a" d="M905,87 L945,87" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-b" x="950" y="46" width="120" height="82" rx="10"/>
  <text class="t-bad" x="1010" y="82" text-anchor="middle" font-size="17">runc</text>
  <text class="t-xs" x="1010" y="106" text-anchor="middle">namespaces</text>

  <rect class="box-w" x="30" y="160" width="1040" height="60" rx="10"/>
  <text class="t-warn" x="50" y="186" font-size="15">containerd restarting, crashing or being upgraded does not kill running containers</text>
  <text class="t-sm" x="50" y="210">it reconnects to the shims and rediscovers the tasks — a “stopped” containerd may still need pkill -f containerd-shim</text>
</svg>`
      },
      {
        type: "prose",
        h: "CRI: the contract that lets Kubernetes stop caring about runtimes",
        p: [
          "CRI — the Container Runtime Interface — is a gRPC API letting kubelet drive <em>any</em> runtime: CRI-O, containerd's <code>cri</code> plugin and the historical dockershim are interchangeable from kubelet's point of view. The distinction to take away is <strong>sandbox versus container</strong>. CRI has a <code>RunPodSandbox</code> call separate from <code>CreateContainer</code>: the sandbox owns the pod's network namespace, IPC namespace, hostname file and cgroup parent, held open by a long-lived <strong>pause container</strong>. Every application container joins that sandbox with its own mount namespace, rootfs and cgroup — which is why sidecars work, and why a broken sidecar still leaves the pod with DNS and an IP."
        ]
      },
      {
        type: "diagram",
        h: "A Kubernetes pod: one sandbox, several containers",
        caption: "The ordering is the point: <b>sandbox first, then CNI, then containers.</b> The sandbox must exist so there is a netns to hand to CNI, and CNI must finish before containers start or they have no network. The pause container is not decoration — it keeps the namespaces alive after the last real container exits.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="A pod sandbox holding shared namespaces and two containers">
  <rect class="box-v" x="30" y="26" width="1040" height="248" rx="12"/>
  <text class="t-violet" x="50" y="54" font-size="17">sandbox · pause container</text>
  <text class="t-sm" x="50" y="80">shared: network namespace · IPC · hostname · cgroup parent</text>

  <rect class="box-a" x="60" y="112" width="440" height="132" rx="10"/>
  <text class="t-accent" x="80" y="142" font-size="17">app container</text>
  <text class="t-xs" x="80" y="168">own mount namespace</text>
  <text class="t-xs" x="80" y="188">own overlay rootfs</text>
  <text class="t-xs" x="80" y="208">own cgroup, limits</text>
  <text class="t-xs" x="80" y="230">catches localhost:9000</text>

  <rect class="box-b" x="560" y="112" width="440" height="132" rx="10"/>
  <text class="t-bad" x="580" y="142" font-size="17">sidecar container</text>
  <text class="t-xs" x="580" y="168">own mount namespace</text>
  <text class="t-xs" x="580" y="188">own overlay rootfs</text>
  <text class="t-xs" x="580" y="208">own cgroup, limits</text>
  <text class="t-xs" x="580" y="230">serves localhost:9000</text>
</svg>`
      },
      {
        type: "prose",
        h: "Container networking: a bridge, a pair of cables, and a NAT rule",
        p: [
          "The default container network is a Linux bridge on the host with a veth pair into the container's netns — one end on the bridge, the other inside, renamed <code>eth0</code>. The bridge (traditionally <code>docker0</code>) takes an address from a private range, which is why containers get <code>172.17.0.2</code>; the host masquerades traffic leaving, because those addresses are not routable.",
          "<strong>Publishing a port is not a proxy.</strong> <code>-p 8080:80</code> installs a DNAT rule rewriting packets for the host's 8080 into the container's IP on port 80, plus a masquerade rule for the return path; conntrack remembers the mapping, so the container never sees the client's real address. Those rules live in <code>nat</code>'s <code>PREROUTING</code> and <code>OUTPUT</code> chains, in a chain called <code>DOCKER</code>, evaluated <strong>before</strong> your firewall's <code>INPUT</code> chain — so container traffic can arrive at a port ufw calls closed."
        ]
      },
      {
        type: "diagram",
        h: "A packet leaving a container",
        caption: "Follow the top row backwards for a published port: DNAT rewrites the destination before any of this happens. Container traffic crosses <b>FORWARD</b>, not <code>INPUT</code>, so ufw's <code>default deny incoming</code> is never consulted — the fix is <code>DOCKER-USER</code>.",
        svg: `
<svg viewBox="0 0 1100 260" role="img" aria-label="Packet path from container out through veth, bridge and masquerade">
  <rect class="box-p" x="30" y="46" width="200" height="82" rx="10"/>
  <text class="t-bad" x="130" y="82" text-anchor="middle" font-size="17">container netns</text>
  <text class="t-xs" x="130" y="106" text-anchor="middle">172.17.0.2, eth0</text>

  <path class="ln-a" d="M230,87 L270,87" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-a" x="275" y="46" width="200" height="82" rx="10"/>
  <text class="t-accent" x="375" y="82" text-anchor="middle" font-size="17">veth pair</text>
  <text class="t-xs" x="375" y="106" text-anchor="middle">one end each side</text>

  <path class="ln-a" d="M475,87 L515,87" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="520" y="46" width="200" height="82" rx="10"/>
  <text class="t-violet" x="620" y="82" text-anchor="middle" font-size="17">docker0 bridge</text>
  <text class="t-xs" x="620" y="106" text-anchor="middle">gateway 172.17.0.1</text>

  <path class="ln-w" d="M720,87 L760,87" marker-end="url(#lm-arrow-warn)"/>
  <text class="t-xs" x="740" y="77" text-anchor="middle">nat</text>

  <rect class="box-w" x="765" y="46" width="200" height="82" rx="10"/>
  <text class="t-warn" x="865" y="82" text-anchor="middle" font-size="17">masquerade</text>
  <text class="t-xs" x="865" y="106" text-anchor="middle">source becomes host</text>

  <path class="ln-ok" d="M965,87 L1005,87" marker-end="url(#lm-arrow-ok)"/>

  <rect class="box-ok" x="1010" y="46" width="60" height="82" rx="10"/>
  <text class="t-ok" x="1040" y="92" text-anchor="middle" font-size="15">NIC</text>

  <rect class="box-b" x="30" y="160" width="1040" height="66" rx="10"/>
  <text class="t-bad" x="50" y="186" font-size="15">-p 0.0.0.0:8080:80 publishes to the world regardless of ufw</text>
  <text class="t-sm" x="50" y="210">the workaround is the DOCKER-USER chain, which is jumped to before Docker's own accepts</text>
</svg>`
      },
      {
        type: "prose",
        h: "Security: what you actually get by default",
        p: [
          "A default container is meaningfully more contained than a normal process. It keeps about fourteen capabilities and drops the rest, including <code>CAP_SYS_ADMIN</code> — the one that matters. It applies <code>noNewPrivileges</code>, so no setuid binary inside gains a privilege the container did not start with, and it mounts empty files over <code>/proc/kcore</code>, <code>/proc/sys</code>, <code>/sys/firmware</code>.",
          "<code>--privileged</code> disables all of that and adds the full capability set — functionally root on the host behind a container-shaped interface — and <code>CAP_SYS_ADMIN</code> alone gets most of the way out. The Kubernetes equivalents are <code>privileged: true</code>, <code>hostNetwork</code>, <code>hostPID</code> and a <code>hostPath</code> volume of <code>/</code>: each defensible alone, collectively “this pod is the host”. <strong>Rootless</strong> containers map inside-root to an unprivileged host UID, so an escape lands as an ordinary user."
        ]
      },
      {
        type: "code",
        lang: "bash",
        what: "Driving containerd directly",
        code:
`crictl ps -a && crictl inspectp <sandbox-id>
ctr -n k8s.io containers ls; ctr -n k8s.io tasks ls
nerdctl --namespace k8s.io ps -a; nerdctl system df
systemctl restart containerd   # safe: shims keep containers alive`
      },
      {
        type: "callout",
        kind: "warn",
        title: "What containerd costs a 19 GB disk",
        text: "Every image layer, every stopped container's writable layer and every snapshot lives under <code>/var/lib/containerd</code>. The failure is boring and total: the disk fills, writes fail, and nothing works — including the service you would fix it with. <code>nerdctl system df</code> to see, <code>nerdctl images prune</code> to reclaim."
      },
      {
        type: "callout",
        kind: "boss",
        title: "The three questions, in order, for anything container-related",
        text: "<b>1. Which namespace am I looking at?</b> <code>docker ps</code>, <code>nerdctl ps</code> and <code>crictl ps</code> show different, equally valid lists — Docker's is <code>moby</code>, Kubernetes' is <code>k8s.io</code>.<br><b>2. Does the container exist, and does the task exist?</b> A container with no task is configured but not running.<br><b>3. Host or runtime?</b> <code>journalctl -u containerd</code> on the node."
      }
    ],
    takeaways: [
      "A container is <strong>a rootfs + namespaces + a cgroup + a credential profile</strong>. Four things, no hypervisor, no fifth mechanism.",
      "<strong>Image, container and task</strong> are different objects. <code>ctr containers ls</code> against <code>ctr tasks ls</code> settles most container confusion in one second.",
      "The <strong>shim</strong> is why containers survive a containerd restart, and why killing containerd does not stop your pods.",
      "Publishing a port is a <strong>DNAT rule plus conntrack</strong>, not a proxy, so your firewall's INPUT chain never sees it."
    ],
    glossary: {
      "containerd": "The container daemon that assembles rootfs, namespaces and cgroups, on a Unix socket.",
      "shim": "A per-task helper that becomes the parent of a container's processes, so containers survive a containerd restart.",
      "CRI": "Container Runtime Interface — the gRPC API kubelet uses to drive any runtime, replacing a hard dependency on Docker.",
      "sandbox": "The pod-level CRI object owning the shared network and IPC namespaces, held open by a pause container.",
      "image / container / task": "Content (digest-addressed) / a recorded configuration / a running process tree. Three different objects.",
      "CNI": "Plugins invoked as binaries with ADD/DEL to build pod networking. No daemon, no port."
    }
  });
})();