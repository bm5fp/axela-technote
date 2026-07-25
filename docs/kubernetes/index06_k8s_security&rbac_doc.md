# Security&RBAC

## 認証（Authentication）

認証は、「誰が」APIサーバにリクエストを送っているかを確認するプロセスです。Kubernetes自体はユーザアカウントを管理するデータベースを持たず、外部の認証基盤に依存する設計になっています。

|認証方式|概要|
|---|---|
|クライアント証明書|kubectlでよく使われる方式。クライアント証明書のCN（Common Name）がユーザ名として扱われる|
|Bearer Token|OIDC（OpenID Connect）など、外部のIDプロバイダが発行したトークンを利用する|
|ServiceAccountトークン|Pod内のアプリケーションがAPIサーバにアクセスするための、Kubernetes自身が発行・管理するトークン|
|Webhook Token認証|外部の認証サービスにトークンの検証を委譲する|

認証を通過すると、リクエストには「ユーザ名」と「所属グループ」の情報が付与され、次の認可（Authorization）の判断材料として使われます。

## 認可（Authorization/RBAC）

認可は、認証されたユーザが「その操作を行ってよいか」を判断するプロセスです。KubernetesではRBAC（Role-Based Access Control）が標準的な認可方式として使われます。

|概念|概要|
|---|---|
|Rule|「どのリソースに対して」「どの操作（get, list, create, delete等）を」許可するかを定義する最小単位|
|Role|Namespace内で有効なRuleの集合|
|ClusterRole|クラスタ全体（または全Namespace横断）で有効なRuleの集合|

APIサーバは、リクエストされた「ユーザ（またはServiceAccount）」「操作」「対象リソース」の組み合わせが、割り当てられたRole/ClusterRoleのいずれかのRuleに合致するかを判定し、合致しなければリクエストを拒否します。デフォルトでは全ての操作が拒否される「ホワイトリスト方式」である点が特徴です。

## ServiceAccount

ServiceAccountは、人間のユーザではなく、Pod内で動作するアプリケーションがKubernetes APIにアクセスするためのアカウントです。

|項目|概要|
|---|---|
|デフォルトの挙動|Namespaceを作成すると`default`という名前のServiceAccountが自動作成され、明示的に指定しないPodはこれを利用する|
|トークンの自動マウント|PodにServiceAccountを紐づけると、対応するトークンが`/var/run/secrets/kubernetes.io/serviceaccount/`に自動マウントされる|
|最小権限の原則|アプリケーションごとに専用のServiceAccountを作成し、必要最小限の権限だけをRoleBindingで付与することが推奨される|

CI/CDパイプラインや、クラスタ内で動作するコントローラ・Operatorが、Kubernetes APIを操作する際の認証手段としてもServiceAccountが広く使われます。

## Role/RoleBinding, ClusterRole/ClusterRoleBinding

RBACは、「何ができるか（Role/ClusterRole）」と「誰に対してそれを許可するか（RoleBinding/ClusterRoleBinding）」を分離して定義する設計になっています。

|リソース|スコープ|役割|
|---|---|---|
|Role|Namespace内|そのNamespace内のリソースに対する操作権限を定義|
|RoleBinding|Namespace内|RoleをUser/Group/ServiceAccountに紐づける。ClusterRoleをRoleBindingで紐づけることで、「定義はクラスタ全体、適用範囲は特定Namespaceのみ」という使い方もできる|
|ClusterRole|クラスタ全体|クラスタ全体（またはNamespaceをまたぐ操作、Node等のクラスタスコープリソース）に対する操作権限を定義|
|ClusterRoleBinding|クラスタ全体|ClusterRoleをクラスタ全体に対して紐づける|

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: dev
subjects:
- kind: ServiceAccount
  name: my-app
  namespace: dev
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

「定義（Role）」と「割り当て（Binding）」を分離することで、同じ権限セットを複数のユーザ・ServiceAccountに使い回したり、逆に同じユーザに複数の権限セットを組み合わせて付与したりすることが柔軟に行えます。

## Pod Security（SecurityContext, Pod Security Standards）

Pod Securityは、コンテナが実行時に持つ権限やアクセス範囲を制御し、万一コンテナが侵害された場合の被害範囲を最小化するための仕組みです。

|項目|概要|
|---|---|
|SecurityContext|Pod/コンテナ単位で、実行ユーザ（runAsUser）、root権限での実行可否（runAsNonRoot）、Capabilitiesの追加/削除、読み取り専用ファイルシステム（readOnlyRootFilesystem）などを設定する|
|Pod Security Standards|Kubernetesが定義する3段階のセキュリティポリシー（Privileged, Baseline, Restricted）。Namespace単位でどのレベルを強制するかを指定できる|
|Privileged|制限なし。特権コンテナなど、インフラ的なワークロード向け|
|Baseline|既知の権限昇格を防ぐ最低限の制限|
|Restricted|Podセキュリティのベストプラクティスに従った最も厳格な制限（非root実行の強制、Capabilitiesの制限など）|

これらの設定は、Linuxのコンテナ技術要素（Capabilities、seccomp、User Namespaceなど）を、Kubernetesのマニフェストレベルで宣言的に制御するためのインターフェースにあたります。

## GKEでの特徴

GKEは、GCPのIAMとKubernetesのRBACを橋渡しする仕組みや、セキュリティ強化のためのGKE独自機能を提供しています。

|項目|概要|
|---|---|
|Workload Identity|Pod内のアプリケーションが、Kubernetesの世界（ServiceAccount）とGCPの世界（IAMサービスアカウント）を紐づけて、GCPサービス（Cloud Storage, BigQueryなど）に対しキー配布なしで安全に認証できる仕組み。Secretとしてサービスアカウントキーを保存する必要がなくなる|
|Google GroupsによるRBAC|Google Groups（GCPの組織で管理するグループ）を、RoleBinding/ClusterRoleBindingのsubjectとして直接指定できる。人事異動などによる権限管理をグループ管理側に一元化できる|
|IAMによるGKEリソースへのアクセス制御|クラスタの作成・削除、Node Poolの操作など、Kubernetes RBACの対象外となるGKEリソース自体の操作権限は、GCPのIAMで別途制御する（RBACとIAMの二層構造）|
|Shielded GKE Nodes|Nodeの起動時の完全性を検証し、ブートキットやルートキットによる改ざんを検出するセキュリティ機能|
|Binary Authorization|あらかじめ許可されたビルドパイプラインを経て、署名されたイメージのみをクラスタにデプロイできるよう強制する仕組み|
|Autopilotのデフォルト制約|Autopilotモードでは、特権コンテナの起動やホストのnamespace（hostNetwork等）の利用があらかじめ禁止されており、Pod Security Standardsの`Restricted`相当が標準で強制される|

Workload IdentityとRBAC/IAMの二層構造は、「クラスタ内の権限（RBAC）」と「GCPリソースへの権限（IAM）」を明確に分離しつつ連携させる、GKE特有の設計として特に重要な概念です。
