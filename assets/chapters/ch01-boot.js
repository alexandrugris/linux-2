/* ch01 — Boot: from power-on to a shell — SIMPLIFIED EDITION
   Source: linux-map/assets/chapters/ch01-boot.js
   2 diagrams redrawn simple: 6+1 and 5 boxes (was 13 and 12),
   viewBox height 270/350 (was 700/560), labels of 2-5 words.
   Prose 1325 -> ~400 (30%). Code 156 -> ~40 (26%). */
(function () {
  LX.push({
    id: "boot",
    title: "Boot: from power-on to a shell",
    tagline: "Everything the machine does before you can type, and the five places it can stop doing it.",
    sections: [
      {
        type: "prose",
        h: "The sequence",
        p: [
          "Boot is a chain of increasingly capable programs handing control forward — which tells you <em>what to blame</em>. The chain is <strong>firmware → bootloader → kernel → initramfs → systemd → login</strong>, and nothing before the kernel is Linux. On a KVM VPS that firmware is an emulated UEFI ROM — a provider boot menu instead of GRUB is firmware, not your OS."
        ]
      },
      {
        type: "diagram",
        h: "The boot chain, and where each stage fails",
        caption: "The shaded band is the trap: a bad <code>/etc/fstab</code>, stale initramfs or bad <code>grub.cfg</code> stops the machine before systemd exists — that needs the provider's console.",
        svg: `
<svg viewBox="0 0 1100 270" role="img" aria-label="Six stage boot chain from firmware to login, with the pre-systemd stages marked as needing a console">
  <rect class="box" x="50" y="40" width="140" height="100" rx="10"/>
  <text class="t-sm" x="120" y="80" text-anchor="middle" font-size="17">firmware</text>
  <text class="t-sm" x="120" y="108" text-anchor="middle" font-size="15">UEFI: picks device</text>

  <path class="ln-a" d="M190,90 L218,90" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box" x="222" y="40" width="140" height="100" rx="10"/>
  <text class="t-sm" x="292" y="80" text-anchor="middle" font-size="17">GRUB2</text>
  <text class="t-sm" x="292" y="108" text-anchor="middle" font-size="15">loads vmlinuz</text>

  <path class="ln-a" d="M362,90 L390,90" marker-end="url(#lm-arrow-accent)"/>

  <g class="jump" data-jump="kernel">
  <rect class="box" x="394" y="40" width="140" height="100" rx="10"/>
  <text x="464" y="80" text-anchor="middle" font-size="17">kernel</text>
  <text class="t-sm" x="464" y="108" text-anchor="middle" font-size="15">starts PID 1</text>
  </g>

  <path class="ln-a" d="M534,90 L562,90" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box" x="566" y="40" width="140" height="100" rx="10"/>
  <text x="636" y="80" text-anchor="middle" font-size="17">initramfs</text>
  <text class="t-sm" x="636" y="108" text-anchor="middle" font-size="15">mounts real root</text>

  <path class="ln-a" d="M706,90 L734,90" marker-end="url(#lm-arrow-accent)"/>

  <g class="jump" data-jump="systemd">
  <rect class="box" x="738" y="40" width="140" height="100" rx="10"/>
  <text x="808" y="80" text-anchor="middle" font-size="17">systemd</text>
  <text class="t-sm" x="808" y="108" text-anchor="middle" font-size="15">starts units</text>
  </g>

  <path class="ln-a" d="M878,90 L906,90" marker-end="url(#lm-arrow-accent)"/>

  <g class="jump" data-jump="services">
  <rect class="box" x="910" y="40" width="140" height="100" rx="10"/>
  <text x="980" y="80" text-anchor="middle" font-size="17">login</text>
  <text class="t-sm" x="980" y="108" text-anchor="middle" font-size="15">sshd :22 open</text>
  </g>

  <path class="ln-b" d="M120,140 L120,178" marker-end="url(#lm-arrow-bad)"/>
  <path class="ln-b" d="M292,140 L292,178" marker-end="url(#lm-arrow-bad)"/>
  <path class="ln-b" d="M464,140 L464,178" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-b" x="50" y="180" width="700" height="56" rx="10"/>
  <text class="t-bad" x="400" y="214" text-anchor="middle" font-size="16">needs a console, not SSH</text>
</svg>`
      },
      {
        type: "prose",
        h: "Firmware and the bootloader, briefly",
        p: [
          "<strong>BIOS</strong> reads the first sector of the disk and chains onward — it knows nothing about partitions. <strong>UEFI</strong> replaces that with a small OS loaded from an <abbr title='Extensible Firmware Interface'>/EFI</abbr> partition, a FAT filesystem of <code>*.efi</code> loaders. <strong>GRUB</strong> reads <code>/etc/default/grub</code>, shows a menu (suppressed by <code>GRUB_TIMEOUT=0</code>), loads <code>vmlinuz</code> and <code>initrd.img</code>, and jumps.",
          "Miss a <code>grub-mkconfig</code> after installing a kernel and GRUB keeps offering the <code>vmlinuz</code> you deleted: today <em>error: file '/boot/vmlinuz-&lt;old-version&gt;' not found</em>. Fix: <code>grub-mkconfig -o /boot/grub/grub.cfg</code>."
        ],
        noteTitle: "Secure Boot",
        note: "Verifies the boot chain against the firmware key store; it does <em>not</em> stop modules loaded after boot. Out-of-tree ones (zfs, nvidia) then fail with <code>Key was rejected by service</code> unless enrolled as a MOK.",
        noteKind: "fact"
      },
      {
        type: "kv",
        h: "The kernel command line",
        items: [
          { k: "root=UUID=…", v: "Which device is the root filesystem. Wrong or missing gives <code>Unable to mount root fs</code> and an initramfs shell. Prefer UUID over <code>/dev/sda1</code>: enumeration order changes when you add a disk. Root mounts <code>ro</code> first and systemd remounts it <code>rw</code>, which is what makes crash recovery safe." },
          { k: "console=ttyS0,115200", v: "Where kernel messages go on a headless box. <strong>Essential on a VPS</strong>: without it a panic goes to a console you cannot see." },
          { k: "systemd.unit=", v: "Boot another target: <code>rescue.target</code>, <code>emergency.target</code>. The most useful rescue tool, and it works from the GRUB menu. <code>net.ifnames=0</code> lives here too — <code>eth0</code> not <code>ens3</code>, which breaks firewall rules you hardcoded." }
        ]
      },
      {
        type: "prose",
        h: "The initramfs: the part that surprises people",
        p: [
          "The kernel cannot mount <code>/</code> without a filesystem driver, nor see the disk without a storage driver. Both are modules. So the bootloader loads a second archive: a miniature root filesystem in a RAM disk holding udev and the modules needed to find the real root device, regenerated <strong>every time a kernel is installed</strong> by <code>update-initramfs</code> (Debian/Ubuntu) or <code>dracut</code> (Fedora/Arch).",
          "Every failure has the same shape: <em>the thing I just installed is not in the initramfs</em>. You land in a <code>(initramfs)</code> shell with the log in <code>/root</code>, where <code>mount -o ro /dev/sdX2 /root</code> separates a filesystem problem from a driver one. The VPS trap: after growing the virtual disk you need <code>growpart</code> then <code>resize2fs</code>, and the stale thing is the partition table."
        ]
      },
      {
        type: "diagram",
        h: "What systemd actually does at boot",
        caption: "systemd runs no startup script: it loads a <b>dependency graph</b> and starts units in parallel where the graph allows. <code>sshd.socket</code> is why port 22 accepts before <code>sshd.service</code> is exec'd.",
        svg: `
<svg viewBox="0 0 1100 350" role="img" aria-label="systemd target graph: multi-user target with four units beneath it">
  <text class="t-title" x="30" y="28" font-size="17">default.target → multi-user.target (a server)</text>

  <rect class="box-ok" x="430" y="44" width="240" height="48" rx="9"/>
  <text class="t-ok" x="550" y="74" text-anchor="middle" font-size="17">multi-user.target</text>

  <path class="ln-ok" d="M490,92 L155,146" marker-end="url(#lm-arrow-ok)"/>
  <path class="ln-ok" d="M520,92 L415,146" marker-end="url(#lm-arrow-ok)"/>
  <path class="ln-ok" d="M580,92 L675,146" marker-end="url(#lm-arrow-ok)"/>
  <path class="ln-ok" d="M610,92 L935,146" marker-end="url(#lm-arrow-ok)"/>

  <rect class="box-a" x="30" y="150" width="250" height="74" rx="9"/>
  <text class="t-sm" x="155" y="180" text-anchor="middle" font-size="17">sysinit.target</text>
  <text class="t-sm" x="155" y="206" text-anchor="middle" font-size="15">journald, udev</text>

  <rect class="box-a" x="290" y="150" width="250" height="74" rx="9"/>
  <text class="t-sm" x="415" y="180" text-anchor="middle" font-size="17">local-fs.target</text>
  <text class="t-sm" x="415" y="206" text-anchor="middle" font-size="15">every fstab entry</text>

  <rect class="box-a" x="550" y="150" width="250" height="74" rx="9"/>
  <text class="t-sm" x="675" y="180" text-anchor="middle" font-size="17">basic.target</text>
  <text class="t-sm" x="675" y="206" text-anchor="middle" font-size="15">paths, tmpfiles</text>

  <rect class="box-a" x="810" y="150" width="260" height="74" rx="9"/>
  <text class="t-accent" x="940" y="180" text-anchor="middle" font-size="17">sshd.socket</text>
  <text class="t-sm" x="940" y="206" text-anchor="middle" font-size="15">:22 before sshd</text>

  <rect class="box-w" x="30" y="254" width="1040" height="70" rx="9"/>
  <text class="t-warn" x="50" y="284" font-size="17">order and dependency are separate</text>
  <text class="t-sm" x="50" y="310" font-size="15">boot survives one dead unit</text>
</svg>`
      },
      {
        type: "code",
        lang: "bash",
        what: "Boot diagnosis, in order",
        code:
`systemd-analyze blame              # which unit cost the most wall-clock
systemctl --failed                 # the single most useful boot command
systemctl status nginx --no-pager -l
journalctl -k -b -p warning        # what the kernel complains about
journalctl -b -1 -k                # the previous boot: why did it reboot?`
      }
    ],
    takeaways: [
      "The chain is firmware → bootloader → kernel → initramfs → systemd → login. Each stage knows less than the next and can only pass on what it has.",
      "The kernel needs <strong>modules</strong> to see your disk and mount it, which is why the initramfs exists and why “I installed something and it won't load” is an initramfs problem.",
      "<code>cat /proc/cmdline</code> is the most revealing command on a broken machine — interface names, console, root device and rescue target all live there.",
      "systemd is a <strong>dependency graph</strong>, not a script: ordering (<code>After=</code>) is separate from dependency (<code>Requires=</code>), so one failed optional service does not stop a boot."
    ],
    glossary: {
      "UEFI": "The firmware standard that boots from an EFI System Partition, replacing the 16-bit BIOS.",
      "GRUB": "GRand Unified Bootloader — reads its config, shows a menu, and loads kernel plus initramfs.",
      "initramfs / initrd": "A compressed cpio archive unpacked into RAM at boot, containing udev and the modules needed to mount the real root filesystem.",
      "target": "A systemd unit grouping other units and representing a boot stage: multi-user.target, graphical.target, rescue.target, emergency.target.",
      "PAM": "Pluggable Authentication Modules — authenticates a user and, via pam_systemd, creates the logind session and its cgroup scope."
    }
  });
})();