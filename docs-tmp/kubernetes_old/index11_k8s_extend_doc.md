# extend

Kubernetesは「拡張できるように設計されたプラットフォーム」です。
以下のような拡張があります。

| 拡張ポイント | 何を拡張するか | 例 |
|---|---|---|
| Operator | CRD+Controllerをセットにして、特定アプリの運用を自動化 | cert-manager, Postgres Operator |
| Admission Webhook | リソース作成・更新時のリクエストを検証・改変 | Istioのサイドカー自動注入、Podのラベル強制付与 |
| APIService(Aggregated API) | APIサーバー自体を拡張(独自APIサーバーを合体) | metrics.k8s.io(metrics-server) |
| Custom Scheduler / Scheduler Extender | Podをどのノードに配置するかのロジックを拡張 | GPU割当を考慮した独自スケジューラ |
| CNI/CSI/CRI | ネットワーキング/ストレージ/コンテナランタイム拡張 | Calico/クラウドドライバ/containerd |
| Device Plugin | ノードのハードウェア(GPU等)を拡張 | NVIDIA GPU device plugin |

## Operator

k8sには本来ステートレスアプリを基本としています。
しかし、実際には以下のようなスト―トフルな運用が必要になってきます。

* PostgreSQLの「フェイルオーバー」「バックアップ」「マスタ昇格」
* Kafkaの「ブローカー追加時のリバランス」
* 証明書の「有効期限が切れる前に更新」

これらのステートフルな運用作業は、標準のk8sリソースでは表現できません。
そこで、CRDで専用の型を用意し、運用をプログラム（controller）として実装します。
このCRD+controllerのセットをOperatorと言います。

Kubernetesは「望ましい状態 (spec)」と「現在の状態 (status)」を常に比較し、差分があればそれを埋めるための操作(Pod作成・削除など)を実行します。
これを「宣言的な状態管理と制御ループ」と言います。
Deployment、Service、Node など、Kubernetesの標準リソースはすべてこの思想で動いています。

CRD/Operatorはこの概念の「拡張ポイント」になります。

Kubernetesが最初から知っている対象(Pod, Deploymentなど)は決まっていますが、実際の現場では「PostgreSQLをこう運用したい」「証明書をこう自動更新したい」のような、Kubernetesが知らない独自の対象を管理したくなります。

そこでCRD/Controllerという形で、Kubernetesの核心である「宣言的状態管理+制御ループ」という概念を、任意のドメインに拡張するための機構、というのがOperatorの本質です。

* CRD：「この新しい対象も、Kubernetesの流儀(spec/status)で管理していいですよ」という型の登録
* Controller：その新しい対象に対して、同じ制御ループを回すプログラムを自分で書く

## Admission Webhook

Kubernetes APIに対して リソースの作成・更新する直前に割り込んで、検証や改変を行う仕組みです。

* Validating Admission Webhook：リクエストを許可/拒否する(書き換えはしない)
* Mutating Admission Webhook：リクエストの中身を書き換える

Operatorはリソースが保存された後に非同期にコントロールする一方で、Admission Webhookはリソースが保存される前にリクエスト単位で同期的に動作します。

### 用途例（Admission Webhook）

* Istioのサイドカー自動注入
    Pod作成→（Mutating Webhook）→実際に保存されるPodにEnvoyのサイドカーコンテナが自動追加
* ラベル強制付与
    Pod作成→（Mutating Webhook）→実際に保存されるPodにラベルが自動付与
* ポリシー違反の拒否
    Pod作成→（Validating Webhook）→latestタグのイメージは禁止

### 実装（Admission Webhook）

Admission Webhookは、k8s標準の設定オブジェクト(MutatingWebhookConfiguration / ValidatingWebhookConfiguration)を作るだけで、実際の判定ロジックはPod＋Service等で自分でHTTPサーバを立てて実装します。
つまり、「Webhookの設定を書き込む場所(Configuration)はKubernetes標準機能として最初から用意されており、独自拡張しているのはその先で呼ばれる判定ロジックの中身」となります。

## API Service

