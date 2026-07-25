# Logging&Monitoring

## アクセスログ（access_log, log_format）

アクセスログは、Nginxが処理した全てのリクエストの記録です。トラフィック分析やトラブルシューティングの基本的な情報源になります。

```nginx
log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                 '$status $body_bytes_sent "$http_referer" '
                 '"$http_user_agent"';

access_log /var/log/nginx/access.log main;
```

|ディレクティブ|概要|
|---|---|
|log_format|ログの出力フォーマットを名前付きで定義する。組み込み変数を組み合わせて自由にカスタマイズできる|
|access_log|ログの出力先ファイルと、使用するフォーマット名を指定する。`off`を指定するとアクセスログを無効化できる|

|代表的な変数|内容|
|---|---|
|$remote_addr|クライアントのIPアドレス|
|$request|リクエストライン（メソッド、パス、HTTPバージョン）|
|$status|レスポンスのステータスコード|
|$request_time|リクエスト処理にかかった時間|
|$upstream_response_time|バックエンド（upstream）が応答に要した時間|

JSON形式でログを出力するよう`log_format`をカスタマイズすることで、後段のログ収集基盤(Fluentdなど)に構造化データとして取り込みやすくなります。

## エラーログ（error_log）

エラーログは、Nginx自体の動作エラーや、設定・処理上の警告を記録するログです。アクセスログとは別ファイル・別フォーマットで出力されます。

```nginx
error_log /var/log/nginx/error.log warn;
```

|ログレベル（重大度が低い順）|概要|
|---|---|
|debug|詳細なデバッグ情報(要デバッグビルド)|
|info / notice|通常の情報レベルのメッセージ|
|warn|軽微な問題（設定の非推奨な書き方など）|
|error|リクエスト処理中に発生したエラー(バックエンド接続失敗など)|
|crit / alert / emerg|Nginx自体の起動失敗など、重大な問題|

指定したレベル以上の重大度を持つログのみが出力されるため、本番環境では`warn`や`error`程度に設定し、必要に応じて`debug`へ一時的に引き上げて調査するという運用が一般的です。

## ステータスモジュール（stub_status）

`stub_status`は、Nginxの現在の稼働状況を簡易的なテキスト形式で取得できる組み込みモジュールです。

```nginx
location /nginx_status {
    stub_status;
    allow 127.0.0.1;
    deny all;
}
```

出力される主な情報は以下の通りです。

|項目|概要|
|---|---|
|Active connections|現在アクティブな接続数|
|accepts / handled / requests|累計の接続受付数、処理済み接続数、総リクエスト数|
|Reading / Writing / Waiting|リクエストヘッダ読み取り中、レスポンス送信中、Keep-Alive待機中の接続数それぞれの内訳|

このモジュールが提供する情報はシンプルですが、Prometheusのnginx-exporterなど外部の監視エージェントがこのエンドポイントをスクレイピングして、より高度な監視ダッシュボードを構築する際の基礎データとしてよく利用されます。アクセス経路は`allow`/`deny`で必ず制限し、外部に公開しないよう注意が必要です。
