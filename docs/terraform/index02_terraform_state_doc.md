# State

## Stateファイル（terraform.tfstate）

Terraformは、実行のたびにインフラの現状をクラウドAPIから毎回全て取得するのではなく、「前回適用した結果」を`terraform.tfstate`というJSON形式のファイルに記録し、これを基準にして差分計算を行います。

|役割|概要|
|---|---|
|リソースのマッピング|コード上のリソース（`aws_instance.web`など）と、実際のクラウド上のリソースID（`i-0123456789`など）を対応付ける|
|メタデータの保持|依存関係、属性値のキャッシュなど、差分計算に必要な情報を保持する|
|機密情報の保持|パスワードなど、リソース作成時にProviderから返却された値がそのまま平文で記録されることがある|

Stateファイルには機密情報が含まれ得るため、Gitなどのバージョン管理システムに直接コミットすることは推奨されません。

## リモートバックエンド

チームでTerraformを利用する場合、Stateファイルをローカルに置いたままだと、複数人が同時に異なるStateを参照してしまい、インフラの状態に矛盾が生じます。リモートバックエンドは、Stateファイルを共有ストレージ上で一元管理する仕組みです。

|バックエンド例|概要|
|---|---|
|Terraform Cloud/Enterprise|HashiCorpが提供するマネージドサービス。State管理に加え、実行環境やチーム権限管理も提供|
|Amazon S3 + DynamoDB|S3にStateを保存し、DynamoDBでロックを管理する定番の構成|
|Google Cloud Storage|GCS上にStateを保存するバックエンド|
|Azure Blob Storage|Azure環境での定番の選択肢|

`backend`ブロックを`terraform`設定内に記述することで、Stateの保存先を切り替えられます。

## Stateロック

複数人・複数のCI/CDジョブが同時に`terraform apply`を実行すると、同じStateファイルへ同時に書き込みが発生し、内容が破損する可能性があります。Stateロックは、この競合を防ぐための排他制御の仕組みです。

|項目|概要|
|---|---|
|ロックの取得|`terraform plan`/`apply`実行時に自動的にロックを取得し、他の実行をブロックする|
|実現方法|バックエンドによって異なる（例：DynamoDBのアイテムロック、Terraform Cloudの内部ロック機構）|
|強制解除|何らかの理由でロックが正常に解放されなかった場合、`terraform force-unlock`で手動解除できる（誤用するとState破損のリスクがあるため慎重に扱う）|

## State操作コマンド（state mv, state rm等）

Stateの内容を直接操作するための低レベルなコマンド群です。通常の`plan`/`apply`では対応できない、リファクタリングや例外的な運用の際に利用します。

|コマンド|役割|
|---|---|
|terraform state list|State内のリソース一覧を表示|
|terraform state show|特定リソースの詳細な属性を表示|
|terraform state mv|State内でのリソースの識別子を変更する（コードのリファクタリング時に、実際のインフラを再作成せずに対応させたい場合に使用）|
|terraform state rm|State管理からリソースを除外する（実際のインフラは削除せず、Terraformの管理対象からのみ外す）|
|terraform import|既存の（Terraform外で作成された）リソースをStateに取り込む|

これらのコマンドは、実際のインフラには影響を与えず、あくまで「Terraformがどのリソースをどう認識しているか」というState側の情報のみを操作する点が重要です。
