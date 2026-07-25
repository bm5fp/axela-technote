# Variable&Output

## 変数定義（variable, tfvars）

variableは、Terraform構成の外部から値を注入するための入力インターフェースです。同じコードを環境ごとに異なる値（インスタンスタイプ、リージョンなど）で使い回す際の基本的な仕組みになります。

```hcl
variable "instance_type" {
  type        = string
  default     = "t3.micro"
  description = "EC2インスタンスのタイプ"
}
```

|指定方法|概要|
|---|---|
|default|値が指定されなかった場合のデフォルト値|
|type|文字列（string）、数値（number）、真偽値（bool）、リスト（list）、マップ（map）、オブジェクト（object）などの型制約|
|validation|値が満たすべき条件を定義し、条件を満たさない場合はplan/apply時にエラーとする|
|sensitive|trueにすると、plan/applyの出力やログでその値がマスクされる|

値の受け渡しには、コマンドライン引数（`-var`）に加え、`.tfvars`という専用のファイル形式がよく使われます。

|方法|概要|
|---|---|
|terraform.tfvars|同名ファイルは`terraform plan`/`apply`実行時に自動的に読み込まれる|
|環境ごとのtfvars（`prod.tfvars`など）|`-var-file=prod.tfvars`のように明示的に指定して読み込む|
|環境変数（`TF_VAR_xxx`）|CI/CD環境などで、シークレット値を直接ファイルに書かず注入する際に使われる|

## 出力値（output）

outputは、Terraform構成が生成したリソースの属性を、実行結果として外部に提示するための仕組みです。

```hcl
output "instance_public_ip" {
  value = aws_instance.web.public_ip
}
```

|用途|概要|
|---|---|
|apply後の確認|`terraform apply`実行後、ターミナルにoutputの値が表示される|
|他モジュールへの受け渡し|子モジュールのoutputは、呼び出し元から`module.<name>.<output名>`として参照できる|
|他Terraform構成との連携|`terraform_remote_state`データソースを使うことで、別のTerraform構成（別のState）が出力した値を読み取ることもできる|

パスワードなど機密性の高い値をoutputする場合は、`sensitive = true`を指定することで、通常の実行ログ上ではマスクされるようになります(ただしStateファイル自体には平文で保持される点に注意が必要です)。

## Local Values

Local Value（`locals`ブロック）は、構成内で繰り返し使う値や、複数の変数を組み合わせた計算結果に、分かりやすい名前を付けて再利用するための仕組みです。

```hcl
locals {
  common_tags = {
    Project = "myapp"
    Env     = var.environment
  }
}
```

|項目|概要|
|---|---|
|variableとの違い|外部から値を注入するインターフェースではなく、構成内部でのみ使う「計算済みの値」を保持する|
|主な用途|複数リソースで共通して使うタグの定義、条件分岐した結果の値の集約、長い式に名前を付けて可読性を上げるなど|

## 変数の優先順位

variableの値は複数の方法から指定できるため、Terraformには明確な優先順位のルールがあります(数字が大きいほど優先される)。

|優先順位|指定方法|
|---|---|
|1（最低）|variableブロックのdefault値|
|2|terraform.tfvars（自動読み込み）|
|3|*.auto.tfvars（自動読み込み、ファイル名のアルファベット順）|
|4|-var-fileオプションで明示的に指定したファイル（複数指定した場合は後のものが優先）|
|5|環境変数（TF_VAR_xxx）|
|6（最高）|-varオプションでコマンドラインから直接指定した値|

この優先順位を理解しておくことで、「CI/CDパイプラインでは環境変数を使い、ローカル開発では`.tfvars`を使う」といった環境差分の切り替えを意図通りに設計できます。
