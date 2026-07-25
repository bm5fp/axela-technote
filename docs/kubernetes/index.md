# Kubernetes

Kubernetes（略称：K8s）は、コンテナ化されたアプリケーションのデプロイ・スケーリング・運用管理を自動化するコンテナオーケストレーションツールです。Googleが社内システム「Borg」の経験をもとに開発し、現在はCNCF（Cloud Native Computing Foundation）が管理するOSSとなっています。

複数のホスト（Node）にまたがってコンテナを配置・運用するにあたり、以下のような課題を解決します。

- コンテナをどのNodeに配置するか（スケジューリング）
- コンテナが異常終了した際の自動復旧（自己修復）
- 負荷に応じたコンテナ数の自動調整（スケーリング）
- コンテナ群への安定したアクセス経路の提供（サービスディスカバリ・ロードバランシング）
- 設定情報や機密情報の配布・管理
- 宣言的な設定（マニフェスト）による構成管理

## 全体像

Kubernetesクラスタは、大きく「Control Plane（クラスタ全体を管理する頭脳部分）」と「Node（実際にコンテナが稼働する実行基盤）」で構成されます。Control Planeが、ユーザがマニフェストで宣言した「あるべき状態」と、クラスタの「現在の状態」を常に比較し、差分があれば自動的に是正することでシステム全体を維持します。

## ドキュメント構成

このドキュメントでは、Kubernetesの技術概念を以下のカテゴリに分けて整理しています。

|カテゴリ|概要|
|---|---|
|[Architecture](index01_k8s_architecture_doc.md)|Control Plane/Nodeの構成要素、クラスタ全体の関係、Namespaceによる論理分割|
|[Workload](index02_k8s_workload_doc.md)|Pod、Deployment、DaemonSet、StatefulSet、Job/CronJobなど、コンテナを動かす仕組み|
|[Networking](index03_k8s_networking_doc.md)|Service、Ingress、NetworkPolicy、CNI、CoreDNSなど、通信に関する仕組み|
|[Storage](index04_k8s_storage_doc.md)|Volume、PersistentVolume、PersistentVolumeClaim、StorageClass、CSIなど、データ永続化の仕組み|
|[Config\&Secret](index05_k8s_config&secret_doc.md)|ConfigMap、Secretなど、設定値・機密情報の管理|
|[Security\&RBAC](index06_k8s_security&rbac_doc.md)|認証・認可、ServiceAccount、Role/ClusterRoleなど、アクセス制御の仕組み|
|[Scaling](index07_k8s_scaling_doc.md)|HPA、VPA、ClusterAutoscaler、ResourceQuota/LimitRangeなど、リソース調整の仕組み|
|[Observability](index08_k8s_observability_doc.md)|Metrics、Logging、Tracing、各種Probeなど、状態把握のための仕組み|
|[Extensibility](index09_k8s_extensibility_doc.md)|CRD、Operatorパターン、Admission Controllerなど、Kubernetesを拡張する仕組み|
