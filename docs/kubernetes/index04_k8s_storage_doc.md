# Storage

## Volume

VolumeはPodが利用できるストレージ領域ですが、Podライフサイクルと連動する「一時的なもの」と「永続的なもの」の両方を含む広い概念です。

|種類|概要|
|---|---|
|emptyDir|Pod作成時に生成される空の領域。Pod内の複数コンテナで共有できるが、Pod削除とともに消える|
|hostPath|Nodeのファイルシステム上の特定パスを直接マウントする。デバッグ用途以外では、Node間の可搬性がないため注意が必要|
|configMap / secret|後述するConfigMap/Secretの内容を、ファイルとしてマウントする形式|
|persistentVolumeClaim|後述するPVCを介して、永続的なストレージをマウントする形式|

このように「Volume」はKubernetesにおいて、Pod内でのデータ共有・設定の受け渡し・永続化の全てを包含する抽象概念として使われます。

## PersistentVolume（PV）

PersistentVolume（PV）は、クラスタ管理者（または動的プロビジョニングの仕組み）によって確保された、実際の永続ストレージ領域を表すクラスタスコープのリソースです。

|項目|概要|
|---|---|
|実体|クラウドのディスク（EBS, Persistent Diskなど）、NFS、ローカルディスクなど、様々なバックエンドに対応する|
|ライフサイクル|Podのライフサイクルとは独立して存在し、Podが削除されてもPVは（設定によっては）残り続ける|
|アクセスモード|ReadWriteOnce（単一Nodeからの読み書き）、ReadOnlyMany（複数Nodeからの読み取り専用）、ReadWriteMany（複数Nodeからの読み書き）など|
|回収ポリシー（Reclaim Policy）|紐付いていたPVCが削除された際の挙動。`Retain`（データを保持）、`Delete`（実体ごと削除）などを指定する|

## PersistentVolumeClaim（PVC）

PersistentVolumeClaim（PVC）は、ユーザ（アプリケーション開発者）が「これだけの容量・アクセスモードのストレージが欲しい」と申請するためのリソースです。

|項目|概要|
|---|---|
|申請の仕組み|PVCが作成されると、条件に合致する既存のPV、または動的プロビジョニングによって新規作成されたPVと「バインド」される|
|Podでの利用|Podのマニフェスト内でVolumeとしてPVCを指定することで、対応するPVが実際にマウントされる|
|PVとの関係|PVが「実際に確保された部屋」であるのに対し、PVCは「部屋を借りるための申請書」に例えられる。ユーザはPVの詳細（クラウド側のディスクの実装など）を意識せずに、PVCを通じて抽象化されたストレージを利用できる|

この「PV（提供側）」と「PVC（利用側）」の分離により、インフラ管理者はストレージの実体を管理し、アプリケーション開発者は必要な容量・性能だけを意識してストレージを要求する、という責務の分離が実現されています。

## StorageClass

StorageClassは、PVを動的に生成（動的プロビジョニング）する際のテンプレートを定義するリソースです。

|項目|概要|
|---|---|
|provisioner|実際にストレージを確保する際に使用するプラグイン（クラウドのディスクAPIやCSIドライバ）を指定する|
|parameters|ディスクの種類（SSD/HDD）、パフォーマンス等級など、プロビジョナに渡す詳細パラメータ|
|volumeBindingMode|PVをいつ実際にバインドするか（PVC作成時点か、Podがスケジュールされた時点かなど）を制御する|

StorageClassを利用することで、PVC作成時に対応するPVが存在しなくても、指定したStorageClassに基づいてオンデマンドでPVが自動生成されるため、事前に管理者が大量のPVを手動作成しておく必要がなくなります。

## CSI（Container Storage Interface）

CSI（Container Storage Interface）は、Kubernetesが様々なストレージシステムを統一的な方法で扱うための標準インターフェースです。

|項目|概要|
|---|---|
|標準化の目的|従来はKubernetes本体のコード内にクラウドごとのストレージ連携ロジックが組み込まれていたが、CSIによりストレージベンダ側が独立してドライバを開発・配布できるようになった|
|CSIドライバ|各ストレージシステム（クラウドのブロックストレージ、NFS、分散ストレージなど）に対応した実装。DaemonSetやDeploymentとしてクラスタにデプロイされる|
|Kubernetes本体との関係|Kubernetes自体はCSIの仕様（gRPCインターフェース）を規定するのみで、実際のストレージ操作ロジックは持たない|

CSIの導入により、Kubernetes本体のリリースサイクルとは切り離して、ストレージベンダが独自にドライバの機能追加・バグ修正を進められるようになり、対応ストレージの種類も大きく拡大しています。

## GKEでの特徴

GKEは、GCPの各種ストレージサービスに対応したCSIドライバをあらかじめ組み込んでおり、標準でPVの動的プロビジョニングが利用できます。

|項目|概要|
|---|---|
|Persistent Disk CSI Driver|GCEのPersistent Disk（永続ディスク）をPVとして利用するための標準ドライバ。デフォルトのStorageClass（`standard-rwo`など）が最初から用意されている|
|Filestore CSI Driver|GCPのマネージドNFSサービスであるFilestoreを利用し、複数Podからの同時読み書き（ReadWriteMany）を必要とするワークロード向けにPVを提供する|
|ディスクの種類|Persistent Diskには標準（pd-standard）、SSD（pd-ssd）、Balanced（pd-balanced）などの種別があり、StorageClassのparametersで指定する|
|リージョナルPersistent Disk|複数ゾーンにデータを同期レプリケーションするディスク。ゾーン障害時にも別ゾーンのNodeから同じPVを継続利用できる|
|Autopilotでの制約|Autopilotモードでは、利用できるStorageClassやアクセスモードに一部制約がある（Node自体をユーザが管理しないため）|

hostPathやローカルディスクを直接使う構成と異なり、これらのCSIドライバを利用することで、Node障害時にもPVを別のNodeへ引き継いでPodを再スケジュールできる可用性が確保されます。
