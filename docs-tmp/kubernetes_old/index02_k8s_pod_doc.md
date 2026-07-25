# Pod

## Container

コンテナに対しては、コンテナ名や利用するコンテナイメージ、通信を受け付けるポートなどを指定できます。

```yaml
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          ports:
            - containerPort: 80
```

### 環境変数

Podに対して、環境変数を設定できます。

```yaml
env:
  - name: APP_ENV
    value: "production"
  - name: LOG_LEVEL
    value: "info"
```

### リソースの下限と上限

RequestとLimitを使用して、コンテナが利用するCPUとメモリの下限と上限を設定できます。

```yaml
resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "250m"
    memory: "256Mi"
```

コンテナは上限を超えてリソースを使用することができません。
リソース超過時には以下の挙動になります。

* CPU超過時：スロットリング（速度制限）
* メモリ超過時：OOMKilled（コンテナ再起動）

### Quality of Service（QoS）

ノードのリソースが圧迫した際には、PodがノードからEvic（追い出し）されます。
RequestとLimitの設定パターンによって、優先的にEvicされるPodが決定します。

| QoSクラス | 条件 | Evictの優先度 |
|---|---|---|
| Guaranteed | 全コンテナで requests と limits が完全に同じ値 | 最も落ちにくい |
| Burstable | requests はあるが limits と異なる（または一部のみ設定） | 中間 |
| BestEffort | requests も limits も未設定 | 最も先に落とされる |

### 状態チェックとライフサイクル

readinessProbeとlivenessProbeを利用すると、コンテナの状態をチェックできます。
両者の違いは以下になります。

| 項目 | readinessProbe | livenessProbe |
|---|---|---|
| 判定内容 | 今リクエストを受け付けられる状態か | プロセスがそもそも生存しているか |
| 失敗時の挙動 | ServiceのEndpointsから外れ通信が来なくなる（再起動はしない） | コンテナが強制終了される |
| 主な用途 | 起動直後の準備、依存先障害による一時的な隔離 | 障害復旧 |
| デプロイ戦略との関係 | 成功して初めて新しいPodがReadyとしてカウントされ、maxSurge/maxUnavailableの計算対象になる | 直接は関係しない |

```yaml
readinessProbe:
  httpGet:
    path: /healthz
    port: 80
  initialDelaySeconds: 5
  periodSeconds: 10
```
```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 80
  initialDelaySeconds: 15
  periodSeconds: 20
```

### コンテナセキュリティ

securityContextを利用すると、コンテナのセキュリティを強化できます。

| フィールド | 意味 |
|---|---|
| `runAsUser` / `runAsGroup` | プロセスを実行するUID/GID |
| `runAsNonRoot` | rootユーザー（UID 0）での実行を禁止する |
| `readOnlyRootFilesystem` | 書き込みレイヤを読み取り専用にする |
| `privileged` | ホストへの全権限を許可（原則使わない） |
| `allowPrivilegeEscalation` | 子プロセスがより高い権限を得ることを許可するか |
| `capabilities` | Linux capabilityを個別に追加/削除 |
| `seccompProfile` | 許可するシステムコールを制限 |

### コンテナ内へのファイル出力

（コンテナ再起動やPod再作成によって、ファイルがロストしてしまう可能性はありますが）コンテナ内にはファイルを書き込む（ファイルを出力、ファイルを編集）ことが可能です。
ただし、ログ出力等で無限にファイル出力するとノードのディスク容量を圧迫してしまうため、ephemeral-storageとしてコンテナの容量を制限することができます。

```yaml
resources:
  requests:
    ephemeral-storage: "100Mi"
  limits:
    ephemeral-storage: "500Mi"
```

一方で、コンテナ内の書き込みを許可してしまうと、攻撃者によってマルウェアの設置やファイル改竄が行われるリスクがあります。
そのため`readOnlyRootFilesystem`によってコンテナ内の書き込みを不可にすることが推奨されます。

```yaml
securityContext:
  readOnlyRootFilesystem: true
```

`readOnlyRootFilesystem`を有効化するとコンテナ内に書き込みすることができなくなりますが、ファイルを出力したいケースはありえます。コンテナにマウントしたVolumeについては書き込み禁止の対象外となるため、ephemeral-storageは利用せず、`readOnlyRootFilesystem`を有効化した上でVolumeをマウントすることが推奨されます。

## volume

### emptyDir

上述の通り、コンテナはセキュリティの観点からルートディレクトリの書き込みを不可とすることが推奨されます。
また、コンテナ内でのファイル書き込みはコンテナ内でしか利用できず、Pod内の複数のコンテナでファイルを共有することができません。

