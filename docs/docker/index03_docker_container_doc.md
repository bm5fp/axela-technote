# Container

Kubernetes環境では、コンテナの作成・起動・停止はkubeletが担い、`docker run`/`stop`/`rm`のようなコマンドをユーザが直接使うことはありません（`kubectl`が同等の操作を提供します）。ここではDocker単体での操作イメージを概要として押さえつつ、ENTRYPOINT/CMDのようにDockerfileの書き方としてそのままKubernetesにも関わる部分は詳しく扱います。

## コンテナのライフサイクル（作成/起動/停止/削除）

コンテナはCreated（作成直後）→Running（実行中）→Exited（終了）→Removed（削除済み）といった状態を遷移します。単体のDockerでは`docker run`/`stop`/`rm`で操作しますが、Kubernetes上ではこれらの操作は`kubectl`とkubeletが代替します。

## exec / attach / logs

稼働中のコンテナのデバッグ・状態確認に使うコマンド群です。`docker exec`（コンテナ内で新規プロセスを実行）、`docker logs`（標準出力/エラー出力の確認）などがあり、Kubernetesでは`kubectl exec`/`kubectl logs`がほぼ同等の役割を果たします。

## 環境変数とエントリポイント（ENTRYPOINT, CMD）

コンテナ起動時に実行されるコマンドは、DockerfileのENTRYPOINTとCMDの組み合わせによって決まります。

|命令|概要|
|---|---|
|ENTRYPOINT|コンテナの「主実行コマンド」を固定する|
|CMD|ENTRYPOINTへのデフォルト引数、またはENTRYPOINTが未指定の場合の実行コマンドそのものを指定する|

|指定形式|挙動|
|---|---|
|shell形式（`CMD command param`）|シェル経由で実行される。シグナルがシェル経由になるため伝搬しないことがある|
|exec形式（`CMD ["command", "param"]`）|プロセスを直接起動する。シグナルが正しくプロセスに届くため、通常はこちらが推奨される|

KubernetesのPodマニフェストにある`command`（ENTRYPOINTに対応）と`args`（CMDに対応）は、このDockerfileの仕組みをそのまま上書き・指定するためのフィールドであり、イメージ作成後もKubernetes側から柔軟に挙動を変更できます。

## ヘルスチェック

ヘルスチェックは、DockerfileのHEALTHCHECK命令により、コンテナ内のアプリケーションが正常に応答しているかをDocker自身が定期的に確認する仕組みです。

なお、Kubernetes環境ではこのHEALTHCHECKは利用されず、代わりにKubernetes独自のLiveness/Readiness/Startup Probeが同様の役割を担います。
