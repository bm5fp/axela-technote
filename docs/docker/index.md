# Docker

Dockerは、アプリケーションとその実行に必要な依存関係を「イメージ」としてパッケージ化し、どの環境でも同じように動作させることができるコンテナ型仮想化技術です。namespaceやcgroupsといったLinuxカーネルの機能を活用し、軽量な隔離環境（コンテナ）を実現しています。

## 全体像

Dockerは、ユーザが操作するクライアント（`docker`コマンド）と、実際にコンテナやイメージを管理するデーモン（dockerd）から構成されます。デーモンはさらにcontainerd、runcといった下位のコンポーネントに処理を委譲し、最終的にLinuxカーネルの機能を用いてコンテナを起動します。イメージはレイヤ構造を持ち、Dockerfileに書かれた手順に従って構築されます。

## ドキュメント構成

このドキュメントでは、Dockerの技術概念を以下のカテゴリに分けて整理しています。

|カテゴリ|概要|
|---|---|
|[Architecture](index01_docker_architecture_doc.md)|Docker Engineの全体像、dockerd/containerd/runcの役割分担|
|[Image](index02_docker_image_doc.md)|Dockerfile、レイヤ構造、ビルドプロセス、レジストリ|
|[Container](index03_docker_container_doc.md)|コンテナのライフサイクル、exec/attach/logs、エントリポイント|
|[Networking](index04_docker_networking_doc.md)|ネットワークドライバ、ポートマッピング、コンテナ間通信|
|[Storage](index05_docker_storage_doc.md)|Volume、Bind Mount、tmpfs、データ永続化パターン|
|[Compose](index06_docker_compose_doc.md)|docker-compose.ymlの構造、マルチコンテナ構成|
|[Security](index07_docker_security_doc.md)|rootlessモード、Capabilities、seccomp/AppArmor、脆弱性管理|
