# ConfigMapとSecret

ConfigMapやSecretを利用すると、各種パラメータをPodに渡すことができます。

* ConfigMap：設定値
* Secret：機密情報（パスワードやAPIキー・証明書、etc...）

## 形式

両者ともKey-Value形式となります。

ConfigMapは平文で保存できる一方で、SecretはBase64エンコードした値を保存する必要があります。
これは、証明書などバイナリデータをk8sのマニュフェスト（yaml）では直接扱えないためです。

SecretにBase64エンコードした値を保存する際は、Dataフィールドを指定します。
ただし、文字列データはstringDataフィールドをk8sマニュフェストで指定することでBase64エンコードせずに指定できます。
これはk8sが自動でBase64エンコードした上で保存するためです。

なお、Base64エンコードは形式の統一であり、暗号化を目的としてはいません。Secretのセキュリティについては後述します。

## 両者の違い

比較すると以下になりますが、本質的な違いはありません。

|ConfigMap|Secret|
|---|---|---|
|用途|設定値（非機密）|機密情報|
|保存形式|平文|Base64エンコード|
|etcd暗号化|通常なし|有効化を推奨|
|kubectl get|値がそのまま見える|Base64で見える（デコードは容易）|
|サイズ上限|1MB|1MB|
|渡し方|環境変数 / Volume|環境変数 / Volume（同じ）|

ただし、ConfigMapとSecretは別々のリソースタイプとして扱えるため、RBACで「ConfigMapは見れるけどSecretは見れない」といった権限設計を行うことができます。

## Podへの値の渡し方

「Podの環境変数に埋め込む」方法と「Volumeとしてマウントする」方法の二つが用意されています。
環境変数を利用するほうがシンプルですが、値を変更した際にはPodの再作成が必要になります。
Volumeマウントの場合は、定期的にファイルの値が更新されるため、Podを再作成する必要がありません。

またVolumeマウントの際には、ファイルのパーミッションを変更できます。
主にConfigMapでスクリプトファイルなどを渡すときに利用します。

## Secretの型

基本は汎用（Opaque）を利用しますが、用途に合う場合には専用の型を利用します。
専用の型は各々スキーマが決まっています。

|type|用途|
|---|---|
|Opaque|汎用（デフォルト）。任意のキー/バリューを格納|
|kubernetes.io/tls|TLS証明書と秘密鍵（tls.crt, tls.key）|
|kubernetes.io/dockerconfigjson|プライベートレジストリのDocker認証情報|
|kubernetes.io/service-account-token|ServiceAccountのトークン（自動生成）|
|kubernetes.io/ssh-auth|SSH認証情報（ssh-privatekey）|
|kubernetes.io/basic-auth|Basic認証（username, password）|
|bootstrap.kubernetes.io/token|ノードのクラスタ参加時のBootstrapトークン|

### SeviceAccountトークン

ServiceAccountのトークンは、ユーザが作成するものでなく、k8sが自動作成します。
NamespaceにServiceAccountを作成すると、自動でこのSecretが作成されます。
PodにServiceAccountを紐づけると、トークンが/var/run/secrets/kubernetes.io/serviceaccount/tokenに自動マウントされます。

### Bootstrapトークン

ノードを新しくKubernetesクラスタに参加させるとき使われる一時的なトークンです。
ノードに参加した後は、不要になります。
kube-systemのNamespaceに保存されています。
クラスタの初期構築時にトークンは生成され、24時間経過すると削除されます。その後は、新しくノードを追加する際に、手動で発行します。

## Secretのセキュリティ

Secretは、そのままではk8sマニュフェストに値を記載することになり、Gitなどで管理する上で漏洩リスクがあります。
これらを解決する手段として、二つの代替策が挙げられます。

### Sealed Secrets Operator

Secretを暗号化するOperatorです。
クラスタにはSealed Secrets Operatorをインストールします。
ユーザは「kubeseal」というクライアントツールを利用して、Secretの値を暗号化します。
PodはSecretを取得する際に、Sealed Secrets OperatorのControllerを経由し、暗号化された値を復号化した上で参照します。
なお、暗号化には公開鍵を利用します。kubesealはControllerインストール時に生成された公開鍵を利用して、Secret値を暗号化します。

### External Secrets Operator

GCPやAWSなどの外部シークレットサービスと連携して、k8s Secretを自動生成・同期するOperatorです。
SecretStoreとExternalSecretの2つのリソースを利用します。

|リソース|役割|例|
|---|---|---|
|SecretStore|外部サービスへの接続設定|「どの金庫室（シークレットサービス）を利用するか」|
|ExternalSecret|何を取得するかの定義|「金庫室の中のどの棚（Secret）を取得するか」|
