# Terraform

Terraformは、HashiCorp社が開発するIaC（Infrastructure as Code）ツールです。クラウドやオンプレミスのインフラ構成をHCL（HashiCorp Configuration Language）というコード（マニフェスト）で宣言的に記述し、実際のインフラをそのコードの状態に一致させることができます。

AWS、GCP、Azureなど様々なクラウドプロバイダに対応しており、単一のワークフロー（init/plan/apply）で異なる基盤のリソースを統一的に管理できる点が特徴です。

## 全体像

Terraformは、ユーザが記述したコード（あるべき状態）と、実際のインフラの状態を「State」というファイルで管理し、両者を比較しながら差分だけを適用します。`terraform plan`で変更内容を事前に確認し、`terraform apply`で実際にインフラへ反映するという流れが基本のワークフローです。

## ドキュメント構成

このドキュメントでは、Terraformの技術概念を以下のカテゴリに分けて整理しています。

|カテゴリ|概要|
|---|---|
|[Core Concepts](index01_terraform_core_doc.md)|HCL構文、Provider、Resource、Data Source|
|[State](index02_terraform_state_doc.md)|Stateファイル、リモートバックエンド、Stateロック|
|[Module](index03_terraform_module_doc.md)|モジュールの構造、再利用、依存関係|
|[Variable\&Output](index04_terraform_variable&output_doc.md)|変数定義、出力値、Local Values|
|[Workflow](index05_terraform_workflow_doc.md)|init/plan/apply/destroyの基本フロー|
|[Workspace](index06_terraform_workspace_doc.md)|Workspace、tfvars、マルチ環境管理|
|[Import\&Drift](index07_terraform_import&drift_doc.md)|既存リソースの取り込み、ドリフト検知|
