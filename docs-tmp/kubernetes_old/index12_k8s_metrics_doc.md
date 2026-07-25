# Metrics

## kubernetesのMetrics監視

kubernetesのメトリクスは3種類の情報源があります。

| 発生源 | 何を計測するか | 代表的な収集ツール |
|---|---|---|
| cAdvisor | コンテナ単位のリソース使用量 | kubelet内蔵→metrics-server, Prometheus |
| node-exporter | Node自体のメトリクス | Prometheus(DaemonSetとして配置) |
| kube-state-metrics | Kubernetesオブジェクトの「状態」 | Prometheus |

### cAdvisor

cAdvisor(kubelet内蔵)は、Node上の各コンテナのリソース使用量を収集します。
kubeletがその値を /metrics/resource として公開しています。
metrics-serverが全NodeのkubeletをPollして集約し、metrics.k8s.io というAPIServiceとして公開
kubectl top / HPAがこのAPIを参照します。

※metrics-serverはKubernetesクラスタの各Nodeからリソース使用量(CPU/メモリ)を集約し、metrics.k8s.io というAPIServiceとしてKubernetes APIに公開する、軽量なコンポーネントです。

### node-exporter

node-exporterは、Node自体のハードウェア・OSレベルのメトリクスを収集し、Prometheus形式で公開するエージェントです。

Prometheus本体には含まれず別コンポーネントとして提供されているため、kubernetes単体では閲覧することができません。
メトリクスを閲覧するには、Prometheusを別途用意する必要があります。

あるいは、Kubernetes API経由で見たい場合はPrometheus Adapterを使い、APIServiceとして再公開する必要があります。

### kube-state-metrics

Kubernetesオブジェクトの「望ましい状態(spec)」と「現在の状態(status)」を、Kubernetes APIから読み取ってPrometheus形式のメトリクスとして公開するコンポーネントです。

情報自体は`kubectl get deployment` や `kubectl describe pod`で個別には確認できます。
ただし、これらを継続的に監視し、閾値超過でアラートを出したり、時系列で推移を見たりするには、Prometheusで扱える形(メトリクス)にする必要があります。kube-state-metricsはその変換役を担います。

## GKEのMetrics

GKEの場合、2つのメトリクス取得方式があります。

| 方式 | 位置づけ | 収集の主体 |
|---|---:|---|
| GKE組込 | 常にオン。設定不要 | GKEが管理する`gke-metrics-agent` |
| Managed Service for Prometheus(GMP) | Prometheus互換。Google管理 | `gmp-operator`(GKEにデフォルト同梱) |


### GKE組込メトリクス

GKEクラスタを作成すると、追加設定なしで自動的に有効になる監視です。
各Nodeで動くgke-metrics-agentというDaemonSetが、kubeletのcAdvisor相当の情報や、GKEコントロールプレーン自体のメトリクスを収集し、Cloud Monitoringにkubernetes.io/というプレフィックスのメトリクスとして送信します。

※前段で説明した「metrics-server(metrics.k8s.io)」とは別経路となるため、クラスタ内のKubernetes APIには公開されません。(Cloud Monitoring側でのみ閲覧可能)
※kubectl topはこのSystem Metricsではなく、あくまでmetrics-server(metrics.k8s.io)を見ています。

### GMPメトリクス

GMPのManaged Collectionには、kubelet/cAdvisorのCPU/メモリをPrometheus形式で自動収集するプリセットが含まれているため、PodMonitoringを1つも書かなくてもcontainer_cpu_usage_seconds_total等はGMP側でも取得できます。


### GKEメトリクス一覧

#### GKE組込

| カテゴリ | メトリクス例 | 内容 |
|---|---|---|
| Container | `kubernetes.io/container/cpu/core_usage_time` | コンテナのCPU使用時間 |
| Container | `kubernetes.io/container/memory/used_bytes` | コンテナのメモリ使用量 |
| Container | `kubernetes.io/container/restart_count` | コンテナの再起動回数 |
| Pod | `kubernetes.io/pod/network/received_bytes_count` | Podのネットワーク受信量 |
| Pod | `kubernetes.io/pod/network/sent_bytes_count` | Podのネットワーク送信量 |
| Pod | `kubernetes.io/pod/volume/utilization` | Podがマウントするボリュームの使用率 |
| Node | `kubernetes.io/node/cpu/allocatable_utilization` | NodeのCPU割当可能量に対する使用率 |
| Node | `kubernetes.io/node/memory/allocatable_utilization` | Nodeのメモリ割当可能量に対する使用率 |
| Node | `kubernetes.io/node/ephemeral_storage/used_bytes` | Nodeのエフェメラルストレージ使用量 |
| Control Plane | `kubernetes.io/anthos/apiserver_request_total` | kube-apiserverへのリクエスト数 |
| Control Plane | `kubernetes.io/anthos/scheduler_pending_pods` | スケジュール待ちPod数 |
| Control Plane | `kubernetes.io/anthos/etcd_server_has_leader` | etcdのリーダー有無 |

#### GMPプリセット

| メトリクス | 内容 |
|---|---|
| `container_cpu_usage_seconds_total` | コンテナのCPU使用量(累積秒数) |
| `container_memory_working_set_bytes` | コンテナのメモリ使用量(Working Set) |
| `container_memory_usage_bytes` | コンテナのメモリ使用量(合計) |
| `container_network_receive_bytes_total` | コンテナのネットワーク受信バイト数(累積) |
| `container_network_transmit_bytes_total` | コンテナのネットワーク送信バイト数(累積) |
| `container_fs_usage_bytes` | コンテナのファイルシステム使用量 |
| `kubelet_running_pods` | Node上で稼働中のPod数(kubelet自身のメトリクス) |



