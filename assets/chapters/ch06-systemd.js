/* ch06 — systemd: PID 1, units, timers, journald — SIMPLIFIED EDITION
   Prose 2422 -> ~590 words. Code 284 -> ~80.
   Both diagrams redrawn: viewBox 300 and 340 (was 560 and 620),
   5 and 4 boxes, labels of 2-5 words, 14 text nodes. */
(function () {
  LX.push({
    id: "systemd",
    title: "systemd: PID 1, units, timers, journald",
    tagline: "PID 1 is a reconciler that happens to manage processes. Almost everything strange about systemd follows from that one idea.",
    sections: [
      {
        type: "prose",
        h: "What PID 1 is actually for",
        p: [
          "Before systemd, PID 1 was <code>init</code>: fork, wait, run a shell script of start commands. It did not know what a dependency was and could not restart a failed service. systemd replaced all of it with one idea: <strong>describe the units, declare the graph, reconcile it forever.</strong> Nearly every oddity follows from that being <em>state machines with timers</em>. A unit is always in exactly one state, every transition has a timeout, and <em>what state, how long, what did the last attempt log</em> answers most questions.",
          "systemd is also the <strong>cgroup manager</strong>. Each unit is a cgroup, so <code>systemctl restart</code> kills a whole process tree reliably and limits are exact rather than advisory."
        ]
      },
      {
        type: "diagram",
        h: "The unit lifecycle, with the timeouts that govern it",
        caption: "Every edge has a timer on it. A unit stuck in <code>activating</code> or <code>deactivating</code> is telling you a timeout is coming, and the reason is in the journal.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="systemd unit state machine with its timeouts">
  <rect class="box" x="40" y="70" width="150" height="70" rx="10"/>
  <text class="t-sm" x="115" y="112" text-anchor="middle">dead (inactive)</text>

  <path class="ln-a" d="M190,105 L258,105" marker-end="url(#lm-arrow-accent)"/>
  <text class="t-xs" x="224" y="95" text-anchor="middle">start</text>

  <rect class="box-a" x="262" y="60" width="220" height="90" rx="10"/>
  <text class="t-accent" x="372" y="94" text-anchor="middle" font-size="17">activating</text>
  <text class="t-xs" x="372" y="120" text-anchor="middle">Type=simple: instant</text>
  <text class="t-xs" x="372" y="138" text-anchor="middle">Type=notify: waits</text>

  <path class="ln-ok" d="M482,105 L550,105" marker-end="url(#lm-arrow-ok)"/>
  <text class="t-xs" x="516" y="95" text-anchor="middle">READY=1</text>

  <rect class="box-ok" x="554" y="70" width="190" height="70" rx="10"/>
  <text class="t-ok" x="649" y="112" text-anchor="middle" font-size="17">active (running)</text>

  <path class="ln" d="M744,105 L812,105" marker-end="url(#lm-arrow)"/>
  <text class="t-xs" x="778" y="95" text-anchor="middle">stop</text>

  <rect class="box-w" x="816" y="70" width="200" height="70" rx="10"/>
  <text class="t-warn" x="916" y="100" text-anchor="middle">deactivating</text>
  <text class="t-xs" x="916" y="124" text-anchor="middle">SIGTERM, then SIGKILL</text>

  <path class="ln-b" d="M372,150 L372,196" marker-end="url(#lm-arrow-bad)" stroke-dasharray="4 4"/>
  <text class="t-bad" x="384" y="178" font-size="14">TimeoutStartSec → failed</text>

  <rect class="box-b" x="302" y="200" width="140" height="52" rx="9"/>
  <text class="t-bad" x="372" y="232" text-anchor="middle">failed</text>

  <path class="ln-a" d="M442,226 L500,226 L500,168 L372,168 L372,152" marker-end="url(#lm-arrow-accent)" stroke-dasharray="3 3"/>
  <text class="t-accent" x="512" y="192" font-size="14">Restart=on-failure</text>

  <path class="ln" d="M816,140 L700,270 L190,270 L190,144" marker-end="url(#lm-arrow)"/>
  <text class="t-dim" x="560" y="290" font-size="14" text-anchor="middle">TimeoutStopSec → dead</text>
</svg>`
      },
      {
        type: "prose",
        h: "Units: pick the right type, or the wrong one surprises you",
        p: [
          "Every managed thing is a <strong>unit</strong> named by a suffix, and the suffix decides what “started” means. <code>Type=simple</code> makes the unit active <em>the instant after fork</em>, before <code>execve</code>, so <code>systemctl start foo</code> succeeding says nothing about foo working. <code>Type=notify</code> waits for your program to call <code>sd_notify(READY=1)</code> — the only way to make “started” mean “ready”."
        ]
      },
      {
        type: "table",
        cols: ["Unit", "What it is", "Get it wrong and…"],
        rows: [
          [
            "<code>.service</code>",
            "A supervised process. <code>Type=</code> picks simple, exec, notify, forking, oneshot, idle",
            "<code>Type=simple</code> on something needing setup means “started” fires before it can serve"
          ],
          [
            "<code>.socket</code>",
            "A listening socket created independently; connections trigger the unit",
            "The fix for a serial service: the socket is open before the daemon, so nothing is refused during a restart"
          ],
          [
            "<code>.timer</code>",
            "Activates a <code>.service</code> on a calendar or monotonic schedule",
            "Assuming cron semantics: <code>AccuracySec</code> defaults to a minute"
          ]
        ]
      },
      {
        type: "diagram",
        h: "systemd is the cgroup manager",
        caption: "systemd does not merely supervise processes, it <b>places</b> them. Each unit is a cgroup, which is why <code>restart</code> kills a tree that has moved process groups, and why <code>systemd-cgls</code>, <code>memory.events</code> and container accounting line up with <code>systemctl status</code>.",
        svg: `
<svg viewBox="0 0 1100 340" role="img" aria-label="One systemd unit is one cgroup holding the whole process tree">
  <rect class="box" x="40" y="50" width="270" height="110" rx="10"/>
  <text class="t-sm" x="175" y="88" text-anchor="middle" font-size="17">nginx.service</text>
  <text class="t-xs" x="175" y="116" text-anchor="middle">/lib/systemd/system/</text>
  <text class="t-xs" x="175" y="138" text-anchor="middle">never edit this file</text>

  <path class="ln-a" d="M310,105 L378,105" marker-end="url(#lm-arrow-accent)"/>
  <text class="t-xs" x="344" y="95" text-anchor="middle">start</text>

  <rect class="box-a" x="382" y="50" width="300" height="110" rx="10"/>
  <text class="t-accent" x="532" y="94" text-anchor="middle" font-size="17">one cgroup</text>
  <text class="t-xs" x="532" y="122" text-anchor="middle">system.slice/nginx.service</text>

  <path class="ln-a" d="M682,105 L750,105" marker-end="url(#lm-arrow-accent)"/>
  <text class="t-xs" x="716" y="95" text-anchor="middle">restart</text>

  <rect class="box-ok" x="754" y="50" width="306" height="110" rx="10"/>
  <text class="t-ok" x="907" y="88" text-anchor="middle" font-size="17">master + workers</text>
  <text class="t-xs" x="907" y="116" text-anchor="middle">one syscall kills them</text>
  <text class="t-xs" x="907" y="138" text-anchor="middle">a double-forked daemon too</text>

  <rect class="box-w" x="40" y="210" width="1020" height="90" rx="10"/>
  <text class="t-warn" x="60" y="240" font-size="15">limits are exact, because the accounting happens in the same tree it manages</text>
  <text class="t-sm" x="60" y="268">memory.max · memory.current · pids.max · cpu.max</text>
  <text class="t-xs" x="60" y="290">systemctl status nginx and systemd-cgls show the tree the kernel actually enforces</text>

  <text class="t-bad" x="550" y="330" text-anchor="middle" font-size="15">on cgroups v2 this is one hierarchy; on v1 (this box, systemd 237) each controller is a separate tree</text>
</svg>`
      },
      {
        type: "prose",
        h: "Dependencies, ordering, and the failure modes that follow",
        p: [
          "systemd separates two questions everyone conflates. <strong>Should this unit start?</strong> is dependency: <code>Requires=</code>, <code>Wants=</code>, <code>BindsTo=</code>, <code>PartOf=</code>. <strong>In what order?</strong> is <code>Before=</code> and <code>After=</code>. A unit can require another without ordering it, and — the source of an entire genre of bug — it can be ordered after something it does not depend on, so it may start first anyway. <code>BindsTo=</code> stops this unit when the bound one goes <em>inactive</em>; <code>PartOf=</code> propagates stop and restart <em>from</em> another unit. systemd also <em>generates</em> units from <code>/etc/fstab</code> and udev, so a unit you cannot find as a file still exists."
        ],
        noteTitle: "The failure everyone hits",
        note: "A unit <b>Wanted</b> by a target that fails produces a warning and boot continues. A unit <b>Required</b> that fails drops the target, landing you in <code>emergency.target</code>. So <code>Requires=</code> for something fragile turns a small failure into an unbootable machine.",
        noteKind: "warn"
      },
      {
        type: "code",
        lang: "bash",
        what: "The five queries that answer most systemd questions",
        code:
`systemctl cat nginx            # every drop-in, in order, with its file
systemctl show nginx -p ActiveState -p SubState -p NRestarts
journalctl -u nginx -f -p err -b -1     # this boot or last, errors only
systemctl list-timers --all     # when the next timer really fires
systemd-analyze blame          # which unit cost the wall-clock
systemctl edit nginx           # drop-in; never edit /lib/systemd/system/
systemctl revert nginx         # undo the drop-ins
systemctl edit --runtime nginx # /run/, lost on reboot`
      },
      {
        type: "prose",
        h: "journald and timers",
        p: [
          "journald merges stdout, stderr, the kernel ring buffer and its own messages into one indexed store where every record carries <code>_SYSTEMD_UNIT</code>, <code>_PID</code>, <code>_BOOT_ID</code>, <code>PRIORITY</code> — which is why <code>journalctl -u nginx -p err -b -1</code> is a query, not a grep. It is <strong>per-boot by nature</strong>, so <code>-b</code> and <code>-b -1</code> are the flags you will use most. It <strong>rate-limits</strong>, so a loop spewing 10,000 lines a second yields <code>Suppressed 12412 messages</code> — the log you read is a summary of a storm. And it has <strong>no integrity protection</strong>: root can edit it. Config is <code>/etc/systemd/journald.conf</code>, capped at <code>SystemMaxUse=300M</code>.",
          "A <code>.timer</code> activates a <code>.service</code>, and the benefit over cron is not scheduling but supervision: same cgroup accounting, journal, timeouts and <code>OnFailure=</code> escalation. <code>OnCalendar=</code> follows the timezone in <code>/etc/localtime</code>, so a wrong timezone runs jobs at the wrong hour; <code>Persistent=true</code> runs a missed job once after boot, which cron will not do."
        ]
      },
      {
        type: "kv",
        h: "Journal queries worth memorising",
        items: [
          { k: "journalctl -u nginx -f", v: "Follow one unit. The single most useful command on a server." },
          { k: "journalctl -b -p err", v: "Errors from <em>this boot</em>. Without <code>-b</code> you are reading history." },
          { k: "journalctl _PID=1234", v: "Everything one process wrote, across all boots." },
          { k: "journalctl list-boots", v: "A missing boot means that boot never reached journald." }
        ]
      },
      {
        type: "callout",
        kind: "boss",
        title: "Two systemd habits that prevent most incidents",
        text: "<b>One:</b> never edit a file in <code>/lib/systemd/system/</code>. It belongs to the package, the next <code>apt upgrade</code> overwrites it silently, and <code>systemctl</code> accepts the change meanwhile.<br><br><b>Two:</b> before restarting something that works, ask <code>systemctl show &lt;unit&gt; -p NRestarts</code>. A unit that restarted nine times in an hour is telling you something."
      },
      {
        type: "prose",
        h: "systemd 237 on your box versus a modern host",
        p: [
          "Your VPS runs systemd 237, which manages <strong>cgroups v1</strong> hierarchies where systemd 245+ on a v2 host manages the unified tree. Unit files are mostly portable, but anything written against <code>/sys/fs/cgroup/*/…</code> paths is not. <code>ProtectProc=</code>, <code>ProcSubset=</code> and <code>PrivateUsers=</code> are directives 237 ignores — and <strong>ignored is silent</strong>: a unit hardened on a modern machine and copied to this one is not hardened, it just looks it."
        ]
      }
    ],
    takeaways: [
      "A unit is always in exactly one state, and every transition has a timeout. <strong>State, duration, log</strong> answer nearly every systemd question.",
      "<code>Type=simple</code> means active the instant after fork; <code>Type=notify</code> means active when your program says so.",
      "<strong>Every unit is a cgroup</strong>, so <code>systemctl restart</code> kills whole process trees reliably and limits are exact.",
      "Drop-ins via <code>systemctl edit</code>, never edits to <code>/lib/systemd/system/</code>.",
      "<code>journalctl -b -1</code> answers “why did it restart”; <code>journalctl -u x -f</code> answers almost everything else."
    ],
    glossary: {
      "Type=": "Start semantics for a service: simple, exec, notify, forking, oneshot, idle. Decides what 'active' means.",
      "sd_notify": "The libc call a Type=notify service uses to report READY=1 or STATUS=... over its notify socket.",
      "activating / deactivating": "The transitional states. Stuck in either means a timeout is coming.",
      "Wanted vs Required": "Required failing takes dependents down and can drop boot to emergency.target. Wanted failing only warns.",
      "BindsTo / PartOf": "BindsTo stops the unit if the bound unit goes inactive. PartOf propagates stop/restart from another unit.",
      "drop-in": "A snippet in /etc/systemd/system/<unit>.d/*.conf overriding parts of the packaged unit."
    }
  });
})();