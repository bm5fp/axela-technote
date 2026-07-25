# Pod&Deployment

k8sでは、複数のコンテナおよび関連リソースをまとめたPodをリソースの最小単位として扱います。
PodはDeploymentを介して間接的に作成、管理します。

## Deploymentの全体像

Deploymentは、大きく3つの要素で構成されます。

* Deployment：世代管理、入れ替え方針を担当
* ReplicaSet：Pod数の維持を担当
* Pod：コンテナの実体

![DeploymentOverview](index02_k8s_pod&deployment_image01.png)

### Deplymentのマニフェストファイル例

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
  annotations:
    kubernetes.io/change-cause: "nginx 1.25 rollout"
spec:
  # --- Deploymentのみ ---
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  revisionHistoryLimit: 5
  progressDeadlineSeconds: 600
  paused: false

  # --- ReplicaSetへコピーされる ---
  replicas: 3
  minReadySeconds: 5
  selector:
    matchLabels:
      app: nginx

  # --- template = Podのひな形 ---
  template:
    metadata:
      labels:
        app: nginx
      annotations:
        prometheus.io/scrape: "true"
    spec:

      # -スケジューリング関連-
      nodeSelector:
        disktype: ssd
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: disktype
                    operator: In
                    values: ["ssd", "nvme"]
      tolerations:
        - key: "dedicated"
          operator: "Equal"
          value: "frontend"
          effect: "NoSchedule"
      schedulerName: default-scheduler
      priorityClassName: high-priority
      runtimeClassName: gvisor

      # -コンテナ関連-
      initContainers:
        - name: wait-for-db
          image: busybox:1.36
          command: ["sh", "-c", "until nc -z db-service 5432; do sleep 2; done"]
      # ephemeralContainers は kubectl debug 等のサブリソース経由で追加するため、通常はここには書かない
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
          volumeMounts:
            - name: shared-data
              mountPath: /var/log/nginx
        - name: log-shipper
          image: fluent/fluent-bit:2.2
          volumeMounts:
            - name: shared-data
              mountPath: /var/log/nginx
              readOnly: true
      volumes:
        - name: shared-data
          emptyDir: {}

      # -セキュリティ関連-
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 2000
      serviceAccountName: nginx-sa
      automountServiceAccountToken: false
      imagePullSecrets:
        - name: my-registry-secret

      # -ライフサイクル関連-
      restartPolicy: Always
      terminationGracePeriodSeconds: 30

      # -ネットワーク関連-
      hostNetwork: false
      hostPID: false
      hostIPC: false
      dnsPolicy: ClusterFirst
      dnsConfig:
        options:
          - name: ndots
            value: "2"
      hostAliases:
        - ip: "10.0.0.5"
          hostnames:
            - "internal-api.example.com"
      hostname: web-1
      subdomain: my-app
      enableServiceLinks: false
