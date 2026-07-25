# Security

## SSL/TLS設定

Nginxは、HTTPS通信の終端(SSL/TLSの復号化)を担うことが多く、そのための設定項目が用意されています。

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    ssl_certificate     /etc/nginx/certs/example.com.crt;
    ssl_certificate_key /etc/nginx/certs/example.com.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
}
```

|ディレクティブ|概要|
|---|---|
|ssl_certificate / ssl_certificate_key|サーバ証明書と秘密鍵のパスを指定|
|ssl_protocols|許可するTLSのバージョン。脆弱性のある古いバージョン(SSLv3, TLSv1.0/1.1)は無効化するのが一般的|
|ssl_ciphers|使用を許可する暗号スイートを指定|
|ssl_session_cache|TLSセッションの再開情報をキャッシュし、再接続時のハンドシェイクコストを削減する|

またNginxはSSL終端の役割を担うことで、バックエンドのアプリケーションサーバは平文のHTTPのみを扱えばよくなり、証明書管理を一箇所に集約できるという運用上のメリットもあります。

## アクセス制御（allow/deny, Basic認証）

特定のIPアドレスやユーザだけにアクセスを許可・制限するための基本的な仕組みです。

|方式|概要|
|---|---|
|allow / deny|IPアドレス（またはCIDR）単位でのアクセス許可・拒否。上から順に評価され、最初に一致したルールが適用される|
|Basic認証（auth_basic）|ユーザ名とパスワードによる簡易認証。`htpasswd`コマンドで生成したパスワードファイルを`auth_basic_user_file`で指定する|

```nginx
location /admin/ {
    allow 10.0.0.0/8;
    deny all;

    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;
}
```

管理画面や社内向けツールなど、外部に一切公開したくないパスに対して、これらを組み合わせて多層的なアクセス制限をかけることがよくあります。

## レートリミット（limit_req, limit_conn）

特定のクライアントからの過剰なリクエストを制限し、サービス全体の可用性を守るための仕組みです。

|ディレクティブ|概要|
|---|---|
|limit_req_zone|リクエスト数を制限するための共有メモリ領域と、単位時間あたりの許可レートを定義する（例：`rate=10r/s`）|
|limit_req|定義したゾーンを使い、実際にリクエスト数を制限する。`burst`パラメータで、瞬間的な超過分をどこまで許容してキューイングするか指定できる|
|limit_conn_zone / limit_conn|同時接続数そのものを制限する（ダウンロードの同時接続数制限などに使用）|

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
    limit_req zone=api burst=20 nodelay;
}
```

これにより、単一クライアントからの過度なアクセス集中(意図的なものか、バグによるリトライループかを問わず)からバックエンドを保護できます。

## セキュリティヘッダ

`add_header`ディレクティブを使い、ブラウザに対してセキュリティ上の指示を与えるHTTPレスポンスヘッダを付与できます。

|ヘッダ|概要|
|---|---|
|X-Frame-Options|自サイトのページが他サイトの`<iframe>`内に埋め込まれることを制限し、クリックジャッキング攻撃を防ぐ|
|X-Content-Type-Options: nosniff|ブラウザによるMIMEタイプの推測（スニッフィング）を無効化し、意図しないファイル種別としての実行を防ぐ|
|Strict-Transport-Security (HSTS)|以降の通信を強制的にHTTPSのみにするようブラウザに指示する|
|Content-Security-Policy|読み込みを許可するスクリプト・スタイル・画像などの取得元を制限し、XSS攻撃の被害範囲を抑える|

これらのヘッダはアプリケーション側で付与することも可能ですが、Nginx側でまとめて一元的に付与することで、複数のバックエンドアプリケーションに対して一貫したセキュリティポリシーを適用しやすくなります。
