/* ch02 — The kernel: the machine underneath — SIMPLIFIED EDITION
   Reference implementation of assets/chapters/SIMPLIFY.md.
   Prose 1744 -> ~430 (25%). Code 150 -> ~45 (30%).
   All 4 diagrams redrawn simple: viewBox height 340/210/230/300 (was 660/470/520/340),
   3-6 boxes each (was 10-20), labels of 2-5 words, 3 text colours. */
(function () {
  LX.push({
    id: "kernel",
    title: "The kernel: the machine underneath",
    tagline: "One privileged program owning the CPU, memory and devices. Everything else is a guest.",
    sections: [
      {
        type: "prose",
        h: "What the kernel actually is",
        p: [
          "Linux is a <strong>resource controller with a syscall API in front of it</strong>. It owns CPU time, memory and devices, and decides who gets what. Packages, services, containers and shells are user-space software talking to it through one door.",
          "Above that line a process does what its <em>credentials</em> allow. Below it there are no permissions — one entity that can touch any page or device. That is why “root” is not an account but the <strong>absence of one</strong>. The kernel is trusted, not sandboxed, so a kernel bug is contained by nothing. Namespaces, capabilities and seccomp add containment back <em>above</em> it."
        ]
      },
      {
        type: "diagram",
        h: "User space asks, the kernel disposes",
        caption: "Two things cross downwards: a <b>trap</b> you asked for, and an <b>interrupt</b> the hardware decided on. Nothing crosses downwards by accident — which is exactly what kernel protection is for.",
        svg: `
<svg viewBox="0 0 1100 340" role="img" aria-label="User space above kernel space above hardware, connected by syscalls and interrupts">
  <rect class="box" x="30" y="20" width="1040" height="80" rx="12"/>
  <text class="t-title" x="550" y="55" text-anchor="middle">USER SPACE</text>
  <text class="t-sm" x="550" y="80" text-anchor="middle">bash · nginx · sshd · containers</text>

  <path class="ln-a" d="M330,100 L330,150" marker-end="url(#lm-arrow-accent)"/>
  <text class="t-accent" x="316" y="132" font-size="16" text-anchor="end">syscall — you asked</text>
  <path class="ln-b" d="M770,100 L770,150" marker-end="url(#lm-arrow-bad)"/>
  <text class="t-bad" x="784" y="132" font-size="16">interrupt — hardware asked</text>

  <rect class="box-w" x="30" y="152" width="1040" height="100" rx="12"/>
  <text class="t-warn" x="550" y="190" text-anchor="middle" font-size="18">KERNEL SPACE</text>
  <text class="t-sm" x="550" y="218" text-anchor="middle">scheduler · memory · filesystems · network · drivers</text>
  <text class="t-xs" x="550" y="238" text-anchor="middle">no permissions inside — this is the trust boundary</text>

  <path class="ln" d="M550,252 L550,286" marker-end="url(#lm-arrow)"/>
  <text class="t-dim" x="570" y="276" font-size="15">CPU · RAM · disk · NIC</text>

  <rect class="box" x="30" y="288" width="1040" height="42" rx="12"/>
  <text class="t-sm" x="550" y="315" text-anchor="middle">HARDWARE — the MMU is the real enforcer</text>
</svg>`
      },
      {
        type: "prose",
        h: "The syscall: the only sanctioned door",
        p: [
          "On x86-64 the ask is literal: load the argument registers, execute <code>syscall</code>, and the CPU switches privilege level and jumps to a fixed kernel entry point. A <em>trap</em>, not an interrupt — the hardware knows it was requested.",
          "The dispatcher then <strong>validates everything</strong>: pointers against the user's address space, lengths against the buffer, credentials against the inode's permission bits <em>and</em> capabilities, LSM policy, cgroup limits. Only then does the work happen. That is why <code>strace</code> reads like a conversation, and why a failing program's <code>ENOENT</code>/<code>EACCES</code> pattern is the fastest truth you have."
        ],
        noteTitle: "Syscall numbers are stable ABI",
        note: "Frozen on x86-64 since 2013: <code>read</code>=0, <code>write</code>=1, <code>openat</code>=257, <code>mmap</code>=9, <code>clone</code>=56, <code>execve</code>=59. That is why a binary runs on any machine of the same architecture — and why a seccomp profile written as deny-this-one-number still holds years later.",
        noteKind: "fact"
      },
      {
        type: "diagram",
        h: "Anatomy of one open()",
        caption: "Nine crossings of the boundary, two of them inside libc. When it is slow, the slow rows are <code>lookup</code> and <code>read</code> — that is your filesystem or your disk, not the kernel.",
        svg: `
<svg viewBox="0 0 1100 210" role="img" aria-label="Four stage flow of an open() call from process to disk">
  <rect class="box-a" x="30" y="55" width="225" height="90" rx="10"/>
  <text class="t-accent" x="142" y="92" text-anchor="middle" font-size="17">process</text>
  <text class="t-sm" x="142" y="118" text-anchor="middle">nginx worker</text>

  <path class="ln-a" d="M255,100 L285,100" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="290" y="55" width="225" height="90" rx="10"/>
  <text class="t-violet" x="402" y="92" text-anchor="middle" font-size="17">libc</text>
  <text class="t-sm" x="402" y="118" text-anchor="middle">openat()</text>

  <path class="ln-w" d="M515,100 L545,100" marker-end="url(#lm-arrow-warn)"/>

  <rect class="box-w" x="550" y="55" width="225" height="90" rx="10"/>
  <text class="t-warn" x="662" y="85" text-anchor="middle" font-size="17">kernel</text>
  <text class="t-sm" x="662" y="110" text-anchor="middle">validate,</text>
  <text class="t-sm" x="662" y="130" text-anchor="middle">then VFS</text>

  <path class="ln-ok" d="M775,100 L805,100" marker-end="url(#lm-arrow-ok)"/>

  <rect class="box-ok" x="810" y="55" width="260" height="90" rx="10"/>
  <text class="t-ok" x="940" y="92" text-anchor="middle" font-size="17">ext4</text>
  <text class="t-sm" x="940" y="118" text-anchor="middle">dentries, inode, disk</text>

  <text class="t-dim" x="550" y="185" text-anchor="middle" font-size="15">returns a file descriptor — or -1 and an errno</text>
</svg>`
      },
      {
        type: "prose",
        h: "Interrupts, and why a hung disk freezes everything",
        p: [
          "A device raises an interrupt, the CPU saves state and enters the kernel. So does the <strong>timer</strong>, which is what makes preemptive multitasking possible: on every tick the scheduler may take the CPU away.",
          'That produces the two states people misread. <code>R</code> is running or runnable. <code>D</code> is uninterruptible sleep — waiting on I/O, cannot be killed, cannot be woken. A process stuck in <code>D</code> on a dead NFS mount is why <em>load climbs and nothing responds</em>, and you cannot <code>kill -9</code> it because it is not listening.'
        ],
        noteTitle: "A practical rule",
        note: "High load with low CPU = <b>blocked on I/O</b>. High load with high CPU = a runaway process or an interrupt storm. Run <code>ps -eo state,pid,comm | awk '$1 ~ /D/'</code> before restarting anything — a reboot hides the cause rather than fixing it.",
        noteKind: "warn"
      },
      {
        type: "diagram",
        h: "Memory is a lie the kernel tells politely",
        caption: "Every process gets an identical-looking address space, mapped on demand and shared copy-on-write after <code>fork()</code>. A process with 12&nbsp;GB virtual and 40&nbsp;MB RSS is not using 12&nbsp;GB.",
        svg: `
<svg viewBox="0 0 1100 230" role="img" aria-label="Virtual address space mapped through page tables onto physical RAM">
  <rect class="box-a" x="30" y="45" width="290" height="110" rx="10"/>
  <text class="t-accent" x="175" y="80" text-anchor="middle" font-size="17">virtual addresses</text>
  <text class="t-sm" x="175" y="110" text-anchor="middle">stack · heap · libs</text>
  <text class="t-xs" x="175" y="135" text-anchor="middle">identical for every process</text>

  <path class="ln-a" d="M320,100 L390,100" marker-end="url(#lm-arrow-accent)"/>
  <text class="t-xs" x="355" y="88" text-anchor="middle">mapped by</text>

  <rect class="box-w" x="395" y="45" width="250" height="110" rx="10"/>
  <text class="t-warn" x="520" y="80" text-anchor="middle" font-size="17">page tables</text>
  <text class="t-sm" x="520" y="110" text-anchor="middle">CR3 → … → PTE</text>
  <text class="t-xs" x="520" y="135" text-anchor="middle">read/write/execute bits</text>

  <path class="ln-a" d="M645,100 L715,100" marker-end="url(#lm-arrow-accent)"/>
  <text class="t-xs" x="680" y="88" text-anchor="middle">resolves</text>

  <rect class="box-ok" x="720" y="45" width="350" height="110" rx="10"/>
  <text class="t-ok" x="895" y="80" text-anchor="middle" font-size="17">physical RAM</text>
  <text class="t-sm" x="895" y="110" text-anchor="middle">pages, assigned on demand</text>
  <text class="t-xs" x="895" y="135" text-anchor="middle">code shared, heap not, cache fills the rest</text>

  <text class="t-bad" x="550" y="200" text-anchor="middle" font-size="15">an unmapped page cannot be named by any user process, whatever its uid</text>
</svg>`
      },
      {
        type: "diagram",
        h: "Where the kernel source lives",
        caption: "When a subsystem misbehaves, <code>dmesg</code> names one of these. Drivers and filesystems are the layer to distrust — they parse data written by untrusted parties.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="Six top-level directories of the Linux kernel source tree">
  <rect class="box-a" x="40" y="40" width="300" height="90" rx="10"/>
  <text class="t-accent" x="190" y="78" text-anchor="middle" font-size="17">kernel/</text>
  <text class="t-sm" x="190" y="105" text-anchor="middle">scheduler, signals, cgroups</text>

  <rect class="box-v" x="400" y="40" width="300" height="90" rx="10"/>
  <text class="t-violet" x="550" y="78" text-anchor="middle" font-size="17">fs/</text>
  <text class="t-sm" x="550" y="105" text-anchor="middle">ext4, xfs, overlay, proc</text>

  <rect class="box-v" x="760" y="40" width="300" height="90" rx="10"/>
  <text class="t-violet" x="910" y="78" text-anchor="middle" font-size="17">net/</text>
  <text class="t-sm" x="910" y="105" text-anchor="middle">tcp, netfilter, bridge</text>

  <rect class="box-w" x="40" y="170" width="300" height="90" rx="10"/>
  <text class="t-warn" x="190" y="208" text-anchor="middle" font-size="17">drivers/</text>
  <text class="t-sm" x="190" y="235" text-anchor="middle">70% of the tree</text>

  <rect class="box" x="400" y="170" width="300" height="90" rx="10"/>
  <text x="550" y="208" text-anchor="middle" font-size="17">arch/</text>
  <text class="t-sm" x="550" y="235" text-anchor="middle">where the entry point lives</text>

  <rect class="box-p" x="760" y="170" width="300" height="90" rx="10"/>
  <text class="t-bad" x="910" y="201" text-anchor="middle" font-size="17">distrust this</text>
  <text class="t-sm" x="910" y="228" text-anchor="middle">parses untrusted data</text>
</svg>`
      },
      {
        type: "prose",
        h: "The kernel's control surfaces",
        p: [
          "<code>/proc</code> is a virtual filesystem synthesised by the kernel on read — <code>/proc/cpuinfo</code> walks kernel structures, it never touches a disk. <code>/sys</code> is the device and driver model. <code>lsmod</code> shows modules; a missing one looks like a mysterious failure, not a missing feature. <code>dmesg</code> holds hardware probes, OOM kills and segfaults — the first place to look on a 2&nbsp;GB VPS when a service will not start. Tunables live in <code>sysctl</code> and should be persisted in <code>/etc/sysctl.d/</code>."
        ]
      },
      {
        type: "code",
        lang: "bash",
        what: "The three kernel-level checks that answer most questions",
        code:
`ps -eo state,pid,comm | awk '$1 ~ /^D/'      # the D-state hunt
journalctl -k -b -p err --no-pager | tail -30  # what the kernel is complaining about
cat /proc/pressure/{cpu,memory,io}             # how long tasks stalled on each`
      },
      {
        type: "callout",
        kind: "warn",
        title: "mental model to keep",
        text: "The kernel grants; user space requests. When something misbehaves, ask <em>which half is it?</em> A process returning <code>ENOENT</code> is user space asking the wrong question. A machine ignoring <code>kill -9</code> is the kernel saying <code>D</code> state."
      }
    ],
    takeaways: [
      "Two halves, one door. <strong>syscall</strong> = you asked; <strong>interrupt</strong> = hardware decided.",
      "The kernel validates every pointer, length and permission — which is why <code>errno</code> is the fastest truth in debugging.",
      "The MMU is the real enforcer: a page is reachable only because the kernel mapped it.",
      "<strong>D state is “unkillable”, not “busy”.</strong> High load with idle CPU means blocked I/O."
    ],
    glossary: {
      "syscall": "A validated request from user space into the kernel — the only sanctioned way to touch the machine.",
      "trap": "A synchronous CPU mode switch caused by the running code (syscall, page fault).",
      "interrupt": "An asynchronous CPU mode switch caused by hardware (timer, NIC, disk).",
      "ring 0 / ring 3": "CPU privilege levels: ring 0 kernel, ring 3 user space, enforced by the MMU.",
      "MMU": "Memory Management Unit. Translates virtual addresses and enforces page permissions.",
      "copy-on-write": "fork() shares memory read-only; the first write faults and copies it.",
      "D state": "Uninterruptible sleep — waiting on I/O, and cannot be killed or woken."
    }
  });
})();