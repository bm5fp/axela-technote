# Nginx

Nginxは、高いパフォーマンスと省メモリ性を特徴とするWebサーバ/リバースプロキシソフトウェアです。静的コンテンツの配信だけでなく、リバースプロキシ、ロードバランサ、キャッシュサーバとしても広く利用されています。

従来型のApacheなどが「リクエストごとにプロセス/スレッドを生成する」方式であるのに対し、Nginxは少数のワーカプロセスがイベント駆動・非同期I/Oで大量の同時接続を捌く設計になっており、この点が高負荷環境での性能優位につながっています。

## 全体像

Nginxは、設定を統括する1つのマスタプロセスと、実際にリクエストを処理する複数のワーカプロセスで構成されます。マスタプロセスは設定の読み込みやワーカプロセスの管理を行い、ワーカプロセスがそれぞれ独立してクライアントからの接続を処理します。動作は`nginx.conf`を中心とした設定ファイルで宣言的に定義されます。

## ドキュメント構成

このドキュメントでは、Nginxの技術概念を以下のカテゴリに分けて整理しています。

|カテゴリ|概要|
|---|---|
|[Architecture](index01_nginx_architecture_doc.md)|マスタ/ワーカプロセスモデル、イベント駆動アーキテクチャ|
|[Configuration](index02_nginx_configuration_doc.md)|nginx.confの構造、主要ディレクティブ|
|[ReverseProxy\&LoadBalancing](index03_nginx_reverseproxy&loadbalancing_doc.md)|proxy_pass、upstream、負荷分散アルゴリズム|
|[StaticContent\&Caching](index04_nginx_staticcontent&caching_doc.md)|静的配信、proxy_cache、gzip圧縮|
|[Security](index05_nginx_security_doc.md)|SSL/TLS、アクセス制御、レートリミット|
|[Logging\&Monitoring](index06_nginx_logging&monitoring_doc.md)|アクセスログ、エラーログ、ステータスモジュール|
