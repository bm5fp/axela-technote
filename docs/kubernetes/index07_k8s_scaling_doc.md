# Scaling

## HorizontalPodAutoscaler（HPA）

HPAは、負荷に応じてPodのレプリカ数を自動的に増減させる仕組みです。DeploymentやStatefulSetなど、レプリカ数を持つワークロードリソースを対象にします。

|項目|概要|
|---|---|
|対象メトリクス|CPU使用率、メモリ使用率がデフォルトで利用可能。Custom Metrics APIやExternal Metrics APIと連携することで、リクエスト数やキューの長さなど、任意のメトリクスも利用できる|
|動作の仕組み|一定間隔でメトリクスを取得し、目標値（例：CPU使用率50%）との差分をもとに必要なレプリカ数を計算し、対象リソースのレプリカ数を書き換える|
|minReplicas / maxReplicas|自動調整の下限・上限を指定し、極端なスケールイン/アウトを防ぐ|

HPAは、後述するMetrics Serverなどが提供するメトリクスAPIに依存しており、これらのコンポーネントがクラスタに導入されていることが前提となります。

## VerticalPodAutoscaler（VPA）

VPAは、HPAが「レプリカ数（横方向）」を調整するのに対し、個々のPodに割り当てるCPU/メモリの要求量・制限値（縦方向）を自動的に調整する仕組みです。

|動作モード|概要|
|---|---|
|Off|推奨値の計算のみ行い、実際の値変更は行わない（確認用途）|
|Initial|Pod作成時にのみ推奨値を適用する|
|Auto|既存のPodを再作成して、推奨値を適用する（現状Podの再起動を伴う）|

VPAは、そのPodに実際どの程度のリソースが必要かを事前に見積もりにくいワークロードに対して有効ですが、HPAと同一のメトリクス（CPU/メモリ）を対象に併用すると競合が起きるため、通常は「HPAはカスタムメトリクスで、VPAはCPU/メモリで」のように役割を分けて使うことが推奨されます。

## ClusterAutoscaler

ClusterAutoscalerは、HPAやVPAがPod単位のリソース調整であるのに対し、クラスタを構成するNode自体の数を自動的に増減させる仕組みです。

|動作条件|概要|
|---|---|
|スケールアウト|既存Nodeのリソース不足により、スケジュール待ち（Pending）のPodが発生した場合、クラウドプロバイダのAPIを通じて新しいNodeを追加する|
|スケールイン|Node上のPod使用率が低く、他のNodeに退避可能と判断された場合、対象NodeのPodを退避（Drain）した上でNodeを削除する|

ClusterAutoscalerはクラウドプロバイダ固有のAPI（Auto Scaling Groupなど）と連携して動作するため、多くのマネージドKubernetesサービスでは、この機能があらかじめ組み込まれた形で提供されています。HPAによるPodの増加が、結果としてClusterAutoscalerによるNodeの増加を誘発するという連動が典型的な自動スケーリングの流れです。

## ResourceQuota & LimitRange

これらは、直接的な自動スケーリングの仕組みではありませんが、リソース使用量に上限を設けることで、クラスタ全体の安定性を保つための重要な設定です。

|リソース|スコープ|役割|
|---|---|---|
|ResourceQuota|Namespace単位|そのNamespace内で使用できるCPU・メモリの合計量や、作成できるPod数などの上限を設定する|
|LimitRange|Pod/コンテナ単位|個々のPod・コンテナに対するリソース使用量のデフォルト値や、上限・下限を設定する|

|典型的な組み合わせ|効果|
|---|---|
|ResourceQuotaのみ|Namespace全体の使用量には上限があるが、個々のコンテナが際限なくリソースを要求すると、少数のPodでQuotaを使い切ってしまう可能性がある|
|LimitRangeの併用|個々のコンテナに妥当なデフォルト値・上限を強制することで、Namespace内での公平なリソース配分を実現できる|

これらを適切に設定することで、特定のNamespace・アプリケーションが暴走してクラスタ全体のリソースを圧迫する事態を未然に防ぐことができます。

## GKEでの特徴

GKEは、標準のHPA/ClusterAutoscalerに加えて、より運用負荷の低い自動スケーリング機能を提供しています。

|項目|概要|
|---|---|
|Node Auto-provisioning（Standard）|事前にNode Poolを用意しなくても、必要なワークロードの要求に応じて、GKEが最適なマシンタイプ・サイズのNode Poolを自動的に作成する|
|Cluster Autoscalerのマネージド化|Cluster Autoscaler自体がGKEに組み込まれており、追加のコンポーネントを別途デプロイする必要がない|
|Autopilotの自動スケーリング|Autopilotモードでは、Node管理自体が存在しないため、HPA/VPAによるPod単位のスケーリングを行うだけで、必要なNodeの追加・削除はGoogle側が自動的に行う|
|VPAの推奨モード|Autopilotでは、コンテナのリソース要求値についてVPAの推奨値がデフォルトで有効になっていることが多く、過不足のないリソース設定を維持しやすい|

Standardモードでは「Podのスケーリング（HPA/VPA）」と「Nodeのスケーリング（Cluster Autoscaler）」を意識して設計する必要がありますが、Autopilotではこの2層構造がGoogle側にほぼ隠蔽され、ユーザはワークロードのスケーリング設定にのみ集中できます。
