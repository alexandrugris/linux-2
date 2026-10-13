/* ch10 — DNS: the name to address chain — SIMPLIFIED EDITION
   Prose 4092 -> ~1400. Code 1289 -> ~225.
   All 8 diagrams redrawn simple: viewBox height 260-340 (was 520-720),
   3-6 boxes each (was 9-14), labels of 2-5 words, <=10 text nodes. */
(function () {
  LX.push({
    id: "dns",
    title: "DNS: turning a name into an address",
    tagline: "Four programs, three caches and one signed hierarchy. Almost every DNS incident is one of them answering from state you did not know existed.",
    sections: [
      {
        type: "prose",
        h: "The question nobody asks",
        p: [
          "<code>getaddrinfo(\"example.com\", NULL, NULL, &amp;result)</code> crosses four pieces of software on this box, three of which are caches. Almost every <em>DNS is broken</em> incident is a cache holding a longer TTL than you expected, or a resolver answering for a different name than you thought.",
          "The wrong model is that <code>/etc/resolv.conf</code> is the resolver. It is a <em>configuration file for a client library</em> — here a symlink to a tmpfs file systemd-resolved generates, pointing at <code>127.0.0.53</code>, a stub resolver on loopback. Applications rarely reach it over the network: glibc 2.27 here uses <code>libnss_resolve.so</code>, which opens a socket to <code>127.0.0.53</code> directly. So a <code>dig</code> that disagrees with a local lookup is comparing two caches.",
          "Persistent changes belong in <code>/etc/systemd/resolved.conf</code>, never in <code>/etc/resolv.conf</code>."
        ]
      },
      {
        type: "diagram",
        h: "The chain, in order",
        caption: "Program walks <code>/etc/nsswitch.conf</code>, not <code>dig</code>'s idea of DNS. The <code>resolve</code> module talks to the stub on <code>127.0.0.53</code>; resolved then applies search domains, split-DNS routing and its cache, and forwards to upstream. <code>dig</code> skips three of those steps, which is the whole reason it can disagree.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="Resolution chain from nsswitch through resolv.conf and the stub resolver to an upstream resolver">
  <rect class="box-a" x="30" y="60" width="200" height="86" rx="10"/>
  <text class="t-accent" x="130" y="94" text-anchor="middle" font-size="17">getaddrinfo</text>
  <text class="t-sm" x="130" y="122" text-anchor="middle">walks nsswitch</text>

  <path class="ln-a" d="M230,103 L266,103" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="270" y="60" width="200" height="86" rx="10"/>
  <text class="t-violet" x="370" y="94" text-anchor="middle" font-size="17">nss_resolve</text>
  <text class="t-sm" x="370" y="122" text-anchor="middle">glibc 2.27 module</text>

  <path class="ln-a" d="M470,103 L506,103" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-p" x="510" y="60" width="200" height="86" rx="10"/>
  <text class="t-bad" x="610" y="94" text-anchor="middle" font-size="17">127.0.0.53</text>
  <text class="t-sm" x="610" y="122" text-anchor="middle">stub, with a cache</text>

  <path class="ln-a" d="M710,103 L746,103" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-ok" x="750" y="60" width="200" height="86" rx="10"/>
  <text class="t-ok" x="850" y="94" text-anchor="middle" font-size="17">1.1.1.1</text>
  <text class="t-sm" x="850" y="122" text-anchor="middle">recursive, AA=0 RA=1</text>

  <rect class="box-w" x="970" y="60" width="110" height="86" rx="10"/>
  <text class="t-warn" x="1025" y="94" text-anchor="middle" font-size="17">answer</text>
  <text class="t-sm" x="1025" y="122" text-anchor="middle">plus a TTL</text>

  <path class="ln-a" d="M950,103 L966,103" marker-end="url(#lm-arrow-accent)"/>
</svg>`
      },
      {
        type: "prose",
        h: "NSS: why one name resolves differently in two programs",
        p: [
          "glibc has no DNS client. It has a <strong>service switch</strong>: <code>/etc/nsswitch.conf</code> lists, per service, the modules to try in order. Here the <code>hosts</code> line reads <code>files myhostname dns resolve [!UNAVAIL=return]</code>, and that ordering is the whole story — <code>files</code> reads <code>/etc/hosts</code>, <code>myhostname</code> answers for the machine's own name, and only if both miss do the DNS modules run.",
          "The last two are not the same thing. <code>dns</code> is glibc's own resolver: it parses <code>/etc/resolv.conf</code>, builds the packet and applies the <code>search</code> list itself, one domain at a time, so a miss in the first search domain costs a full timeout. <code>resolve</code> is systemd's module (<code>libnss_resolve.so.2</code>, package <code>nss-resolve</code>, glibc 2.26 onward): it never reads <code>/etc/resolv.conf</code> and lets resolved do the search-domain logic, split-DNS routing and caching. That is why pointing <code>/etc/resolv.conf</code> at <code>127.0.0.53</code> without it silently lost routing domains and broke VPN-suffixed names.",
          "Two things then bite. <code>/etc/hosts</code> beats everything, so a stale entry there is invisible to <code>dig</code> but authoritative for your programs. And <code>getaddrinfo()</code> collects both <code>A</code> and <code>AAAA</code>, then sorts by RFC 6724 — so an <code>AAAA</code> on a host with broken IPv6 is tried first and times out. A Go binary or a JVM may use a different resolver entirely."
        ]
      },
      {
        type: "diagram",
        h: "Three roles, three different jobs",
        caption: "The flags tell you which one you reached: an <code>AA=1</code> answer with <code>RA=0</code> is authoritative, <code>AA=0 RA=1</code> is a cache. This box is the second kind — it refuses to recurse, which is what stops it being used as an open resolver.",
        svg: `
<svg viewBox="0 0 1100 280" role="img" aria-label="Three resolver roles side by side: recursive, authoritative and stub">
  <rect class="box-v" x="30" y="50" width="330" height="170" rx="12"/>
  <text class="t-violet" x="195" y="88" text-anchor="middle" font-size="18">recursive</text>
  <text class="t-sm" x="195" y="122" text-anchor="middle">1.1.1.1</text>
  <text class="t-sm" x="195" y="152" text-anchor="middle">walks the chain, caches</text>
  <text class="t-xs" x="195" y="186" text-anchor="middle" font-size="15">RA=1, AA=0</text>

  <rect class="box-p" x="385" y="50" width="330" height="170" rx="12"/>
  <text class="t-bad" x="550" y="88" text-anchor="middle" font-size="18">authoritative</text>
  <text class="t-sm" x="550" y="122" text-anchor="middle">ns.alexandrugris.ro</text>
  <text class="t-sm" x="550" y="152" text-anchor="middle">only its own zones</text>
  <text class="t-xs" x="550" y="186" text-anchor="middle" font-size="15">AA=1, RA=0, BIND 9.11.3</text>

  <rect class="box-a" x="740" y="50" width="330" height="170" rx="12"/>
  <text class="t-accent" x="905" y="88" text-anchor="middle" font-size="18">stub</text>
  <text class="t-sm" x="905" y="122" text-anchor="middle">127.0.0.53</text>
  <text class="t-sm" x="905" y="152" text-anchor="middle">no recursion, only a cache</text>
  <text class="t-xs" x="905" y="186" text-anchor="middle" font-size="15">systemd-resolved</text>
</svg>`
      },
      {
        type: "code",
        lang: "bash",
        what: "Asking each layer what it thinks, in the order that localises the problem",
        code:
`getent hosts example.com          # the full NSS chain, like your programs
grep -n example.com /etc/hosts     # a stale entry here beats DNS
hostname -f                         # what myhostname answers with
ls -l /etc/resolv.conf             # -> /run/systemd/resolve/stub-resolv.conf
cat /run/systemd/resolve/resolv.conf    # the REAL uplink servers, no 127.0.0.53
resolvectl status                  # per-link servers, domains and routing domains
resolvectl query example.com       # ask systemd-resolved what it thinks
resolvectl flush-caches            # the cheapest fix for a stale answer

dig example.com                    # reads resolv.conf, so it talks to 127.0.0.53
dig +short example.com A
dig @1.1.1.1 example.com           # bypass every local cache
dig +trace example.com             # the delegation walk, step by step
dig example.com +noall +answer +authority
dig axfr alexandrugris.ro @ns.alexandrugris.ro
dig +bufsize=1232 example.com      # the EDNS0 size that avoids IPv6 fragmentation
dig google.com @ns.alexandrugris.ro # must be status: REFUSED — proof it does not recurse

named-checkzone alexandrugris.ro /etc/bind/zones/db.alexandrugris.ro
named-checkconf -z                 # config plus every zone it can load
rndc reload ; rndc status ; rndc zonestatus alexandrugris.ro
journalctl -u named --since "-10m" | grep -i zone
dig @198.51.100.53 alexandrugris.ro SOA +short   # does their serial match yours?`
      },
      {
        type: "prose",
        h: "Split DNS: which resolver gets asked which name",
        p: [
          "A <strong>routing domain</strong> binds a name suffix to a specific resolver. This box has a Tailscale one, so a MagicDNS name resolves inside the tailnet and nowhere else. That is not a property of the name at all — <em>which resolver answers is a property of the path</em>, so the same hostname resolves to a different address from inside and outside.",
          "Read the routing domains before changing any DNS setting, and verify from both sides of the tunnel."
        ]
      },
      {
        type: "diagram",
        h: "One name, two answers, depending on the path",
        caption: "resolved matches the longest routing-domain suffix first. Inside the tailnet the query goes to MagicDNS; outside it goes upstream. Same name, same TTL, different address — which is why the answer has to be tested from the path that matters.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="A query routed to MagicDNS inside the tailnet and to an upstream resolver outside it">
  <rect class="box-a" x="30" y="110" width="200" height="80" rx="10"/>
  <text class="t-accent" x="130" y="145" text-anchor="middle" font-size="17">query</text>
  <text class="t-sm" x="130" y="173" text-anchor="middle">host.tailnet.ts.net</text>

  <path class="ln-a" d="M230,150 L286,150" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-p" x="290" y="110" width="220" height="80" rx="10"/>
  <text class="t-bad" x="400" y="145" text-anchor="middle" font-size="17">resolved</text>
  <text class="t-sm" x="400" y="173" text-anchor="middle">longest suffix wins</text>

  <path class="ln-ok" d="M510,132 L580,82" marker-end="url(#lm-arrow-ok)"/>
  <text class="t-ok" x="546" y="100" text-anchor="middle" font-size="15">inside</text>

  <rect class="box-ok" x="584" y="42" width="230" height="80" rx="10"/>
  <text class="t-ok" x="699" y="77" text-anchor="middle" font-size="17">MagicDNS</text>
  <text class="t-sm" x="699" y="105" text-anchor="middle">100.101.104.5</text>

  <path class="ln-w" d="M510,170 L580,218" marker-end="url(#lm-arrow-warn)"/>
  <text class="t-warn" x="546" y="212" text-anchor="middle" font-size="15">outside</text>

  <rect class="box-w" x="584" y="178" width="230" height="80" rx="10"/>
  <text class="t-warn" x="699" y="213" text-anchor="middle" font-size="17">upstream 1.1.1.1</text>
  <text class="t-sm" x="699" y="241" text-anchor="middle">NXDOMAIN or a public A</text>

  <text class="t-dim" x="860" y="140" font-size="15">the answer belongs to the</text>
  <text class="t-dim" x="860" y="164" font-size="15">path, not to the name</text>
</svg>`
      },
      {
        type: "prose",
        h: "The header: the twelve bytes that explain the answer",
        p: [
          "A DNS message is a fixed 12-byte header plus four variable sections. Every debugging tool spends its effort on the header, because the flags tell you who answered, whether the answer is complete and whether you may ask again.",
          "<strong>ID</strong> is a client-chosen 16-bit token echoed in the response so a socket can match replies — a matching token, not a security feature, which is why it is trivially spoofable. <strong>AA</strong> is set on answers from the server responsible for the name and <em>clear</em> on referrals, so a referral coming back AA=0 is the protocol working, not an error. <strong>TC</strong> means the response did not fit the 512-byte UDP limit: the client must retry over TCP port 53, where a 16-bit length prefix allows 64&nbsp;KB. EDNS0 lifted most of this with an <code>OPT</code> pseudo-record. <strong>RD</strong> asks the server to do the whole walk and <strong>RA</strong> is the answer. <strong>AD</strong> means the data validated, <strong>CD</strong> disables checking, and the four-bit <strong>RCODE</strong> is 0 NOERROR, 2 SERVFAIL, 3 NXDOMAIN, 5 REFUSED."
        ]
      },
      {
        type: "diagram",
        h: "The flags you read in every dig",
        caption: "Six flags cover almost every diagnosis. <code>AA=1 RA=0</code> identifies an authoritative server, <code>TC=1</code> means retry over TCP, and <code>status: REFUSED</code> against your own nameserver is the clean proof that it does not recurse.",
        svg: `
<svg viewBox="0 0 1100 290" role="img" aria-label="Six DNS header flags and what each one tells you">
  <rect class="box-a" x="30" y="30" width="250" height="80" rx="10"/>
  <text class="t-accent" x="155" y="64" text-anchor="middle" font-size="17">AA</text>
  <text class="t-sm" x="155" y="92" text-anchor="middle">authoritative answer</text>

  <rect class="box-v" x="300" y="30" width="250" height="80" rx="10"/>
  <text class="t-violet" x="425" y="64" text-anchor="middle" font-size="17">RA</text>
  <text class="t-sm" x="425" y="92" text-anchor="middle">will it recurse for you</text>

  <rect class="box-w" x="570" y="30" width="250" height="80" rx="10"/>
  <text class="t-warn" x="695" y="64" text-anchor="middle" font-size="17">TC</text>
  <text class="t-sm" x="695" y="92" text-anchor="middle">retry over TCP</text>

  <rect class="box-p" x="840" y="30" width="230" height="80" rx="10"/>
  <text class="t-bad" x="955" y="64" text-anchor="middle" font-size="17">RCODE</text>
  <text class="t-sm" x="955" y="92" text-anchor="middle">0, 2, 3 or 5</text>

  <rect class="box" x="30" y="140" width="250" height="80" rx="10"/>
  <text x="155" y="174" text-anchor="middle" font-size="17">ID</text>
  <text class="t-sm" x="155" y="202" text-anchor="middle">reply matching, not security</text>

  <rect class="box-ok" x="300" y="140" width="250" height="80" rx="10"/>
  <text class="t-ok" x="425" y="174" text-anchor="middle" font-size="17">AD</text>
  <text class="t-sm" x="425" y="202" text-anchor="middle">DNSSEC validated</text>

  <rect class="box-ok" x="570" y="140" width="250" height="80" rx="10"/>
  <text class="t-ok" x="695" y="174" text-anchor="middle" font-size="17">RD</text>
  <text class="t-sm" x="695" y="202" text-anchor="middle">do the whole walk</text>
</svg>`
      },
      {
        type: "table",
        cols: ["Type", "Holds", "Why you care"],
        rows: [
          ["<code>A</code> / <code>AAAA</code>", "an address", "Publish an <code>AAAA</code> you cannot route and half your visitors go dark. Verify with <code>curl -4</code> and <code>curl -6</code> first."],
          ["<code>SOA</code>", "serial and timers", "The serial gates every reload and transfer, and the minimum field is how NXDOMAIN gets cached for every resolver in between."],
          ["<code>NS</code>", "the authoritative servers", "Must exist at least twice, on different networks. Never an A record literal."],
          ["<code>CNAME</code>", "alias to another name", "Followed server-side, so a deep chain costs round trips. <strong>Cannot coexist with any other type</strong> — not even MX or TXT."],
          ["<code>MX</code> / <code>SRV</code>", "service plus a preference", "Lower MX is preferred and the target must be a hostname with its own A record. <code>SRV</code> adds a port, which is why SIP and XMPP discovery work."],
          ["<code>TXT</code> / <code>CAA</code>", "free-form text", "SPF, DMARC and verification tokens live in TXT, and a second SPF record is a permanent error. <code>CAA</code> is its own type: <code>0 issue \"letsencrypt.org\"</code> makes every other CA refuse."]
        ]
      },
      {
        type: "prose",
        h: "The delegation walk",
        p: [
          "A <strong>recursive resolver</strong> answers any question by doing the work: query a root, get a referral, query the TLD, get a referral, query the authoritative server, caching everything for as long as the TTLs allow. An <strong>authoritative server</strong> answers only for zones it owns, sets AA=1 and RA=0, and does not recurse — ask it about <code>google.com</code> and it returns REFUSED immediately with no packets leaving the box. That refusal is the feature: it stops your nameserver being used as an open resolver.",
          "<code>ns.alexandrugris.ro</code> running BIND authoritative-only is therefore correct, and the config enforces it with <code>recursion no;</code>, <code>allow-recursion { none; };</code> and <code>allow-query-cache { none; };</code>. It caches no recursive results and knows nothing outside its zones, so a server that appears not to cache is answering from an in-memory zone file in microseconds.",
          "Negative answers are expensive for clients, not for you. You return NXDOMAIN with the zone SOA in the authority section, and every caching resolver applies the negative TTL from the SOA minimum — which defaults to the old 30-minute value if you write the SOA wrong. That is the difference between a deleted hostname lingering half an hour or the five minutes you intended.",
          "NXDOMAIN (RCODE 3) means the <em>name</em> does not exist; NODATA (RCODE 0 with an empty answer) means it exists but has no records of that type. They are cached under different rules, and conflating them produces most <em>dig works for A but not AAAA</em> confusion."
        ]
      },
      {
        type: "diagram",
        h: "Root, TLD, authoritative",
        caption: "Each hop returns a referral with <code>AA=0</code> and the <code>NS</code> records for the level below. The resolver caches each referral for its TTL, which is why the walk is fast for the second visitor and slow for the first.",
        svg: `
<svg viewBox="0 0 1100 290" role="img" aria-label="Delegation walk from the root server to the TLD to the authoritative nameserver">
  <rect class="box-a" x="30" y="60" width="220" height="80" rx="10"/>
  <text class="t-accent" x="140" y="94" text-anchor="middle" font-size="17">root</text>
  <text class="t-sm" x="140" y="122" text-anchor="middle">knows every TLD</text>

  <path class="ln-a" d="M250,100 L306,100" marker-end="url(#lm-arrow-accent)"/>
  <text class="t-xs" x="278" y="84" text-anchor="middle" font-size="15">referral</text>

  <rect class="box-v" x="310" y="60" width="220" height="80" rx="10"/>
  <text class="t-violet" x="420" y="94" text-anchor="middle" font-size="17">.ro TLD</text>
  <text class="t-sm" x="420" y="122" text-anchor="middle">knows our NS</text>

  <path class="ln-a" d="M530,100 L586,100" marker-end="url(#lm-arrow-accent)"/>
  <text class="t-xs" x="558" y="84" text-anchor="middle" font-size="15">referral</text>

  <rect class="box-b" x="590" y="60" width="240" height="80" rx="10"/>
  <text class="t-bad" x="710" y="94" text-anchor="middle" font-size="17">ns.alexandrugris.ro</text>
  <text class="t-sm" x="710" y="122" text-anchor="middle">owns the zone</text>

  <path class="ln-ok" d="M830,100 L886,100" marker-end="url(#lm-arrow-ok)"/>

  <rect class="box-ok" x="890" y="60" width="180" height="80" rx="10"/>
  <text class="t-ok" x="980" y="94" text-anchor="middle" font-size="17">answer</text>
  <text class="t-sm" x="980" y="122" text-anchor="middle">AA=1, RA=0</text>
</svg>`
      },
      {
        type: "prose",
        h: "What a zone looks like, and the serial that gates everything",
        p: [
          "A zone is a text file <code>named</code> parses into an in-memory tree. One rule causes most mistakes: a name without a trailing dot is not fully qualified, so <code>www IN A 203.0.113.10</code> means <code>www.alexandrugris.ro.</code> — and a <code>CNAME</code> target typed without the dot silently becomes <code>target.alexandrugris.ro.alexandrugris.ro.</code>. <code>named-checkzone</code> catches it, which is why you never edit a zone file without running it first. <code>@</code> is shorthand for the current origin.",
          "The SOA needs four things right. <strong>MNAME</strong> is the primary hostname <em>with a trailing dot</em>, and it needs an address record or every secondary fails to transfer — the classic <code>AXFR failed: no address record</code>. <strong>RNAME</strong> is the responsible email with <code>@</code> replaced by a dot. Then the <strong>serial</strong> and four timers, conventionally <code>28800 3600 1209600 604800</code> — expire in 14 days and a negative TTL of a week, which is usually why a deleted record lingers. <code>rndc</code> talks to <code>named</code> on port 953 with the key in <code>/etc/bind/rndc.key</code>.",
          "The serial is the entire reload mechanism: newer wins, identical or lower means named logs <em>zone file unchanged: serial number unchanged</em> and loads nothing. A forgotten serial is the number one cause of a change that reloads successfully and serves the old data."
        ]
      },
      {
        type: "diagram",
        h: "Zone file to answer on the wire",
        caption: "Check, bump the serial, reload, and the in-memory tree is what answers. There is no disk read per query and no cache to expire, because the zone is resident. Secondaries loop the other way: NOTIFY from the primary when the serial changes, with SOA refresh polling as the fallback.",
        svg: `
<svg viewBox="0 0 1100 290" role="img" aria-label="Zone file on disk checked and reloaded into named memory which then answers queries">
  <rect class="box" x="30" y="60" width="220" height="80" rx="10"/>
  <text x="140" y="94" text-anchor="middle" font-size="17">db.alexandrugris.ro</text>
  <text class="t-sm" x="140" y="122" text-anchor="middle">on disk</text>

  <path class="ln-a" d="M250,100 L306,100" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="310" y="60" width="220" height="80" rx="10"/>
  <text class="t-violet" x="420" y="94" text-anchor="middle" font-size="17">check the serial</text>
  <text class="t-sm" x="420" y="122" text-anchor="middle">named-checkzone</text>

  <path class="ln-a" d="M530,100 L586,100" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-p" x="590" y="60" width="240" height="80" rx="10"/>
  <text class="t-bad" x="710" y="94" text-anchor="middle" font-size="17">named in memory</text>
  <text class="t-sm" x="710" y="122" text-anchor="middle">BIND 9.11.3</text>

  <path class="ln-ok" d="M830,100 L886,100" marker-end="url(#lm-arrow-ok)"/>

  <rect class="box-ok" x="890" y="60" width="180" height="80" rx="10"/>
  <text class="t-ok" x="980" y="94" text-anchor="middle" font-size="17">answer</text>
  <text class="t-sm" x="980" y="122" text-anchor="middle">in microseconds</text>

  <text class="t-bad" x="550" y="212" text-anchor="middle" font-size="15">serial unchanged, nothing loaded</text>
</svg>`
      },
      {
        type: "prose",
        h: "DNSSEC: chain of trust, no encryption",
        p: [
          "DNSSEC gives every answer a cryptographic signature and a chain back to a root key. The zone is signed with a ZSK, the KSK signs the DNSKEY set, and a hash of the KSK is published as a <code>DS</code> record in the <em>parent</em> zone — for your domain, typed into the registrar control panel. Every resolver walking the chain validates each signature, so a forged or modified answer is rejected as SERVFAIL instead of being cached and served.",
          "What it does not do is encrypt anything. Query and answer are plaintext on the wire; confidentiality needs DoT on port 853 or DoH, an RFC 8484 request body inside a normal HTTPS POST.",
          "Two operational warnings. A wrong <code>DS</code> record breaks everything, not just DNSSEC: if it does not match a key in your DNSKEY set, validating resolvers treat the whole zone as bogus and SERVFAIL every name in it. And DNSSEC breaks when the registrar is a different provider from the nameserver, because the delegation must be signed at every level you do not control. On BIND 9.11 signing is manual — <code>dnssec-keygen</code> then <code>dnssec-signzone</code> on every serial bump; BIND 9.18 changed the default to automatic online signing with a <code>dnssec-policy</code>.",
          "What signing buys is the end of cache poisoning and response spoofing — the class of attack where a forged answer is injected into a recursive resolver's cache and every visitor gets redirected. It does not hide queries, protect the server from being overwhelmed or strengthen TLS trust."
        ]
      },
      {
        type: "diagram",
        h: "The chain of trust",
        caption: "Trust starts at the root key and walks down. Each zone is signed by a ZSK, the KSK signs the DNSKEY set, and a hash of the KSK sits in the parent's <code>DS</code>. Break any link and every validating resolver answers SERVFAIL rather than serving a forged answer.",
        svg: `
<svg viewBox="0 0 1100 320" role="img" aria-label="DNSSEC chain from the root trust anchor down through the DS record to the zone signing key">
  <rect class="box-ok" x="30" y="50" width="200" height="80" rx="10"/>
  <text class="t-ok" x="130" y="84" text-anchor="middle" font-size="17">root key</text>
  <text class="t-sm" x="130" y="112" text-anchor="middle">the trust anchor</text>

  <path class="ln-a" d="M230,90 L286,90" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="290" y="50" width="200" height="80" rx="10"/>
  <text class="t-violet" x="390" y="84" text-anchor="middle" font-size="17">parent DS</text>
  <text class="t-sm" x="390" y="112" text-anchor="middle">a hash, in the parent</text>

  <path class="ln-a" d="M490,90 L546,90" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-p" x="550" y="50" width="200" height="80" rx="10"/>
  <text class="t-bad" x="650" y="84" text-anchor="middle" font-size="17">KSK signs DNSKEY</text>
  <text class="t-sm" x="650" y="112" text-anchor="middle">your key, at the registrar</text>

  <path class="ln-a" d="M750,90 L806,90" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box" x="810" y="50" width="260" height="80" rx="10"/>
  <text x="940" y="84" text-anchor="middle" font-size="17">ZSK signs the zone</text>
  <text class="t-sm" x="940" y="112" text-anchor="middle">every record gets an RRSIG</text>

  <path class="ln-b" d="M940,130 L940,196" marker-end="url(#lm-arrow-bad)"/>

  <rect class="box-w" x="620" y="200" width="450" height="60" rx="10"/>
  <text class="t-warn" x="845" y="237" text-anchor="middle" font-size="17">resolver validates — or SERVFAIL</text>

  <text class="t-bad" x="300" y="237" font-size="15">a wrong DS</text>
  <text class="t-bad" x="300" y="261" font-size="15">breaks the zone</text>
</svg>`
      },
      {
        type: "diagram",
        h: "Symptom to layer",
        caption: "Each symptom has exactly one first check. Start at the layer closest to the symptom and work outward — almost always the answer is a cache, and <code>resolvectl flush-caches</code> costs nothing. The exception is a <code>SERVFAIL</code> on a DNSSEC-signed zone: that is the <code>DS</code> record or a broken signature, not a cache.",
        svg: `
<svg viewBox="0 0 1100 290" role="img" aria-label="Four DNS symptoms each mapped to the layer to check first">
  <rect class="box-b" x="30" y="40" width="230" height="66" rx="10"/>
  <text class="t-bad" x="145" y="80" text-anchor="middle" font-size="17">stale answer</text>

  <path class="ln-a" d="M260,73 L306,73" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box" x="310" y="40" width="230" height="66" rx="10"/>
  <text x="425" y="80" text-anchor="middle" font-size="17">a cache, somewhere</text>

  <rect class="box-w" x="30" y="126" width="230" height="66" rx="10"/>
  <text class="t-warn" x="145" y="166" text-anchor="middle" font-size="17">wrong here only</text>

  <path class="ln-a" d="M260,159 L306,159" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box" x="310" y="126" width="230" height="66" rx="10"/>
  <text x="425" y="166" text-anchor="middle" font-size="17">routing domain</text>

  <rect class="box-v" x="600" y="40" width="230" height="66" rx="10"/>
  <text class="t-violet" x="715" y="80" text-anchor="middle" font-size="17">my edit is not live</text>

  <path class="ln-a" d="M830,73 L876,73" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box" x="880" y="40" width="190" height="66" rx="10"/>
  <text x="975" y="80" text-anchor="middle" font-size="17">the serial</text>
</svg>`
      },
      {
        type: "table",
        cols: ["Cache layer", "How to bypass it", "TTL reality"],
        rows: [
          ["Browser", "a fresh or private window; Firefox <code>network.trr.mode</code> shows if DoH is on", "Chrome's DNS cache can outlive the record TTL under load, and the HTTP cache is a separate source of stale pages."],
          ["<code>systemd-resolved</code>", "<code>resolvectl flush-caches</code>", "Honours the record TTL, applies its own floor for some types, keeps negative answers per the SOA minimum."],
          ["Recursive resolver", "<code>dig +trace</code>", "Bounded by the TTL in the response. Some resolvers ignore very low TTLs; 60&nbsp;s is not a guarantee."],
          ["Authoritative, yours", "<code>dig @ns1.alexandrugris.ro</code>", "Not a cache at all — the zone is resident. Reloads are gated by the serial, not by a timer."]
        ]
      },
      {
        type: "callout",
        kind: "boss",
        title: "mental model to keep",
        text: "Three caches and a signed hierarchy, in a fixed order: <code>/etc/hosts</code>, then the resolved cache on <code>127.0.0.53</code>, then the recursive resolver, then the authoritative answer. Every <em>wrong answer</em> is a claim about which one you asked. Change one layer at a time, and query it by name."
      }
    ],
    takeaways: [
      "<code>/etc/resolv.conf</code> is generated and owned by systemd-resolved. Persistent changes belong in <code>/etc/systemd/resolved.conf</code>.",
      "glibc does not do DNS; it walks <code>/etc/nsswitch.conf</code>. On glibc 2.26+ the <code>resolve</code> module talks to <code>127.0.0.53</code> directly, which is why split-DNS routing domains work at all.",
      "<strong>AA</strong> and <strong>RA</strong> identify the server: AA=1 RA=0 is authoritative, AA=0 RA=1 is a cache. <strong>TC=1</strong> means retry over TCP.",
      "Authoritative-only is correct for a primary, and the serial is the entire reload mechanism — a forgotten serial is the number one cause of a change that serves old data."
    ],
    glossary: {
      "stub resolver": "A resolver that does no recursion itself — systemd-resolved on 127.0.0.53 — but caches and applies search domains.",
      "NSS": "glibc Service Switch: the ordered modules in /etc/nsswitch.conf consulted per service, e.g. files, myhostname, dns, resolve.",
      "routing domain": "A suffix bound to a specific resolver in systemd-resolved. The mechanism behind split DNS.",
      "referral": "A non-authoritative answer containing NS records for the next zone down. AA=0 is correct for a referral, not an error.",
      "NXDOMAIN": "RCODE 3 — the name itself does not exist, cached using the SOA minimum of the closest enclosing zone.",
      "NODATA": "NOERROR with an empty answer section — the name exists but has no records of the requested type.",
      "serial": "A number in the SOA compared on reload. Newer wins; identical or lower means named logs zone file unchanged and does nothing."
    }
  });
})();