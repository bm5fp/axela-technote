# Workspace

## Workspaceによる環境分離

Terraformの「Workspace」は、同一のコード（構成ファイル）を使い回しながら、環境ごとに別々のStateファイルを持たせるための仕組みです。

|コマンド|役割|
|---|---|
|terraform workspace new dev|新しいWorkspace（例：dev）を作成する|
|terraform workspace select prod|指定したWorkspaceに切り替える|
|terraform workspace list|存在するWorkspaceの一覧を表示する|
|terraform.workspace|コード内で現在のWorkspace名を参照するための組み込み変数|

|項目|概要|
|---|---|
|デフォルトWorkspace|`default`という名前のWorkspaceが常に存在する|
|Stateの実体|各Workspaceは、内部的に別々のStateファイル（またはリモートバックエンド上の別パス）を持つ|

Workspaceは同じコードを共有するため、環境間の差はコード内で`terraform.workspace`を参照した条件分岐（例：`count = terraform.workspace == "prod" ? 3 : 1`）によって表現することが一般的です。

## tfvarsファイルによる環境ごとの値の切り替え

Workspaceがコードを共有しつつStateだけを分離する仕組みであるのに対し、`.tfvars`ファイルは「同じコードに対して異なる入力値を与える」ことで環境差分を表現する方法です。

|ファイル例|用途|
|---|---|
|dev.tfvars|開発環境向けの値（小さいインスタンスサイズなど）|
|prod.tfvars|本番環境向けの値（冗長構成、大きいインスタンスサイズなど）|

`terraform plan -var-file=prod.tfvars`のように明示的に指定して使用します。Workspaceと組み合わせて、「Workspaceで環境（Stateの分離単位）を切り替え、対応するtfvarsで値を切り替える」という運用もよく行われます。

## ディレクトリ分割によるマルチ環境管理

Workspaceやtfvarsとは異なるアプローチとして、環境ごとに物理的にディレクトリ自体を分ける方法もあります。

```text
environments/
  dev/
    main.tf
    backend.tf
  prod/
    main.tf
    backend.tf
modules/
  vpc/
  ec2/
```

|方式|メリット|デメリット|
|---|---|---|
|Workspace方式|コードの重複がなく、切り替えが手軽|環境ごとの構成差が大きい場合、条件分岐が複雑化しやすい。誤って別環境のWorkspaceに適用するリスクがある|
|ディレクトリ分割方式|環境ごとにバックエンド設定やリソース構成を完全に独立させられ、誤操作のリスクが低い|環境間でコードの重複が生まれやすく、共通化にはモジュール化が必須になる|

小規模な構成やステージング/本番の差が小さい場合はWorkspace、大規模な組織や環境ごとの構成差が大きい場合はディレクトリ分割、という使い分けがよく行われます。
