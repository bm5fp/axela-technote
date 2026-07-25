# Compose

Docker Composeは、複数コンテナで構成されるアプリケーションをYAMLで宣言的に定義・起動するツールです。主にローカル開発環境や単体のDocker運用で使われるもので、Kubernetesを前提とする場合、本番環境でのオーケストレーションはKubernetesのマニフェスト（Deployment, Serviceなど）が担うため、Composeの出番は限定的です。概要のみ押さえておきます。

## docker-compose.ymlの構造

`services`(起動するコンテナの定義)、`networks`、`volumes`といったトップレベルキーで構成されます。`docker compose up`/`down`で一括起動・停止します。

## マルチコンテナ構成の定義

Webサーバ・DBなど複数の役割を持つコンテナ群を1つの定義にまとめ、サービス名を使って相互に通信させることができます。

## depends_onとヘルスチェック連携

`depends_on`でサービス間の起動順序を制御できます。`condition: service_healthy`と組み合わせると、依存先のHEALTHCHECKが成功するまで起動を待たせることも可能です。

## 環境ごとの設定分離

`.env`ファイルや`docker-compose.override.yml`により、開発・本番などの環境差分を切り替えられます。
