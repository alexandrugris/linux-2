/* ch09 — Networking: from your process to the wire — SIMPLIFIED EDITION
   Prose 5269 -> ~1600. Code 1230 -> ~285.
   All 9 diagrams redrawn simple: viewBox height 200-330 (was 500-700),
   4-7 boxes each (was 9-14), labels of 2-5 words, <=13 text nodes. */
(function () {
  LX.push({
    id: "networking",
    title: "The network stack, from your process to the wire",
    tagline: "A packet is a kernel data structure with a socket attached. Routes, neighbours, firewalls and NAT are bookkeeping that decides where it goes.",
    sections: [
      {
        type: "prose",
        h: "What the kernel owns and what the NIC does",
        p: [
          "Almost nothing about networking happens in the NIC. It owns a MAC address, a transmit ring and an interrupt line, and it does not know what TCP or an IP address is. Framing, ARP, routing, sequence numbers, retransmission timers, congestion windows, socket buffers, firewall hooks and NAT are all <strong>kernel code on your CPU</strong>. The driver only programs the DMA rings and rings the doorbell; receive work is drained by NAPI under a bounded budget, because unbounded interrupt-context work starves the box.",
          "<code>ethtool -k</code> can report checksum offload as <em>on</em> while costing CPU. On this VPS the driver is <code>virtio_net</code>: no hardware switch, no VLAN tagging in silicon, nothing offload worth trusting."
        ]
      },
      {
        type: "diagram",
        h: "The stack, four layers, in one column",
        caption: "A <code>write()</code> enters at the top and leaves at the bottom. Each layer only talks to its neighbours, which is why a problem is always local: <code>ss</code> for the top two, <code>ip route get</code> for the third, <code>ethtool</code> for the fourth. Receive runs the same path upward.",
        svg: `
<svg viewBox="0 0 1100 372" role="img" aria-label="Four stacked layer boxes from socket down to transport, IP and link, ending at the NIC">
  <rect class="box-a" x="180" y="16" width="740" height="62" rx="10"/>
  <text class="t-accent" x="204" y="45" font-size="18">socket</text>
  <text class="t-sm" x="330" y="45">a file descriptor, two buffers</text>

  <path class="ln-a" d="M550,78 L550,92" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box" x="180" y="94" width="740" height="62" rx="10"/>
  <text x="204" y="123" font-size="18">transport</text>
  <text class="t-sm" x="390" y="123">TCP: sequence numbers, ACKs, timers</text>

  <path class="ln-a" d="M550,156 L550,170" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="180" y="172" width="740" height="62" rx="10"/>
  <text class="t-violet" x="204" y="201" font-size="18">IP</text>
  <text class="t-sm" x="290" y="201">addressing, route lookup, TTL</text>

  <path class="ln-a" d="M550,234 L550,248" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-w" x="180" y="250" width="740" height="62" rx="10"/>
  <text class="t-warn" x="204" y="279" font-size="18">link</text>
  <text class="t-sm" x="300" y="279">framing, MAC, ARP</text>

  <path class="ln-a" d="M550,312 L550,326" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-ok" x="180" y="328" width="740" height="36" rx="10"/>
  <text class="t-ok" x="550" y="352" text-anchor="middle" font-size="17">DMA rings and a MAC</text>
</svg>`
      },
      {
        type: "prose",
        h: "Interface, address, route, neighbour",
        p: [
          "Four kernel data structures. An <strong>interface</strong> is a MAC and a name, with no address of its own. An <strong>address</strong> is a separate object, so one interface can carry many and they can change under open sockets. A <strong>route</strong> is a prefix plus an action in a table. A <strong>neighbour</strong> caches the link-layer address for an IP on the same segment.",
          "A route is <em>not a path</em>: there is no per-flow state, so the next packet may take a different route. <code>ip route get 1.1.1.1</code> prints the answer, including the <code>src</code> address bound to the socket for the connection lifetime.",
          "Policy routing is what makes a multi-homed host work. <code>ip rule</code> numbers the rules — <code>0: from all lookup local</code> first, then <code>main</code>, then custom tables — and a Tailscale box uses <code>lookup 100</code> matching <code>from 100.64.0.0/10</code> to force that traffic out <code>tailscale0</code>. Plain <code>ip route show</code> lies on such a host; use <code>ip route show table all</code>."
        ]
      },
      {
        type: "diagram",
        h: "How the kernel picks a route",
        caption: "Rules are consulted in numeric order, then longest-prefix match inside the selected table. The <code>local</code> table is checked first, which is why a packet to the machine's own address never leaves the machine. Only when every rule fails is the packet dropped.",
        svg: `
<svg viewBox="0 0 1100 280" role="img" aria-label="Four step route lookup ending in a route, with an unreachable branch">
  <rect class="box-a" x="30" y="60" width="230" height="86" rx="10"/>
  <text class="t-accent" x="145" y="95" text-anchor="middle" font-size="17">packet</text>
  <text class="t-sm" x="145" y="122" text-anchor="middle">dst 1.1.1.1</text>

  <path class="ln-a" d="M260,103 L296,103" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="300" y="60" width="230" height="86" rx="10"/>
  <text class="t-violet" x="415" y="95" text-anchor="middle" font-size="17">ip rule</text>
  <text class="t-sm" x="415" y="122" text-anchor="middle">local, then main</text>

  <path class="ln-a" d="M530,103 L566,103" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box" x="570" y="60" width="230" height="86" rx="10"/>
  <text x="685" y="95" text-anchor="middle" font-size="17">longest prefix</text>
  <text class="t-sm" x="685" y="122" text-anchor="middle">/8 beats /16 beats /0</text>

  <path class="ln-ok" d="M800,103 L836,103" marker-end="url(#lm-arrow-ok)"/>

  <rect class="box-ok" x="840" y="60" width="230" height="86" rx="10"/>
  <text class="t-ok" x="955" y="95" text-anchor="middle" font-size="17">route</text>
  <text class="t-sm" x="955" y="122" text-anchor="middle">dev eth0 via 192.0.2.1</text>

  <path class="ln-b" d="M685,146 L685,200" marker-end="url(#lm-arrow-bad)"/>
  <text class="t-bad" x="700" y="182" font-size="15">no match anywhere</text>
  <rect class="box-b" x="570" y="206" width="230" height="52" rx="10"/>
  <text class="t-bad" x="685" y="238" text-anchor="middle" font-size="17">ENETUNREACH</text>
</svg>`
      },
      {
        type: "code",
        lang: "bash",
        what: "Read the network the way the kernel has it",
        code:
`ip -br -4 addr                          # -b one line per interface, -4 skips AAAA
ip route get 1.1.1.1                    # the route it would use, plus the src it would pick
ip rule show ; ip route show table all   # plain ip route show lies on a policy-routed host
ip -s link show dev eth0 ; ethtool -i eth0
ip neigh show ; ip neigh flush dev eth0 # the best try-that-again command in networking

ss -s                                    # totals: sockets, states, memory
ss -ltnp                                 # -l listen  -n numeric  -p process (needs root)
ss -tan state time-wait | wc -l          # on a server, many means you are closing first
ss -tanp state close-wait                # an application leak, always
ss -tin dst 1.1.1.1                      # rtt, rto, cwnd, retrans, pmtu for one connection
ss -ulnp                                 # UDP has no state machine, so look at queues

iptables -V                              # prints legacy or nf_tables — do this first
update-alternatives --display iptables   # every candidate backend on this box
nft list ruleset                         # the nftables store; empty means nothing is in it
iptables -L -n -v --line-numbers        # nonzero counters prove a rule is live
iptables -Z                              # zero them, then watch which move
conntrack -L
nstat -az | grep -E "TcpRetransSegs|TcpExtListenDrops|TcpExtSyncookies"

tracepath -n example.com                 # hops plus the discovered MTU at each
mtr -n -r -c 20 example.com              # -r report mode, safe to paste
tcpdump -i any -nn 'icmp[0] == 3 and icmp[1] == 4'   # frag-needed = PMTUD is broken
ping -c3 -M do -s 1473 example.com       # fails at exactly 1500 path MTU
nc -vz -w3 <public-ip> 80                # open, refused or hung — three different faults`
      },
      {
        type: "prose",
        h: "The socket: a file descriptor that is a conversation",
        p: [
          "<code>socket(AF_INET, SOCK_STREAM, 0)</code> returns a <code>struct sock</code> as a file descriptor, and from then it <em>is</em> a file: <code>read()</code>, <code>write()</code>, <code>poll()</code>, <code>close()</code>. <code>/proc/&lt;pid&gt;/fd/</code> shows <code>socket:[12345]</code> and <code>/proc/net/tcp</code> lists the same inode, which is why <code>ss -p</code> and <code>lsof</code> agree.",
          "Three ways to wait. <strong>Blocking</strong> parks the thread until data or EOF. <strong>Non-blocking</strong> returns <code>EAGAIN</code> immediately, so a bare spin loop is a bug. <strong>Ready-notification</strong> parks no thread per connection: epoll keeps one interest list and one ready list, and wakes you with exactly the descriptors that have work. <code>select()</code> is O(n) per call and capped at <code>FD_SETSIZE</code> = 1024.",
          "The expensive resource is the <em>connection</em>, not the CPU — a kernel socket, two buffer allocations, a conntrack entry, an fd and a <code>struct file</code>. Threads add a task and an 8&nbsp;MB stack on top; epoll multiplexes thousands from one thread."
        ]
      },
      {
        type: "diagram",
        h: "Blocking vs epoll: one thousand sockets",
        caption: "Left, a thousand threads each with a stack and a scheduler entry. Right, one thread and a ready list the kernel appends to at the moment state changes, so the wakeup carries exactly the work that exists. The right column is why nginx with four workers holds tens of thousands of connections on a 2&nbsp;GB box.",
        svg: `
<svg viewBox="0 0 1100 260" role="img" aria-label="Blocking model with many threads compared to one thread using epoll">
  <text class="t-title" x="230" y="34" text-anchor="middle">BLOCKING</text>
  <text class="t-title" x="850" y="34" text-anchor="middle">EPOLL</text>

  <rect class="box-w" x="60" y="56" width="340" height="50" rx="9"/>
  <text class="t-warn" x="230" y="87" text-anchor="middle" font-size="17">1000 threads</text>

  <rect class="box-w" x="60" y="118" width="340" height="50" rx="9"/>
  <text class="t-sm" x="230" y="149" text-anchor="middle">1000 stacks, 8 MB each</text>

  <rect class="box-w" x="60" y="180" width="340" height="50" rx="9"/>
  <text class="t-sm" x="230" y="211" text-anchor="middle">scheduler latency scales</text>

  <rect class="box-ok" x="660" y="86" width="380" height="50" rx="9"/>
  <text class="t-ok" x="850" y="117" text-anchor="middle" font-size="17">one thread</text>

  <rect class="box-ok" x="660" y="148" width="380" height="50" rx="9"/>
  <text class="t-sm" x="850" y="179" text-anchor="middle">ready list built on the event</text>
</svg>`
      },
      {
        type: "prose",
        h: "TCP is a kernel state machine you can inspect",
        p: [
          "You hand bytes to a socket; the kernel keeps the send buffer, assigns sequence numbers, tracks the peer's advertised window, runs the retransmission timers, moves the congestion window and reassembles the stream in order. So 400 bytes written and 900 received is never a TCP bug. The three-way handshake establishes one thing: both sides agree on the initial sequence numbers. Each SYN carries an ISN, the reply ACKs it, and every reliability property is built on those 32-bit per-direction counters. RTO starts near 200&nbsp;ms and is smoothed to the real delay.",
          "<code>CLOSE_WAIT</code> is an application bug: the peer sent FIN and your code never called <code>close()</code>. <code>TIME_WAIT</code> is correctness — whoever closes first holds the tuple for 2×MSL, 60&nbsp;s on Linux, so late duplicates cannot reuse the ports. Harmless on a client; on a server it means you are closing first."
        ],
        noteTitle: "SYN_SENT in bulk on a server",
        note: "Means the accept queue is full, not that the box is slow. Raise <code>net.core.somaxconn</code> and <code>net.ipv4.tcp_max_syn_backlog</code>, or enable <code>tcp_syncookies</code> — on by default since kernel 4.1, which is why this box already has it."
      },
      {
        type: "diagram",
        h: "The TCP states, in a row",
        caption: "The client path, with the three handshake packets and the four close packets. The server runs the mirror image: <code>LISTEN</code> to <code>SYN_RECV</code> to <code>ESTABLISHED</code> to <code>CLOSE_WAIT</code> to <code>LAST_ACK</code> to <code>CLOSED</code>. Whoever sends the first FIN pays <code>TIME_WAIT</code>, so keepalives push the cost onto the peer.",
        svg: `
<svg viewBox="0 0 1100 240" role="img" aria-label="TCP client state sequence from CLOSED through TIME_WAIT back to CLOSED">
  <rect class="box-a" x="11" y="100" width="130" height="58" rx="10"/>
  <text class="t-accent" x="76" y="135" text-anchor="middle" font-size="17">CLOSED</text>

  <path class="ln-a" d="M141,129 L167,129" marker-end="url(#lm-arrow-accent)"/>
  <text class="t-accent" x="154" y="84" text-anchor="middle" font-size="15">SYN</text>

  <rect class="box-a" x="169" y="100" width="130" height="58" rx="10"/>
  <text class="t-accent" x="234" y="135" text-anchor="middle" font-size="17">SYN_SENT</text>

  <path class="ln-ok" d="M299,129 L325,129" marker-end="url(#lm-arrow-ok)"/>
  <text class="t-ok" x="312" y="84" text-anchor="middle" font-size="15">SYN+ACK, ACK</text>

  <rect class="box-a" x="327" y="100" width="130" height="58" rx="10"/>
  <text class="t-accent" x="392" y="135" text-anchor="middle" font-size="17">ESTABLISHED</text>

  <path class="ln-b" d="M457,129 L483,129" marker-end="url(#lm-arrow-bad)"/>
  <text class="t-bad" x="470" y="84" text-anchor="middle" font-size="15">FIN, ACK</text>

  <rect class="box-w" x="485" y="100" width="130" height="58" rx="10"/>
  <text class="t-warn" x="550" y="135" text-anchor="middle" font-size="17">FIN_WAIT_1</text>

  <path class="ln-w" d="M615,129 L641,129" marker-end="url(#lm-arrow-warn)"/>
  <text class="t-warn" x="628" y="84" text-anchor="middle" font-size="15">ACK</text>

  <rect class="box-w" x="643" y="100" width="130" height="58" rx="10"/>
  <text class="t-warn" x="708" y="135" text-anchor="middle" font-size="17">FIN_WAIT_2</text>

  <path class="ln-w" d="M773,129 L799,129" marker-end="url(#lm-arrow-warn)"/>
  <text class="t-warn" x="786" y="84" text-anchor="middle" font-size="15">FIN</text>

  <rect class="box-w" x="801" y="100" width="130" height="58" rx="10"/>
  <text class="t-warn" x="866" y="135" text-anchor="middle" font-size="17">TIME_WAIT</text>

  <path class="ln-w" d="M931,129 L957,129" marker-end="url(#lm-arrow-warn)"/>
  <text class="t-warn" x="944" y="84" text-anchor="middle" font-size="15">ACK</text>

  <rect class="box" x="959" y="100" width="130" height="58" rx="10"/>
  <text x="1024" y="135" text-anchor="middle" font-size="17">CLOSED</text>
</svg>`
      },
      {
        type: "table",
        cols: ["State", "Who sits in it", "What it means when you see many"],
        rows: [
          ["<code>LISTEN</code>", "server", "Socket exists with a backlog. If missing, nothing is bound — check <code>ss -ltnp</code>."],
          ["<code>ESTAB</code>", "both", "Working connections. Compare <code>ss -s</code> against your application log to find leaks."],
          ["<code>SYN_SENT</code>", "client", "<code>connect()</code> piling up: DNS, a full backlog, an unreachable next hop."],
          ["<code>CLOSE_WAIT</code>", "the receiver", "<strong>Application leak.</strong> The peer closed and your code never called <code>close()</code>. Never a network fault."],
          ["<code>TIME_WAIT</code>", "the closer", "60&nbsp;s on Linux. On a server you are closing first — check <code>keepalive_timeout</code>."]
        ]
      },
      {
        type: "prose",
        h: "UDP and the trade you are making",
        p: [
          "UDP is IP's reliability features removed: eight header bytes, no handshake, no sequence numbers, no retransmission, no ordering, no congestion control, no connection state. A send is a hand-off into a receive queue; if nobody is listening or the queue is full the kernel drops it, or a later read returns <code>ECONNREFUSED</code> — which is how ICMP port-unreachable becomes visible to an application.",
          "The payoff is latency: DNS, real-time media where a retransmitted frame is worthless, and WireGuard and QUIC, which run their own reliability and congestion control over UDP because user space is more flexible than a kernel state machine. The cost is that <em>you</em> handle reordering, loss, authentication and amplification control. A few spoofed bytes produce a megabyte of reply, which is how DNS reflection works. Rate-limit by source."
        ]
      },
      {
        type: "diagram",
        h: "netfilter: five hooks, one fork",
        caption: "Hooks sit at fixed points in the packet path; rules live in tables attached to those hooks and are walked in order. The routing decision happens between <code>PREROUTING</code> and <code>INPUT</code>/<code>FORWARD</code>, which is why <code>PREROUTING</code> is the only place a DNAT rule can work. Hooks marked <code>*nat</code> run <em>only</em> for the first packet of a connection.",
        svg: `
<svg viewBox="0 0 1100 330" role="img" aria-label="Packet path through PREROUTING then a routing fork to INPUT or FORWARD">
  <rect class="box-ok" x="30" y="30" width="180" height="58" rx="10"/>
  <text class="t-ok" x="120" y="65" text-anchor="middle" font-size="17">packet in</text>

  <path class="ln-a" d="M210,59 L256,59" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-p" x="260" y="30" width="230" height="58" rx="10"/>
  <text class="t-bad" x="375" y="65" text-anchor="middle" font-size="17">PREROUTING *nat</text>

  <path class="ln-a" d="M490,59 L536,59" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-w" x="540" y="30" width="210" height="58" rx="10"/>
  <text class="t-warn" x="645" y="65" text-anchor="middle" font-size="17">dst is mine?</text>

  <path class="ln-ok" d="M645,88 L645,150" marker-end="url(#lm-arrow-ok)"/>
  <text class="t-ok" x="655" y="126" font-size="15">yes</text>

  <path class="ln-w" d="M750,59 L806,59" marker-end="url(#lm-arrow-warn)"/>
  <text class="t-warn" x="778" y="92" text-anchor="middle" font-size="15">no</text>

  <rect class="box-p" x="540" y="154" width="210" height="58" rx="10"/>
  <text class="t-bad" x="645" y="189" text-anchor="middle" font-size="17">INPUT</text>

  <rect class="box-p" x="810" y="30" width="200" height="58" rx="10"/>
  <text class="t-bad" x="910" y="65" text-anchor="middle" font-size="17">FORWARD</text>

  <path class="ln-ok" d="M645,212 L645,258" marker-end="url(#lm-arrow-ok)"/>

  <rect class="box-a" x="540" y="262" width="210" height="50" rx="10"/>
  <text class="t-accent" x="645" y="293" text-anchor="middle" font-size="17">socket</text>

  <path class="ln-w" d="M910,88 L910,258" marker-end="url(#lm-arrow-warn)"/>

  <rect class="box-p" x="810" y="262" width="200" height="50" rx="10"/>
  <text class="t-bad" x="910" y="293" text-anchor="middle" font-size="17">POSTROUTING *nat</text>

  <text class="t-dim" x="375" y="150" font-size="15">nat rewrites once; conntrack remembers</text>
</svg>`
      },
      {
        type: "prose",
        h: "Conntrack: why a stateless rule is not working",
        p: [
          "Any decision involving <code>NEW</code> or <code>RELATED</code> requires the kernel to remember the flow. That memory is conntrack: one entry per connection keyed by the 5-tuple, holding the NAT translation and a timeout, in a hash table with a fixed ceiling — <code>net.netfilter.nf_conntrack_max</code>, commonly 65,536 on kernel 4.15, at roughly 300 bytes per entry. When it fills, no new entry is created, the packet counts as untracked, and your first rule — normally <code>ACCEPT RELATED,ESTABLISHED</code> — stops matching.",
          "That is why <code>-m state</code> exists. <code>-A INPUT -p tcp --dport 22 -j ACCEPT</code> works inbound but leaves the return path broken for UDP and for anything replying from a different source port. A rule matching <code>--sport 80</code> fails outright: by the time the reply arrives the tuple is <code>ESTABLISHED</code>, not <code>NEW</code>. <code>RELATED</code> is decided by helper modules, and <code>INVALID</code> means the packet matched no flow and looked wrong — drop it first.",
          "On this box the box is 2&nbsp;GB of RAM with a 19&nbsp;GB disk, so conntrack exhaustion is a real failure mode rather than a theoretical one. <code>conntrack -L</code> shows the table; <code>conntrack -E</code> streams events."
        ]
      },
      {
        type: "prose",
        h: "iptables-legacy and nftables: same intent, different binaries",
        p: [
          "<code>iptables</code> was a userspace tool generating opaque kernel blobs registered with <code>xtables</code>. The kernel grew a second interface in 3.13 — nftables — with named objects, maps, sets, atomic whole-ruleset replacement and expressions instead of extension modules. <code>iptables-nft</code> compiles iptables syntax into an nftables ruleset; <code>iptables-legacy</code> keeps writing the old blobs.",
          "This is the trap. Both backends are compiled in and they are <strong>separate rule stores the packet path consults in a fixed order — first verdict wins</strong>. On this box (Ubuntu 18.04.6, kernel 4.15, iptables 1.6.1) <code>update-alternatives</code> selects <strong>legacy</strong> and ufw 0.36 hard-codes <code>iptables</code> against it. Install <code>iptables-nft</code> and two live stores exist: rules added with <code>iptables -A</code> never appear in <code>nft list ruleset</code>.",
          "So name the backend before you debug logic. <code>iptables -V</code> prints <code>nf_tables</code> or <code>legacy</code>; <code>update-alternatives --display iptables</code> lists every candidate. Then convert once and never mix: <code>iptables-save &gt; backup.rules</code>, <code>nft flush ruleset</code>, port deliberately, with ufw, Docker and fail2ban all on the same backend.",
          "nftables is genuinely better where rulesets are large. With <code>ipset</code> you kept a parallel userspace list pushed in from cron; a named nftables set is a kernel object thousands of rules reference, so blocking 50,000 addresses costs one rule. And <code>nft -f file</code> replaces the whole ruleset in one transaction, so no half-applied config ever leaves the host open."
        ]
      },
      {
        type: "diagram",
        h: "Two rule stores, one packet",
        caption: "The legacy store (populated by ufw, Docker and hand-written scripts) and the nftables store are independent kernel objects evaluated in a fixed order. A permissive legacy rule shadows a strict nftables one; a <code>DROP</code> in the legacy store ends the packet and the nftables <code>ACCEPT</code> never runs. That is why my rule is not taking effect is usually a backend mismatch rather than a logic error.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="One packet evaluated against a legacy rule store and an nftables store, first verdict wins">
  <rect class="box-b" x="400" y="20" width="300" height="52" rx="10"/>
  <text class="t-bad" x="550" y="52" text-anchor="middle" font-size="17">one packet</text>

  <path class="ln-w" d="M480,72 L330,124" marker-end="url(#lm-arrow-warn)"/>
  <path class="ln-a" d="M620,72 L770,124" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-w" x="100" y="128" width="440" height="80" rx="10"/>
  <text class="t-warn" x="320" y="160" text-anchor="middle" font-size="17">iptables-legacy store</text>
  <text class="t-sm" x="320" y="186" text-anchor="middle">ufw, Docker, your scripts</text>

  <rect class="box-p" x="560" y="128" width="440" height="80" rx="10"/>
  <text class="t-bad" x="780" y="160" text-anchor="middle" font-size="17">iptables-nft store</text>
  <text class="t-sm" x="780" y="186" text-anchor="middle">nft, CNI, your newer scripts</text>

  <path class="ln-ok" d="M320,208 L320,250" marker-end="url(#lm-arrow-ok)"/>
  <path class="ln-b" d="M780,208 L780,250" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-ok" x="100" y="254" width="440" height="40" rx="10"/>
  <text class="t-ok" x="320" y="280" text-anchor="middle" font-size="17">ACCEPT here ends it</text>

  <rect class="box-b" x="560" y="254" width="440" height="40" rx="10"/>
  <text class="t-bad" x="780" y="280" text-anchor="middle" font-size="17">DROP here, no log line</text>
</svg>`
      },
      {
        type: "prose",
        h: "NAT: address translation as a lookup table",
        p: [
          "Three shapes. <strong>DNAT</strong> rewrites the destination and must be explicit, because the kernel does not invent a mapping — DNAT with no port sends traffic to the port it arrived on. <strong>SNAT</strong> rewrites the source to a fixed address, classically so a mail server originates from the IP reverse DNS and SPF expect. <strong>MASQUERADE</strong> is SNAT resolved at send time, so it survives a new DHCP lease and costs a route lookup per packet: use it on mobile or cloud interfaces, SNAT when the address is fixed.",
          "The inbound case has no socket to guess from. The packet was addressed to <em>the host's</em> IP and port, so unless a DNAT rule exists for exactly that protocol and port, nothing matches and the kernel answers RST. That asymmetry — works on localhost, refused from outside, <code>curl: (7) Failed to connect</code> — is the fingerprint of a missing NAT or firewall rule. Forwarding at all needs <code>net.ipv4.ip_forward=1</code> plus a <code>FORWARD</code> accept; ufw does not write those for you."
        ]
      },
      {
        type: "diagram",
        h: "Masquerade out, DNAT in",
        caption: "Outbound, a container's flow is an ordinary socket with an ephemeral source port; masquerade rewrites it on <code>POSTROUTING</code> and conntrack un-maps the reply. Inbound, the packet hits no socket, so a <code>PREROUTING *nat</code> DNAT rule naming the exact port is what makes the connection exist at all.",
        svg: `
<svg viewBox="0 0 1100 340" role="img" aria-label="Outbound masquerade and inbound DNAT shown as two three-box flows">
  <text class="t-title" x="30" y="28">OUTBOUND</text>

  <rect class="box-a" x="30" y="46" width="280" height="62" rx="10"/>
  <text class="t-accent" x="170" y="84" text-anchor="middle" font-size="17">container 172.17.0.2</text>

  <path class="ln-a" d="M310,77 L386,77" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-w" x="390" y="46" width="320" height="62" rx="10"/>
  <text class="t-warn" x="550" y="84" text-anchor="middle" font-size="17">MASQUERADE on POSTROUTING</text>

  <path class="ln-a" d="M710,77 L786,77" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-ok" x="790" y="46" width="280" height="62" rx="10"/>
  <text class="t-ok" x="930" y="84" text-anchor="middle" font-size="17">internet sees 10.0.0.4</text>

  <text class="t-title" x="30" y="188">INBOUND</text>

  <rect class="box-b" x="30" y="206" width="280" height="62" rx="10"/>
  <text class="t-bad" x="170" y="244" text-anchor="middle" font-size="17">client to :8080</text>

  <path class="ln-a" d="M310,237 L386,237" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-p" x="390" y="206" width="320" height="62" rx="10"/>
  <text class="t-bad" x="550" y="244" text-anchor="middle" font-size="17">DNAT needs the exact port</text>

  <path class="ln-a" d="M710,237 L786,237" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-a" x="790" y="206" width="280" height="62" rx="10"/>
  <text class="t-accent" x="930" y="244" text-anchor="middle" font-size="17">container :80</text>
</svg>`
      },
      {
        type: "prose",
        h: "WireGuard, Tailscale and where traffic actually goes",
        p: [
          "WireGuard lives in the kernel as the <code>wireguard</code> module or in userspace as <code>wireguard-go</code>. Its API is a <code>tun</code> device: the kernel routes packets into <code>wg0</code> as if they came off a wire, and the driver encrypts, wraps them in UDP and sends to the peer endpoint. <strong>There is no listening port.</strong> The initiator sends a UDP packet to the endpoint and remembers it, so nothing on your edge firewall needs a hole and sshd is bound to a Tailscale address, not <code>0.0.0.0</code>.",
          "The subtlety: the SSH session is not invisible to <code>ss -t</code>, it is simply not on the interface you expected. <code>ss -tanp | grep sshd</code> shows <code>100.101.102.103:22 → 100.101.104.5:44120</code>, because the kernel decrypted it before TCP saw it. What is invisible is the <em>public</em> identity: one UDP flow to port 41641, and your source address appears nowhere in the packet, so a port scan of the public IP reaches nothing. DERP relays cover the case where direct UDP fails.",
          "Two interface facts bite on this box. Bridges forward frames without touching the routing table, so with the default <code>bridge-nf-call-iptables=0</code> traffic crossing <code>docker0</code> never reaches iptables <code>FORWARD</code>. And an <code>ip addr add</code> typed at a shell is lost on reboot — netplan on 18.04+ lives in <code>/etc/netplan/01-netcfg.yaml</code>, ifupdown in <code>/etc/network/interfaces</code>."
        ]
      },
      {
        type: "diagram",
        h: "Where a packet goes on this box",
        caption: "Top, a tailnet session: the tun device carries ordinary TCP sockets on 100.x addresses, and <code>ip rule 1000</code> picks the WireGuard table so it leaves as one UDP flow. Bottom, a container: a veth pair into a bridge, then routed through <code>FORWARD</code> and masqueraded. ufw manages neither path.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="Tailnet path from peer through tailscale0 and wg0 to the internet, and container path through docker0 to eth0">
  <rect class="box-a" x="30" y="40" width="230" height="60" rx="10"/>
  <text class="t-accent" x="145" y="77" text-anchor="middle" font-size="17">tailnet peer</text>

  <path class="ln-a" d="M260,70 L326,70" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="330" y="40" width="230" height="60" rx="10"/>
  <text class="t-violet" x="445" y="77" text-anchor="middle" font-size="17">tailscale0, tun</text>

  <path class="ln-a" d="M560,70 L626,70" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-w" x="630" y="40" width="230" height="60" rx="10"/>
  <text class="t-warn" x="745" y="77" text-anchor="middle" font-size="17">wg0, UDP 41641</text>

  <path class="ln-a" d="M860,70 L926,70" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-ok" x="930" y="40" width="140" height="60" rx="10"/>
  <text class="t-ok" x="1000" y="77" text-anchor="middle" font-size="17">internet</text>

  <text class="t-xs" x="745" y="128" text-anchor="middle" font-size="15">ip rule 1000 picks this table</text>

  <rect class="box-a" x="30" y="188" width="230" height="60" rx="10"/>
  <text class="t-accent" x="145" y="225" text-anchor="middle" font-size="17">container netns</text>

  <path class="ln-a" d="M260,218 L326,218" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="330" y="188" width="230" height="60" rx="10"/>
  <text class="t-violet" x="445" y="225" text-anchor="middle" font-size="17">docker0 bridge</text>

  <path class="ln-w" d="M560,218 L626,218" marker-end="url(#lm-arrow-warn)"/>

  <rect class="box-w" x="630" y="188" width="440" height="60" rx="10"/>
  <text class="t-warn" x="850" y="225" text-anchor="middle" font-size="17">FORWARD, MASQUERADE, eth0</text>
</svg>`
      },
      {
        type: "diagram",
        h: "Why small responses work and TLS handshakes hang",
        caption: "The endpoints assume 1500 and advertise MSS 1460; something in the middle is 1420. Handshake packets fit, so the connection looks healthy, and the certificate response does not fit and is silently dropped. Pin it with <code>ping -c3 -M do -s 1473</code>, which fails when the real path MTU is 1500.",
        svg: `
<svg viewBox="0 0 1100 320" role="img" aria-label="Path MTU black hole: small packets delivered, the oversized TLS certificate dropped silently">
  <text class="t-ok" x="30" y="30" font-size="15">small packets — delivered</text>

  <rect class="box-a" x="30" y="46" width="230" height="56" rx="10"/>
  <text class="t-accent" x="145" y="81" text-anchor="middle" font-size="17">process, MSS 1460</text>

  <path class="ln-a" d="M260,74 L336,74" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="340" y="46" width="230" height="56" rx="10"/>
  <text class="t-violet" x="455" y="81" text-anchor="middle" font-size="17">tun, MTU 1420</text>

  <path class="ln-a" d="M570,74 L646,74" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-w" x="650" y="46" width="230" height="56" rx="10"/>
  <text class="t-warn" x="765" y="81" text-anchor="middle" font-size="17">firewall drops ICMP</text>

  <path class="ln-a" d="M880,74 L956,74" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-ok" x="960" y="46" width="110" height="56" rx="10"/>
  <text class="t-ok" x="1015" y="81" text-anchor="middle" font-size="17">peer</text>

  <text class="t-bad" x="30" y="172" font-size="15">the TLS certificate — dropped</text>

  <rect class="box-b" x="30" y="188" width="230" height="56" rx="10"/>
  <text class="t-bad" x="145" y="223" text-anchor="middle" font-size="17">certificate, 2.4 KB</text>

  <path class="ln-b" d="M260,216 L336,216" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-b" x="340" y="188" width="540" height="56" rx="10"/>
  <text class="t-bad" x="610" y="223" text-anchor="middle" font-size="17">dropped, silently</text>

  <path class="ln-b" d="M765,244 L765,282" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-w" x="650" y="286" width="230" height="30" rx="8"/>
  <text class="t-warn" x="765" y="307" text-anchor="middle" font-size="17">retransmit forever</text>
</svg>`
      },
      {
        type: "table",
        cols: ["Error string", "What is actually happening"],
        rows: [
          ["<code>ECONNREFUSED</code> (curl: (7))", "An RST came back. Nothing is listening on that host and port, or a firewall sent <code>REJECT</code>. Immediate — the network works."],
          ["<code>Connection timed out</code>", "No RST, no reply. A firewall <code>DROP</code>, a black-hole route or a dead next hop. <code>nc -vz</code> hangs instead of refusing."],
          ["<code>ENETUNREACH</code>", "No route at all — <code>ip route get</code> returns <code>unreachable</code> — or a route exists but the host is unreachable: failed ARP, or <code>ip_forward=0</code> on a forwarding path."],
          ["<code>EMSGSIZE</code>", "A datagram exceeded the path MTU and fragmentation is disallowed, so UDP sends fail while TCP works."],
          ["<code>EAGAIN</code> on a non-blocking socket", "Accept queue full: <code>ss -ltn</code> shows <code>Recv-Q</code> at the Send-Q value and <code>TcpExtListenDrops</code> climbs."]
        ]
      },
      {
        type: "callout",
        kind: "boss",
        title: "mental model to keep",
        text: "Networking is four kernel data structures — interfaces, addresses, routes, neighbours — plus one state machine for reliability (TCP) and one for policy (netfilter and conntrack). Both are <em>inspectable</em>, which is why <code>ss</code> and <code>conntrack -L</code> exist. Ask which state machine is wrong before blaming the wire."
      }
    ],
    takeaways: [
      "The NIC owns a MAC and a cable. IP, TCP, NAT and the firewall are software on your CPU, so the network is almost never the network.",
      "A route is a lookup result, not a path. <code>ip route get</code> is the honest question; <code>traceroute</code> shows one path only.",
      "<code>CLOSE_WAIT</code> in bulk is an application leak. <code>TIME_WAIT</code> in bulk on a server means you are closing first.",
      "netfilter hooks are gates and <code>*nat</code> runs only for the first packet. Legacy and nftables are separate stores, first verdict wins — run <code>iptables -V</code> before debugging logic.",
      "Small responses working while TLS hangs is a path-MTU symptom: <code>ping -M do</code> pins it, accepting ICMP type 3 code 4 fixes it."
    ],
    glossary: {
      "socket": "A kernel object exposed as a file descriptor. Owns buffers, state and the protocol state machine.",
      "route": "A prefix plus an action in a routing table. Longest-prefix match wins; no flow state.",
      "routing rule": "An ordered policy-routing entry naming a table and a match. <code>ip rule</code>; index 0 is always local.",
      "neighbour table": "The ARP and NDP cache mapping link-layer addresses to IP addresses on the same segment.",
      "MTU": "Maximum transmission unit — the largest payload a link carries without fragmentation. Ethernet is 1500.",
      "conntrack": "The kernel per-connection state table shared by netfilter and NAT, keyed by the 5-tuple."
    }
  });
})();