`emptyDir`を利用すると、Pod内にボリュームを用意できます。
このボリュームはPod内に用意されるため、Pod再作成によってファイルがロストしてしまう可能性はありますが、コンテナとは独立したリソースのため、複数コンテナでボリュームを共有することが可能です。そのため、「Pod内コンテナ間の一時的なファイル共有」や「ログの一次出力先」等の用途で利用されます。

```yaml
volumes:
  - name: tmp-storage
    emptyDir:
      sizeLimit: 500Mi
```

```yaml
volumeMounts:
  - name: tmp-storage
    mountPath: /tmp
```

emptyDirには、サイズ上限を設定できます。

### ノードのメモリを使用

ボリュームに`medium:Memory`を指定すると、tmpfs（ノードのメモリ）をボリュームとして利用できます。
これはファイルの読み書きが高速になる一方で、ノードのメモリを食い尽くすリスクがあるため、`sizeLimit`を併せて指定しておくことが推奨されます。

```yaml
  volumes:
    - name: cache-storage
      emptyDir:
        medium: Memory
        sizeLimit: 100Mi
```

## Pod

### Pod数

replicasにて、Pod数を定義できます。

### Pod置換戦略

Podテンプレートの内容が変わったときに、新旧のPodをどう入れ替えるかを制御できます。

| 戦略 | 挙動 | ダウンタイム | 新旧Podの同時存在 |
|---|---|---|---|
| RollingUpdate（デフォルト） | 新旧を混在させながら段階的に置き換え | なし | あり |
| Recreate | 旧Podを全削除してから新Podを作成 | あり | なし |

#### 削除時の猶予時間

terminationGracePeriodSecondsを利用すると、Podが削除されるまでの時間を制御できます。
デフォルトでは30秒で強制終了します。

#### デプロイが失敗とみなすまでの時間

#### 安定稼働までの時間

#### ロールバック用に残す世代数


## ServiceAccount

## initContainers




## ephemeralContainers



## imagePullSecrets






#### restartPolicy
terminationGracePeriodSeconds


### ネットワーク

| フィールド | 用途 |
|---|---|
| `hostNetwork` / `hostPID` / `hostIPC` | ノードのネットワーク/PID/IPC namespaceを直接共有するか（通常は使わない） |
| `dnsPolicy` / `dnsConfig` | Pod内で使うDNS設定のカスタマイズ |
| `hostAliases` | Pod内の/etc/hostsに追加するエントリ |
| `hostname` / `subdomain` | Pod自体のホスト名（headless Serviceと組み合わせてDNSレコードを持たせる場合など） |



---

上記の例で追加した、Pod自体には含まれないDeployment固有の要素は以下の通りです。

* `metadata.annotations`: `kubectl rollout history`で表示される変更理由などのメタ情報
* `spec.minReadySeconds`: 新しいPodがReady状態になってから、利用可能とみなすまでの待機秒数
* `spec.revisionHistoryLimit`: ロールバックのために保持する過去のReplicaSetの世代数
* `spec.progressDeadlineSeconds`: この秒数以内に進捗がない場合、Deploymentが失敗したとみなされる
* `spec.strategy`: デプロイ戦略（詳細は次項）
* `template.metadata.annotations`: Pod自体に付与されるアノテーション（Prometheusのスクレイプ対象指定など）
* `readinessProbe` / `livenessProbe`: Podがトラフィックを受け付けられる状態か、生存しているかを判定するヘルスチェック。RollingUpdate中、`readinessProbe`に失敗しているPodは新しいPodとしてカウントされないため、デプロイ戦略と密接に関係する
* `containers`（複数コンテナ/サイドカー構成）: `containers`配列には複数のコンテナを指定できます。上記では、nginxのアクセスログを収集して転送する`log-shipper`をサイドカーコンテナとして追加しています。両コンテナで`nginx-logs`（emptyDir）を同じPod内でマウントすることで、コンテナ間でのファイル共有を実現しています

### デプロイ戦略

Deploymentが既存のPodを新しいPodに置き換える際の方法は、`spec.strategy`で指定できます。
戦略には`RollingUpdate`と`Recreate`の2種類があります。


## スケジューリング関連（どのノードに配置するか）

| フィールド | 用途 |
|---|---|
| `nodeSelector` | 指定したlabelを持つノードにのみ配置（例: `disktype: ssd`） |
| `affinity` | `nodeAffinity`（ノード条件）、`podAffinity`/`podAntiAffinity`（他Podとの近さ/離れ具合）をより柔軟に指定 |
| `tolerations` | ノードのtaint（配置制限）を許容し、そのノードに配置されられるようにする |
| `topologySpreadConstraints` | ゾーンやノードにPodを均等に分散させる |
| `schedulerName` | 使用するスケジューラーを指定（デフォルト以外のカスタムスケジューラーを使う場合） |
| `priorityClassName` | Pod同士の優先度（Evictや配置順に影響） |



