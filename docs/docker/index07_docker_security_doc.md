# Security

## rootlessモード

rootlessモードは、Dockerデーモン自体を非特権ユーザとして動作させる仕組みです。ただしKubernetes環境ではdockerd自体が介在しないため、この機能は主に単体でのDocker運用時に関係する内容です。Kubernetes側での「非root実行の強制」はPod Security（`runAsNonRoot`など）で扱います。

## Capabilitiesの制限

Linux Capabilitiesの仕組みを利用し、Dockerはコンテナに付与する権限を絞り込めます（`--cap-drop ALL`で全削除した上で必要な分だけ`--cap-add`する、などの運用）。Kubernetes環境では、これらはdocker runのオプションではなく、PodマニフェストのsecurityContext.capabilitiesとして宣言的に設定します。

## seccomp / AppArmorプロファイル

コンテナ内のプロセスが呼び出せるシステムコールやファイルアクセス範囲を、Capabilitiesよりさらに細かく制限する仕組みです。Dockerでは`--security-opt`で指定しますが、Kubernetes環境ではPodマニフェストのsecurityContext.seccompProfileやAppArmorアノテーションとして同様の設定を行います。

## イメージスキャンと脆弱性管理

コンテナイメージのベースイメージやパッケージに起因する既知の脆弱性（CVE）を検出する仕組みです。TrivyやGrypeといったOSSスキャナをCI/CDパイプラインに組み込んでビルド時にチェックする運用が一般的で、これはKubernetesを使う場合でも変わらず重要な工程です。ベースイメージを最小限にする（distroless、alpineなど）、定期的に更新するといった対策も同様に有効です。
