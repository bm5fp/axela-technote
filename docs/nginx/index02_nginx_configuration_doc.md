# Configuration

## nginx.confの構造（http, server, locationブロック）

Nginxの設定は、入れ子になった「ブロック」という単位で階層的に記述されます。内側のブロックは、外側のブロックで設定された値を継承しつつ、必要に応じて上書きできます。

|ブロック|階層|役割|
|---|---|---|
|（グローバル）|最上位|worker_processesなど、Nginx全体に関わる設定|
|events|最上位|接続処理に関する設定（worker_connectionsなど）|
|http|最上位|HTTP関連の共通設定（MIMEタイプ、ログ形式、タイムアウトなど）。複数のserverブロックを内包する|
|server|http内|1つの仮想サーバ（バーチャルホスト）の定義。listenするポートやドメイン名(server_name)を指定する|
|location|server内|リクエストパスのパターンに応じた処理を定義する。1つのserver内に複数指定できる|

```nginx
http {
    server {
        listen 80;
        server_name example.com;

        location / {
            root /var/www/html;
        }

        location /api/ {
            proxy_pass http://backend;
        }
    }
}
```

同じ`server_name`やIPアドレス・ポートに複数の`server`ブロックが存在する場合、Nginxは`server_name`の一致度が最も高いものを選択します(完全一致 > 前方一致のワイルドカード > 後方一致のワイルドカード > 正規表現の順)。

## 主要ディレクティブ

設定ファイル内で使われる代表的なディレクティブです。

|ディレクティブ|概要|
|---|---|
|listen|待ち受けるIPアドレスとポートを指定|
|server_name|バーチャルホストを識別するためのドメイン名(複数指定・ワイルドカード・正規表現も可)|
|root|リクエストパスに対応する静的ファイルのルートディレクトリ|
|index|ディレクトリへのリクエスト時に返すデフォルトファイル名(index.htmlなど)|
|try_files|指定した順にファイルの存在を確認し、最初に見つかったものを返す(SPAのフォールバックなどでよく使用)|
|return|即座に指定したステータスコード・リダイレクトを返す|
|rewrite|正規表現を使ってURLを書き換える|

## 設定ファイルの分割とinclude

サービスが増えるにつれて`nginx.conf`が肥大化するのを避けるため、設定を複数ファイルに分割し`include`ディレクティブで読み込む構成が一般的です。

|ファイル/ディレクトリ例|用途|
|---|---|
|/etc/nginx/nginx.conf|全体のエントリーポイント。基本設定と`include`文のみを持つことが多い|
|/etc/nginx/conf.d/*.conf|サービス・ドメインごとの`server`ブロックを個別ファイルに分割して配置|
|/etc/nginx/sites-available/、sites-enabled/|Debian/Ubuntu系でよく使われる慣習。利用可能な設定と実際に有効化する設定をシンボリックリンクで管理する|

```nginx
http {
    include /etc/nginx/conf.d/*.conf;
}
```

この分割により、サービス単位で設定を追加・削除・一時的に無効化しやすくなり、複数のアプリケーションを1つのNginxインスタンスでホストする際の管理性が向上します。
