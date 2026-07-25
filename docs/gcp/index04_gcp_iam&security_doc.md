# IAM&Security

## IAM（Identity and Access Management）

IAMは、GCPリソースに対する「誰が」「何をできるか」を管理する、GCP全体に共通する権限管理の基盤です。[アクセス制御](../general/index01_general_accesscontrol_doc.md)で扱ったRBACの考え方に基づいて設計されています。

|要素|概要|
|---|---|
|プリンシパル|権限を付与される対象。Googleアカウント（ユーザ）、サービスアカウント、Google Groupsなど|
|ロール|許可される操作（Permission）の集合。「基本ロール」（Owner/Editor/Viewerなど広範な権限）、「事前定義ロール」（サービスごとに用意された細分化された権限）、「カスタムロール」（利用者が独自に定義する権限）がある|
|リソース階層|Organization → Folder → Project → 個々のリソース、という階層構造を持ち、上位階層で付与されたロールは下位階層に継承される|

最小権限の原則に基づき、基本ロール（Owner/Editor/Viewer）ではなく、必要な操作だけを許可する事前定義ロールやカスタムロールを使うことが推奨されます。

## Service Account

Service Accountは、人間のユーザではなく、アプリケーションやVMがGCP APIを呼び出す際に使う、プログラム用のアカウントです。

|項目|概要|
|---|---|
|用途|Compute EngineのVM、Cloud Run、GKEのPodなどが、他のGCPサービス（Cloud Storage, BigQueryなど）にアクセスする際の認証主体になる|
|キーの管理|サービスアカウントキー（JSON形式の秘密鍵）を発行してプログラムに組み込む方式は、漏洩リスクが高いため近年は非推奨とされることが多い|
|Workload Identity（GKE）|Kubernetesのサービスアカウントと、GCPのサービスアカウントを紐づけ、キーファイルを一切扱わずにPodからGCPサービスへ安全にアクセスできる仕組み（Kubernetesドキュメントの[Security&RBAC](../kubernetes/index06_k8s_security&rbac_doc.md)を参照）|

## Organization Policy

Organization Policyは、IAMのような「誰が何をできるか」ではなく、「そもそもどのような設定・リソースの使用を組織として許可するか」を制約するための仕組みです。

|項目|概要|
|---|---|
|制約の例|外部IPアドレスを持つVMの作成を禁止する、特定リージョン以外へのリソース作成を禁止する、サービスアカウントキーの発行を禁止するなど|
|適用範囲|Organization、Folder、Projectの階層に対して設定でき、下位階層に継承される|
|IAMとの違い|IAMは「個々のプリンシパルへの権限付与」であるのに対し、Organization Policyは「IAMで許可されていても、組織として絶対に許可しない設定」を強制するガードレールとして機能する|

## Cloud KMS（Key Management Service）

Cloud KMSは、暗号化・復号に使う鍵を安全に生成・保管・管理するためのマネージドサービスです。[暗号化](../general/index05_general_encryption_doc.md)で扱った対称鍵・非対称鍵の管理を、自前で運用せずにGoogle側に任せられます。

|項目|概要|
|---|---|
|鍵のライフサイクル管理|鍵のローテーション（定期的な鍵の更新）や無効化を、ポリシーに基づいて管理できる|
|Cloud Storage/Compute Engineとの統合|保存データの暗号化（Encryption at Rest）に使う鍵として、Cloud KMSで管理する鍵を指定できる（顧客管理の暗号鍵、CMEK）|

## サービスの使い分け

|要件|向いているサービス|
|---|---|
|ユーザ・アプリケーションへの権限付与|IAM|
|アプリケーション/VMからのAPI呼び出しの認証主体|Service Account|
|組織全体で特定の設定・操作を一律禁止したい|Organization Policy|
|暗号化鍵の管理|Cloud KMS|
