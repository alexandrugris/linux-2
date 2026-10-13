/* ch03 — Processes, threads, and the process tree — SIMPLIFIED EDITION
   Source: linux-map/assets/chapters/ch03-processes.js
   4 diagrams redrawn simple: 5, 4, 5 and 5 boxes (was 19, 8, 9 and 19),
   viewBox height 340/290/350/320 (was 620/470/540/420), labels of 2-5 words.
   Prose 1395 -> ~420 (30%). Code 313 -> ~50 (16%). */
(function () {
  LX.push({
    id: "processes",
    title: "Processes, threads, and the process tree",
    tagline: "A process is a kernel object that owns some memory, some file descriptors and a slot in a scheduler queue. Everything on Linux is a file or a process.",
    sections: [
      {
        type: "prose",
        h: "What a process actually is",
        p: [
          "A program is a file on disk — inert text. A process is what the kernel creates when something <em>executes</em> it: a <code>task_struct</code> holding a PID, credentials, open fds, a signal mask, an address space, a cgroup membership and a run queue entry.",
          "Because the kernel stores that structure, <strong>/proc is a view of the kernel's own data</strong>: reading <code>/proc/1234/status</code> formats live fields, which is why it is always current. Every running thing is a process, and <em>process identity is an accounting boundary, not a security boundary</em>."
        ]
      },
      {
        type: "diagram",
        h: "A real process tree: your Ubuntu server",
        caption: "One <code>systemd</code> at the root. Two shapes: <b>master/worker</b> (nginx and sshd both fork) and <b>session</b> (your shell hangs off logind, not sshd). A dead parent <b>reparents the child to PID 1</b>.",
        svg: `
<svg viewBox="0 0 1100 340" role="img" aria-label="Process tree rooted at systemd, with nginx workers and a login session">
  <rect class="box-ok" x="440" y="24" width="220" height="58" rx="10"/>
  <text class="t-ok" x="550" y="50" text-anchor="middle" font-size="17">systemd (PID 1)</text>
  <text class="t-sm" x="550" y="72" text-anchor="middle" font-size="15">reaps orphans</text>

  <path class="ln" d="M490,82 L180,120" marker-end="url(#lm-arrow)"/>
  <path class="ln" d="M550,82 L550,120" marker-end="url(#lm-arrow)"/>
  <path class="ln" d="M610,82 L920,120" marker-end="url(#lm-arrow)"/>

  <g class="jump" data-jump="services">
  <rect class="box-v" x="60" y="124" width="240" height="74" rx="10"/>
  <text class="t-violet" x="180" y="154" text-anchor="middle" font-size="17">nginx master</text>
  <text class="t-sm" x="180" y="180" text-anchor="middle" font-size="15">holds :80 and :443</text>
  </g>

  <g class="jump" data-jump="security">
  <rect class="box-a" x="430" y="124" width="240" height="74" rx="10"/>
  <text class="t-accent" x="550" y="154" text-anchor="middle" font-size="17">sshd</text>
  <text class="t-sm" x="550" y="180" text-anchor="middle" font-size="15">one child per login</text>
  </g>

  <rect class="box-v" x="800" y="124" width="240" height="74" rx="10"/>
  <text class="t-violet" x="920" y="154" text-anchor="middle" font-size="17">systemd --user</text>
  <text class="t-sm" x="920" y="180" text-anchor="middle" font-size="15">user@1000.service</text>

  <path class="ln" d="M180,198 L180,232" marker-end="url(#lm-arrow)"/>
  <path class="ln" d="M550,198 L550,232" marker-end="url(#lm-arrow)"/>
  <path class="ln dash" d="M670,266 L800,180" marker-end="url(#lm-arrow)"/>

  <rect class="box" x="60" y="236" width="240" height="58" rx="10"/>
  <text class="t-sm" x="180" y="261" text-anchor="middle" font-size="17">workers</text>
  <text class="t-sm" x="180" y="283" text-anchor="middle" font-size="15">one per CPU</text>

  <rect class="box-p" x="430" y="236" width="240" height="58" rx="10"/>
  <text class="t-sm" x="550" y="261" text-anchor="middle" font-size="17">bash</text>
  <text class="t-sm" x="550" y="283" text-anchor="middle" font-size="15">session-3.scope</text>

  <text class="t-bad" x="550" y="326" text-anchor="middle" font-size="16">orphans reparent to PID 1</text>
</svg>`
      },
      {
        type: "prose",
        h: "fork + exec: why two steps",
        p: [
          "Unix creates processes with <code>fork()</code>, copying the parent's address space, then <code>exec()</code>, throwing that copy away for a new program. Between the two calls <em>the child is a copy of the parent</em>: same fds, same working directory, same credentials, same open files at their <em>current offset</em>. That window is the basis of shell redirection, of <code>daemon</code> double-forking, and of why <code>exec 3&gt;file</code> affects every command that shell runs.",
          "<strong>The copy is cheap</strong> — copy-on-write mappings, so fork costs page tables, not data. Modern programs use <code>posix_spawn()</code> (async-signal-safe in threaded programs) or <code>clone()</code>, which makes processes <em>and</em> threads with one call."
        ]
      },
      {
        type: "diagram",
        h: "Threads are processes with the same address space",
        caption: "Threads share everything except the stack. One thread blocking in <code>read()</code> does not stop the others; one thread <em>segfaulting</em> takes the whole process. <code>ulimit -n</code> and <code>-u</code> are per-process.",
        svg: `
<svg viewBox="0 0 1100 290" role="img" aria-label="Three threads sharing one address space, fd table and cgroup">
  <rect class="box-a" x="30" y="40" width="330" height="100" rx="10"/>
  <text class="t-accent" x="195" y="80" text-anchor="middle" font-size="17">main thread</text>
  <text class="t-sm" x="195" y="108" text-anchor="middle" font-size="15">epoll_wait()</text>

  <rect class="box-a" x="385" y="40" width="330" height="100" rx="10"/>
  <text class="t-accent" x="550" y="80" text-anchor="middle" font-size="17">worker</text>
  <text class="t-sm" x="550" y="108" text-anchor="middle" font-size="15">shares the heap</text>

  <rect class="box-a" x="740" y="40" width="330" height="100" rx="10"/>
  <text class="t-accent" x="905" y="80" text-anchor="middle" font-size="17">timer</text>
  <text class="t-sm" x="905" y="108" text-anchor="middle" font-size="15">epoll timeout</text>

  <path class="ln-a" d="M195,140 L195,186" marker-end="url(#lm-arrow-accent)"/>
  <path class="ln-a" d="M550,140 L550,186" marker-end="url(#lm-arrow-accent)"/>
  <path class="ln-a" d="M905,140 L905,186" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-w" x="30" y="190" width="1040" height="64" rx="10"/>
  <text class="t-warn" x="550" y="218" text-anchor="middle" font-size="17">shared: address space, fds</text>
  <text class="t-sm" x="550" y="242" text-anchor="middle" font-size="15">one segfault kills all three</text>
</svg>`
      },
      {
        type: "table",
        h: "States: the single most useful column in ps",
        cols: ["State", "Meaning", "Can you kill it?"],
        rows: [
          [
            "<code>R</code> (R, R+)",
            "Running or runnable. High R on all cores means CPU saturation",
            "yes"
          ],
          [
            "<code>S</code> (S, S+)",
            "Interruptible sleep: a timer, a socket, or a page-in from disk",
            "yes, immediately"
          ],
          [
            "<code>D</code>",
            "Uninterruptible sleep: hung disk, unreachable NFS. <strong>Never transient</strong> — investigate the filesystem, do not kill",
            "<b>no.</b> SIGKILL is queued until the I/O returns"
          ],
          [
            "<code>Z</code>",
            "Zombie: exited, parent has not reaped it; holds a PID slot",
            "already dead"
          ],
          [
            "<code>T</code> (T, t)",
            "Stopped by job control or a debugger. Lowercase <code>t</code> = a tracer (strace, gdb) is attached",
            "yes — SIGCONT, or detach the tracer"
          ]
        ]
      },
      {
        type: "diagram",
        h: "Signals: how a kill becomes an action",
        caption: "A signal is a queued number, not an event. The kernel decides at delivery from the <b>disposition</b> (default, ignore, handler) and the <b>mask</b> — which is why <code>kill -9</code> cannot be caught and some programs ignore signals you think are working.",
        svg: `
<svg viewBox="0 0 1100 350" role="img" aria-label="Signal queued in the kernel then dispatched to a handler, ignored, or the default action">
  <rect class="box-a" x="350" y="30" width="400" height="60" rx="9"/>
  <text class="t-accent" x="550" y="56" text-anchor="middle" font-size="17">sender</text>
  <text class="t-sm" x="550" y="78" text-anchor="middle" font-size="15">kill(2), Ctrl-C, OOM killer</text>

  <path class="ln-a" d="M550,90 L550,118" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-w" x="350" y="120" width="400" height="60" rx="9"/>
  <text class="t-warn" x="550" y="146" text-anchor="middle" font-size="17">kernel: pending bitmask</text>
  <text class="t-sm" x="550" y="168" text-anchor="middle" font-size="15">queued per task, delivered later</text>

  <path class="ln" d="M420,180 L155,222" marker-end="url(#lm-arrow)"/>
  <path class="ln" d="M550,180 L550,222" marker-end="url(#lm-arrow)"/>
  <path class="ln" d="M680,180 L945,222" marker-end="url(#lm-arrow)"/>

  <rect class="box-ok" x="30" y="226" width="250" height="76" rx="9"/>
  <text class="t-ok" x="155" y="256" text-anchor="middle" font-size="17">handler runs</text>
  <text class="t-sm" x="155" y="282" text-anchor="middle" font-size="15">nginx drains first</text>

  <rect class="box-w" x="425" y="226" width="250" height="76" rx="9"/>
  <text class="t-warn" x="550" y="256" text-anchor="middle" font-size="17">ignored</text>
  <text class="t-sm" x="550" y="282" text-anchor="middle" font-size="15">mask or SIG_IGN</text>

  <rect class="box-b" x="820" y="226" width="250" height="76" rx="9"/>
  <text class="t-bad" x="945" y="256" text-anchor="middle" font-size="17">default action</text>
  <text class="t-sm" x="945" y="282" text-anchor="middle" font-size="15">terminate or stop</text>

  <text class="t-bad" x="550" y="336" text-anchor="middle" font-size="16">SIGKILL, SIGSTOP: uncatchable by design</text>
</svg>`
      },
      {
        type: "prose",
        h: "Scheduling, and what load average is measuring",
        p: [
          "Linux runs a preemptive per-CPU run queue: the Completely Fair Scheduler orders tasks by a virtual runtime counter that grows while a task runs and shrinks when it is scheduled in. <strong>nice</strong> (−20 … 19) shifts the starting weight. <strong>SCHED_FIFO and SCHED_RR</strong> are real-time, where a FIFO task <em>preempts everything</em> until it blocks — a mistake on a shared server. <strong>cgroup weights</strong> (<code>cpu.weight</code>, or <code>cpu.shares</code> on v1) are the modern lever.",
          "Load average is routinely misread. It is <strong>the exponentially-weighted count of runnable and uninterruptibly-sleeping tasks</strong> over 1, 5 and 15 minutes — not CPU utilisation. Load 4 on a 2-core box is oversubscribed; on a 32-core box it is idle. Because <code>D</code> counts, <strong>load climbs while the CPU is idle</strong>: the fingerprint of blocked I/O."
        ]
      },
      {
        type: "diagram",
        h: "What the load average counts",
        caption: "<code>S</code> is most of your machine and is <b>not</b> counted; <code>D</code> is a stuck task and <b>is</b>. So rising load with idle CPU is a disk or network wait — restarting the app changes nothing.",
        svg: `
<svg viewBox="0 0 1100 320" role="img" aria-label="Load average counts runnable and uninterruptible tasks but not sleeping ones">
  <rect class="box-a" x="350" y="24" width="400" height="60" rx="9"/>
  <text class="t-accent" x="550" y="50" text-anchor="middle" font-size="17">load average</text>
  <text class="t-sm" x="550" y="72" text-anchor="middle" font-size="15">1, 5, 15 minute means</text>

  <path class="ln" d="M420,84 L155,128" marker-end="url(#lm-arrow)"/>
  <path class="ln" d="M550,84 L550,128" marker-end="url(#lm-arrow)"/>
  <path class="ln" d="M680,84 L945,128" marker-end="url(#lm-arrow)"/>

  <rect class="box-ok" x="30" y="132" width="250" height="76" rx="9"/>
  <text class="t-ok" x="155" y="162" text-anchor="middle" font-size="17">R · runnable</text>
  <text class="t-sm" x="155" y="188" text-anchor="middle" font-size="15">counted</text>

  <rect class="box" x="425" y="132" width="250" height="76" rx="9"/>
  <text class="t-sm" x="550" y="162" text-anchor="middle" font-size="17">S · sleeping</text>
  <text class="t-sm" x="550" y="188" text-anchor="middle" font-size="15">not counted</text>

  <rect class="box-b" x="820" y="132" width="250" height="76" rx="9"/>
  <text class="t-bad" x="945" y="162" text-anchor="middle" font-size="17">D · blocked on I/O</text>
  <text class="t-sm" x="945" y="188" text-anchor="middle" font-size="15">counted</text>

  <rect class="box-b" x="30" y="238" width="520" height="64" rx="9"/>
  <text class="t-bad" x="290" y="266" text-anchor="middle" font-size="17">high load, idle CPU</text>
  <text class="t-sm" x="290" y="290" text-anchor="middle" font-size="15">blocked on I/O</text>

  <rect class="box-a" x="580" y="238" width="490" height="64" rx="9"/>
  <text class="t-accent" x="825" y="266" text-anchor="middle" font-size="17">cpu.weight throttles</text>
  <text class="t-sm" x="825" y="290" text-anchor="middle" font-size="15">by scheduling less</text>
</svg>`
      },
      {
        type: "code",
        lang: "bash",
        what: "The process toolkit: what to run, and what the answer means",
        code:
`ps -eo pid,ppid,stat,etimes,%cpu,%mem,comm --sort=-%cpu | head
ps -eo stat,pid,comm | awk '$1 ~ /^D/'   # the D-state hunt: do this first
pstree -asp 1                             # the tree from PID 1
ls -l /proc/1234/fd                       # every open file
cat /proc/1234/cgroup                     # therefore which limits apply
kill -TERM 1234                           # ask nicely
kill -- -$(ps -o pgid= -p 1234)           # the whole process group`
      }
    ],
    takeaways: [
      "A process is a <code>task_struct</code>: PID, credentials, fds, address space, cgroup. <strong>/proc is a live view of that structure</strong>, not a cached file.",
      "Read <code>ps -eo stat</code> first. <strong>D means blocked on I/O and cannot be killed</strong>; S is normal; Z points at the parent — PID 1 is what reaps orphans, so a container needs a real init.",
      "fork+exec is two steps on purpose: between them the child is a copy of the parent with its fds and their offsets, which is how redirection, daemonising and job control work.",
      "Load average counts runnable <em>and</em> uninterruptibly-sleeping tasks. <strong>High load with idle CPU is blocked I/O</strong>, not a busy machine."
    ],
    glossary: {
      "task_struct": "The kernel structure behind a process: state, scheduling info, credentials, memory map, fds, cgroup membership.",
      "PPID": "Parent process ID. Becomes 1 when the parent dies and the kernel reparents the orphan to init.",
      "zombie": "An exited process whose exit status has not been collected by its parent. Holds a PID slot, no memory.",
      "copy-on-write": "fork shares the parent's memory read-only until a write faults it into a private copy, making fork cheap.",
      "CFS": "Completely Fair Scheduler — the per-CPU run-queue scheduler, ordering tasks by virtual runtime so long waits shrink."
    }
  });
})();