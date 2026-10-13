/* ch05-filesystem — concise edition, second pass
   All 7 diagrams redrawn: 300-340px tall (was 520-640), 3-6 boxes each (was 5-22),
   9-13 text nodes each (was 27-48). Prose 5840 -> ~2100 (36%). Code 993 -> ~190. */
(function () {
  LX.push({
    id: "filesystem",
    title: "The filesystem tree and how it is faked",
    tagline: "One namespace grafted out of many filesystems, most of which are never stored anywhere at all.",
    sections: [
      {
        type: "prose",
        h: "There is no directory called /",
        p: [
          "<code>/</code> is not a folder. It is the root dentry inside the root filesystem's <strong>superblock</strong>, and it does not exist until something is mounted. Every absolute path resolves against it.",
          "Everything else is a graft: mounting splices another filesystem's root dentry over a directory that already exists, giving that directory two parents path resolution cannot tell apart. <code>stat /mnt</code> reports the mounted inode, never the directory underneath.",
          "<code>/proc</code> and <code>/sys</code> are not on disk. The kernel synthesises them while you read them, so <code>/proc/cpuinfo</code> walks kernel structures and never touches a block. They occupy no space and vanish on reboot.",
          "<code>/sys</code> is the kobject tree: one directory per device and driver, one file per attribute. A hotplugged disk appears because the kernel created the object, not because a daemon noticed. Writing an attribute changes behaviour, which is why <code>echo 1 &gt; /sys/block/vda/queue/rotate</code> is a real setting rather than a text file.",
          "One 19 GB disk with 2 GB of RAM still shows twenty filesystems in <code>findmnt</code>: ext4 on <code>/dev/vda1</code>, tmpfs, proc, sysfs, devpts, cgroups, plus bind mounts. <code>/proc/self/mountinfo</code> is the kernel's per-namespace view with every option string."
        ]
      },
      {
        type: "diagram",
        h: "The tree is a stack of grafts, not a set of folders",
        caption: "Only the left branch occupies disk. A mount is a splice and the namespace is the result of all the splices, which is why a 19 GB box carries twenty filesystems.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="A single root dentry branching to ext4 on disk and to filesystems computed in RAM">
  <rect class="box-a" x="380" y="24" width="340" height="64" rx="10"/>
  <text class="t-accent" x="550" y="52" text-anchor="middle" font-size="18">/ — one root dentry</text>
  <text class="t-xs" x="550" y="74" text-anchor="middle" font-size="14">inside the root superblock, not on a disk</text>

  <path class="ln-a" d="M480,88 L480,120" marker-end="url(#lm-arrow-accent)"/>
  <path class="ln" d="M620,88 L620,120" marker-end="url(#lm-arrow)"/>

  <rect class="box-ok" x="290" y="125" width="380" height="90" rx="10"/>
  <text class="t-ok" x="480" y="155" text-anchor="middle" font-size="18">ext4 on /dev/vda1</text>
  <text class="t-sm" x="480" y="180" text-anchor="middle" font-size="15">/usr · /var · /etc · /home</text>
  <text class="t-xs" x="480" y="202" text-anchor="middle" font-size="14">occupies blocks</text>

  <rect class="box-v" x="700" y="125" width="360" height="90" rx="10"/>
  <text class="t-violet" x="880" y="155" text-anchor="middle" font-size="18">proc · sysfs · tmpfs</text>
  <text class="t-sm" x="880" y="180" text-anchor="middle" font-size="15">computed while you read</text>
  <text class="t-xs" x="880" y="202" text-anchor="middle" font-size="14">zero bytes on disk</text>

  <text class="t-dim" x="550" y="268" text-anchor="middle" font-size="15">a mount is a splice — findmnt lists twenty on a machine with one disk</text>
</svg>`
      },
      {
        type: "prose",
        h: "Superblock, inode, dentry, file",
        p: [
          "<strong>superblock</strong> — one per mounted filesystem, read from disk at mount and written back at unmount. The on-disk magic <code>0xEF53</code> is how the kernel picks the ext4 driver.",
          "<strong>inode</strong> — the file itself: mode, owner, timestamps, size, block map, link count. Its number <em>is</em> the file's identity, and it means nothing outside one filesystem.",
          "<strong>dentry</strong> — a name and a parent pointer, cached in RAM to make lookup fast and evicted under pressure. A negative dentry is a cached 'not here', which is why a deleted file still returns <code>ENOENT</code> instantly.",
          "<strong>struct file</strong> — an open instance: inode pointer, offset, flags, <code>file_operations</code>. This is what <code>fd 3</code> points at and what the file limits count.",
          "<strong>The VFS is the abstraction that makes those four uniform.</strong> Every filesystem registers <code>inode_operations</code> and <code>file_operations</code>, so <code>open()</code> is the same call whether it lands on ext4, tmpfs or overlayfs, and <code>/proc/self/mountinfo</code> describes all of them identically."
        ]
      },
      {
        type: "diagram",
        h: "Path resolution: a string to an open file",
        caption: "What you typed, then a cache in RAM, then what is actually on disk. The bottom band is the part people forget: the inode survives the dentry.",
        svg: `
<svg viewBox="0 0 1100 320" role="img" aria-label="Path string resolved through the dentry cache to an inode and on to an open file object">
  <rect class="box-a" x="30" y="40" width="200" height="90" rx="10"/>
  <text class="t-accent" x="130" y="75" text-anchor="middle" font-size="18">path string</text>
  <text class="t-sm" x="130" y="102" text-anchor="middle" font-size="15">bytes in user space</text>

  <path class="ln-a" d="M230,85 L275,85" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="280" y="40" width="230" height="90" rx="10"/>
  <text class="t-violet" x="395" y="75" text-anchor="middle" font-size="18">dentry cache</text>
  <text class="t-sm" x="395" y="102" text-anchor="middle" font-size="15">one lookup per component</text>

  <path class="ln" d="M510,85 L555,85" marker-end="url(#lm-arrow)"/>

  <rect class="box" x="560" y="40" width="210" height="90" rx="10"/>
  <text x="665" y="75" text-anchor="middle" font-size="18">inode</text>
  <text class="t-sm" x="665" y="102" text-anchor="middle" font-size="15">mode, size, blocks</text>

  <path class="ln" d="M770,85 L815,85" marker-end="url(#lm-arrow)"/>

  <rect class="box-ok" x="820" y="40" width="250" height="90" rx="10"/>
  <text class="t-ok" x="945" y="75" text-anchor="middle" font-size="18">struct file</text>
  <text class="t-sm" x="945" y="102" text-anchor="middle" font-size="15">offset, flags, fops</text>

  <text class="t-dim" x="550" y="178" text-anchor="middle" font-size="15">below this sits the page cache, then the block layer</text>

  <rect class="box-w" x="30" y="208" width="1040" height="70" rx="10"/>
  <text class="t-warn" x="550" y="238" text-anchor="middle" font-size="18">a dentry lives in RAM only</text>
  <text class="t-sm" x="550" y="262" text-anchor="middle" font-size="15">evict it and it is rebuilt; the inode is on disk</text>
</svg>`
      },
      {
        type: "code",
        lang: "bash",
        what: "A name is not an inode; ask the driver",
        code:
`$ stat -c '%i %h %d %n' /etc/passwd
481925 1 253,1 /etc/passwd
$ sudo debugfs -R "stat /etc/passwd" /dev/vda1 2>/dev/null | head -2
Inode: 481925   Type: Regular   Mode:  0644
$ lsof +L1
rsync 4241 root 3w REG 0 4.1G 6291457 /var/log/app.log (deleted)
$ du -sh /var/log; df -h /var/log       # du is blind, df counts it
$ readlink /var/log/current             # stored string, not target
$ realpath /var/log/current             # the resolved chain
$ lsattr /etc/hosts                    # +i immutable, +a append-only
$ aa-status | head -2                  # AppArmor here, SELinux on Fedora`
      },
      {
        type: "callout",
        kind: "fact",
        title: "Inode numbers mean nothing across mounts",
        text: "On tmpfs, overlayfs and most network filesystems they are <strong>synthesised per lookup</strong>. Never key a cache or a dedup tool on inode numbers across mounts."
      },
      {
        type: "prose",
        h: "Hardlinks and symlinks: same string, different physics",
        p: [
          "A <strong>hardlink</strong> is a second name in one inode's link count: one inode, one set of blocks, N names. The data dies when the count reaches zero <em>and</em> the last descriptor closes. It cannot cross a filesystem, because both names would have to share one superblock's inode table. <code>ls -l</code> prints the count in its second column, which is the fastest confirmation that a hardlink exists.",
          "A <strong>symlink</strong> is a file whose contents are a path string, mode <code>lrwxrwxrwx</code>, resolved as a second lookup. It is relative unless the stored string starts with <code>/</code>, and it resolves against the directory holding the link, not your cwd — the main cause of dangling links after a move. <code>readlink</code> returns the stored string; <code>realpath</code> resolves the whole chain.",
          "<strong><code>rename(2)</code> is what breaks links.</strong> An editor writes a new file beside the target and renames over it: over a symlink it replaces the <em>symlink</em>, over a hardlink one name only, so the edit vanishes from the other. The inode never moved.",
          "<code>rename(2)</code> cannot cross a superblock either, so a <code>mv</code> onto <code>/var/www/html</code> degrades to copy plus unlink and loses atomicity."
        ]
      },
      {
        type: "diagram",
        h: "One inode with two names, versus a file that points at a name",
        caption: "Left: after <code>ln</code> the inode has <code>nlink = 2</code>, and renaming one name leaves the other reading the old bytes. Right: a symlink is a small file with its own inode, and it can dangle.",
        svg: `
<svg viewBox="0 0 1100 340" role="img" aria-label="A hardlink giving two names to one inode beside a symlink whose contents are a path string">
  <text class="t-title" x="40" y="34" font-size="18">hardlink — ln target link</text>
  <rect class="box" x="40" y="50" width="230" height="52" rx="8"/>
  <text class="t-sm" x="56" y="82" font-size="15">/var/log/nginx/access.log</text>
  <rect class="box" x="40" y="118" width="230" height="52" rx="8"/>
  <text class="t-sm" x="56" y="150" font-size="15">/var/log/current</text>

  <path class="ln-a" d="M270,76 L330,76" marker-end="url(#lm-arrow-accent)"/>
  <path class="ln-a" d="M270,144 L330,144" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-ok" x="335" y="50" width="230" height="120" rx="10"/>
  <text class="t-ok" x="450" y="84" text-anchor="middle" font-size="18">inode 481925</text>
  <text class="t-sm" x="450" y="114" text-anchor="middle" font-size="15">nlink = 2</text>
  <text class="t-sm" x="450" y="136" text-anchor="middle" font-size="15">the bytes live here</text>
  <text class="t-xs" x="450" y="158" text-anchor="middle" font-size="14">rename moves names only</text>

  <line class="ln dash" x1="600" y1="34" x2="600" y2="300" stroke-width="2"/>

  <text class="t-title" x="640" y="34" font-size="18">symlink — ln -s target link</text>
  <rect class="box-b" x="640" y="50" width="230" height="52" rx="8"/>
  <text class="t-sm" x="656" y="82" font-size="15">/etc/nginx/current</text>

  <path class="ln-b" d="M870,76 L930,76" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-v" x="935" y="50" width="130" height="52" rx="8"/>
  <text class="t-sm" x="951" y="82" font-size="15">its own inode</text>

  <rect class="box-b" x="640" y="205" width="425" height="90" rx="10"/>
  <text class="t-bad" x="658" y="236" font-size="17">contents are a path string</text>
  <text class="t-sm" x="658" y="260" font-size="15">resolved against its own directory</text>
  <text class="t-sm" x="658" y="282" font-size="15">can dangle; rm removes only it</text>
</svg>`
      },
      {
        type: "prose",
        h: "Deleting is not truncating",
        p: [
          "<code>rm</code> removes the name. The inode and every block survive until the last reference closes, so the space is allocated, unreachable, invisible to <code>du</code> and fully counted by <code>df</code>. <code>lsof +L1</code> finds it, and restarting the holder frees it.",
          "<code>truncate -s 0</code> frees the blocks at once and keeps the name; <code>ftruncate(fd, 0)</code> does the same to an open file, which is what <code>copytruncate</code> uses. What neither frees is a file held open on a dead mount: unlinking succeeds and the space does not come back until the last reference in <code>D</code> state is gone.",
          "<code>logrotate</code> defaults to rename, which over a hardlinked log leaves the new file empty while workers keep filling the renamed inode."
        ]
      },
      {
        type: "diagram",
        h: "rm and truncate free different things",
        caption: "Both look identical from <code>ls</code>. Only one hands the blocks back to the filesystem, and only one is what <code>logrotate</code> needs over a hardlink.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="rm unlinking a name while a descriptor keeps the blocks, versus truncate freeing the blocks immediately">
  <text class="t-title" x="40" y="34" font-size="18">rm access.log</text>
  <rect class="box" x="40" y="50" width="250" height="80" rx="10"/>
  <text x="165" y="82" text-anchor="middle" font-size="18">name unlinked</text>
  <text class="t-sm" x="165" y="108" text-anchor="middle" font-size="15">inode stays allocated</text>

  <path class="ln-w" d="M290,90 L350,90" marker-end="url(#lm-arrow-warn)"/>

  <rect class="box-w" x="355" y="50" width="300" height="80" rx="10"/>
  <text class="t-warn" x="505" y="82" text-anchor="middle" font-size="18">worker holds fd 3</text>
  <text class="t-sm" x="505" y="108" text-anchor="middle" font-size="15">a reference keeps blocks</text>

  <text class="t-bad" x="860" y="96" text-anchor="middle" font-size="15">du cannot find it, df counts it</text>

  <text class="t-title" x="40" y="182" font-size="18">truncate -s 0 access.log</text>
  <rect class="box-ok" x="40" y="198" width="250" height="80" rx="10"/>
  <text class="t-ok" x="165" y="230" text-anchor="middle" font-size="18">blocks freed now</text>
  <text class="t-sm" x="165" y="256" text-anchor="middle" font-size="15">name and inode survive</text>

  <path class="ln-ok" d="M290,238 L350,238" marker-end="url(#lm-arrow-ok)"/>

  <rect class="box-a" x="355" y="198" width="300" height="80" rx="10"/>
  <text class="t-accent" x="505" y="230" text-anchor="middle" font-size="18">copytruncate does both</text>
  <text class="t-sm" x="505" y="256" text-anchor="middle" font-size="15">what logrotate wants</text>

  <text class="t-dim" x="860" y="242" text-anchor="middle" font-size="15">lsof +L1 finds the deleted one</text>
</svg>`
      },
      {
        type: "prose",
        h: "Descriptors, exec and the three ceilings",
        p: [
          "Every process has a flat table of integers pointing at <code>struct file</code> objects, starting at 0, 1, 2 for stdin, stdout and stderr. The numbers mean nothing by convention; fd 3 in nginx and fd 3 in sshd are unrelated.",
          "<code>execve(2)</code> does not clear the table: it replaces the address space and reinstalls the survivors, which is the whole mechanism behind pipes, shell redirection and systemd's <code>StandardOutput=</code>. A descriptor opened with <code>O_CLOEXEC</code> is closed by the kernel during the exec, so libraries do not leak a socket or a key into a child. <code>dup2</code> <em>clears</em> the flag.",
          "<strong>EMFILE</strong> means the process hit <code>RLIMIT_NOFILE</code>, and nginx logs <code>open() failed (24: Too many open files)</code>. <strong>ENFILE</strong> means the system ran out of <code>struct file</code> objects, capped by <code>/proc/sys/fs/file-max</code>. <code>/proc/sys/fs/nr_open</code>, <code>1048576</code> here, caps the hard limit itself — above it <code>setrlimit</code> fails with <code>EPERM</code> even as root.",
          "For a systemd 237 unit the order is the unit's <code>LimitNOFILE=</code>, then <code>DefaultLimitNOFILE</code> in <code>/etc/systemd/system.conf</code>, then the compiled-in default. A login shell bypasses systemd and uses <code>pam_limits</code> with <code>/etc/security/limits.d/*.conf</code>, which is why <code>ulimit -n</code> and the unit can disagree. nginx has a fourth ceiling, <code>worker_rlimit_nofile</code>, in the nginx config rather than the unit."
        ]
      },
      {
        type: "diagram",
        h: "The descriptor table survives exec, except for O_CLOEXEC",
        caption: "The table belongs to the process, not the binary. systemd sets that flag on every socket it opens, then clears it for the handful a unit is meant to pass on — that is what <code>StandardInput=null</code> versus inheriting means.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="A shell descriptor table carried across execve with the O_CLOEXEC entries closed">
  <rect class="box" x="30" y="40" width="300" height="190" rx="10"/>
  <text class="t-sm" x="48" y="76" font-size="15">shell fd table</text>
  <text class="t-sm" x="48" y="116" font-size="15">0  1  2  /dev/pts/0</text>
  <text class="t-sm" x="48" y="152" font-size="15">3  pipe    CLOEXEC</text>
  <text class="t-sm" x="48" y="188" font-size="15">5  socket  CLOEXEC</text>

  <path class="ln-a" d="M330,135 L400,135" marker-end="url(#lm-arrow-accent)"/>
  <text class="t-accent" x="365" y="122" font-size="15" text-anchor="middle">execve</text>

  <rect class="box-a" x="405" y="40" width="300" height="190" rx="10"/>
  <text class="t-sm" x="423" y="76" font-size="15">same table, new binary</text>
  <text class="t-sm" x="423" y="116" font-size="15">0  1  2  /dev/pts/0</text>
  <text class="t-bad" x="423" y="160" font-size="15">3  and  5  closed</text>

  <path class="ln-w" d="M705,135 L775,135" marker-end="url(#lm-arrow-warn)"/>

  <rect class="box-w" x="780" y="70" width="290" height="130" rx="10"/>
  <text class="t-warn" x="925" y="112" text-anchor="middle" font-size="18">dup2 clears CLOEXEC</text>
  <text class="t-sm" x="925" y="146" text-anchor="middle" font-size="15">so a pipe becomes stdout</text>
  <text class="t-xs" x="925" y="180" text-anchor="middle" font-size="14">ssh host ls works this way</text>
</svg>`
      },
      {
        type: "code",
        lang: "bash",
        what: "Which ceiling is biting, and what is mounted",
        code:
`$ systemctl show nginx.service -p LimitNOFILE
LimitNOFILE=1024 524288
$ cat /proc/$(pgrep -n nginx)/limits | grep -i "open files"
Max open files  1024  524288  files
$ cat /proc/sys/fs/file-max /proc/sys/fs/nr_open
$ printf '* soft nofile 16384\n' > /etc/security/limits.d/99-nofile.conf
$ nginx -T 2>/dev/null | grep worker_rlimit_nofile
$ findmnt -t ext4,tmpfs -o TARGET,SOURCE,FSTYPE,OPTIONS
$ grep -E '^[^#]' /etc/fstab
UUID=9f2c1d84-2b1e-4f0a-9c33-6d5a1e77b210 / ext4 errors=remount-ro 0 1
//fileserver/share /mnt/share cifs _netdev,nofail,credentials=/etc/samba/share.cred 0 0
$ systemd-analyze verify var-www-html.mount`
      },
      {
        type: "prose",
        h: "Mounts, namespaces and /etc/fstab",
        p: [
          "systemd does not read <code>/etc/fstab</code> directly: <code>systemd-fstab-generator</code> turns each line into a <code>.mount</code> unit, so you can <code>daemon-reload</code> after editing and <code>systemctl mask</code> one. The unit is named after the escaped path — <code>/var/www/html</code> becomes <code>var-www-html.mount</code>, <code>/</code> becomes <code>-.mount</code>. A device that never appears is a failed dependency, and systemd drops to <code>emergency.target</code> after 90s: on a Tailscale-only VPS with no serial console that is an unbootable machine, so <code>nofail</code> on anything optional is not cosmetic.",
          "Three fields decide most outcomes. Prefer <code>UUID=</code> in field one: <code>/dev/sda1</code> is a udev convention that moves between disks. Field three, <code>auto</code>, reads the superblock magic (<code>0xEF53</code> for ext2/3/4, xfs, btrfs) — never for root. Field four carries the options; <code>defaults</code> expands to <code>rw,suid,dev,exec,auto,nouser,async</code>, and the <code>x-systemd.*</code> ones are systemd's, not <code>mount(8)</code>'s. <code>_netdev</code> only adds <code>After=network.target</code>, so a remote share also needs <code>x-systemd.requires=network-online.target</code>.",
          "A mount namespace (<code>CLONE_NEWNS</code>) gives a process a private copy of that table, which is what <code>unshare -m</code>, <code>chroot</code> and every container use. A <strong>bind mount</strong> republishes a subtree without copying, so both sides share one inode set and a rename shows on both. <code>--rbind</code> recurses into submounts and must be unmounted recursively or the table leaks across namespaces. A read-only bind needs <code>-o remount,bind,ro</code>; a plain <code>-o ro</code> on an existing bind is silently ignored. Propagation decides the rest: <code>shared</code> sends to peers, <code>slave</code> only receives, <code>private</code> neither.",
          "<code>pivot_root(2)</code> makes a new subtree the <code>/</code> and parks the old one underneath; <code>chroot</code> only moves where path resolution starts, so an open descriptor or <code>/proc/self/fd</code> is still a way out. <code>pivot_root</code> needs <em>new_root</em> to be a mount point, <em>put_old</em> beneath it, and returns <code>EINVAL</code> if <code>chroot(2)</code> was already called here."
        ]
      },
      {
        type: "prose",
        h: "Overlayfs: a filesystem made of other filesystems",
        p: [
          "Overlayfs has no on-disk format, no superblock magic and no inode table. Each directory it serves is computed at lookup by walking up to N lower directories and one upper directory and deciding per name which wins. This is Docker's <code>overlay2</code>, <code>snap</code> and every orchestrator's image layers.",
          "<code>lowerdir</code> is colon-separated, <strong>lowest layer first</strong> — with <code>l/AAA:l/BBB</code>, BBB is searched first and AAA fills gaps. <code>upperdir</code> takes every write. <code>workdir</code> stages operations that must be atomic across both layers and must sit on <code>upperdir</code>'s filesystem.",
          "A delete creates a <strong>whiteout</strong>: a character device with major 0, minor 0, meaning keep looking down and report <code>ENOENT</code> if nothing is there. The xattr <code>trusted.overlay.opaque=y</code> does the same for a whole subtree.",
          "The lower layers are read-only because they are <em>shared</em> — if container A wrote to layer L, container B on the same image would see it. The costs are that lookups walk a directory chain, whiteouts accumulate, and a hardlink cannot span layers. Docker's <code>overlay2</code> stores each layer as a plain directory of files on whatever the underlying filesystem is — ext4 here, not <code>devicemapper</code>, which was removed in Docker 18.09."
        ]
      },
      {
        type: "diagram",
        h: "How one lookup in an overlay is decided",
        caption: "The merged view is computed, never stored. A read comes from the first layer that has the name, a write copies up and hides every lower version, a delete writes a whiteout — which is why <code>rm</code> inside a container does not touch the image.",
        svg: `
<svg viewBox="0 0 1100 340" role="img" aria-label="An overlayfs merged view computed from a lower directory, an upper directory and a work directory">
  <rect class="box-a" x="350" y="24" width="400" height="70" rx="10"/>
  <text class="t-accent" x="550" y="54" text-anchor="middle" font-size="18">merged view</text>
  <text class="t-sm" x="550" y="80" text-anchor="middle" font-size="15">computed at every lookup</text>

  <path class="ln-a" d="M420,94 L420,140" marker-end="url(#lm-arrow-accent)"/>
  <path class="ln" d="M680,94 L680,140" marker-end="url(#lm-arrow)"/>

  <rect class="box-v" x="300" y="145" width="240" height="90" rx="10"/>
  <text class="t-violet" x="420" y="177" text-anchor="middle" font-size="18">lowerdir</text>
  <text class="t-sm" x="420" y="204" text-anchor="middle" font-size="15">read-only, colon-separated</text>
  <text class="t-xs" x="420" y="226" text-anchor="middle" font-size="14">searched right to left</text>

  <rect class="box-ok" x="560" y="145" width="240" height="90" rx="10"/>
  <text class="t-ok" x="680" y="177" text-anchor="middle" font-size="18">upperdir</text>
  <text class="t-sm" x="680" y="204" text-anchor="middle" font-size="15">every write lands here</text>
  <text class="t-xs" x="680" y="226" text-anchor="middle" font-size="14">whiteouts record deletes</text>

  <rect class="box-w" x="300" y="255" width="500" height="62" rx="10"/>
  <text class="t-warn" x="550" y="284" text-anchor="middle" font-size="17">workdir stages atomic ops</text>
  <text class="t-xs" x="550" y="307" text-anchor="middle" font-size="14">it sits on upperdir; no superblock magic</text>
</svg>`
      },
      {
        type: "prose",
        h: "Choosing a filesystem, and what the journal buys",
        p: [
          "The trade-off is rarely 'faster'. It is which failure mode you accept. <strong>ext4</strong> is the Ubuntu default because it is boring and well exercised, and its jbd2 journal is why power loss is survivable: writes land in a log first, so a crash costs the last uncommitted transactions, never a corrupt filesystem. The price is no data checksums and no snapshots.",
          "A clean unmount leaves the journal empty; an unclean one leaves transactions to replay, and ext4 replays them at mount while printing <code>EXT4-fs (vda1): recovery complete</code> in <code>dmesg</code>. That is the whole promise of jbd2 — you lose the last uncommitted writes, not the filesystem. An unjournalled filesystem turns the same reset into a long <code>e2fsck</code>, or worse, one that mounts with your last writes silently missing.",
          "<strong>XFS</strong> cannot shrink at all and <code>xfs_repair</code> must run unmounted. <strong>btrfs</strong> is copy-on-write, so a 4 KB write inside a 2 GB file copies the extent, and <code>BTRFS error: unable to allocate chunk</code> is space accounting rather than a genuinely full device. <strong>ZFS</strong> is an out-of-tree module whose ARC will consume most of your RAM, and a failed DKMS rebuild on a box reached only over SSH means no boot.",
          "<strong>tmpfs</strong> is RAM with a swapfile underneath, defaulting to half of RAM. That is why <code>/dev/shm</code> is half of RAM, and why Docker caps it at 64 MB."
        ]
      },
      {
        type: "diagram",
        h: "A device name is a convention, not a file",
        caption: "The letter and the number are a driver convention plus discovery order. The major:minor pair in the inode is the only part a syscall uses, and renaming the node changes nothing.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="A device node name decomposed into a driver letter, a number and a major minor pair that selects the driver">
  <rect class="box-a" x="40" y="40" width="240" height="80" rx="10"/>
  <text class="t-accent" x="160" y="72" text-anchor="middle" font-size="18">/dev/vda1</text>
  <text class="t-sm" x="160" y="100" text-anchor="middle" font-size="15">a name, nothing more</text>

  <path class="ln-a" d="M280,80 L360,80" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="365" y="40" width="240" height="80" rx="10"/>
  <text class="t-violet" x="485" y="72" text-anchor="middle" font-size="18">class letter and number</text>
  <text class="t-sm" x="485" y="100" text-anchor="middle" font-size="15">v is virtio, sd is SCSI</text>

  <path class="ln-a" d="M605,80 L685,80" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-w" x="690" y="40" width="370" height="80" rx="10"/>
  <text class="t-warn" x="875" y="72" text-anchor="middle" font-size="18">major:minor  254:0</text>
  <text class="t-sm" x="875" y="100" text-anchor="middle" font-size="15">the only meaningful part</text>

  <path class="ln-w" d="M875,120 L875,170" marker-end="url(#lm-arrow-warn)"/>

  <rect class="box-ok" x="690" y="175" width="370" height="80" rx="10"/>
  <text class="t-ok" x="875" y="209" text-anchor="middle" font-size="18">driver file_operations</text>
  <text class="t-sm" x="875" y="237" text-anchor="middle" font-size="15">no filesystem involved</text>

  <path class="ln" d="M160,120 L160,170" marker-end="url(#lm-arrow)"/>

  <rect class="box" x="40" y="175" width="290" height="80" rx="10"/>
  <text x="185" y="209" text-anchor="middle" font-size="18">read and write</text>
  <text class="t-sm" x="185" y="237" text-anchor="middle" font-size="15">go straight to the driver</text>

  <text class="t-dim" x="550" y="288" text-anchor="middle" font-size="15">/dev/disk/by-uuid is a symlink to the same inode, which is why UUID= works</text>
</svg>`
      },
      {
        type: "prose",
        h: "Device files and the four permission gates",
        p: [
          "A device node is an inode whose <code>i_rdev</code> holds a <strong>major</strong> and a <strong>minor</strong> number — a key into a kernel table, not a pointer to hardware. <code>ls -l /dev/null</code> gives <code>crw-rw-rw- 1 root root 1, 3</code>: major 1 is <code>mem</code>, minor 3 is <code>null</code>, <code>/dev/zero</code> is <code>1, 5</code>, <code>/dev/vda</code> is <code>254, 0</code>. The major names the <em>driver</em>, not the disk.",
          "The driver installs a <code>file_operations</code> table and the syscall goes straight there, with no filesystem involved. A write to <code>/dev/null</code> counts the bytes, discards them and returns the count: nothing copied, no page cache, no device. <code>/dev/full</code> is the contrast — same major, but every <code>write()</code> returns <code>ENOSPC</code>, so a program claiming a successful write hits the disk-full failure on purpose.",
          "devtmpfs, inside the kernel, creates the node the instant a driver calls <code>device_add()</code>. udev then <em>decorates</em> it: permissions, the <code>/dev/disk/by-uuid/</code> symlinks, your rules. Without both you get an empty <code>/dev</code> and nothing starts.",
          "<strong>DAC</strong> is the owner/group/other triple, and root bypasses it with <code>CAP_DAC_OVERRIDE</code>. <strong>POSIX ACLs</strong> add named users and a mask without replacing DAC; they are xattrs, so <code>rsync -a</code> destroys them without <code>-A</code>. <strong>Inode flags</strong> (<code>+i</code> immutable, <code>+a</code> append-only) are not permissions at all: no owner, no inheritance, and they apply to the directory entry too.",
          "<strong>MAC</strong> is the fourth gate and the only non-discretionary one. Ubuntu ships AppArmor, a profile per daemon, and a denial appears in <code>dmesg</code> as <code>apparmor=&quot;DENIED&quot;</code>. Fedora ships SELinux, Alpine neither. The MAC hook can refuse a root-owned file with a bare <code>Permission denied</code>."
        ]
      },
      {
        type: "kv",
        items: [
          {
            k: "<code>/proc</code> — procfs",
            v: "Synthesised from <code>task_struct</code> at read time, zero bytes on disk. <code>/proc/PID/fd</code> and <code>/proc/self/mountinfo</code> are live views, and <code>/proc</code> is where <code>lsof</code> reads a descriptor table from outside."
          },
          {
            k: "<code>/sys</code> — sysfs",
            v: "One directory per kobject, one file per attribute, each a window onto a kernel variable — which is why hotplug works and why writing to a file here changes behaviour."
          },
          {
            k: "<code>/dev</code> — devtmpfs",
            v: "Nodes created by the kernel as drivers register, decorated by udev. <code>/dev/null</code> is <code>1, 3</code>; <code>/dev/full</code> is <code>1, 7</code> and returns <code>ENOSPC</code> on every write."
          },
          {
            k: "<code>/run</code> — tmpfs",
            v: "Runtime state that must not survive a reboot: sockets, systemd's bookkeeping, <code>/run/lock</code>. Redeclaring <code>/run</code> in <code>fstab</code> is a duplicate-unit warning."
          },
          {
            k: "<code>/sys/fs/cgroup</code>",
            v: "On this Ubuntu 18.04 host cgroups <strong>v1</strong>: separate hierarchies at <code>/sys/fs/cgroup/memory</code>, <code>/sys/fs/cgroup/cpu</code>, <code>/sys/fs/cgroup/pids</code>. On v2 it is one <code>cgroup2</code> mount with controllers enabled per branch through <code>cgroup.subtree_control</code>."
          }
        ]
      }
    ],
    takeaways: [
      "<code>/</code> is a dentry inside a superblock, not a directory on a disk. Everything else is a graft, and crossing one changes your assumptions about ownership, options and failure modes.",
      "Inode is identity, path is a name, dentry is a cache entry, <code>struct file</code> an open instance. Conflating them explains hardlinks, rotation failures and inode-number nonsense.",
      "<strong>Deleting is not truncating.</strong> <code>rm</code> removes the name; the inode and every block survive until the last descriptor closes — allocated, unreachable, invisible to <code>du</code>, fully counted by <code>df</code>. <code>truncate</code> frees the blocks at once.",
      "A mount namespace gives private views of the same superblocks — how <code>ProtectSystem=</code>, <code>PrivateTmp=</code>, bind mounts and containers work. <code>pivot_root</code> turns the trick into containment; <code>chroot</code> does not.",
      "A device node's name is a convention. The major:minor pair is the part that reaches a driver, which is why <code>UUID=</code> beats <code>/dev/sda1</code> in <code>fstab</code>.",
      "The journal is what turns a power cut into lost seconds instead of a corrupt filesystem. An unclean unmount is a replay, not a repair."
    ],
    glossary: {
      "superblock": "One mounted filesystem: block size, free space, root inode, options, and the on-disk magic the kernel probes for.",
      "inode": "The file's identity record: mode, owner, timestamps, size, block map, link count. Meaningless outside one filesystem.",
      "dentry": "A name plus a parent pointer, cached in RAM to make lookup fast. May be negative, meaning a cached 'not here'.",
      "hardlink": "A second directory entry on the same inode. Cannot cross a filesystem, and survives a rename of either name.",
      "symlink": "A file whose contents are a path string, resolved against its own directory. Can dangle.",
      "FD_CLOEXEC": "Closes a descriptor during <code>execve</code>, so secrets are not leaked into children. <code>dup2</code> clears it.",
      "mount namespace": "A process's private copy of the mount table. Mounts inside are invisible outside.",
      "whiteout": "A 0:0 character device in an overlayfs upperdir recording a deletion that the lower layers must mask.",
      "deleted but open": "A file unlinked but still referenced by an open descriptor; its blocks stay allocated until the last reference closes."
    }
  });
})();