# PersistantVolume

PersistantVolume（PV）とは、Podが利用可能な永続ストレージです。

## 永続ストレージの種類

Podは、大きく3つの永続ストレージを利用可能です。

|種類|例|
|---|---|
|ローカルストレージ|`hostPath` `local`|
|マネージドディスク|`EBS` `PD` `AzureDisk`|
|ネットワークストレージ|`NFS` `iSCSI` `CephFS/RBD`|

### ローカルストレージ

ノード上のディスクをストレージを利用します。

`hostpath`を指定したPodは、複数のノードに配置されます。
各Podは、配置されたノードのローカルディスクにアクセスするため、ノードを超えてのデータ共有はできません。

`local`を指定すると、特定の1ノードでしかPodは立ち上がらないようになりますので、データ共有が可能になります。
一方で、立ち上がるノードが1ノードに固定されるため、ノード障害が発生するとPodが起動できなくなります。

ローカルストレージはノード上のパスを参照しているので、Podからもノードからも同じデータにアクセスすることができます。

### マネージドディスク

クラウド上のマネージドディスクを利用します。

GKEやEKSなどマネージドなk8sサービスの場合、ノードは再作成される可能性があり、ローカルストレージを利用しているとデータがロストしてしまう可能性があります。

マネージドディスクはノードから独立してマウントされるため、ノード再作成によるロストの影響はありません。

### ネットワークストレージ

Podから永続ストレージを利用する場合には読み書きモードを指定する必要がありますが、ストレージの種類によって利用できる読み書きモードに制約があります。

|読み書きモード|意味|ローカルストレージ|マネージドディスク|ネットワークストレージ|
|---|---|---|---|---|
|ReadWriteOncePod（RWOP）|1 つの Pod からのみ読み書き可|○|○|○|
|ReadWriteOnce（RWO）|1 つのノードから読み書き可|○|○|○|
|ReadOnlyMany（ROM）|複数ノードから読み取り専用|×|×|○|
|ReadWriteMany（RWM）|複数ノードから読み書き可|×|×|○|

ローカルストレージもマネージドディスクも、原則複数のノードから利用することができません。
クラスタを構成するノードは多くの場合複数台で冗長化されているため、データを共有・一元化するための永続ストレージとしては利用できません。

ネットワークストレージを利用すると、複数ノードでデータを共有・一元化することが可能になります。

## 永続ストレージの利用

Podから永続ストレージを利用する場合、Podから直接実ストレージを指定できません。
`PVC`および`PV`というk8sリソースを経由して、実ストレージの利用を指定します。

PVCでは、利用したい永続ストレージの「容量」と「読み書きモード」を宣言します。
具体的なストレージの種類は指定しません。

一方PVでは、具体的な永続ストレージの種類を定義します。

これにより、Podはインフラストラクチャ（AWS、GCP、オンプレ、等）を意識する必要がなくなります。
インフラストラクチャ毎にPVを用意することで、PodおよびPVCの定義を修正することなく、どのインフラストラクチャでもPodを起動することが可能になります。

### SotrageClassによるPVと実ストレージの動的プロビジョニング

PVCにて永続ストレージを利用するにあたっては、事前に実ストレージ作成かつPVを定義（静的プロビジョニング）しておく必要があります。

StorageClassを利用すると、PVCの要求に応じて自動的にPVおよび実ストレージを動的にプロビジョニングできます。
これにより、動的プロビジョニングは実ストレージの作成やPVの定義をスキップしてすぐにストレージを利用できるようになります。

一方で、動的プロビジョニングはストレージの厳格な管理が困難になります。
実際の本番ワークロードでは、IaCなどで実ストレージ自体を厳格に管理したいユースケースが多いため、使いどころは限られます。

#### デフォルトのStorageClass

k8sでは、デフォルトのStorageClassが定義されています。
PVCにて特にStorageClassを定義しない場合、デフォルトのStorageClassが利用されます。
デフォルトのStorageClassの定義は、インフラストラクチャによって変わります。

| | Docker Desktop / kind | AWS EKS | GCP GKE | Azure AKS |
|--|--|--|--|--|
| name | `standard` | `gp2` | `standard` | `default` |
| provisioner | `docker.io/hostpath` | `ebs.csi.aws.com` | `pd.csi.storage.gke.io` | `disk.csi.azure.com` |
| reclaimPolicy | `Delete` | `Delete` | `Delete` | `Delete` |
| volumeBindingMode | `Immediate` | `WaitForFirstConsumer` | `WaitForFirstConsumer` | `WaitForFirstConsumer` |
| parameters.type | なし | `gp2` | `pd-standard` | `Standard_LRS` |
| ストレージ種別 | hostPath | EBS | Persistent Disk | Azure Disk |
| accessModes | ReadWriteOnce | ReadWriteOnce | ReadWriteOnce | ReadWriteOnce |

PVCではStorageClassを定義しない場合、デフォルトのStorageClassが利用されます。
そのため静的プロビジョニングを利用するには、デフォルトのStorageClassのprovisionerを`kubernetes.io/no-provisioner`にしておく必要があります。

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: static-default
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: Immediate
```

なお、PVおよびPVCにて`storageClass:""`と明示するとStorageClassは利用されなくなりますが、定義漏れによって意図せず動的にプロビジョニングされるリスクがあるため、デフォルトのStorageClassを変更しておくことが推奨されます。

### PVCとPVの紐づけ

静的プロビジョニングでは、PVC側でPVを指定する、あるいはPV側でPVCを指定することもできます。

| |volumeName（PVC側）|claimRef（PV側）|
|--|--|--|
|ロックされる側 |PVC→PV方向のみ|PV→PVC方向のみ|
|PVが他PVCにバインドされる可能性|あり（PVは誰でも受け入れる）| なし（PVが拒否する）|
|PVCが他PVにバインドされる可能性|なし（PVCが指定済み） | あり（PVCは誰でも受け入れる）|

なお、これらはPVCとPVの紐づけ可否の定義であり、この定義を踏まえた上で実際のPVCとPVは1対1で固定されます。
PVCとPVの双方で定義を入れることで、PVCとPVの確実な1対1の紐づけが保証されます。

## PVのステータスとReclaimPolicy

PVには主に3つのステータスがあります。

|ステータス|意味|
|-----------|------|
|Available|利用可能|
|Bound|使用中|
|Released|利用していたPVCが削除された（データは残っている）|

PVCを削除すると、PVのReclaimPolicyで`delete`を指定している場合、PVも一緒に削除されます。
一方で、`Retain`を指定している場合、PVのステータスはRelasedとなります。

`Released`ステータスのPVは他のPVCから再利用することはできません。
再利用するためには、PVの状態を手動でAvailableに変更する必要があります。

## CSI

クラウドのマネージドディスクやネットワークストレージは、Container Storage Interface（CSI）を利用して実ストレージを利用します。
CSIは3rdパーティベンダにより提供されているため、新しいストレージ製品が出てきた場合も、CSIをk8sに追加インストールするだけで利用が可能になります。

## SubPath

ネットワークストレージでは、サブディレクトにアプリケーション毎のディレクトリを切る場合があります。

通常はアプリケーションのディレクトリ毎にPVCとPVを定義する必要がありますが、SubPathを利用すれば1つのPVCとPVで利用ができます。

ただし、これはPod