```

## リソース名

Deployment、Replicaset、Pod、コンテナには名前を付与できます。

| 対象 | 決め方 | 命名形式 | 使える文字 | 一意性の範囲 | 例 |
| --- | --- | --- | --- | --- | --- |
| Deployment名 | 手動 | 任意 | 小文字英数字・ハイフン・ドット | 同namespace内のDeployment同士 | `nginx-deployment` |
| ReplicaSet名 | 自動生成 | `<Deployment名>-<pod-template-hash>` | 小文字英数字・ハイフン・ドット | 同namespace内のReplicaSet同士 | `nginx-deployment-7d8f9c9d8b` |
| Pod名 | 自動生成 | `<Deployment名>-<pod-template-hash>-<ランダム値>` | 小文字英数字・ハイフン・ドット | 同namespace内のPod同士 | `nginx-deployment-7d8f9c9d8b-a1b2c` |
| コンテナ名 | 手動 | 任意 | 小文字英数字・ハイフン | 同じPod内のみ | `nginx` |

### Pod Template Hash

Podテンプレートハッシュは、Podテンプレートの世代です。
マニフェストファイルのPodテンプレートのを変えてデプロイすると新しいPodテンプレートハッシュ値が生成されます。
ReplicaSetやPodは、Podテンプレートハッシュ値が名前に自動的に付与されます。
Replicasetには、レプリカ数などのフィールドもありますが、これらを変更しただけではPodテンプレートの世代は変わりません。
あくまでPodテンプレートを変更した場合、新しいReplicaSetが作成され、Podが新しく生成されます。

### コンテナ名

コンテナにも名前は付与できます。
ただし、DeploymentやReplicaset、Podのようなk8sリソースと異なり、コンテナはMetadata内に定義はせず、あくまでコンテナのフィールドの1つとして設定します。
これはコンテナがk8sリソースではないためです。

## LabelとAnnotation

Deployment、Replicaset、Podについては、LabelとAnnotationにより、Metadata内でメタ情報を定義できます。
両者の違いや使い分けは以下の通りです。

| 項目 | label | annotation |
| --- | --- | --- |
| 日本語 | 付け札 | 注釈 |
| 目的 | リソースの識別・分類 | リソースへの補足情報付与 |
| k8sでの利用 | する（Selectorによる紐付け・絞り込みに利用） | しない（コントローラやツールが読むだけ） |
| 主な用途 | Deployment↔Podの紐付け、kubectlコマンドでの絞り込み | 変更履歴、クラウドによる機能拡張 |
| 値の形式・制約 | 比較的厳格（文字列） | 緩め（自由なテキスト、JSON、等） |

### appラベル

慣習的にPodには「app」ラベルを付与し、appラベルをReplicaSetのselectorとして使用することで、ReplicaSetとPodを紐づけます。

## Container

コンテナには、多数のフィールドが用意されています。

### 基本情報・起動コマンド

| フィールド | 用途 |
| --- | --- |
| `name` | コンテナ名 |
| `image` | 使用するコンテナイメージ |
| `imagePullPolicy` | イメージの取得方針（Always / IfNotPresent / Never） |
| `command` | コンテナのエントリポイントを上書き |
| `args` | エントリポイントに渡す引数 |
| `workingDir` | プロセスの作業ディレクトリ |

#### image

コンテナイメージは、以下のような形式で定義します。

* [レジストリホスト[:ポート]/]リポジトリ名[:タグ | @ダイジェスト]
* 例）gcr.io/my-project/my-app:v1.2.3

:latestは「常に最新版を指す、移動するタグ」なので、同じマニフェストを再適用しても違うイメージが使われる可能性があり、Kubernetesの「宣言的で再現性のある管理」という思想と相性が悪いです。
一方、イメージを更新してもマニュフェストファイル上に変化がないため、k8sが変更とみなさず、Podをデプロイできないこともあります。そのため、k8sでは:latestを利用しないことが推奨されます。

#### imagePullPolicy

imagePullPolicyは、コンテナ起動時にイメージをレジストリから取得（pull）するかどうかの方針です。

* Always（デフォルト）：Pod再作成時に毎回イメージを取得し直す。
* IfNotPresent：ノード上に同じタグのイメージが既にあれば、それを使い回します。
* Never：レジストリには一切問い合わせません。ノード上に無ければ起動失敗します。

AlwaysはPodが再作成のたびにレジストリからイメージを取りに行くため起動が遅くなり、またレジストリの負荷が増加するため、これらが課題となる場合には別の方針を検討します。

#### commandとargs、workingDir

Command, args, workingDirは、いずれもコンテナイメージにDockerfileで焼き込まれたデフォルト設定を上書きするためのフィールドです。
通常は上書きする必要性はないですが、以下のような用途では利用するケースがあります。

* 汎用イメージを、用途に応じて異なるコマンドで動かしたい場合
* デバッグ目的で、イメージ本来の起動処理をせずsleep infinityだけ実行させ、kubectl execで中に入りたい場合
* initContainersで使う軽量イメージに、特定のワンショット処理だけ実行させたい場合（マニュフェスト例のwait-for-dbの例もこのパターン）

### ネットワーク・環境変数

| フィールド | 用途 |
| --- | --- |
| `ports` | 待ち受けるポート（containerPort, protocolなど） |
| `env` | 環境変数を個別に指定 |
| `envFrom` | ConfigMap/Secretの中身をまとめて環境変数として注入 |

#### envFrom

envFromは、ConfigMapやSecretの中身をまとめて丸ごと環境変数として注入するためのフィールドです。
envが1つずつ個別指定するのに対し、envFromは一括インポートです。詳細については、Cofigmap/Secretの章に記載するため、ここでは割愛します。

### リソース・ストレージ

| フィールド | 用途 |
| --- | --- |
| `resources` | requests/limits（CPU・メモリの下限上限） |
| `resizePolicy` | 稼働中のコンテナに対するCPU/メモリの動的リサイズ方針 |
| `volumeMounts` | volumeをファイルとしてマウントする場所 |
| `volumeDevices` | volumeをブロックデバイスとして直接使う場合の設定 |

#### resources

コンテナが利用するCPUやメモリの下限上限を設定するためのフィールドです。
コンテナは上限を超えてリソースを使用することができません。
リソース超過時には以下の挙動になります。

* CPU超過時：スロットリング（利用制限）
* メモリ超過時：OOMKilled（コンテナ再起動）

#### resizePolicy

稼働中のPodに対して、CPU/メモリのresources（requests/limits）をPod再起動なしで動的に変更する際の挙動を制御するフィールドです。

* NotRequired（デフォルト）：再起動せずその場で反映
* RestartContainer：コンテナを再起動して反映

CPUはスロットリングで済むためNotRequiredにして無停止でリサイズし、メモリは動的な上限拡張がランタイム側でサポートされにくいためRestartContainerにする、といった使い分けが一般的です。

### ヘルスチェック

| フィールド | 用途 |
| --- | --- |
| `readinessProbe` | トラフィックを受け付けてよいかの判定 |
| `livenessProbe` | 生存しているかの判定 |
| `startupProbe` | 起動が遅いアプリ向け。成功するまでliveness/readinessの判定を開始しない |

#### readinessProbe

コンテナがトラフィックを受け付けてよい状態かを判定します。
起動直後のウォームアップ中や、DB接続断など一時的に処理できない間、ユーザーリクエストを避けるために利用します。
失敗時はServiceから一時的に外されトラフィックが来なくなりますが、コンテナは再起動しません。

#### livenessProbe

コンテナが生きているか（デッドロックなど、応答不能に陥っていないか）を判定します。
アプリがフリーズして応答しなくなった場合に自動復旧させるために利用します。
失敗時はコンテナを再起動（kill → restart）します。

#### startupProbe

アプリの起動が完了したかを判定します。起動が遅いアプリ向けの機能です。
readinessProbeとlivenessProbeは、startupProbeが成功してから判定が開始されます。
起動に数十秒〜数分かかるレガシーアプリなどで、livenessProbeのinitialDelaySecondsを長くする代わりに使います。（起動完了後はlivenessProbeが本来の間隔で監視を引き継ぎます。）
startupProbeが未設定の場合は、すぐにreadinessProbeとlivenessProbeの判定は開始されます。
startupProbeが失敗した場合、コンテナは再起動します。

#### readinessProbeのProbe初回実行待機時間とstartupProbe

livenessProbeは、コンテナ起動後最初のProbeを実行するまでの待ち時間を指定できます。
そのため、大体の起動時間が推定できる場合はreadinessProbeだけでアプリの起動を吸収できます。

一方でstartupProbeを利用すると、待ち時間に依存せず、確実にアプリの起動を検知できます。
また、readinessProbeはlivenessProbeとは独立しているため、livenessProbeの誤発火を防げませんが、startupProbeであれば防げます。

つまり、startupProbeは「起動が遅い＆ばらつくアプリで、livenessProbeによる誤った再起動ループを防ぐ」ために導入される専用機能で、Probe初回実行待機時間（initialDelaySeconds）の固定待ちでは代替できない場合に利用します。

#### Probeのフィールド

3つのProbeのフィールドはどれも同じです。

* initialDelaySeconds（デフォルト0秒）：コンテナ起動後、最初のProbe実行までの待ち時間
* periodSeconds（デフォルト10秒）：Probeの実行間隔
* timeoutSeconds（デフォルト1秒）：Probe自体のタイムアウト時間
* successThreshold（1回固定）：失敗状態から成功と判定するのに必要な連続成功回数
* failureThreshold（デフォルト3回）：成功状態から失敗と判定するのに必要な連続失敗回数

#### Probeの判定方式

4つの判定方式があります。

* httpGet：HTTPリクエストを送り、レスポンスコードで判定
* tcpSocket：指定ポートへのTCP接続確立可否で判定
* exec：コンテナ内で任意のコマンドを実行し、終了コードで判定
* grpc：gRPCのHealth Checking Protocolを使って判定

### ライフサイクルフック

| フィールド | 用途 |
| --- | --- |
| `lifecycle.postStart` | コンテナ起動直後に実行する処理 |
| `lifecycle.preStop` | コンテナ終了前（SIGTERM送信前）に実行する処理 |
| `restartPolicy` | サイドカーコンテナ向け（initContainers内でAlwaysを指定する新しいパターン） |

#### lifecycle.postStart

lifecycle.postStartは、コンテナのメインプロセス（command/argsで指定したもの）と並行して、コンテナ起動直後に一度だけ実行されるフックです。
完了するまでコンテナはRunning扱いになりません。
失敗するとコンテナがkillされます。

以下のような用途で利用されます。

* 起動直後に外部システム（サービスディスカバリ等）へ自身を登録する
* 設定ファイルの動的生成やウォームアップ処理
* 起動ログの送出

#### lifecycle.preStop

lifecycle.preStopは、コンテナにSIGTERMが送られる前に実行されるフックです。
グレースフルシャットダウン（処理中の処理を強制中断させず、完了してから安全に終了させる）のために利用されます。

終了の流れは以下となります。

1. PodのステータスがTerminatingになる（同時にServiceからは即座に除外）
2. preStopフック実行
3. フック完了後SIGTERM送信
4. terminationGracePeriodSeconds以内にプロセスが終了しなければSIGKILL

以下のような用途で利用されます。

* Connection Drainingのための待機
* グレースフルシャットダウンのトリガー
* 外部システムからの登録解除

#### restartPolicy（for Container）

※restartPolicyにはコンテナとPodのレベルがあり、ここではコンテナレベルについて説明します。

initContainers配下の個別コンテナにrestartPolicy:Alwaysを指定すると、そのコンテナは「サイドカーコンテナ」として扱われるようになります。

以前はcontainers（通常のコンテナ）に同居させるしかなく、「メインアプリより先に起動完了させたい」「メインアプリより後に終了させたい」という順序制御ができませんでした。
この機能により、initContainersの起動順序制御を活かしつつ、常駐プロセスとして動かせるようになりました。

通常のコンテナには、restartPolicyは指定できません。
通常のコンテナはPodレベルのrestartPolicyに従います。

### セキュリティ・その他

| フィールド | 用途 |
| --- | --- |
| `securityContext` | コンテナレベルの権限設定 |
| `terminationMessagePath` | 異常終了時、終了メッセージを書き出すファイルパス |
| `terminationMessagePolicy` | 終了メッセージの取得方法（File / FallbackToLogsOnError） |
| `stdin` / `stdinOnce` / `tty` | kubectl attach等で対話的にアタッチする際の設定 |

#### securityContext

securityContextは、コンテナがどのユーザー/権限で動くかを制御するフィールドです。
※securityContextにはコンテナとPodのレベルがあり、ここではコンテナレベルについて説明します。

* runAsUser：実行時のUID
* runAsGroup：実行時のGID
* runAsNonRoot：trueだとroot（UID 0）で起動しようとした場合に起動失敗させる
* readOnlyRootFilesystem：ルートファイルシステムを読み取り専用にする
* allowPrivilegeEscalation：sudo等で権限昇格することを許可するか
* privileged：ホストへのフルアクセスを持つ特権コンテナにするか
* capabilities：Linux capabilityの追加(add)・削除(drop)
* seccompProfile：使用可能なシステムコールを制限するプロファイル

#### terminationMessagePath/terminationMessagePolicy

CrashLoopBackOffのようにコンテナが繰り返しクラッシュする状況では、`kubectl logs --previous`などのログによる原因調査には手間や制約があります。

terminationMessagePathとterminationMessagePolicyは、Pod内でコンテナが再起動した際に、再起動理由をkubectl describe podで即座に確認できるようになります。

terminationMessagePathは、describe podに残すメッセージを書き込むコンテナ上のログファイルのパスです。
デフォルトでは、`/dev/termination-log`になります。

terminationMessagePolicyは、terminationMessagePathの内容をどう取得するかを決めるフィールドです。

* File（デフォルト）：ファイル内容をそのまま使う。アプリが何も書き込んでいなければ空のまま
* FallbackToLogsOnError：異常終了時（終了コードが非ゼロ）で、かつファイルが空の場合、代わりにコンテナの最後のログ出力（stdout/stderr）の末尾を使う

## Volume

| フィールド | 用途 |
| --- | --- |
| `name` | このvolumeの名前（volumeMountsから参照するため必須） |
| `emptyDir` | 空の一時ディレクトリ（Pod削除で消える、コンテナ間共有可） |
| `hostPath` | ノードのファイルシステムを直接マウント |
| `configMap` | ConfigMapの中身をファイルとしてマウント |
| `secret` | Secretの中身をファイルとしてマウント |
| `persistentVolumeClaim` | PersistentVolumeClaim経由で永続ストレージをマウント |
| `projected` | 複数のvolume source（configMap/secret/downwardAPI等）を1つのディレクトリに統合 |
| `downwardAPI` | Pod自身のメタ情報（labels, annotations, resource値等）をファイルとして公開 |
| `csi` | CSIドライバー経由の外部ストレージ（クラウドディスク等） |
| `nfs` | NFS共有を直接マウント（レガシー、CSI移行が推奨） |

## Pod

### コンテナ関連フィールド

#### initContainers

initContainersは、メインコンテナ（containers）が起動する前に、コンテナを順番に実行・完了できる仕組みです。特徴は以下の通りです。

* 逐次実行（initContainersが複数ある場合上からシーケンシャルに実行）
* 完了必須（各initContainerは正常終了するまで次に進まない。失敗するとPodのrestartPolicyに従ってPod全体がリトライ）
* 全て完了後にメインコンテナ起動

用途としては以下になります。

* 依存サービスの起動待ち（DBやAPIなど依存先の起動チェック）
* 設定ファイルやシークレットの準備（emptyDir経由で設定をメインコンテナに渡す）
* マイグレーション処理（DBスキーマの初期化、データ移行など）

※initContainers内のコンテナにrestartPolicy: Alwaysを指定すると、常駐するサイドカーとして扱われる特殊パターンもあります。これは通常のinitContainer（一度きりで完了）とは異なる挙動になる点に注意する必要があります。

#### ephemeralContainers

ephemeralContainersは、すでに動いているPodに、デバッグ目的で一時的にコンテナを追加するための機能です。
マニフェストに直接書くものではなく、kubectl debugコマンド経由で使うのが基本です。

* kubectl debug -it <エフェメラルコンテナ名> --image=<コンテナイメージ> --target=<対象Pod>

エフェメラルコンテナを使用して、デバッグや障害調査を実施できます。

### スケジュール関連フィールド

#### nodeSelector

nodeSelectorは、Podをどのノードに配置するかを制約する、最もシンプルなスケジューリング機能です。
各ノードには付与したLabelをキーにします。

#### affinity

affinityは、Podをどのノードに配置するか（または他のPodとの位置関係）を制御する、nodeSelectorより表現力の高いスケジューリング機能です。3種類あります。

* nodeAffinity：nodeSelectorの上位互換。OR条件やNOT条件も指定可能。
* podAffinity：特定のラベルを持つPodと同じノードに配置
* podAntiAffinity：特定のラベルを持つPodとは別のノードに配置

3種類とも、必須または希望の2段階のレベルで指定することができます。

#### tolerations（+tait）

（nodeSelector/affinityが「Podがノードを選ぶ」仕組みなのに対し）、taint/tolerationは逆に「ノードがPodを拒否する」仕組みです。

事前にノードにはtaint（汚れ）を付与しておきます。
Podには、tolerationを設定することで、taintの許容を宣言できます。

taintが付いたノードには、対応するtolerationを持つPodだけがスケジュール可能になります。何もtolerationを持たないPodはそのノードを避けます。

主な用途は以下となります。

* 専有ノードの確保（GPUノードを特定Pod専用に）
* ControlPlaneノードの保護（マスターノードには標準でNoScheduleのtaintが付いており、一般のPodは乗らない）
* 障害ノードからの退去（ノードがNotReady等になると自動でtaintが付き（NoExecute）、対応するtolerationがないPodは退去させられる）

#### schedulerName

k8sでは、標準のkube-schedulerとは別に、独自のスケジューリングロジックを持つカスタムスケジューラをクラスタに追加でデプロイし、Podごとに使うスケジューラを切り替えられます。

schedulerNameは、Podのスケジューラを指定するフィールドです。

### ライフサイクル関連フィールド

#### restartPolicy（for Pod）

※restartPolicyにはコンテナとPodのレベルがあり、ここではPodレベルについて説明します。

Pod内のコンテナが終了したときに、Podとして再起動させるかどうかの方針です。
3つの値がありますが、Deploymentについては、Always（常に再起動）のみです。残りはJobやDaemonSetの場合に指定できます。

* Always（デフォルト）：終了コードにかかわらず常に再起動
* OnFailure：異常終了（終了コードが非ゼロ）の場合のみ再起動
* Never：再起動しない（終了したらそのまま）

Pod単位での指定のため、コンテナごとに変えられません。
ただし、サイドカー用の特殊フィールドは別になります。

#### terminationGracePeriodSeconds

terminationGracePeriodSecondsは、Pod削除時にSIGTERM送信からSIGKILLまでの猶予時間を指定するフィールドです。
デフォルトは30秒です。
Pod削除時の流れは以下となります。

1. Pod削除がトリガー（Terminating状態に）
1. lifecycle.preStop フック実行
1. SIGTERM送信
1. terminationGracePeriodSeconds 経過
1. まだプロセスが残っていればSIGKILLで強制終了

terminationGracePeriodSecondsは、①～④までの時間となります。

### ネットワーク関連フィールド

#### hostNetwork/hostPID/hostIPC

hostNetworkは、Podに独自のネットワーク名前空間を持たせず、ノード（ホスト）のネットワーク名前空間をそのまま使わせる設定です。
hostPIDは、Podに独自のPID名前空間を持たせず、ノード（ホスト）のPID名前空間をそのまま使わせる設定です。
hostIPCは、Podに独自のIPC名前空間を持たせず、ノード（ホスト）のIPC名前空間をそのまま使わせる設定です。

いづれも、デフォルトはfalseであり、特別な要件がない限り利用しません。

※IPC（Inter-Process Communication）は、同一マシン上のプロセス間でメモリを共有したり通知し合う仕組み

#### dnsPolicy/dnsConfig

dnsPolicyは、PodがDNS解決にどのリゾルバ（DNSサーバー）を使うかを決めるフィールドです。

* ClusterFirst（デフォルト）：クラスタ内DNS（CoreDNS等）を優先的に使う
* Default：クラスタ内DNSを使わず、ノードの/etc/resolv.confをそのまま使う
* None：DNS設定を一切自動で行わない。

dnsConfigは、dnsPolicyが決めた土台の上に、追加のDNS設定を上乗せ・カスタマイズするためのフィールドです。
具体的なフィールドと用途例は以下となります。

* nameservers：追加のDNSサーバーIPを指定→社内プライベートDNSサーバーを併用したい
* searches：追加の検索ドメイン→独自の検索ドメインを追加したい
* options：resolv.confの各種オプション（ndots、timeout等）→名前解決のパフォーマンスチューニング

※「検索ドメイン」とは、DNS解決の際に省略されたドメイン名を補完するために自動で付加されるサフィックスのこと

#### hostAliases

hostAliasesは、Pod内の/etc/hostsファイルに独自のIP-ホスト名のマッピングを追加するフィールドです。


#### hostname/subdomain

hostnameは、Pod内のカーネルレベルのホスト名（hostnameコマンドで返る値）を指定するフィールドです。デフォルトでは、Pod名がそのまま使われます。
subdomainは、hostnameと組み合わせて、クラスタ内DNSで名前解決可能なFQDNを構成するためのフィールドです。

hostname/subdomeinは、ヘッドレスServiceにおいて、両者揃って初めて機能します。
※ヘッドレスServiceは、Service自体にIPを持たせず、代わりに配下の各Podに個別のDNSレコードを発行するという特殊な動作をします。

#### enableServiceLinks

enableServiceLinksは、Pod起動時に同一Namespace内の既存Serviceの接続情報を、環境変数として自動注入するかどうかを制御するフィールドです。
デフォルトはtrueですが、これはKubernetesがDNSベースのService Discovery（CoreDNS）を導入する以前からある古い仕組みで、後方互換性のために残っています。

DNSベースの名前解決（my-service.my-namespace.svc.cluster.local）が標準的な現在では、この環境変数方式に依存する理由はほぼなく、Namespace内のService数が多い環境や、意図しない環境変数汚染を避けたい場合はenableServiceLinks: falseにするのが安全側の選択です。

### セキュリティ関連フィールド

#### securityContext（for Pod）

※securityContextにはコンテナとPodのレベルがあり、ここではPodレベルについて説明します。

securityContextは、Pod内の全コンテナに適用されるデフォルトのセキュリティ設定を定義するフィールドです。
コンテナレベルのsecurityContextと重複するフィールドについては、コンテナ側で同名フィールドを指定するとそちらが優先されます。

Podレベルでしか存在しないフィールドもあり、以下のようなものがあります。

* fsGroup：マウントされたボリュームの所有グループ（GID）を指定
* fsGroupChangePolicy：fsGroupによるファイル所有権変更を毎回行うか（Always）、必要な場合のみ行うか（OnRootMismatch）
* supplementalGroups：コンテナプロセスに追加で付与する副GIDのリスト
* sysctls：Pod単位で変更を許可するカーネルパラメータ
* seLinuxOptions：SELinuxのラベル（user/role/type/level）を指定する

#### ServiceAccountName/automountServiceAccountToken

ServiceAccountNameは、Podがk8sのAPIにアクセスする際に使うServiceAccountを指定するフィールドです。指定しない場合はそのNamespaceのデフォルトServiceAccountが使われます。
ServiceAccountは「Podに紐づく認証アイデンティティ」で、Podはこのアカウントのトークンを使ってk8s APIを呼び出します。
ServiceAccountにRBAC（Role/RoleBinding、ClusterRole/ClusterRoleBinding）で権限を紐付けます。

automountServiceAccountTokenは、ServiceAccountのトークンを、Pod内に自動マウントするかどうかを制御するフィールドです。
デフォルトはtrueです。
マウントしてないとAPIアクセスができませんが、後から明示的にマウントすればfalseでもAPIを利用することが可能です。
明示的なマウントでは、期限付きトークンや利用先を限定も指定できるため、単純な自動マウントより安全です。
よって、実務上のベストプラクティスは「デフォルトの自動マウントは切り、必要なコンテナにだけ明示的・限定的にトークンを渡す」という構成になります。

#### imagePullSecrets

imagePullSecretsは、プライベートなコンテナレジストリからイメージをpullする際の認証情報をPodに指定するフィールドです。

レジストリの認証情報を格納したSecretを事前に作成し、そのSecret名をこのフィールドで参照します。
kubeletがコンテナイメージをpullする際、ここで指定されたSecretの認証情報を使ってレジストリにログインします。

ECR/GCR/ACRやプライベートなHarbor等、認証が必要なレジストリを使う場合に設定します。
ただし、ServiceAccountのimagePullSecretsフィールドに紐付けておくと、そのServiceAccountを使う全Podに自動適用されるので、Podのこのフィールドで設定する必要はありません。

## Deployment&ReplicaSet

### ReplicaSet

ReplicaSetはPod数の維持を担当します。

#### replicas/selector

replicasは、ReplicaSetが維持すべきPodの数を指定するフィールドです。
selectorで指定したラベルに一致するPodを「自分の管理下」としてカウントします。

#### minReadySeconds

minReadySeconds は、PodがReady状態になってから、「利用可能（Available）」と見なすまでの最低待機時間を指定するフィールドです。

ReadinessProbe自体は「今このPodにトラフィックを送ってよいか」を継続的に判定する一方、minReadySecondsは「その判定が出てからさらにどれだけ待つか」というデプロイ時1回きりの追加の安全装置、という位置づけです。

### Deployment

Deploymentは世代管理、入れ替え方針を担当します。

#### strategy

strategyは、DeploymentがPodを新しいバージョンに入れ替える際の方式を指定するフィールドです。

* RollingUpdate（デフォルト）：段階的に入れ替え。ダウンタイムなし。
* Recreate：既存Podを全て削除、新Podを一斉作成。ダウンタイムあり。

#### revisionHistoryLimit

revisionHistoryLimitは、ロールバックのために保持しておく過去のReplicaSetの数を指定するフィールドです。
デフォルトは10です。
Deploymentは更新のたびに新しいReplicaSetを作成し、古いReplicaSetは（Pod数を0にした状態で）削除せずに残しておく仕組みになっています。

#### progressDeadlineSeconds

progressDeadlineSeconds は、ロールアウト（新しいPodへの入れ替え）がこの秒数以内に進捗しなければ「失敗」と判定するタイムアウト値を指定するフィールドです。
デフォルトは10分です。

#### paused

pausedは、Deploymentのロールアウトを一時停止するかどうかを指定するフィールドです。
trueにすると、spec.templateを変更してもロールアウトが自動的には開始されなくなります。
falseに戻すと、溜まっていた変更差分を反映する形でロールアウトが開始されます。

## ContainerとPod、Deployment/Replicasetの状態