CRDより自由度高くKubernetes APIを拡張する仕組みです。
CRDが「既存のapiserverに型を追加登録する」のに対し、APIServiceは自分で丸ごと別のAPIサーバを実装し、Kubernetes本体のAPIサーバに"合体"させる方式です。

### 用途例（API Service）

* metrics.k8s.io（metrics-server）：`kubectl top pod/node`が使うCPU/メモリ使用量API
* custom.metrics.k8s.io（Prometheus Adapter、等）：HPA(オートスケール)がPrometheusの任意メトリクスを参照するためのAPI
* external.metrics.k8s.io（各種Adapter）：クラスタ外部(SQSのキュー長など)のメトリクスをHPAで使うためのAPI

メトリクスは刻一刻と変化する値で、etcdに保存して管理するようなものではありません。
APIServiceなら「リクエストが来た瞬間にリアルタイムで値を計算して返す」という、CRD(etcd保存が前提)では実現できない挙動が可能です。

### 実装（API Service）

APIServiceというオブジェクトで「このAPIパスへのリクエストは、あっちのAPIサーバーに転送してね」とkube-apiserverに教えます。

```yaml
apiVersion: apiregistration.k8s.io/v1
kind: APIService
metadata:
  name: v1beta1.metrics.k8s.io
spec:
  service:
    name: metrics-server
    namespace: kube-system
  group: metrics.k8s.io
  version: v1beta1
  insecureSkipTLSVerify: true
  groupPriorityMinimum: 100
  versionPriority: 100
```

これにより `kubectl get --raw /apis/metrics.k8s.io/v1beta1`へのリクエストは、裏でmetrics-serverというPodに丸ごと転送されます。

## Custom Scheduler / Scheduler Extender

「どのPodをどのNodeに配置するか」を決めるロジックを拡張する仕組みです。
標準のKube-schedulerだけでは対応できない、特殊な配置ルールが必要な場合に使います。

* 方法1:スケジューラを丸ごと自作・置き換え（Custom Scheduler）
    Pod側で「このPodはこのSchedulerを使う」と指定し、標準のkube-schedulerとは別のスケジューラプログラムを丸ごと動かす方式です。
* 方法2:標準schedulerにWebhookで介入（Scheduler Extender）
    標準のkube-schedulerの判定プロセスの一部を、外部のHTTP Webhookに問い合わせて上書きさせる方式です。
* 方法3: Scheduling Framework Plugin※現在主流の方式
    kube-scheduler自体の内部にGoのプラグインとして直接組み込む方式です。
    Extenderより高速(HTTP通信が発生しない)で、現在推奨されている拡張方法です。

## CNI/CSI/CRI

Kubernetesの設計方針として「ネットワークやストレージ、コンテナランタイムの実現方法は環境によって全く異なる(オンプレ、クラウド、等)」ため、具体的な実装は差し替え可能にして、標準インターフェース(仕様)だけを決めるという形を取っています。

CRD/Operator/Admission Webhookが「Kubernetesの上に乗るアプリケーションレイヤの拡張」だったのに対し、CNI/CSI/CRIはKubernetesというプラットフォーム自体の基盤を構成するための拡張ポイントという、レイヤーの違いがあります。

### Podが起動するときの流れ

1. Pod作成リクエスト
1. [kube-scheduler] どのNodeに置くか決定
1. [kubelet] (対象Node上で) Podを起動する準備
    1. CRI → コンテナランタイムにコンテナ起動を指示(containerd/CRI-OがイメージPull → プロセス起動)
    1. CSI → PersistentVolumeをアタッチ・マウント(クラウドのディスクをNodeに接続 → Podにマウント)
    1. CNI  → Podにネットワークを設定(IPアドレス割当、ルーティング設定)
1. Podが実際に動き出す

3つともkubeletが仲介役となり、それぞれの標準インターフェース経由で外部プラグインを呼び出す、という共通パターンです。

### out-of-tree

いずれも元々はKubernetes本体(in-tree)に実装が直接組み込まれていましたが、「実装をKubernetes本体から切り離し、標準インターフェースだけを介して繋ぐ」という同じ進化を辿っています。

