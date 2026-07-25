# Extensibility

## CustomResourceDefinition（CRD）

CRDは、Kubernetesが標準で提供していない独自のリソース種別を定義するための仕組みです。CRDを作成すると、そのカスタムリソースはPodやDeploymentと同じように、`kubectl`やAPIサーバを通じて扱えるようになります。

|項目|概要|
|---|---|
|定義内容|カスタムリソースの名前（Kind）、スキーマ（どのようなフィールドを持つか）、バージョンなどを定義する|
|カスタムリソース（CR）|CRDによって定義された型に基づき、実際に作成される個々のリソースインスタンス|
|標準リソースとの違い|CRDはあくまで「データの型」を定義するだけであり、そのリソースが作成された際に何らかの処理（実際のインフラ操作など）を行いたい場合は、別途コントローラの実装が必要になる|

CRDにより、KubernetesのAPIサーバ・認証認可・etcdによる永続化といった基盤機能を再利用しながら、ドメイン固有の概念（例：「データベースクラスタ」「証明書」など）をKubernetesネイティブなリソースとして表現できます。

## Operatorパターン

Operatorパターンは、CRDと、それを監視して実際の処理を行う専用のコントローラを組み合わせることで、特定のアプリケーションの運用作業（インストール、バックアップ、障害復旧、アップグレードなど）を自動化する設計手法です。

|要素|役割|
|---|---|
|CRD|扱いたいアプリケーション固有の概念をリソースとして定義する（例：`PostgresCluster`）|
|カスタムコントローラ|CRDのリソースを監視し、あるべき状態と現在の状態の差分を検知して、実際の操作（Pod作成、バックアップ実行など）を行う|
|reconcileループ|Kubernetes標準のコントローラと同様、「現在の状態を確認 → あるべき状態と比較 → 差分を解消する操作を実行」というループを継続的に回す|

Operatorパターンは、いわば「人間の運用担当者が持つドメイン知識（このアプリケーションはこう障害復旧すべき、といった知見）を、コントローラのコードとして実装したもの」と捉えることができ、DBやメッセージキューなど、複雑な運用が必要なステートフルなアプリケーションでよく採用されます。

## Admission Controller

Admission Controllerは、APIサーバがリクエストを受け付けてetcdに永続化する直前に、リクエスト内容をチェック・変更するための仕組みです。認証・認可を通過した後、最終的な関門として機能します。

|種類|タイミング|役割|
|---|---|---|
|Mutating Admission Webhook|検証（Validating）より前|リクエストされたリソースの内容を書き換える（例：デフォルトのラベルやSidecarコンテナを自動的に注入する）|
|Validating Admission Webhook|Mutatingの後|リクエストされたリソースの内容が組織のポリシーに合致するかを検証し、合致しなければリクエストを拒否する（例：特定のラベルが必須、特権コンテナの禁止など）|

|代表的な用途|概要|
|---|---|
|Sidecarの自動注入|Service Mesh（Istioなど）が、Pod作成時にプロキシコンテナを自動的に追加する|
|ポリシー強制|OPA (Open Policy Agent) Gatekeeperなどを用いて、「特定のNamespaceではlatestタグのイメージを禁止する」といった組織のルールを機械的に強制する|

これらのWebhookは、組み込みのAdmission Controllerに加え、クラスタ管理者が独自に開発・追加できる拡張ポイントとして提供されています。

## API Aggregation

API Aggregationは、独自に実装したAPIサーバを、既存のKubernetes APIサーバと統合し、あたかも標準のAPIの一部であるかのように見せる仕組みです。

|項目|概要|
|---|---|
|APIService|どのAPIグループ・バージョンのリクエストを、どの拡張APIサーバに転送するかを定義するリソース|
|CRDとの違い|CRDが「既存のAPIサーバ（etcdへの保存含む）の仕組みをそのまま使う」簡易な拡張方法であるのに対し、API Aggregationは「独自のストレージ・独自のロジックを持つ完全に別のAPIサーバ」を後ろに配置できる、より柔軟だが実装コストの高い拡張方法|
|代表例|`metrics.k8s.io`（Metrics Serverが提供するAPI）は、API Aggregationの仕組みを利用して標準のKubernetes APIと統合されている|

CRDで足りる用途では実装コストの低いCRDが選ばれることが多く、独自の複雑なビジネスロジックやパフォーマンス要件がある場合にAPI Aggregationが採用される、という使い分けが一般的です。

## GKEでの特徴

GKEは、CRD/Operatorパターンの仕組みを応用し、GCPのリソース自体をKubernetesのマニフェストから管理できるようにする独自の拡張機能を提供しています。

|項目|概要|
|---|---|
|Config Connector（KCC）|Cloud SQLインスタンスやCloud Storageバケットなど、GCPのリソースをKubernetesのCRD（カスタムリソース）として定義し、`kubectl apply`で作成・管理できるようにするアドオン。「インフラのマニフェストとアプリケーションのマニフェストを同じ手法で管理する」ことを目的とする|
|Anthos Config Management|複数のGKEクラスタに対して、RBACやNetworkPolicyといった設定を、Gitリポジトリを起点として一元的に同期・強制するための仕組み（GitOpsのKubernetes版に近い位置づけ）|
|GKE Enterprise（旧Anthos）のアドオン群|Service Mesh（Istio相当）や、マルチクラスタ管理など、標準のKubernetes拡張機能（CRD、Admission Webhookなど）を土台に構築された上位レイヤの機能群|

Config Connectorは、CRDとOperatorパターンという標準的なKubernetesの拡張の仕組みを使って、「クラウドインフラの管理」までKubernetesの世界に統合してしまうという、GKEならではの応用例といえます。
