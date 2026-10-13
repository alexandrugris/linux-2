/* ch00 — The whole machine on one screen — SIMPLIFIED EDITION
   Source: linux-map/assets/chapters/ch00-map.js
   2 diagrams redrawn simple: 3 and 5 boxes (was 19 and 15),
   viewBox height 280/260 (was 720/700), labels of 2-5 words.
   Prose 899 -> ~265 (29%). No code blocks. */
(function () {
  LX.push({
    id: "map",
    title: "The whole machine on one screen",
    tagline: "Every box below is a chapter. Start anywhere; the arrows are the dependency order.",
    sections: [
      {
        type: "prose",
        h: "How to read this map",
        p: [
          "This document is ordered by <strong>dependency</strong>, not by topic. The left column is what physically exists, the middle is what ordinary userspace does on it, the right is what you build when one machine is not enough. The left is always true: a Pod is a cgroup, some namespaces, an overlayfs mount and a netns with a veth in it."
        ]
      },
      {
        type: "diagram",
        h: "The map: machine, userspace, orchestration",
        caption: "Read it left to right. <b>The left level exists</b> whatever you installed; <b>the middle</b> is processes, files, permissions and sockets; <b>the right</b> is what you build out of the middle. Click a box to jump to its chapter.",
        svg: `
<svg viewBox="0 0 1100 280" role="img" aria-label="Three levels: the machine, what runs on it, and what you build on top">
  <text class="t-title" x="30" y="30" font-size="17">read left to right</text>

  <g class="jump" data-jump="boot">
  <rect class="box-b" x="30" y="56" width="300" height="150" rx="10"/>
  <text class="t-bad" x="48" y="84" font-size="17">1 · the machine</text>
  <text class="t-sm" x="48" y="112">CPU · RAM · disk · NIC</text>
  <text class="t-sm" x="48" y="140">UEFI → GRUB → kernel</text>
  <text class="t-sm" x="48" y="168">systemd is PID 1</text>
  </g>

  <path class="ln-a" d="M330,131 L366,131" marker-end="url(#lm-arrow-accent)"/>

  <g class="jump" data-jump="processes">
  <rect class="box" x="366" y="56" width="300" height="150" rx="10"/>
  <text x="384" y="84" font-size="17">2 · what runs on it</text>
  <text class="t-sm" x="384" y="112">processes · threads · files</text>
  <text class="t-sm" x="384" y="140">users · permissions · packages</text>
  <text class="t-sm" x="384" y="168">sockets · daemons · units</text>
  </g>

  <path class="ln-a" d="M666,131 L702,131" marker-end="url(#lm-arrow-accent)"/>

  <g class="jump" data-jump="kubernetes">
  <rect class="box-a" x="702" y="56" width="368" height="150" rx="10"/>
  <text class="t-accent" x="720" y="84" font-size="17">3 · what you build</text>
  <text class="t-sm" x="720" y="112">containers · runc · overlayfs</text>
  <text class="t-sm" x="720" y="140">kubernetes · etcd · kubelet</text>
  <text class="t-sm" x="720" y="168">same kernel, narrower view</text>
  </g>

  <text class="t-dim" x="550" y="244" text-anchor="middle" font-size="16">orchestration rearranges the middle, never replaces it</text>
</svg>`
      },
      {
        type: "prose",
        h: "The one request you can trace all the way down",
        p: [
          "Follow one byte from a browser into the RAM of a process: the packet arrives, netfilter decides whether it survives, a listening socket claims it, an nginx worker wakes, opens a file, and the page cache returns bytes. Kubernetes adds address translation — a <code>Service</code> is netfilter rules installed by a program watching an API server, so cluster networking collapses back into chapter 09."
        ]
      },
      {
        type: "diagram",
        h: "One HTTP request, top to bottom",
        caption: "Five steps on a plain Ubuntu server, and <b>they do not change in a cluster</b>. Every step is a place the request can be refused, dropped, or queued forever. <code>connection refused</code> = the host answered. <code>timed out</code> = the packet vanished somewhere. That one distinction is most of network debugging.",
        svg: `
<svg viewBox="0 0 1100 260" role="img" aria-label="Five step path of one HTTP request from browser to file">
  <text class="t-title" x="30" y="30" font-size="17">the same five steps, on any server</text>

  <rect class="box" x="30" y="66" width="180" height="104" rx="10"/>
  <text class="t-sm" x="120" y="106" text-anchor="middle" font-size="17">browser</text>
  <text class="t-xs" x="120" y="134" text-anchor="middle">builds the packet</text>

  <path class="ln-a" d="M210,118 L246,118" marker-end="url(#lm-arrow-accent)"/>

  <g class="jump" data-jump="networking">
  <rect class="box-w" x="250" y="66" width="180" height="104" rx="10"/>
  <text class="t-warn" x="340" y="106" text-anchor="middle" font-size="17">netfilter</text>
  <text class="t-xs" x="340" y="134" text-anchor="middle">ufw: drop or accept</text>
  </g>

  <path class="ln-a" d="M430,118 L466,118" marker-end="url(#lm-arrow-accent)"/>

  <g class="jump" data-jump="services">
  <rect class="box-ok" x="470" y="66" width="180" height="104" rx="10"/>
  <text class="t-ok" x="560" y="106" text-anchor="middle" font-size="17">listening socket</text>
  <text class="t-xs" x="560" y="134" text-anchor="middle">nginx on :443</text>
  </g>

  <path class="ln-a" d="M650,118 L686,118" marker-end="url(#lm-arrow-accent)"/>

  <g class="jump" data-jump="processes">
  <rect class="box-a" x="690" y="66" width="180" height="104" rx="10"/>
  <text class="t-accent" x="780" y="106" text-anchor="middle" font-size="17">worker wakes</text>
  <text class="t-xs" x="780" y="134" text-anchor="middle">epoll, then read()</text>
  </g>

  <path class="ln-a" d="M870,118 L906,118" marker-end="url(#lm-arrow-accent)"/>

  <g class="jump" data-jump="filesystem">
  <rect class="box" x="910" y="66" width="160" height="104" rx="10"/>
  <text class="t-sm" x="990" y="106" text-anchor="middle" font-size="17">the file</text>
  <text class="t-xs" x="990" y="134" text-anchor="middle">/var/www/html</text>
  </g>

  <text class="t-dim" x="550" y="222" text-anchor="middle" font-size="16">refused = the process · timed out = the path</text>
</svg>`
      },
      {
        type: "prose",
        h: "Three ideas that carry the whole document",
        p: [
          "<strong>Everything is a file</strong> — not bytes on a disk, but a kernel object: a socket, a pipe, a device, a memory map and a directory are all an entry in a table, reachable by an integer.",
          "<strong>Isolation is layering.</strong> uid/gid stops accidents, capabilities stop escalation, namespaces hide what a process sees, cgroups bound what it consumes. No single layer is a sandbox.",
          "<strong>Declarative intent, imperative reconciliation.</strong> systemd, Kubernetes and Ansible describe a state and loop until it is true. The loops are cheap; the description is where the bugs live."
        ],
        noteTitle: "Where this document can drift",
        note: "Stated against Debian/Ubuntu + systemd, checked on a real Ubuntu 18.04.6 VPS. Two divergences matter most: <b>cgroups v1 vs v2</b> and <b>iptables 1.6 legacy vs nftables</b>.",
        noteKind: "fact"
      }
    ],
    takeaways: [
      "Read the map in dependency order: machine → userspace → orchestration.",
      "A Pod is namespaces + cgroups + an overlayfs rootfs + a netns with a veth in it. There is no fifth thing.",
      "A Kubernetes <strong>Service</strong> is a netfilter rule installed by a program watching an API server.",
      "Every system here is a reconciliation loop. Bugs live in the gap between declared intent and observed reality."
    ],
    glossary: {
      reconciler: "A control loop comparing declared intent with observed reality. systemd, Kubernetes controllers and kubelet are all reconcilers.",
      dataplane: "The path data actually takes: kube-proxy's rules or a CNI's eBPF programs."
    }
  });
})();