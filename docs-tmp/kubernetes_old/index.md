# kubenetes

Kubernetes（略称：K8s）は、コンテナ化されたアプリケーションのデプロイ・スケーリング・運用管理を自動化するコンテナオーケストレーションツールです。Googleが社内システム「Borg」の経験をもとに開発し、現在はCNCF（Cloud Native Computing Foundation）が管理するOSSとなっています。

## kubernetesの全体像

![overview](index00_k8s_overview.png)

## コンポーネント概要

### Control Plane（クラスタ管理）

| コンポーネント | 概要 |
|---|---|
| **kube-apiserver** | すべての操作の窓口。kubectlや他コンポーネントはここを通じてクラスタとやり取りする |
| **etcd** | クラスタの状態（あるべき構成情報）を保存するKVS（Key-Valueストア） |
| **controller-manager** | 各種コントローラーを動かし、現在の状態を「あるべき状態」に近づける |
| **kube-scheduler** | 新しいPodをどのNodeに配置するか決定する |
| **cloud-controller-manager** | AWSやGCPなど、クラウド基盤固有の処理（LBやストレージ連携など）を担当 |

### Node（Pod実行基盤）

| コンポーネント | 概要 |
|---|---|
| **kubelet** | 各Nodeで動作し、割り当てられたPodのコンテナを実際に起動・管理する |
| **kube-proxy** | 各Nodeで動作し、Service宛の通信を実Podへ転送するネットワークルール（iptables/IPVS）を管理 |

### トラフィック経路（外部アクセス）

| コンポーネント | 概要 |
|---|---|
| **Ingress** | HTTPパスやホスト名でルーティングするL7ロードバランサー |
| **Service** | PodグループへのアクセスをまとめるL4ロードバランサー |
| **Endpoint** | Serviceの背後にある実際のPodのIPアドレス一覧（EndpointSliceが現在の標準実装） |

### ワークロード（Podを生成する仕組み）

| コンポーネント | 概要 |
|---|---|
| **Deployment** | Podの望ましい状態を宣言的に定義するリソース |
| **ReplicaSet** | 指定数のPodを維持する仕組み（通常はDeploymentが自動生成） |
| **HorizontalPodAutoscaler (HPA)** | 負荷（CPU使用率など）に応じてReplica数を自動調整 |
| **DaemonSet** | 各Nodeに1つずつPodを配置する仕組み（ログ収集エージェントなどに利用） |
| **StatefulSet** | ステートフルなPod（順序性・固有ネットワークIDを持つ）を管理。DBなどに利用 |
| **CronJob** | 定期的なスケジュールでJobを起動する仕組み |
| **Job** | 一度限りのタスクを完了まで実行するリソース |
| **Pod** | コンテナの実行単位。Kubernetesにおける最小デプロイ単位 |

### 設定・機密情報

| コンポーネント | 概要 |
|---|---|
| **ConfigMap** | アプリの設定値（環境変数やファイル）を保持する独立リソース |
| **Secret** | パスワードやAPIキーなど機密情報を保持する独立リソース（Base64エンコード） |

### セキュリティ・アクセス制御

| コンポーネント | 概要 |
|---|---|
| **NetworkPolicy** | Pod間・Namespace間の通信を制御するルール |
| **ServiceAccount** | Podが利用するアカウント（人間ではなくアプリケーション用） |
| **Role** | Namespace内で許可される操作（権限）を定義 |
| **RoleBinding** | RoleをUser/Group/ServiceAccountに紐づける |
| **ClusterRole** | クラスタ全体レベルで許可される操作（権限）を定義 |
| **ClusterRoleBinding** | ClusterRoleをUser/Group/ServiceAccountに紐づける |
| **User** | 人のアカウント（Kubernetes自体はUserリソースを管理せず、外部認証基盤に依存） |
| **Group** | 権限付与対象をまとめるグループ |

### リソース管理

| コンポーネント | 概要 |
|---|---|
| **ResourceQuota** | Namespace単位でのリソース使用量の上限 |
| **LimitRange** | Pod/コンテナ単位でのリソース使用量の上限・デフォルト値 |

### ストレージ

| コンポーネント | 概要 |
|---|---|
| **Volume** | Pod内のコンテナがデータを保存・共有する領域。Pod削除で消える非永続ストレージ |
| **PersistentVolumeClaim (PVC)** | 永続ストレージの使用要求（利用者側が申請するリソース） |
| **PersistentVolume (PV)** | 実際に確保された永続ストレージの実体 |
| **StorageClass** | PVを動的に生成する際のテンプレート（クラウドのディスクタイプなどを指定） |

### Namespace（論理分割）

| Namespace | 概要 |
|---|---|
| **kube-system** | k8s本体のコンポーネント（apiserver, etcd, scheduler等）が動作する領域 |
| **kube-public** | 誰でも読める公開情報の置き場 |
| **kube-node-lease** | ノードの死活監視用Heartbeat情報の書き込み先 |
| **（ユーザ管理Namespace）** | ユーザーが作成する業務アプリ用の任意の領域 |
| **default** | Namespace未指定時に使われるデフォルトの領域 |

### その他

| コンポーネント | 概要 |
|---|---|
| **CustomResourceDefinition (CRD)** | Kubernetes標準にないカスタムリソースを定義する拡張の仕組み |

