# GCP

GCP（Google Cloud Platform）は、Googleが提供するクラウドサービス群です。コンピューティング、ストレージ、ネットワーキング、データベース、データ分析、機械学習など幅広い領域のマネージドサービスを提供しており、Googleの検索エンジンやYouTubeなどを支える社内インフラの技術基盤がベースになっています。

## 全体像

GCPのリソースは、Organization → Folder → Project という階層構造で管理され、IAMによる権限やOrganization Policyによる制約は、この階層に沿って上位から下位へ継承されます。個々のサービス（Compute Engine、GKE、Cloud Storageなど）は、この階層のいずれかのProjectに紐づく形で作成されます。

## ドキュメント構成

このドキュメントでは、GCPの主要サービスを以下のカテゴリに分けて整理しています。

|カテゴリ|概要|
|---|---|
|[Compute](index01_gcp_compute_doc.md)|Compute Engine、GKE、Cloud Run、App Engine|
|[Storage](index02_gcp_storage_doc.md)|Cloud Storage、Persistent Disk、Filestore|
|[Networking](index03_gcp_networking_doc.md)|VPC、Cloud Load Balancing、Cloud DNS、Cloud NAT|
|[IAM\&Security](index04_gcp_iam&security_doc.md)|IAM、Service Account、Organization Policy、Cloud KMS|
|[Database](index05_gcp_database_doc.md)|Cloud SQL、Cloud Spanner、Firestore、BigQuery|
|[Serverless\&Data](index06_gcp_serverless&data_doc.md)|Cloud Functions、Pub/Sub、Dataflow|
|[Operations](index07_gcp_operations_doc.md)|Cloud Monitoring、Cloud Logging、Cloud Trace|

GKE（Kubernetes）に関するより詳細な内容は、[kubernetesディレクトリ](../kubernetes/index.md)の各ファイルにある「GKEでの特徴」セクションを参照してください。
