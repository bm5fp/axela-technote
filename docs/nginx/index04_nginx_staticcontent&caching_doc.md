# StaticContent&Caching

## 静的ファイル配信

Nginxはもともと静的ファイル配信に特化して設計されており、非常に高いスループットで画像・CSS・JavaScriptなどのファイルを配信できます。

|ディレクティブ|概要|
|---|---|
|root|リクエストパスをそのままドキュメントルート配下のパスに対応させる(`root /var/www; location /img/ ...`→`/var/www/img/...`)|
|alias|locationのパスとファイルシステム上のパスを別々にマッピングする(locationのパス部分をそのまま置き換える)|
|index|ディレクトリへのアクセス時に返すデフォルトファイル|
|autoindex|indexファイルが存在しない場合に、ディレクトリ内のファイル一覧を自動生成して返す|
|sendfile|カーネルの`sendfile()`システムコールを使い、ファイル内容をアプリケーション層でコピーせず直接ソケットへ送信する高速化設定|

`root`と`alias`はよく混同されますが、`alias`はlocationのマッチした部分を完全に置き換えるのに対し、`root`はリクエストパス全体をルート配下にそのまま連結するという違いがあります。

## proxy_cacheによるキャッシュ

`proxy_cache`は、バックエンドから取得したレスポンスをNginx自身がディスク/メモリ上にキャッシュし、同じリクエストが来た際にバックエンドへ問い合わせずに直接応答する仕組みです。

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=mycache:10m max_size=1g;

server {
    location / {
        proxy_pass http://backend;
        proxy_cache mycache;
        proxy_cache_valid 200 10m;
    }
}
```

|ディレクティブ|概要|
|---|---|
|proxy_cache_path|キャッシュの保存先ディレクトリと、キャッシュキー管理用の共有メモリ領域(keys_zone)を定義|
|proxy_cache|使用するキャッシュゾーンを指定して有効化|
|proxy_cache_valid|ステータスコードごとにキャッシュを保持する時間を指定|
|proxy_cache_key|キャッシュを区別するためのキー(デフォルトはURLベース)|

これにより、バックエンドへの負荷を大幅に削減しつつ、レスポンスタイムを改善できます。ただし、動的に変化するコンテンツを誤ってキャッシュしないよう、対象パスやキャッシュ時間の設計には注意が必要です。

## gzip圧縮

gzip圧縮は、レスポンスボディをNginx側で圧縮してからクライアントに送信することで、通信量を削減する仕組みです。

|ディレクティブ|概要|
|---|---|
|gzip on|gzip圧縮を有効化|
|gzip_types|圧縮対象とするMIMEタイプを指定(text/html, application/jsonなど)|
|gzip_comp_level|圧縮レベル(1〜9)。高いほど圧縮率は上がるがCPU負荷も増える|
|gzip_min_length|圧縮を行う最小レスポンスサイズ|

テキスト系のコンテンツ(HTML、CSS、JavaScript、JSONなど)は高い圧縮効果が得られる一方、既に圧縮済みの画像や動画ファイルへの適用は効果が薄いため、`gzip_types`で対象を絞り込むのが一般的です。

## Expires/Cache-Controlヘッダ

これらは、Nginx自身のキャッシュではなく「クライアント（ブラウザ）側」に対して、コンテンツをどれだけの期間キャッシュしてよいかを指示するHTTPレスポンスヘッダです。

|ディレクティブ|概要|
|---|---|
|expires|指定した期間後に期限切れとなる`Expires`ヘッダと`Cache-Control: max-age`ヘッダを付与する(例：`expires 30d;`)|
|add_header Cache-Control|`Cache-Control`ヘッダの値をより細かく制御する(`no-cache`, `public`, `private`など)|

画像やライブラリファイルのようにコンテンツが変わりにくい静的リソースには長いキャッシュ期間を設定し、HTMLのように更新頻度の高いコンテンツには短いキャッシュ期間（または`no-cache`）を設定するのが一般的な設計方針です。ファイル名にハッシュ値を含めるビルド手法(キャッシュバスティング)と組み合わせることで、長いキャッシュ期間と即時反映を両立できます。