これにより、Kubernetes本体を更新しなくても、各社が独立してランタイム/ストレージ/ネットワークの実装を進化させられるというメリットが生まれています。

## Device Plugin

GPU・FPGA・InfiniBand NICなど、標準のKubernetesが理解できない特殊なハードウェアリソースを、Podに割り当てられるようにする拡張ポイントです。

Kubernetes標準では、Podが要求できるリソースは基本的にCPUとメモリだけです。
しかし実際にはKubernetesが元々知らない種類のハードウェアをPodに割り当てたい、というニーズがあります。
CPU/メモリのように「分割して割り当てる」ことが前提の仕組みでは対応できないため、専用の拡張ポイントとしてDevice Pluginが用意されています。

### 使い方

まるでCPU/メモリと同じ感覚で特殊ハードウェアを要求できるのがDevice Pluginの価値です。

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: gpu-training-job
spec:
  containers:
    - name: trainer
      image: tensorflow/tensorflow:latest-gpu
      resources:
        limits:
          nvidia.com/gpu: 1   # ← CPU/メモリと同じ書き方でGPUを要求できる
```

## GKEの代表的な拡張

| 拡張ポイント | GKEでの代表的な実装 | 内容 |
|---|---|---|
| CRD / Operator | Config Connector (KCC) | GCPリソースをKubernetes CRとして管理 |
| CRD / Operator | Managed Service for Prometheus | Prometheus互換メトリクス収集のOperator(`gmp-operator`) |
| CRD / Operator | Policy Controller | ポリシー強制Operator |
| CRD / Operator | Backup for GKE | バックアップ/リストアの自動化 |
| Admission Webhook | Binary Authorization | 署名されていないコンテナイメージのデプロイを拒否するValidating Webhook |
| Admission Webhook | Policy Controller | ポリシー違反をAdmission Webhookとして拒否(上記Operatorの実体) |
| APIService | metrics.k8s.io | `kubectl top`/HPA用の標準メトリクスAPI(GKEはデフォルトでmetrics-server有効) |
| APIService | Custom Metrics Stackdriver Adapter | Cloud Monitoringのメトリクスを`custom.metrics.k8s.io`としてHPAに供給 |
| Custom Scheduler / Extender | Kueue | バッチ/ML ジョブ向けのキューイング・ギャングスケジューリング(GoogleがOSSで開発・GKEでサポート) |
| CNI | GKE Dataplane V2 | Ciliumベースの独自CNI。eBPFで高速化、NetworkPolicyもネイティブ実装 |
| CSI | Compute Engine Persistent Disk CSI Driver | 永続ディスク(Persistent Disk)の提供 |
| CSI | Filestore CSI Driver | NFS(Filestore)をPodにマウント |
| CSI | Cloud Storage FUSE CSI Driver | GCSバケットをファイルシステムとしてPodにマウント |
| CRI | containerd | GKEノードの標準コンテナランタイム(Docker Engineは既に廃止済み) |
| Device Plugin | NVIDIA GPU Device Plugin | GPUノードプールでのGPU割当を自動管理(GKEがマネージドで提供) |
| Device Plugin | TPU Device Plugin | Cloud TPUをPodに割り当てる仕組み |

### Managed Service for Prometheus

Prometheus互換のメトリクス収集・保存・クエリを、サーバー運用なしでGKE上に実現するフルマネージドサービスです。

### アーキテクチャ

![GMP](index11_k8s_extend_image01.png)




### Policy Controller

OPA Gatekeeperをベースにした、ポリシー強制のOperatorです。
「latestタグ禁止」「特定ラベル必須」のようなガバナンスルールをCRDとして定義し、Admission Webhookとして違反リクエストを拒否します。

Policy ControllerはOperatorですが、「Operatorという手段を使ってAdmission Webhookという別の拡張ポイントを構築・運用管理しており、「Operator」と「Admission Webhook」という2つの拡張ポイントを両方兼ねている点がポイントです。

