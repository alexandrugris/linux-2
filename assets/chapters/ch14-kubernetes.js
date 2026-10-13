/* ch14 — Kubernetes behind the scenes — SIMPLIFIED EDITION
   Prose 2535 -> ~760 words. Code 168 -> ~65.
   All 4 diagrams redrawn: viewBox 280-320 (was 600-740),
   4-6 boxes each (was 10-19), labels of 2-5 words, <=14 text nodes.
   One idea per diagram: the control plane, the pod's path, the loop,
   and the fact that a ClusterIP is a firewall rule. */
(function () {
  LX.push({
    id: "kubernetes",
    title: "Kubernetes behind the scenes",
    tagline: "A reconciliation engine over etcd, with an HTTP API in front and one agent on every node doing the actual work. Every feature you use is a loop; every bug is a loop that disagrees.",
    sections: [
      {
        type: "prose",
        h: "Strip away the marketing",
        p: [
          "Kubernetes is three things in order: a <strong>strongly-typed key-value store</strong> (etcd), an <strong>HTTP API</strong> in front that validates everything, and a <strong>set of reconciliation loops</strong> that read desired state from it and write the world until it matches. Scheduling, self-healing, rolling updates and service discovery are the same loop with a different comparison. Nothing is ever “set”; everything is reconciled — which explains why deleting a pod by hand does nothing, and why a pod can be <code>Running</code> and receive no traffic."
        ]
      },
      {
        type: "diagram",
        h: "The whole system on one node",
        caption: "Everything in the top row is stateless and replicated — run three or five apiservers. Everything below is per-node, runs as <b>root</b>, and is where the cluster touches your Linux machine. That lower set is your real attack surface.",
        svg: `
<svg viewBox="0 0 1100 320" role="img" aria-label="Control plane above, per-node components below">
  <rect class="box-v" x="30" y="24" width="1040" height="112" rx="12"/>
  <text class="t-violet" x="50" y="50" font-size="17">CONTROL PLANE</text>
  <text class="t-sm" x="50" y="78">kube-apiserver :6443</text>
  <text class="t-xs" x="50" y="102">the only writer to etcd</text>
  <text class="t-sm" x="380" y="78">scheduler, controller-manager</text>
  <text class="t-sm" x="780" y="78">etcd :2379 / :2380</text>

  <path class="ln-a" d="M550,136 L550,176" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-a" x="30" y="182" width="330" height="112" rx="10"/>
  <text class="t-accent" x="50" y="210" font-size="17">kubelet :10250</text>
  <text class="t-xs" x="50" y="236">watches pods assigned here</text>
  <text class="t-xs" x="50" y="258">runs CNI, pulls, probes</text>

  <rect class="box-b" x="400" y="182" width="330" height="112" rx="10"/>
  <text class="t-bad" x="420" y="210" font-size="17">containerd + shims</text>
  <text class="t-xs" x="420" y="236">namespaces, cgroups, overlay</text>

  <rect class="box-w" x="770" y="182" width="300" height="112" rx="10"/>
  <text class="t-warn" x="790" y="210" font-size="17">CNI + kube-proxy</text>
  <text class="t-xs" x="790" y="236">veth, IP, DNAT rules</text>
  <text class="t-xs" x="790" y="258">see chapter 13</text>

  <text class="t-dim" x="550" y="322" text-anchor="middle" font-size="15">everything below the line runs as root — that set is your real attack surface</text>
</svg>`
      },
      {
        type: "prose",
        h: "The apiserver is the only door",
        p: [
          "Every read and write goes through <code>kube-apiserver</code> — controllers, schedulers, kubelets, CI, <code>kubectl</code>. Nothing touches etcd except the apiservers, and that is what makes authorisation, validation and auditing tractable in one place instead of five. A write passes four gates: <strong>authentication</strong> (client cert or bearer token); <strong>authorisation</strong> (RBAC decides whether that identity may do that verb on that resource in that namespace); <strong>admission</strong> (mutating webhooks may rewrite the object, which is how a service mesh injects its sidecar); then <strong>persistence</strong> with a new <code>resourceVersion</code>. Watches make reconciliation cheap: a controller asks to be told when anything changes and receives a stream."
        ]
      },
      {
        type: "diagram",
        h: "One pod, from YAML to a running process",
        caption: "The apiserver is involved at <b>every</b> step — kubelet reports status back through it rather than to the scheduler, whose only output is one field written into the pod object.",
        svg: `
<svg viewBox="0 0 1100 300" role="img" aria-label="Pod lifecycle from kubectl apply to running container">
  <rect class="box-v" x="30" y="40" width="180" height="76" rx="10"/>
  <text class="t-sm" x="120" y="70" text-anchor="middle" font-size="16">kubectl apply</text>
  <text class="t-xs" x="120" y="94" text-anchor="middle">no nodeName yet</text>

  <path class="ln-a" d="M210,78 L260,78" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="265" y="40" width="180" height="76" rx="10"/>
  <text class="t-sm" x="355" y="70" text-anchor="middle" font-size="16">apiserver</text>
  <text class="t-xs" x="355" y="94" text-anchor="middle">stored, Pending</text>

  <path class="ln-a" d="M445,78 L495,78" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-a" x="500" y="40" width="180" height="76" rx="10"/>
  <text class="t-accent" x="590" y="70" text-anchor="middle" font-size="16">scheduler</text>
  <text class="t-xs" x="590" y="94" text-anchor="middle">writes nodeName</text>

  <path class="ln-a" d="M680,78 L730,78" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-ok" x="735" y="40" width="180" height="76" rx="10"/>
  <text class="t-ok" x="825" y="70" text-anchor="middle" font-size="16">kubelet</text>
  <text class="t-xs" x="825" y="94" text-anchor="middle">reconciles it</text>

  <rect class="box-p" x="30" y="146" width="1040" height="70" rx="10"/>
  <text class="t-bad" x="50" y="172" font-size="16">the four CRI calls, in order</text>
  <text class="t-sm" x="50" y="198">RunPodSandbox → CNI ADD → CreateContainer × N → StartContainer × N, then probes forever</text>

  <rect class="box-b" x="30" y="236" width="500" height="58" rx="10"/>
  <text class="t-bad" x="50" y="260" font-size="15">Running but not Ready</text>
  <text class="t-xs" x="50" y="282">no traffic, no error, no log line</text>

  <rect class="box-w" x="560" y="236" width="510" height="58" rx="10"/>
  <text class="t-warn" x="580" y="260" font-size="15">Pending forever</text>
  <text class="t-xs" x="580" y="282">the scheduler never assigned it — check requests</text>
</svg>`
      },
      {
        type: "diagram",
        h: "Everything is a loop",
        caption: "Same shape every time: watch objects of kind A, compare to objects of kind B, write a correction. The <b>owner reference</b> is how deletion propagates, and why manually deleting a stuck pod does nothing — its controller immediately makes another.",
        svg: `
<svg viewBox="0 0 1100 280" role="img" aria-label="Reconciliation loop watching, comparing and correcting">
  <rect class="box-v" x="30" y="40" width="280" height="90" rx="10"/>
  <text class="t-violet" x="170" y="78" text-anchor="middle" font-size="17">watch</text>
  <text class="t-xs" x="170" y="104" text-anchor="middle">desired state, from etcd</text>

  <path class="ln-a" d="M310,85 L370,85" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-a" x="375" y="40" width="280" height="90" rx="10"/>
  <text class="t-accent" x="515" y="78" text-anchor="middle" font-size="17">compare</text>
  <text class="t-xs" x="515" y="104" text-anchor="middle">desired against observed</text>

  <path class="ln-a" d="M655,85 L715,85" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-ok" x="720" y="40" width="280" height="90" rx="10"/>
  <text class="t-ok" x="860" y="78" text-anchor="middle" font-size="17">correct</text>
  <text class="t-xs" x="860" y="104" text-anchor="middle">write, wait, repeat</text>

  <path class="ln dash" d="M860,130 L860,160 L170,160 L170,134" marker-end="url(#lm-arrow)"/>

  <rect class="box-b" x="30" y="186" width="1040" height="76" rx="10"/>
  <text class="t-bad" x="50" y="212" font-size="16">three loops that explain most of Kubernetes</text>
  <text class="t-sm" x="50" y="238">Deployment → ReplicaSet → Pod · kubelet: pod.spec → run it · endpoints: Ready pods → ClusterIP rules</text>
  <text class="t-xs" x="50" y="256">the garbage collector is the loop that makes ownerReference real</text>
</svg>`
      },
      {
        type: "prose",
        h: "Scheduling, requests, and the QoS rule that decides who dies first",
        p: [
          "The scheduler runs two phases. <strong>Filtering</strong> removes nodes that cannot run the pod: not enough allocatable CPU or memory against the pod's <em>requests</em>, a taint with no matching toleration, a nodeSelector that does not match, a volume that cannot attach there. <strong>Scoring</strong> ranks the survivors and the highest wins. If nothing survives the pod stays <code>Pending</code> and the reason lands in <code>pod.status.conditions</code>.",
          "<strong>Requests are the unit of accounting</strong>: the CPU share and memory floor the scheduler reserves. A limit is the ceiling the kernel enforces. The kubelet derives the <strong>QoS class</strong> from those two numbers, and QoS decides eviction order under memory pressure — deterministic, not random. <strong>Guaranteed</strong> (every container sets requests == limits for both CPU and memory) is evicted last. <strong>Burstable</strong> goes second, ranked by usage above request. <strong>BestEffort</strong> — no requests and no limits anywhere, easy to create by omission — always goes first."
        ]
      },
      {
        type: "prose",
        h: "Networking: three things that are frequently confused",
        p: [
          "<strong>Pod networking</strong> is the flat overlay giving every pod an IP from its node's pod CIDR. Kubernetes does not implement it — it delegates to a <strong>CNI plugin</strong>, invoked as a binary with <code>ADD</code>/<code>DEL</code> and a netns path, returning JSON that becomes <code>pod.status.podIP</code>.",
          "<strong>Service networking</strong> is a virtual IP load-balancing to N pods. A Service gets a ClusterIP from the service CIDR (default <code>10.96.0.0/12</code>) that nothing answers on directly — it is intercepted. <strong>Ingress</strong> is not a fourth thing: an ingress controller is just another controller writing more netfilter rules, and none of these terminate TLS by default.",
          "<strong>Storage</strong> is three nouns. A <strong>PV</strong> is storage that exists. A <strong>PVC</strong> is a request: this much space, this StorageClass. A <strong>StorageClass</strong> is a named provisioning policy saying which CSI driver to ask. Binding is a handshake — the PV controller finds a matching PV or asks the driver to <code>CreateVolume</code>, then the kubelet calls <code>NodePublishVolume</code>, the call that bind-mounts into the container."
        ]
      },
      {
        type: "diagram",
        h: "A ClusterIP is a firewall rule, not an address",
        caption: "The kube-proxy chain top to bottom. Because these live in <b>nat</b> before any <b>filter</b> rule runs, container traffic appears to ignore your firewall — the same trap as chapters 13 and 15, with cluster IP ranges bolted on.",
        svg: `
<svg viewBox="0 0 1100 290" role="img" aria-label="kube-proxy chain turning a ClusterIP into a pod IP">
  <rect class="box-w" x="30" y="40" width="200" height="76" rx="10"/>
  <text class="t-warn" x="130" y="82" text-anchor="middle" font-size="16">to 10.96.14.22:80</text>

  <path class="ln-a" d="M230,78 L275,78" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-a" x="280" y="40" width="200" height="76" rx="10"/>
  <text class="t-accent" x="380" y="82" text-anchor="middle" font-size="16">KUBE-SVC</text>

  <path class="ln-a" d="M480,78 L525,78" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-v" x="530" y="40" width="230" height="76" rx="10"/>
  <text class="t-violet" x="645" y="82" text-anchor="middle" font-size="16">KUBE-SEP</text>

  <path class="ln-a" d="M760,78 L805,78" marker-end="url(#lm-arrow-accent)"/>

  <rect class="box-ok" x="810" y="40" width="260" height="76" rx="10"/>
  <text class="t-ok" x="940" y="82" text-anchor="middle" font-size="16">DNAT to pod IP</text>
  <text class="t-xs" x="940" y="104" text-anchor="middle">conntrack pins the connection</text>

  <rect class="box-b" x="30" y="146" width="500" height="110" rx="10"/>
  <text class="t-bad" x="50" y="172" font-size="16">ClusterIP</text>
  <text class="t-xs" x="50" y="196">NodePort — a port on every node</text>
  <text class="t-xs" x="50" y="218">LoadBalancer — a public IP</text>
  <text class="t-xs" x="50" y="240">none of these terminate TLS</text>

  <rect class="box-w" x="560" y="146" width="510" height="110" rx="10"/>
  <text class="t-warn" x="580" y="172" font-size="16">Running is not serving</text>
  <text class="t-xs" x="580" y="198">kube-proxy watches EndpointSlices, not</text>
  <text class="t-xs" x="580" y="220">pods. A Running-but-not-Ready pod gets</text>
  <text class="t-xs" x="580" y="242">no traffic and no error anywhere.</text>
</svg>`
      },
      {
        type: "prose",
        h: "Workloads and probes",
        p: [
          "<strong>Deployment</strong> is stateless replicas behind a selector, with rolling updates bounded by <code>maxSurge</code> and <code>maxUnavailable</code>. <strong>StatefulSet</strong> adds a stable identity per replica — ordinal names, ordered start, a stable volume claim each — which is what makes databases possible.",
          "The three probes are different and mixing them up is a classic self-inflicted outage: <strong>liveness</strong> failure <em>restarts the container</em>; <strong>readiness</strong> failure only <em>removes it from endpoints</em>; <strong>startup</strong> suppresses both until boot completes. A liveness probe that checks a dependency turns a dependency outage into a cluster-wide restart storm."
        ]
      },
      {
        type: "code",
        lang: "bash",
        what: "kubectl, in the order that answers what is wrong",
        code:
`kubectl get pods -o wide --field-selector=status.phase=Pending
kubectl describe pod <pod>        # Events at the bottom are the answer
kubectl logs pod/<pod> --previous  # the crash behind CrashLoopBackOff
kubectl diff -f ./manifests/ -R   # what would change, before it changes
kubectl rollout undo deploy/web
# on the node, as root:
journalctl -u kubelet -f ; journalctl -u containerd -f ; crictl ps -a`
      },
      {
        type: "callout",
        kind: "tip",
        title: "The one-paragraph mental model to keep",
        text: "etcd holds <b>what you asked for</b>. The apiserver is the only thing that validates and writes it. Controllers turn <b>object graphs</b> into other objects. The scheduler writes <b>one field</b> into a pod. The kubelet is the <b>executor</b>, and it talks to containerd through CRI, never to the scheduler. Every one of those is a loop with a timer and a retry. <b>Debug Kubernetes by asking which loop is wrong, not which object is wrong.</b>"
      }
    ],
    takeaways: [
      "Kubernetes is <strong>reconciliation loops over etcd</strong> behind an API server. Every feature is the same loop with a different comparison.",
      "The apiserver is the only writer to etcd, and the scheduler's only output is <code>spec.nodeName</code> on a pod.",
      "<strong>Sandbox vs container</strong> is what makes pods click: the sandbox owns the netns, IPC and cgroup plus the pause container.",
      "Running ≠ Ready ≠ serving traffic. Traffic follows EndpointSlices, so a Running-but-not-Ready pod is invisible with no error anywhere.",
      "A Service is <strong>netfilter rules written by kube-proxy</strong>. Delete kube-proxy and the ClusterIP becomes a dead address."
    ],
    glossary: {
      "apiserver": "The only component that writes to etcd. Everything talks to it over HTTPS on :6443.",
      "etcd": "Raft-replicated key-value store holding all cluster state. Back up with etcdctl snapshot save.",
      "watch / informer": "The client pattern turning a list into a live event stream. Every controller uses one.",
      "pod sandbox": "The shared namespaces for a pod: netns, IPC, mount of /etc/hosts, cgroup parent, and a pause container.",
      "kube-proxy": "Watches Services and EndpointSlices and programs iptables/eBPF so a ClusterIP load-balances to ready pods.",
      "ownerReference": "The parent link between objects. The garbage collector uses it so deleting a Deployment removes its pods."
    }
  });
})();