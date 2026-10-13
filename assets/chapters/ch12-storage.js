/* ch12-storage — concise edition, second pass
   All 8 diagrams redrawn: 270-340px tall (was 470-620), 3-5 boxes each (was 2-20),
   7-13 text nodes each (was 19-70). Prose 7345 -> ~2700 (37%). Code 1860 -> ~180. */
(function () {
  LX.push({
    id: "storage",
    title: "Block devices, filesystems, and the disk you are running out of",
    tagline: "Four layers, each with its own failure mode; almost every storage outage is a mismatch between what one layer believes and what the next one is actually doing.",
    sections: [
      {
        type: "prose",
        h: "Four layers, and a naming scheme",
        p: [
          "A byte written to <code>/var/www/html/index.html</code> crosses four layers with nothing to do with each other, each allowed to fail alone. The <strong>block device</strong> is the kernel's view of the hardware: a queue of 512-byte sectors plus a driver. The <strong>partition</strong> is a slice described by a table in its first sector. The <strong>filesystem</strong> is a data structure inside it, with a superblock at byte offset 1024. The <strong>mountpoint</strong> is a directory in the VFS tree that filesystem is grafted onto.",
          "Each reports success upward independently: the disk accepts the sectors, so <code>mount</code> succeeds — and your file is gone anyway. Storage debugging is finding the layer where the disagreement is, and each layer has one command that can answer for it and nothing else. On this Ubuntu 18.04 host the chain is <code>/dev/vda</code> → <code>/dev/vda1</code> → <code>ext4</code> → <code>/</code>: the same four layers as the most expensive box a provider sells.",
          "Device names are a naming scheme, not a kind of device. An NVMe parent already ends in a digit, so the kernel inserts a <code>p</code>: <code>/dev/nvme0n1p1</code>. Letter-ended parents need none — <code>/dev/sda1</code>, <code>/dev/vda1</code>. Write <code>/dev/nvme0n11</code> and you get a real <code>No such file or directory</code> at mount time. <code>/dev/mapper/vg0-root</code> is the device-mapper name for an LVM volume, so <code>/dev/mapper</code> is empty here, and that is correct.",
          "The partition table is the one structure you cannot rebuild from anything else, which is why GPT keeps an identical copy in the last 33 sectors behind a CRC32. On a BIOS box GPT still writes an MBR at LBA 0 — a <strong>protective MBR</strong>, one entry of type <code>0xEE</code> meaning 'the real table is GPT, read LBA 1'. Pre-GPT tools read <code>0xEE</code> as unknown and refuse to write, which is what stops an old <code>fdisk</code> creating an MBR table that hides every GPT partition."
        ],
        noteTitle: "A partition is not a device",
        noteKind: "warn",
        note: "Partitioning buys a separate <code>/var</code> that a runaway log cannot fill, swap off the root volume, and somewhere to put a backup image — at the cost of a layer of naming. On a 19&nbsp;GB cloud volume with no separate <code>/var</code> and no swap, one partition is correct."
      },
      {
        type: "diagram",
        h: "The chain, and the command that answers for each layer",
        caption: "Read the failure bottom-up: start at the layer whose error string you can actually see, then confirm with that layer's own tool. <code>lsblk</code> answers the first, <code>blkid</code> the third, <code>findmnt</code> the fourth.",
        svg: `
<svg viewBox="0 0 1100 330" role="img" aria-label="The four storage layers from block device through partition and superblock to mountpoint, each with the command that inspects it">
  <rect class="box-v" x="30" y="50" width="185" height="90" rx="10"/>
  <text class="t-violet" x="122" y="88" text-anchor="middle" font-size="18">block device</text>
  <text class="t-sm" x="122" y="116" text-anchor="middle" font-size="15">lsblk</text>

  <path class="ln-a" d="M215,95 L253,95" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="258" y="50" width="185" height="90" rx="10"/>
  <text class="t-violet" x="350" y="88" text-anchor="middle" font-size="18">partition</text>
  <text class="t-sm" x="350" y="116" text-anchor="middle" font-size="15">fdisk, parted</text>

  <path class="ln" d="M443,95 L481,95" marker-end="url(#lm-arrow)"/>

  <rect class="box-v" x="486" y="50" width="185" height="90" rx="10"/>
  <text class="t-violet" x="578" y="88" text-anchor="middle" font-size="18">superblock</text>
  <text class="t-sm" x="578" y="116" text-anchor="middle" font-size="15">blkid</text>

  <path class="ln" d="M671,95 L709,95" marker-end="url(#lm-arrow)"/>

  <rect class="box-ok" x="714" y="50" width="185" height="90" rx="10"/>
  <text class="t-ok" x="806" y="88" text-anchor="middle" font-size="18">filesystem</text>
  <text class="t-sm" x="806" y="116" text-anchor="middle" font-size="15">df -hT</text>

  <path class="ln-a" d="M899,95 L937,95" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-w" x="942" y="50" width="128" height="90" rx="10"/>
  <text class="t-warn" x="1006" y="88" text-anchor="middle" font-size="18">mountpoint</text>
  <text class="t-sm" x="1006" y="116" text-anchor="middle" font-size="15">findmnt</text>

  <text class="t-dim" x="550" y="200" text-anchor="middle" font-size="15">each layer reports success upward on its own</text>
  <text class="t-bad" x="550" y="233" text-anchor="middle" font-size="15">so the disk takes the sectors, mount succeeds, your file is gone</text>
  <text class="t-dim" x="550" y="266" text-anchor="middle" font-size="15">/sys/block tells you whether layer one exists at all</text>
</svg>`
      },
      {
        type: "diagram",
        h: "Name anatomy across three driver families",
        caption: "The parent name comes from the driver and the partition suffix exists solely to disambiguate NVMe. <code>/dev/mapper/*</code> is not an enumerated device — it is a symlink the device-mapper target creates, which is why the directory is empty on a box with no LVM.",
        svg: `
<svg viewBox="0 0 1100 280" role="img" aria-label="Device node names for SCSI, NVMe, virtio and device-mapper parents">
  <rect class="box-v" x="30" y="50" width="240" height="80" rx="10"/>
  <text class="t-violet" x="150" y="86" text-anchor="middle" font-size="18">/dev/sda1</text>
  <text class="t-sm" x="150" y="114" text-anchor="middle" font-size="15">letter-ended parent</text>

  <rect class="box-v" x="300" y="50" width="240" height="80" rx="10"/>
  <text class="t-violet" x="420" y="86" text-anchor="middle" font-size="18">/dev/nvme0n1p1</text>
  <text class="t-sm" x="420" y="114" text-anchor="middle" font-size="15">the p disambiguates</text>

  <rect class="box-v" x="570" y="50" width="240" height="80" rx="10"/>
  <text class="t-violet" x="690" y="86" text-anchor="middle" font-size="18">/dev/vda1</text>
  <text class="t-sm" x="690" y="114" text-anchor="middle" font-size="15">this machine, virtio</text>

  <rect class="box-w" x="840" y="50" width="230" height="80" rx="10"/>
  <text class="t-warn" x="955" y="86" text-anchor="middle" font-size="18">/dev/mapper/vg0-root</text>
  <text class="t-sm" x="955" y="114" text-anchor="middle" font-size="15">a symlink, not enumerated</text>

  <text class="t-dim" x="550" y="182" text-anchor="middle" font-size="15">names are assigned at boot in discovery order</text>
  <text class="t-bad" x="550" y="214" text-anchor="middle" font-size="15">hard-code UUID= in fstab, never /dev/sdb</text>
</svg>`
      },
      {
        type: "diagram",
        h: "GPT disk layout and the two recovery paths",
        caption: "<b>Backup GPT at the tail</b> is what lets <code>gdisk</code> and <code>sgdisk</code> report <i>backup GPT table is corrupt, but main is OK</i> instead of losing the partition map. Run <code>sgdisk -e</code> before a resizing operation, not after.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="A GPT disk with a protective MBR, a primary GPT and a backup GPT in the last sectors">
  <rect class="box" x="30" y="40" width="1040" height="60" rx="10"/>
  <text x="550" y="68" text-anchor="middle" font-size="18">protective MBR at LBA 0, type 0xEE</text>
  <text class="t-sm" x="550" y="90" text-anchor="middle" font-size="15">pre-GPT tools read it as unknown and refuse to write</text>

  <rect class="box-a" x="30" y="115" width="1040" height="60" rx="10"/>
  <text class="t-accent" x="550" y="143" text-anchor="middle" font-size="18">primary GPT at LBA 1 — 128 entries, CRC32</text>
  <text class="t-sm" x="550" y="165" text-anchor="middle" font-size="15">the only structure you cannot rebuild from anything else</text>

  <rect class="box-ok" x="30" y="190" width="1040" height="60" rx="10"/>
  <text class="t-ok" x="550" y="218" text-anchor="middle" font-size="18">backup GPT in the last 33 sectors</text>
  <text class="t-sm" x="550" y="240" text-anchor="middle" font-size="15">sgdisk -e rebuilds the front from the tail</text>

  <text class="t-dim" x="550" y="285" text-anchor="middle" font-size="15">a missing backup is still a warning, not data loss — rebuild before you resize</text>
</svg>`
      },
      {
        type: "prose",
        h: "LVM and device-mapper: a real use case and a real cost",
        p: [
          "LVM inserts three layers between a partition and a filesystem, all of them presented through the kernel's device-mapper layer. Block devices are marked <strong>Physical Volumes</strong>; PVs pool into a <strong>Volume Group</strong>, which carves space into <strong>extents</strong> — 4&nbsp;MiB by default, fixed at <code>pvcreate</code> time — and hands them to <strong>Logical Volumes</strong>. The LV is what you format and mount, as <code>/dev/mapper/vg0-name</code>, so the filesystem never learns it is not talking to a real disk.",
          "Two of that are genuinely useful. <strong>Thin provisioning</strong> works: a 500&nbsp;GB virtual LV on 20&nbsp;GB of PV grows into the pool, with a <code>Data</code> percentage to monitor. <strong>Snapshots</strong> are a metadata operation. <strong>Online resize</strong> is <code>lvresize</code> plus <code>resize2fs</code> with everything still mounted.",
          "The costs are real too. Every <code>lvm</code> command takes a write lock on <code>/run/lock/lvm</code>, so in a container with a private <code>/run</code> two LVM-touching processes can deadlock until reboot. Metadata lives in <code>/etc/lvm/</code>, and corrupt metadata means every LV is gone until you restore <code>/etc/lvm/backup/</code> — which belongs in your off-box copy. On a 19&nbsp;GB volume you cannot snapshot your way out of a bad <code>rm</code>."
        ]
      },
      {
        type: "diagram",
        h: "The LVM stack, top to bottom",
        caption: "An LV is not a partition and not a device — it is a mapping table plus a set of extents. That is why <code>pvs</code>, <code>vgs</code> and <code>lvs</code> are the three commands you need, and why <code>lvdisplay -m</code> is the fastest answer to 'where did these bytes physically land'.",
        svg: `
<svg viewBox="0 0 1100 340" role="img" aria-label="The LVM stack from filesystem through logical volume and volume group to a physical volume and a block device">
  <rect class="box" x="30" y="30" width="240" height="80" rx="10"/>
  <text x="150" y="66" text-anchor="middle" font-size="18">the filesystem</text>
  <text class="t-sm" x="150" y="94" text-anchor="middle" font-size="15">ext4, and it is unaware</text>

  <path class="ln-a" d="M270,70 L318,70" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-w" x="323" y="30" width="240" height="80" rx="10"/>
  <text class="t-warn" x="443" y="66" text-anchor="middle" font-size="18">logical volume</text>
  <text class="t-sm" x="443" y="94" text-anchor="middle" font-size="15">/dev/mapper/vg0-root</text>

  <path class="ln" d="M563,70 L611,70" marker-end="url(#lm-arrow)"/>

  <rect class="box-v" x="616" y="30" width="240" height="80" rx="10"/>
  <text class="t-violet" x="736" y="66" text-anchor="middle" font-size="18">volume group</text>
  <text class="t-sm" x="736" y="94" text-anchor="middle" font-size="15">4 MiB extents</text>

  <path class="ln" d="M736,110 L736,155" marker-end="url(#lm-arrow)"/>

  <rect class="box-v" x="616" y="160" width="240" height="80" rx="10"/>
  <text class="t-violet" x="736" y="196" text-anchor="middle" font-size="18">physical volume</text>
  <text class="t-sm" x="736" y="224" text-anchor="middle" font-size="15">created by pvcreate</text>

  <path class="ln" d="M616,200 L573,200" marker-end="url(#lm-arrow)"/>

  <rect class="box" x="300" y="160" width="273" height="80" rx="10"/>
  <text x="436" y="196" text-anchor="middle" font-size="18">a block device</text>
  <text class="t-sm" x="436" y="224" text-anchor="middle" font-size="15">/dev/sdb, /dev/vdb</text>

  <text class="t-dim" x="550" y="288" text-anchor="middle" font-size="15">corrupt metadata in /etc/lvm means every LV is gone until restored</text>
</svg>`
      },
      {
        type: "prose",
        h: "RAID is availability, not backup",
        p: [
          "RAID arranges block devices so one or more can fail without the filesystem noticing. That is the entire promise, and it is narrower than it sounds. It does nothing about <code>rm -rf /var/www</code>, an <code>rsync</code> overwriting live files with an old version, a compromised key, ransomware that can write to the mounted array, or fire — all of which write correct data to every member at once. A RAID 6 array replicates a corrupted delete across all four disks in about eight seconds.",
          "Two more realities. An array is not a backup target — you cannot copy onto a mounted RAID, so backups come off it through a snapshot or from an idle member. And degraded is not healthy: RAID 5 tolerates one failure and then every I/O pays a read-modify-write penalty until replacement; RAID 6 tolerates two; RAID 10 mirrors whole stripes, so sequential writes stay full-stripe and pay no parity penalty. On real hardware a battery-backed controller cache is part of the correctness argument, because consumer cards lie about flushes.",
          "<strong>Snapshots fail the same way.</strong> LVM, btrfs and ZFS all make one nearly free by noting which blocks changed instead of copying them, so 'snap before upgrade' is a practical safety net. But the snapshot and the original share the medium and the credentials: a deleted file is deleted in every snapshot, ransomware creates its own and deletes yours, and a provider that loses a volume loses every snapshot in it. LVM is the fragile one — fill the snapshot volume and it <em>invalidates</em>, taking every dependent LV with it — so size it for write rate times retention."
        ]
      },
      {
        type: "diagram",
        h: "Parity layouts: what each level actually costs",
        caption: "RAID 5 and 6 spread parity across the array, so one bad disk degrades every stripe. RAID 10 mirrors whole stripes: large write unit, simple read path, per-mirror rebuilds.",
        svg: `
<svg viewBox="0 0 1100 320" role="img" aria-label="RAID 5, RAID 6 and RAID 10 costs beside the statement that none of them is a backup">
  <rect class="box-a" x="30" y="30" width="200" height="90" rx="10"/>
  <text class="t-accent" x="130" y="66" text-anchor="middle" font-size="18">RAID 5</text>
  <text class="t-sm" x="130" y="94" text-anchor="middle" font-size="15">one failure tolerated</text>
  <text class="t-xs" x="130" y="114" text-anchor="middle" font-size="14">read-modify-write</text>

  <rect class="box-a" x="250" y="30" width="200" height="90" rx="10"/>
  <text class="t-accent" x="350" y="66" text-anchor="middle" font-size="18">RAID 6</text>
  <text class="t-sm" x="350" y="94" text-anchor="middle" font-size="15">two failures tolerated</text>
  <text class="t-xs" x="350" y="114" text-anchor="middle" font-size="14">double parity</text>

  <rect class="box-a" x="470" y="30" width="200" height="90" rx="10"/>
  <text class="t-accent" x="570" y="66" text-anchor="middle" font-size="18">RAID 10</text>
  <text class="t-sm" x="570" y="94" text-anchor="middle" font-size="15">mirrors whole stripes</text>
  <text class="t-xs" x="570" y="114" text-anchor="middle" font-size="14">no parity penalty</text>

  <rect class="box-b" x="700" y="30" width="370" height="90" rx="10"/>
  <text class="t-bad" x="718" y="66" font-size="17">none of them is a backup</text>
  <text class="t-sm" x="718" y="94" font-size="15">a deleted file is deleted on every</text>
  <text class="t-sm" x="718" y="114" font-size="15">member, in about eight seconds</text>

  <text class="t-dim" x="550" y="182" text-anchor="middle" font-size="15">one bad disk degrades every stripe; a rebuild reads 1.5 TB per TB restored</text>
  <text class="t-warn" x="550" y="222" text-anchor="middle" font-size="15">snapshots share the medium and the credentials, so they fail identically</text>
</svg>`
      },
      {
        type: "prose",
        h: "The journal and the write path",
        p: [
          "<code>write(2)</code> copies into the page cache and returns; <strong>returning 0 means 'in RAM', not 'on the platter'</strong>. That gap is where <code>fsync()</code> lives, and it is how a cloud disk loses the last seconds of a log on a hard reset. The journal is what closes the gap in the direction that matters: the ordered log is committed first, so a crash costs the last uncommitted transactions rather than the filesystem.",
          "A clean unmount leaves the journal empty. An unclean one leaves transactions to replay, and ext4 replays them at mount while printing <code>EXT4-fs (vda1): recovery complete</code> in <code>dmesg</code>. An unjournalled filesystem turns the same reset into a long <code>e2fsck</code>, or worse, into one that mounts successfully with your last writes silently missing.",
          "<strong>Which is exactly what <code>nobarrier</code> buys you:</strong> it skips the cache flush around a journal commit, so a device whose cache lies about flushes can produce a corrupt filesystem from a perfectly clean shutdown. On a cloud volume the hypervisor is the one flushing, and the option is often absent or ignored — but knowing why it exists tells you what the vendor is claiming."
        ]
      },
      {
        type: "diagram",
        h: "write(2), the journal, and the platter",
        caption: "The kernel reclaims and drops clean page cache first because it is provably discardable. Everything after that is a real write, and on a cloud volume a write is a network round trip.",
        svg: `
<svg viewBox="0 0 1100 320" role="img" aria-label="A write going to the page cache, then the journal commit, then the platter, with fsync between cache and journal">
  <rect class="box-a" x="30" y="40" width="190" height="80" rx="10"/>
  <text class="t-accent" x="125" y="76" text-anchor="middle" font-size="18">write(2)</text>
  <text class="t-sm" x="125" y="102" text-anchor="middle" font-size="15">returns 0 at once</text>

  <path class="ln-a" d="M220,80 L268,80" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="273" y="40" width="240" height="80" rx="10"/>
  <text class="t-violet" x="393" y="76" text-anchor="middle" font-size="18">page cache</text>
  <text class="t-sm" x="393" y="102" text-anchor="middle" font-size="15">the bytes are in RAM</text>

  <path class="ln" d="M513,80 L561,80" marker-end="url(#lm-arrow)"/>
  <text class="t-xs" x="537" y="66" text-anchor="middle" font-size="14">fsync</text>

  <rect class="box-w" x="566" y="40" width="250" height="80" rx="10"/>
  <text class="t-warn" x="691" y="76" text-anchor="middle" font-size="18">journal commit</text>
  <text class="t-sm" x="691" y="102" text-anchor="middle" font-size="15">jbd2, the ordered log</text>

  <path class="ln-b" d="M816,80 L864,80" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-a" x="869" y="40" width="201" height="80" rx="10"/>
  <text class="t-accent" x="969" y="76" text-anchor="middle" font-size="18">the platter</text>
  <text class="t-sm" x="969" y="102" text-anchor="middle" font-size="15">ms on a cloud volume</text>

  <text class="t-bad" x="550" y="185" text-anchor="middle" font-size="15">a hard reset in between loses exactly the last seconds</text>
  <text class="t-dim" x="550" y="217" text-anchor="middle" font-size="15">that is what the journal buys, and it is still not a backup</text>
  <text class="t-dim" x="550" y="249" text-anchor="middle" font-size="15">nobarrier skips the flush, and a lying cache corrupts a clean shutdown</text>
</svg>`
      },
      {
        type: "prose",
        h: "Filesystems by what they are actually good at",
        p: [
          "<strong>ext4</strong> is the Ubuntu default: a journal, extent mapping, and <code>df</code> conservative by design — ext4 reserves 5% of blocks for root, roughly 950&nbsp;MB on a 19&nbsp;GB volume, reported as used however empty the disk is. It grows online while shrinking only <em>unmounted</em>, and only after <code>e2fsck -f</code>.",
          "<strong>xfs</strong> wins on large files and parallel throughput, hence the RHEL and Fedora default. <strong><code>xfs_growfs</code> grows a mounted filesystem and can never shrink one</strong> — there is no <code>xfs_shrink</code> — and <code>xfs_repair</code> needs an unmounted filesystem. <strong>btrfs</strong> is the copy-on-write filesystem and the reason snapshots became cheap: every write goes to new blocks and only then is the tree metadata atomically relinked, buying instant snapshots, checksums on metadata <em>and</em> data so bit rot is detected rather than silently returned, and built-in RAID.",
          "<strong>ZFS</strong> is the other copy-on-write option: an adaptive RAM read cache called the ARC, datasets with quotas, and <code>zfs send</code>/<code>recv</code> for incremental off-box replication. Its caveat on Ubuntu is packaging — an out-of-tree DKMS module, so a failed rebuild on a box reached only over SSH means no boot. <strong>tmpfs</strong> is RAM with a swapfile underneath, defaulting to half of RAM, which is why <code>/dev/shm</code> is half of RAM and Docker caps it at 64&nbsp;MB."
        ]
      },
      {
        type: "prose",
        h: "Mount options that quietly change behaviour",
        p: [
          "<code>relatime</code> updates atime only when it is over 24 hours old or older than mtime; <code>strictatime</code> on every read; <code>noatime</code> never. The default is <code>relatime</code>. <code>noatime</code> is a real win on an IOPS-capped device, at the cost of tools that select by last access; <strong><code>lazytime</code> is the compromise</strong>, refreshing atime on unmount or copy.",
          "<code>discard</code> tells the device to discard blocks on <code>unlink</code>; <code>fstrim</code> does it in bulk from <code>fstrim.timer</code>. Do not do both: discard-on-unlink costs a round trip per deletion and on a virtual device often does nothing, because the hypervisor handles TRIM itself.",
          "<code>noexec</code> makes <code>execve</code> return <code>EACCES</code> on that mount, <code>nosuid</code> ignores the setuid and setgid bits, <code>nodev</code> refuses device files. On a <code>/tmp</code> any unprivileged user can write to, <code>nodev,nosuid,noexec</code> costs nothing and closes the standard abuse patterns — writing a <code>.so</code> for something to load, copying a setuid binary and running it, creating <code>/tmp/kmem</code> as a device for a kernel exploit. The cost is real: a rescue or initramfs script placed there silently fails to run."
        ]
      },
      {
        type: "prose",
        h: "/etc/fstab, field by field",
        p: [
          "Every line is six whitespace-separated fields: device, mountpoint, type, options, dump frequency, fsck pass order. The <code>UUID=</code> prefix tells <code>mount</code> to resolve against <code>/dev/disk/by-uuid/</code>; get the UUID from <code>blkid</code>, never from memory. The trailing <code>0 1</code> is legacy, but that value is how systemd derives which units get automatic checks — setting <code>pass</code> to <code>0</code> switches the safety net off entirely.",
          "Two options save remote machines. <strong><code>nofail</code></strong> makes a failed mount not a boot failure, so the box still comes up — with the directory empty, which is its own hazard on a data disk. <strong><code>_netdev</code></strong> orders the mount after networking instead of timing out into emergency mode.",
          "And the part that matters on a Tailscale-only, key-only VPS: a line referencing a device or UUID that does not exist makes systemd consider the boot failed and drop to <code>emergency.target</code> — on a remote box that is a serial console you do not have. Never hard-code <code>/dev/vda1</code>: <code>/dev/sd*</code> ordering is a race, and a reboot after adding a disk is when it bites. Append rather than edit in place, keep the SSH session open, and run <code>mount -a</code> plus <code>findmnt --verify --verbose</code> before rebooting."
        ]
      },
      {
        type: "diagram",
        h: "One fstab line becomes a systemd unit",
        caption: "systemd-fstab-generator reads <code>/etc/fstab</code> at boot and writes one <code>*.mount</code> unit per line into <code>/run/systemd/generator/</code>. <b>local-fs.target</b> gates multi-user.target; <b>remote-fs.target</b> and <b>swap.target</b> are separate.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="An fstab line turned into a mount unit and a dependency on local-fs.target">
  <rect class="box-v" x="30" y="40" width="1040" height="58" rx="10"/>
  <text class="t-mono" x="50" y="76" font-size="17">UUID=9f2c1d84... /var/lib/docker ext4 defaults,nofail 0 2</text>

  <path class="ln-a" d="M550,98 L550,140" marker-end="url(#lm-arrow-accent)"/>
  <text class="t-xs" x="616" y="126" font-size="14">systemd-fstab-generator</text>

  <rect class="box-a" x="30" y="145" width="300" height="75" rx="10"/>
  <text class="t-accent" x="180" y="178" text-anchor="middle" font-size="18">var-lib-docker.mount</text>
  <text class="t-sm" x="180" y="204" text-anchor="middle" font-size="15">one unit per line</text>

  <path class="ln" d="M330,182 L356,182" marker-end="url(#lm-arrow)"/>

  <rect class="box-v" x="360" y="145" width="300" height="75" rx="10"/>
  <text class="t-violet" x="510" y="178" text-anchor="middle" font-size="18">local-fs.target</text>
  <text class="t-sm" x="510" y="204" text-anchor="middle" font-size="15">gates multi-user.target</text>

  <path class="ln-b" d="M660,182 L686,182" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-w" x="690" y="145" width="380" height="75" rx="10"/>
  <text class="t-warn" x="880" y="178" text-anchor="middle" font-size="18">missing nofail: emergency.target</text>
  <text class="t-sm" x="880" y="204" text-anchor="middle" font-size="15">after DefaultTimeoutStartSec, 90s</text>

  <text class="t-dim" x="550" y="268" text-anchor="middle" font-size="15">_netdev only adds After=network.target; remote shares need network-online.target</text>
</svg>`
      },
      {
        type: "code",
        lang: "bash",
        what: "Ask each layer the one question only it can answer",
        code:
`$ lsblk -f && sudo blkid /dev/vda1 && findmnt /
# a disagreement between the three answers is the diagnosis
$ df -hT -x tmpfs -x devtmpfs; df -i /          # bytes, then inodes`
      },
      {
        type: "prose",
        h: "Growing online, and the one filesystem that refuses to shrink",
        p: [
          "Growing a cloud volume is three operations in three different layers. The provider enlarges the block device; you extend the partition table to describe the new size; you grow the filesystem inside it. Skipping step 2 is the classic mistake and produces <code>Partition table entries are not in sync with disk</code> — the kernel sees the new sector count while the table still ends at the old one.",
          "Step 2 is <code>growpart</code> from cloud-utils, run against the <em>partition</em>, not the disk: <code>sudo growpart /dev/vda 1</code>, which also rewrites the GPT backup header at the end of the disk to match. Without it, <code>parted -s /dev/vda resizepart 1 100%</code> plus <code>partprobe</code>. If the partition is in use you get <code>Device or resource busy</code>, and the kernel picks up the new geometry at the next reboot.",
          "Step 3 is per filesystem: <code>resize2fs /dev/vda1</code> for ext4, safe online; <code>xfs_growfs /mountpoint</code> for XFS, which takes the <em>mountpoint</em> rather than the device and confuses everyone who forgets; <code>btrfs filesystem resize max /mountpoint</code>, which grows every subvolume; <code>lvresize -l +100%FREE</code> plus the filesystem command on the <code>/dev/mapper</code> device when LVM is involved. And the asymmetry to internalise: <strong>ext4 shrinks only unmounted and only after <code>e2fsck -f</code></strong>; <strong>XFS cannot shrink at all</strong>. Oversize a volume and your only option is to copy into a smaller filesystem, which XFS will not let you do."
        ]
      },
      {
        type: "prose",
        h: "Swap and the OOM killer: one problem, two symptoms",
        p: [
          "When the kernel cannot satisfy a page allocation it has two responses. If reclaimable memory exists — clean page cache, or anonymous pages it can page out — it <strong>reclaims</strong> and your application slows down. If there is nothing left, it <strong>invokes the OOM killer</strong>, which scores processes on RSS and swap usage and SIGKILLs the worst. SIGKILL cannot be caught or handled. The log says <code>Out of memory: Killed process 4211 (java) total-vm:...</code>; the unit reports <code>status=137/KILL</code>.",
          "Why swap changes the outcome on a small box: swapping anonymous memory is neither free nor fast. Every page-out is a synchronous write to a block device — on a cloud volume, a network round trip in milliseconds. In steady swap the process blocks on I/O, allocates again immediately after freeing, and pages out again. That is <strong>thrash</strong>: a machine at 100% CPU, unresponsive to SSH, with full disks and no OOM kill in <code>dmesg</code>.",
          "<code>free -h</code> showing 200&nbsp;MB free with 900&nbsp;MB in <code>buff/cache</code> is <em>healthy</em> — that cache is reclaimable. The number to watch is <code>available</code>, the kernel's own estimate of what a new process could get without swapping. <code>vmstat 1</code> tells you the regime: non-zero <code>so</code> with high <code>wa</code> is thrash; non-zero <code>si</code> with <code>so</code> at zero is a working set that does not fit, and only more RAM fixes it. A swap file does not fix an OOM; it converts a clean, diagnosable kill into an undiagnosable slowdown and takes your SSH session with it. If you add one, <code>chmod 600</code> it — a world-writable swapfile is how people hand out a root shell — and never add swap to paper over a leak."
        ]
      },
      {
        type: "diagram",
        h: "The allocation failure decision",
        caption: "Cache is reclaimed first because it is provably discardable. Anonymous memory is different — reclaiming it means writing it out, which is why <b>swap converts a fast failure into a slow one</b>. <code>vmstat</code> <code>si</code>/<code>so</code> and <code>free -h</code> <code>available</code> tell you which branch you are on.",
        svg: `
<svg viewBox="0 0 1100 340" role="img" aria-label="A page allocation failing, reclaiming clean cache, swapping out, and finally invoking the OOM killer">
  <rect class="box" x="30" y="30" width="180" height="80" rx="10"/>
  <text x="120" y="66" text-anchor="middle" font-size="18">request</text>
  <text class="t-sm" x="120" y="94" text-anchor="middle" font-size="15">a page, from malloc</text>

  <path class="ln-a" d="M210,70 L258,70" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box" x="263" y="30" width="190" height="80" rx="10"/>
  <text x="358" y="66" text-anchor="middle" font-size="18">no free page</text>
  <text class="t-sm" x="358" y="94" text-anchor="middle" font-size="15">zone watermark hit</text>

  <path class="ln" d="M453,70 L501,70" marker-end="url(#lm-arrow)"/>

  <rect class="box-ok" x="506" y="30" width="190" height="80" rx="10"/>
  <text class="t-ok" x="601" y="66" text-anchor="middle" font-size="18">reclaim</text>
  <text class="t-sm" x="601" y="94" text-anchor="middle" font-size="15">drop clean cache</text>

  <path class="ln-w" d="M696,70 L744,70" marker-end="url(#lm-arrow-warn)"/>

  <rect class="box-w" x="749" y="30" width="160" height="80" rx="10"/>
  <text class="t-warn" x="829" y="66" text-anchor="middle" font-size="18">swap out</text>
  <text class="t-sm" x="829" y="94" text-anchor="middle" font-size="15">a real disk write</text>

  <path class="ln-b" d="M829,110 L829,160" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-w" x="700" y="165" width="370" height="80" rx="10"/>
  <text class="t-warn" x="885" y="200" text-anchor="middle" font-size="18">OOM kill</text>
  <text class="t-sm" x="885" y="226" text-anchor="middle" font-size="15">SIGKILL, uncatchable; status=137/KILL</text>

  <text class="t-bad" x="360" y="200" text-anchor="middle" font-size="15">reclaiming anonymous memory means</text>
  <text class="t-bad" x="360" y="232" text-anchor="middle" font-size="15">writing it out first</text>
</svg>`
      },
      {
        type: "steps",
        items: [
          {
            t: "df -hT, then df -i",
            d: "Which filesystem, and bytes or inodes. Exclude pseudo-filesystems: <code>df -hT -x tmpfs -x devtmpfs -x squashfs</code>."
          },
          {
            t: "sudo lsof +L1",
            d: "Catch deleted-but-open files before walking the tree. <code>nginx 1204 root 14w REG 253,1 104857600 0 6291 /var/log/nginx/access.log (deleted)</code> is 100&nbsp;MB that <code>du</code> can never find. Restart the holder."
          },
          {
            t: "du -x -h --max-depth=1 / | sort -h",
            d: "The <code>-x</code> is essential — without it <code>du</code> attributes other filesystems' size to the path you are measuring."
          },
          {
            t: "journalctl --disk-usage, then --vacuum-size=200M",
            d: "Vacuum works on a running system and removes only archived journals, never the active one. On this box journald is capped at <code>SystemMaxUse=300M</code> with <code>SystemKeepFree=1G</code>, so it will never be the cause."
          },
          {
            t: "docker system prune; apt-get clean",
            d: "Prune drops stopped containers, images and networks but <em>not</em> volumes — <code>docker volume prune</code> is separate and irreversible for named volumes. Never hand-delete <code>/var/lib/docker</code> or <code>/var/lib/lvm</code>."
          }
        ]
      },
      {
        type: "prose",
        h: "fsck, and what an unclean unmount costs",
        p: [
          "<code>fsck</code> is not one program; it is a dispatcher. <code>fsck /dev/vda1</code> reads which filesystem the superblock claims and execs <code>fsck.ext4</code>, <code>fsck.xfs</code>, <code>fsck.btrfs</code> or <code>fsck.vfat</code>. Each takes a different view of consistency, and that difference is exactly what a power cut costs you.",
          "<strong>ext4 with a journal replays it at mount and fixes itself.</strong> A clean unmount leaves the journal empty; an unclean one produces <code>EXT4-fs (vda1): recovery complete</code> in <code>dmesg</code> and the system carries on. <code>fsck.ext4</code> on a mounted filesystem returns <code>fsck: /dev/vda1 is mounted.  fsck.ext4: refusing to work on a mounted filesystem.</code>, because the check itself corrupts a live filesystem. To force a check of root, schedule one with <code>tune2fs -c 30 /dev/vda1</code>.",
          "<strong>XFS refuses to be checked while mounted, full stop</strong>, and <code>xfs_repair</code> must run unmounted — booting <code>init=/bin/bash</code> from GRUB, remounting <code>/</code> read-write, unmounting, repairing, rebooting. That is the real cost of a filesystem choice: measured at the worst moment, not the average one. <strong>systemd-fsck@.service</strong> automates it: at boot it runs <code>fsck -n</code> — <strong>no</strong>, never <code>-a</code> or <code>-y</code> — triggered by the generated <code>*.mount</code> units. Exit code 4 means 'errors left uncorrected' and systemd refuses that mount."
        ]
      },
      {
        type: "prose",
        h: "SMART, and telling a dying disk from a busy one",
        p: [
          "SMART is the drive's self-assessment, read straight off the device without the filesystem involved: <code>sudo smartctl -a /dev/vda</code>. The two attributes that matter before a failure are <strong>Reallocated_Sector_Ct</strong>, which counts sectors the disk has retired and remapped, and <strong>Current_Pending_Sector</strong>, which counts sectors the disk could not read this time. The first climbing steadily means the disk is dying; the second non-zero means a read already failed.",
          "On a cloud volume you rarely have <code>smartctl</code> or passthrough, and that is exactly why the error strings matter. <code>EXT4-fs error (device vda1): ext4_read_error: error reading blocks</code> or a <code>Buffer I/O error</code> in <code>dmesg</code> with <code>task … blocked for more than 120 seconds</code> is the kernel reporting a device that stopped answering — the process in <code>D</code> state cannot be killed because it is waiting on the hardware.",
          "<strong>The triage that follows is: stop writing, copy what you can read, then replace.</strong> <code>dmesg -T | grep -i error</code> gives you the first bad sector address; <code>ddrescue</code> rather than <code>dd</code> reads around the holes. Do not run <code>e2fsck</code> first — it reads the same bad sectors and may take the data with it. And on a VPS, a host that has become unresponsive to reads is a provider ticket, not a debugging session."
        ]
      },
      {
        type: "prose",
        h: "Reading the numbers, and why fio will take your site offline",
        p: [
          "Every device has a <strong>queue</strong>, and its depth is its parallelism: throughput approaches <code>IOPS = queue_depth / average_latency</code>, and latency improves only while the queue is unsaturated. That is where <code>%util</code> misleads — it reads 100% at queue depth 1, so a device doing 50&nbsp;000 IOPS at depth 32 looks busier than a saturated array. Read <code>await</code> against <code>aqu-sz</code> instead. On a VPS the ceiling is the provider's per-volume IOPS pool, not your disk.",
          "And the warning: <code>fio</code> is the correct tool and it will absolutely take a production volume offline. A naive invocation writes gigabytes of random data as fast as it can, saturating the IOPS pool your database depends on, and you may get rate-limited. If you must run it: <code>--direct=1</code> so you measure the device and not the page cache, <code>--filename</code> on a <em>file</em> rather than a raw device, and cap it with <code>--iodepth</code> and <code>--runtime</code>."
        ]
      }
    ],
    takeaways: [
      "Four layers — block device, partition, filesystem, mountpoint — each reporting success upward independently. <code>lsblk</code> answers 'do I have the device', <code>blkid</code> 'what filesystem is on it', <code>findmnt</code> 'what is mounted where'. In that order the answer is in front of you.",
      "Partition suffixes are a disambiguation rule, not a guess: <code>/dev/sda1</code> has a letter-ended parent, <code>/dev/nvme0n1p1</code> needs the 'p'. Never put a raw device in fstab — a wrong mount at boot means emergency.target.",
      "The journal is what turns a power cut into lost seconds instead of a corrupt filesystem. An unclean unmount is a replay at mount, not a repair — and XFS refuses that convenience entirely.",
      "RAID and snapshots are availability, not backup: a deleted file is deleted on every member and every snapshot, because they share the medium and the credentials.",
      "Swap does not fix an OOM; it converts a fast, diagnosable SIGKILL into an undiagnosable stall. Watch <code>vmstat</code> <code>si</code>/<code>so</code> and <code>free -h</code> <code>available</code>. <code>iostat</code>'s <code>%util</code> saturates at queue depth 1 — on a VPS the ceiling is the provider's IOPS pool.",
      "<code>ENOSPC</code> means the filesystem could not satisfy the allocation, not that bytes are gone. Check inodes with <code>df -i</code> and deleted-but-open files with <code>lsof +L1</code> before you start deleting things."
    ],
    glossary: {
      "block device": "A device the kernel addresses in fixed-size sectors (512 bytes on virtio), with a driver and a request queue.",
      GPT: "GUID Partition Table: 128 entries, 128-bit UUIDs, a CRC32, and a backup copy in the last 33 sectors.",
      "protective MBR": "The type-0xEE entry at LBA 0 on a GPT disk, so pre-GPT tools refuse to write over the real table.",
      LVM: "Pools block devices into volume groups and hands out logical volumes that can be resized or snapshotted while mounted.",
      "device-mapper": "The kernel dm layer presenting stacked devices as <code>/dev/mapper/*</code>; LVM and cryptsetup sit on it.",
      ENOSPC: "'No space left on device'. It covers exhausted blocks <em>and</em> inodes, so <code>df -i</code> must be checked too.",
      "deleted but open": "A file unlinked but still referenced by an open descriptor; its blocks stay allocated until the last reference closes.",
      SMART: "On-disk self-assessment read with <code>smartctl</code>; reallocated and pending sector counts are the two that predict failure."
    }
  });
})();