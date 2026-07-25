# Architecture

## Control Plane構成要素（kube-apiserver, etcd, controller-manager, kube-scheduler, cloud-controller-manager）

Control Planeは、クラスタ全体の「あるべき状態」を管理し、実際の状態をそれに近づける役割を担うコンポーネント群です。

|コンポーネント|役割|
|---|---|
|kube-apiserver|全ての操作の窓口。kubectlや他のコンポーネント間の通信は必ずここを経由する。認証・認可・Admission制御を経て、リソースの状態をetcdに読み書きする|
|etcd|クラスタの構成情報・状態を保存する分散KVS（Key-Valueストア）。Kubernetesの「唯一の信頼できる情報源」であり、これが失われるとクラスタの状態情報自体が失われる|
|controller-manager|各種コントローラを1つのプロセスとしてまとめて実行する。現在の状態を「あるべき状態」に近づけるための調整ループ（reconcile loop）を回し続ける|
|kube-scheduler|新規作成されたPodを、どのNodeに配置するか決定する。リソース要求量、アフィニティ/アンチアフィニティ、Taintなどの条件を考慮する|
|cloud-controller-manager|AWSやGCPなど、クラウド基盤固有の処理（LoadBalancerの作成、ノードのライフサイクル管理、ストレージ連携など）を担当し、Kubernetes本体からクラウド依存のコードを分離する|

## Node構成要素（kubelet, kube-proxy, コンテナランタイム）

Nodeは、実際にPod（コンテナ）が稼働する実行基盤です。各Nodeには、Control Planeと連携するためのエージェント群が動作しています。

|コンポーネント|役割|
|---|---|
|kubelet|各Nodeで動作するエージェント。kube-apiserverと通信し、割り当てられたPodの仕様（PodSpec）に基づいてコンテナランタイムにコンテナの起動・停止を指示する。Podの状態を監視し、Control Planeに報告する役割も担う|
|kube-proxy|各Nodeで動作し、Service宛の通信を実際のPodへ転送するためのネットワークルール（iptablesやIPVS）を管理する|
|コンテナランタイム|実際にコンテナを起動・管理するソフトウェア。containerdやCRI-Oなど、CRI（Container Runtime Interface）に準拠した実装が使われる|

kubeletは、CRI（コンテナランタイムとのインターフェース）、CNI（ネットワークプラグインとのインターフェース）、CSI（ストレージプラグインとのインターフェース）という標準化されたインターフェースを通じて、各種プラグインと連携する設計になっています。

## クラスタの全体像とコンポーネント間の関係

Kubernetesクラスタは「宣言的な状態管理」という思想に基づいて動作します。ユーザはマニフェスト（YAML）で「あるべき状態」を宣言し、Control Planeがこれを実現し続けます。

|流れ|概要|
|---|---|
|1. ユーザがマニフェストを適用（kubectl apply）|kube-apiserverに対して、リソースのあるべき状態がリクエストされる|
|2. kube-apiserverが状態をetcdに保存|認証・認可・Admission Controllerのチェックを経た上で、リソース定義がetcdに永続化される|
|3. 各種コントローラが差分を検知|controller-manager内の各コントローラが、あるべき状態と現在の状態の差分を検知し、必要な操作（Podの作成など）をkube-apiserver経由で要求する|
|4. kube-schedulerがNodeを決定|未配置のPodに対して、適切なNodeを選定する|
|5. kubeletがコンテナを起動|割り当てられたNode上のkubeletが、実際にコンテナランタイムを通じてコンテナを起動する|

このように、各コンポーネントは中央集権的に制御し合うのではなく、いずれもkube-apiserverを介して間接的にやり取りする「疎結合な設計」になっている点がKubernetesアーキテクチャの特徴です。

## Namespaceによる論理分割

Namespaceは、1つの物理的なクラスタを、複数の仮想的なクラスタであるかのように論理分割する仕組みです。

|Namespace|概要|
|---|---|
|kube-system|Kubernetes本体のコンポーネント（一部のControl Planeコンポーネントや、CoreDNSなどのアドオン）が動作する領域|
|kube-public|認証なしで誰でも読み取り可能な、公開情報の置き場|
|kube-node-lease|各Nodeの死活監視用のHeartbeat情報（Leaseオブジェクト）が書き込まれる領域|
|default|Namespaceを指定せずにリソースを作成した場合に使われる、デフォルトの領域|
|（ユーザ定義Namespace）|ユーザが用途（チーム、環境、アプリケーションなど）に応じて自由に作成する領域|

Namespaceは、リソース名の衝突回避や、RBACによるアクセス制御・ResourceQuotaによるリソース制限の適用単位として利用されます。ただし、Node自体やPersistentVolumeのようにクラスタ全体で共有される一部のリソースは、Namespaceに属さない「クラスタスコープ」のリソースとして扱われます。

## GKEでの特徴

GKE（Google Kubernetes Engine）は、GCP上のマネージドKubernetesサービスです。自前でControl Planeを構築・運用する必要がなく、Googleが可用性・アップグレード・セキュリティパッチ適用を管理します。

|項目|概要|
|---|---|
|Control Planeの管理|kube-apiserver, etcdなどはGoogle側で完全に管理され、ユーザはそのVMやプロセスに直接アクセスできない（Autopilot/Standard共通）|
|Standardモード|Nodeの管理（VMのスペック、台数、Node Pool構成）をユーザ自身が行う。柔軟性が高い分、Node周りの運用負荷はユーザ側に残る|
|Autopilotモード|Node自体の管理もGoogleに委ね、ユーザはワークロード（Pod単位のリソース要求）のみを意識すればよい。Pod単位の課金モデルとなり、セキュリティ設定の一部（特権コンテナの禁止など）がデフォルトで強制される|
|Node Pool|同一の設定（マシンタイプ、ディスク種別など）を持つNodeの集合。用途に応じて複数のNode Poolを使い分けられる（例：GPU用Node Poolと汎用Node Poolを分離）|
|リージョン/ゾーンクラスタ|Control Planeやノードを単一ゾーンに配置する「ゾーンクラスタ」と、複数ゾーンにまたがって冗長化する「リージョンクラスタ」を選択できる|

新規にKubernetesを学ぶ・構築する場合、Control Planeの構築や証明書管理といった煩雑な作業をGKEが肩代わりしてくれるため、ワークロードの設計そのものに集中しやすくなります。
