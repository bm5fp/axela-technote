# 一般

Linux、Kubernetes、Docker、Terraform、Nginxなど、個別のツールに閉じない、横断的な基礎技術概念をまとめています。特定のツールのドキュメントを読んでいて前提として出てくる用語（RBAC、証明書、TCP/UDPなど）は、こちらにまとめて整理しています。

## ドキュメント構成

|カテゴリ|概要|
|---|---|
|[アクセス制御](index01_general_accesscontrol_doc.md)|RBACなど、権限管理の一般的な考え方|
|[標準ストリーム](index02_general_standard-streams_doc.md)|標準入力/出力/エラー出力の基礎|
|[証明書・PKI](index03_general_certificate&pki_doc.md)|公開鍵暗号、証明書、CA、証明書チェーン、TLSハンドシェイク|
|[認証方式](index04_general_authentication_doc.md)|Basic認証、JWT、OAuth 2.0/OIDC、APIキー|
|[暗号化](index05_general_encryption_doc.md)|対称鍵/非対称鍵暗号、ハッシュ関数、ソルト|
|[TCP/UDP](index06_general_tcp&udp_doc.md)|トランスポート層プロトコルの違いと使い分け|
|[HTTP/HTTPS](index07_general_http&https_doc.md)|メソッド、ステータスコード、TLS化、Cookie|
|[名前解決（DNS）](index08_general_dns_doc.md)|ドメイン階層、名前解決の流れ、レコードタイプ|
|[宣言的設定と命令的設定](index09_general_declarative&imperative_doc.md)|Terraform/Kubernetesに共通する設計思想|
|[冪等性](index10_general_idempotency_doc.md)|安全な再試行を支える性質、冪等キー|
|[CI/CD](index11_general_cicd_doc.md)|継続的インテグレーション/デリバリ/デプロイメント、デプロイ戦略|
