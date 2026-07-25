# コマンド実行と認証認可
k8sではCLIツール「kubectl」を利用して、kube-apiserverにコマンドを実行します。

## kubeconfig
kubectlのコマンド実行にあたり「どのクラスタに」「誰として」実行するか、をクライアント側で事前に設定する必要があります。
これは、~/.kube/configに設定できます。設定内容は大きく3つの要素があります。

* クラスタ接続情報
* ユーザの認証情報
* クラスタ × ユーザの組み合わせ（コンテキスト）

なお、コンテキストでは接続するnamespaceも設定できます。

それ以外に、kubeconfigでは現在のコンテキストとしてどれを使うかも定義されています。
kubectlコマンド実行時に特にコンテキストを指定しなければ現在のコンテキストが使われます。

## k8sの認可
### RoleとClusterRole
k8sでは、RoleあるいはClusterRoleにより、ロールベースの権限を定義できます。なお、RoleとClusterRoleの違いは対象リソースの違いになります。

* Role：特定のNamespace内のリソースに対する権限
* ClusterRole：全Namespaceを対象にした権限

### RoleBindingとClusterRoleBinding
定義した権限は、RoleBindingおよびClusterRoleBindingにより、UserやGroup、ServiceAccountに紐づけられます。
Role、ClusterRole、RoleBinding、ClusterRoleBindingの組み合わせにより、4種類の権限管理が実現できます。

|バインディング|ロール|権限管理|
|---|---|---|
|RoleBinding|Role|特定Namespace内の権限管理|
|RoleBinding|ClusterRole|ClusterRoleの権限を特定Namespaceのリソースに限定して付与|
|ClusterRoleBinding|ClusterRole|クラスター全体の権限管理|
|ClusterRoleBinding|Role|ー（不可）|

原則はRoleBinding × RoleあるいはClusterRoleBinding × ClusterRoleの組み合わせを利用するのがシンプルで分かりやすいです。

### RoleBinding × Role
RoleBinding × ClusterRoleは、RoleBinding × Roleに比べてNamespace毎にRoleを用意しなくてよい点がメリットとして挙げられます。（下図参照）
![](index01_k8s_Role_Binding.png)

一方で権限管理は複雑になるため、基本的にはRoleBinding × Roleを利用するほうが良いと考えます。

## k8sの認証

### クライアント証明書による認証
クライアント証明書と秘密鍵を利用した認証になります。大まかな流れは以下となります。

1. クラスタの認証局にてクライアント証明書を発行
1. kubeconfigのユーザ接続情報にクライアント証明書と秘密鍵を設定
1. kubectlにてクライアント証明書 + 秘密鍵を送信
1. kube-apiserverにて、クライアント証明書を検証
1. kube-apiserverがRBACによりコマンドの実行を判定

なお、事前にRBACを設定しておかなければ、権限がなにもなくコマンドは成功されません。

#### ユーザとグループ
クライアント証明書では、/CN（Common Name）と/O（組織名）を設定できます。
k8sではこの情報をユーザ/グループにマッピングします。

#### メリットとデメリット、ユースケース
クライアント証明書による認証は、追加コンポーネントが不要でシンプルです。
一方で、漏洩時に証明書の失効が難しかったり、有効期限の管理が必要であったり、大規模になると証明書自体の管理も必要になってきます。
そのため、本番ワークロードには向きません。

### OIDCによる認証
#### 一般的なOIDCによる認証
OpenID Connectプロトコルを利用した認証基盤との連携による認証が可能です。
一般的な認証の流れはID Tokenを利用した以下となります。

1. 認証基盤にログインし、ID Token（JWT）、Access Token、Refresh Tokenを取得

    |トークン|目的|有効期限|
    |---|---|---|
    |ID Token|ユーザ識別（認証）|数分～1時間|
    |Access Token|APIへのアクセス権限（認可）|数分～1時間|
    |Refresh Token|ID Token/Access Tokenの再取得|数日～数週間|

