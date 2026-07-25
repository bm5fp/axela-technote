# Config&Secret

## ConfigMap

ConfigMapは、アプリケーションの設定値（環境変数やファイル）を、コンテナイメージから切り離して管理するためのリソースです。同じイメージを環境（開発・本番など）ごとに異なる設定で動かしたい場合に使われます。

|項目|概要|
|---|---|
|形式|Key-Value形式。値は平文（Base64エンコード不要）で保存される|
|データサイズ上限|1MB|
|典型的な内容|アプリケーションの設定ファイル全体、個別の環境変数値など|

## Secret

Secretは、パスワードやAPIキー、証明書といった機密情報を扱うためのリソースです。ConfigMapと構造は似ていますが、扱う情報の性質が異なります。

|項目|概要|
|---|---|
|保存形式|Base64エンコードされた値を保存する（証明書などのバイナリデータをマニフェスト上で扱うための形式統一が目的であり、暗号化ではない）|
|dataフィールド|Base64エンコード済みの値を指定する場合に使用|
|stringDataフィールド|平文の文字列を指定でき、Kubernetesが自動的にBase64エンコードして保存してくれる|

|Secretの型|用途|
|---|---|
|Opaque（デフォルト）|汎用。任意のKey-Valueを格納|
|kubernetes.io/tls|TLS証明書と秘密鍵（tls.crt, tls.key）|
|kubernetes.io/dockerconfigjson|プライベートレジストリへのDocker認証情報|
|kubernetes.io/service-account-token|ServiceAccountのトークン（Kubernetesが自動生成）|
|kubernetes.io/basic-auth|Basic認証情報（username, password）|

ConfigMapとSecretは別々のリソースタイプとして扱われるため、RBACで「ConfigMapは閲覧可、Secretは閲覧不可」といったきめ細かい権限設計が可能です。

## 環境変数/Volumeマウントでの受け渡し

ConfigMap/Secretの値をPodに渡す方法は、大きく2種類あります。

|方法|概要|
|---|---|
|環境変数への埋め込み|`envFrom`や`env.valueFrom`でコンテナの環境変数として注入する。シンプルだが、値を変更した場合はPodの再作成が必要|
|Volumeとしてのマウント|ConfigMap/Secretの各キーがファイルとしてマウントされる。値が更新されると、マウント済みのファイルも自動的に（数十秒〜数分の遅延を伴って）更新されるため、Podの再作成が不要|

Volumeマウントの場合は、マウントするファイルのパーミッションを指定することもできます。設定ファイルやスクリプトファイルを渡す際に、この方式がよく使われます。

## Secretのセキュリティ（Sealed Secrets, External Secrets）

Secretの値をそのままマニフェスト（YAML）に記載すると、Gitリポジトリで管理する際に平文（Base64は暗号化ではない）の機密情報が漏洩するリスクがあります。この課題への代表的な対策が2つあります。

|方式|概要|
|---|---|
|Sealed Secrets Operator|Secretの値を公開鍵で暗号化してマニフェストに含められるようにするOperator。ユーザは`kubeseal`というクライアントツールで値を暗号化し、クラスタに導入したControllerだけが対応する秘密鍵で復号できる|
|External Secrets Operator|AWSやGCPなど、外部のシークレット管理サービスと連携し、Kubernetesの`Secret`リソースを自動生成・同期するOperator。`SecretStore`（外部サービスへの接続設定）と`ExternalSecret`（何を取得するかの定義）の2つのリソースを利用する|

いずれの方式も、「機密情報の実体はマニフェストに直接含めず、暗号化された値、または外部サービスへの参照だけをコード管理する」という考え方に基づいています。

## GKEでの特徴

GKEを利用する場合、GCPが提供するシークレット管理サービスと連携させる方法が代表的な選択肢になります。

|項目|概要|
|---|---|
|Secret Manager|GCPのマネージドシークレット管理サービス。パスワードやAPIキーなどを一元管理し、バージョニングやIAMによるアクセス制御が可能|
|Secret Manager CSI Driver|Secret Managerに保存された値を、KubernetesのVolumeとしてPodに直接マウントできるようにするCSIドライバ。Kubernetesの`Secret`リソースを介さず、実行時に都度Secret Managerから値を取得する|
|Workload Identityとの連携|後述のWorkload Identityを使い、Podに紐づくGCPサービスアカウントにSecret Managerへのアクセス権限（IAMロール）を付与することで、上記CSIドライバやアプリケーションコードからSecret Managerの値を安全に取得できる|

Kubernetesの`Secret`リソースをそのまま使う方法と比べ、Secret Managerと連携する方式は「機密情報の実体をetcdにもクラスタ内にも保存しない」という点で、より高いセキュリティレベルを実現できます。
