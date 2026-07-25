# Core Concepts

## HCL構文（HashiCorp Configuration Language）

HCLは、Terraformの設定ファイル（`.tf`ファイル）を記述するための宣言型言語です。JSON的な構造を持ちつつ、人間にとって読み書きしやすいシンタックスになっています。

|要素|概要|
|---|---|
|ブロック|`resource "type" "name" { ... }`のように、種類・名前・中身（引数）で構成される基本単位|
|引数（Argument）|ブロック内で`key = value`の形式で指定する設定値|
|式（Expression）|文字列、数値、リスト、マップに加え、他リソースの属性参照（`aws_instance.web.id`など）や関数呼び出しも記述できる|
|コメント|`#`または`//`（1行）、`/* */`（複数行）|

HCLファイルは`.tf`拡張子で保存し、同一ディレクトリ内の全`.tf`ファイルはTerraformの実行時に自動的にまとめて読み込まれます。

## Provider

Providerは、Terraformが特定のクラウドやサービス(AWS, GCP, Azureなど)のAPIを操作するためのプラグインです。Terraform本体はクラウドに関する知識を持たず、Providerを通じて実際のAPI呼び出しを行います。

|項目|概要|
|---|---|
|provider ブロック|使用するProviderの設定（リージョン、認証情報など）を定義する|
|required_providers|使用するProviderの種類とバージョン制約を宣言する（`terraform`ブロック内に記述）|
|Provider Registry|HashiCorpが運営する公式のProvider配布場所。`terraform init`実行時に自動的にダウンロードされる|

1つの構成内で複数のProvider（例：AWSとCloudflare）を組み合わせて使うことも一般的です。

## Resource

Resourceは、Terraformが管理する実際のインフラの構成要素（仮想マシン、ネットワーク、DBインスタンスなど）を表す最も基本的な単位です。

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0123456789"
  instance_type = "t3.micro"
}
```

|要素|概要|
|---|---|
|リソースタイプ（`aws_instance`）|Providerが定義する、作成対象のリソースの種類|
|リソース名（`web`）|同一Terraform構成内でそのリソースを参照するための識別子（実際のクラウド上のリソース名とは別物）|
|属性参照|`aws_instance.web.id`のように、`<タイプ>.<名前>.<属性>`の形式で他のリソースの値を参照できる|

Terraformは、コード上の`resource`ブロックの集合を「あるべき状態」として扱い、実際のインフラをこれに一致させます。

## Data Source

Data Sourceは、Terraformの管理外にある既存のリソース、またはProvider側が提供する情報を「参照専用」で取得する仕組みです。

```hcl
data "aws_ami" "latest_amazon_linux" {
  most_recent = true
  owners      = ["amazon"]
}
```

|項目|概要|
|---|---|
|resourceとの違い|resourceは「作成・変更・削除」を行う対象であるのに対し、data sourceは既存の情報を「読み取るだけ」で、Terraformがその実体を作成・変更することはない|
|主な用途|既存のVPC IDの取得、最新のAMI IDの検索、他のTerraform構成が出力したState情報の参照など|

Data Sourceを活用することで、「手動で作成された既存リソース」や「別チームが管理するインフラ」の情報を、自分のTerraform構成に安全に取り込むことができます。
