# Networking

Kubernetes環境では、Pod間・Service間の通信はCNIプラグインやServiceが担うため、ここで扱うDocker単体のネットワーク機能は主に単体でのDocker利用時に関係する内容です。概要のみ押さえておきます。

## ネットワークドライバ（bridge, host, overlay, none）

Dockerは「ネットワークドライバ」によってコンテナの接続方式を切り替えられます。デフォルトは仮想ブリッジを使う`bridge`で、他に`host`（ホストのネットワークを共有）、`overlay`（複数ホストにまたがる通信、Docker Swarm向け）、`none`（隔離）などがあります。

## ポートマッピング

コンテナ内のポートをホストに公開する仕組みです（`docker run -p 8080:80`など）。内部的にはiptablesのNATルールで実現されています。

## コンテナ間通信とDNS解決

ユーザ定義ネットワーク上のコンテナは、コンテナ名を使ってIPアドレスを意識せずに通信できます（Dockerデーモンが提供する内部DNSによる名前解決）。

## Docker Composeでのネットワーク

`docker-compose`は定義ごとに専用のネットワークを自動生成し、サービス名で名前解決できるようにします。詳細は[Compose](index06_docker_compose_doc.md)を参照してください。