1. kubectlコマンドを実行
    1. コマンドと併せて、ID Token（JWT）を送信
    1. kube-apiserverは、ID Tokenを検証（本当に認証基盤から発行されたものかどうか認証基盤の署名を確認）
    1. kube-apiserverがRBACによりコマンドの実行を判定

k8sではOIDCのID Tokenのみを認証に利用しますが、認可についてはk8sのRBACで別途行われます。
そのためクライアント証明書と同様に事前にRBACを設定しておかなければ、権限がなくkubectlコマンドは実行できません。
またこの場合、認証基盤でユーザのアカウントを無効化しても、ID Token（JWT）の有効期限が切れるまではkubectlコマンドを実行できてしまう点が問題です。

#### GKE+Google認証でのOIDCによる認証
GKEでGoogle認証を利用する場合は、Access Tokenを利用した認証となります。

1. gcloud auth loginによる認証
    1. ID Token、Access Token、Refresh Tokenが返される。

1. gcloud get credentialによる接続情報の取得して設定
    * kubeconfigにクラスタ接続情報
    * ユーザ認証情報（googleアカウント名とAccess Token取得コマンド）

2. kubectlコマンドを実行
    1. kubectlはAccess Tokenを送信
    1. kube-apiserverはGoogleのTokeninfo APIにAccess Tokenの持ち主を問い合わせ
    1. GoogleのTokeninfo APIがユーザ情報を返却
    1. kube-apiserverがRBACによりコマンドの実行を判定

一般的なOICDによる認証と異なり、GKEのgcloudによる認証ではkubectlコマンドを実行するたびにGoogleのTokeninfo APIに問い合わせが走ります。そのため、Googleアカウントを無効化すると即時にユーザ情報が返却されなくなり、結果としてkubectlコマンドは利用できなくなります。

一方で、ユーザがroles/container.admin、roles/container.developer、roles/container.viewer、等の権限を持っていない場合、gcloud get credentialでクラスタの接続情報を取得できません。ただし、何らかの手段でクラスタ接続情報を取得した場合、gcloud authで取得したAccess Tokenを利用してkube-apiserverの接続自体はできてしまいます。
そのため、RBACで権限が設定されている場合、GCPのIAMロールの保持にかかわらず、kubectlコマンドが実行できてしまう点に注意してください。

##### GCPのロールとRBACの連携
GKEの場合もRBACによる認可が基本ですが、roles/container.adminの権限を持つユーザの場合、特にRBACを設定しなくてもkubectlコマンドを実行できます。
これは、roles/container.adminが特別に、RBACと連携されているためです。具体的には、RBACではデフォルトで以下のような設定が入っていますが、cluster-adminについてはroles/container.adminを持つGoogleアカウントがバインドされています。そのため、roles/container.adminを持つユーザはGKEクラスタを立てるだけで、そのままkubectlコマンドを実行できてしまいます。

|ClusterRoleBinding|対象|権限|GCPのIAMロールとの連携|
|---|---|---|---|
|cluster-admin|system:mastersグループ|全権限|roles/container.adminを持つGoogleアカウントをバインド|
|system:basic-user|全認証済みユーザ|自分の権限確認のみ|なし|
|system:discovery|全認証済みユーザ|API一覧の取得のみ|なし|

#### ユーザとグループ
一般的なOIDCの場合、kube-apiserverの設定でID Token（JWT）のどのクレーム（KeyとValue）を使うかを設定できます。

* ユーザ：username-claim=email
* グループ：groups-claim=groups

一方でGKEの場合は、GoogleアカウントやGoogleグループが使われます。なお、GKEでGoogle認証以外を利用する場合、kube-apiserverを直接編集できませんが、Anthos Identity Service（AIS）というCustomResorceで設定可能です。

#### メリットとデメリット、ユースケース
OIDCは、社内の認証基盤によるアカウントの一元化やSSO利用などで、管理や運用が効率化されます。
また、クライアント証明書のような漏洩リスクもなくセキュリティ面でも安全です。
本番ワークロードでは、基本的にはOIDCの利用が推奨されます。




