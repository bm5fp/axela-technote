# Architecture

## Docker Engineの全体像（クライアント/デーモンモデル）

Dockerは、ユーザが操作する「クライアント（`docker`コマンド）」と、実際の処理を行う「デーモン（dockerd）」に分かれたクライアント/サーバモデルで構成されています。ただしKubernetes環境では、kubeletはCRI経由でcontainerdと直接やり取りし、dockerdは介在しません。そのため、このクライアント/デーモンモデル自体は主にローカルでの`docker`コマンド利用時に関係する内容です。

## dockerd, containerd, runcの役割分担

Docker Engineは、責務ごとに階層化された複数のコンポーネントの組み合わせで実装されています。

|コンポーネント|役割|
|---|---|
|dockerd|イメージのビルド、ネットワーク・ボリュームの管理など、Docker CLIからのリクエストを受け付ける最上位のデーモン|
|containerd|コンテナのライフサイクル管理（作成・起動・停止・削除）を担う、業界標準のコンテナランタイム。CNCFのプロジェクトとして独立している|
|runc|OCI（Open Container Initiative）仕様に基づき、namespaceやcgroupsを実際に操作してコンテナプロセスを生成する低レベルランタイム|

KubernetesのNode上では、kubeletがCRI（Container Runtime Interface）を通じてこのcontainerdを直接呼び出しており、dockerdは経由しません。つまり「Dockerで作ったイメージ」を「containerd/runcがそのまま実行する」という関係になっており、Dockerがビルドツールとして、containerd/runcが実行基盤として使い分けられている形です。

## イメージとコンテナのライフサイクル概要

Dockerにおける中心的な概念は「イメージ」と「コンテナ」であり、両者は明確に区別されます。

|概念|概要|
|---|---|
|イメージ（Image）|アプリケーションの実行に必要なファイル一式をまとめた読み取り専用のテンプレート|
|コンテナ（Container）|イメージを元に生成された、実行中（または実行可能な状態の）インスタンス|

イメージからコンテナを生成する際、イメージのレイヤは読み取り専用のまま使い、その上に書き込み可能な薄いレイヤを1枚追加します（Copy-on-Write）。この「イメージは不変、コンテナは使い捨て」という考え方は、KubernetesのPodにもそのまま引き継がれています。
