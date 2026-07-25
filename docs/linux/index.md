# Linux

Linuxは、Linus Torvaldsによって開発が始まったオープンソースのUnix系OSカーネル、およびそれを中核として構築されるOS全般を指します。サーバ、組み込み機器、スマートフォン（Android）、クラウド基盤に至るまで幅広く使われており、現代のITインフラの大部分を支えています。

Linuxは、プロセス管理・メモリ管理・ファイルシステム・ネットワークといった基本的なOSの機能に加え、namespaceやcgroupsといった仕組みを備えており、これらはDockerやKubernetesに代表されるコンテナ技術の実現基盤にもなっています。

## 全体像

Linuxはカーネル空間とユーザ空間を明確に分離し、アプリケーション（ユーザ空間）はシステムコールという窓口を通じてカーネルの機能を利用します。カーネルはハードウェアを直接制御しつつ、複数のプロセスやユーザに対してリソース（CPU、メモリ、ディスク、ネットワークなど）を安全かつ公平に分配する役割を担います。

## ドキュメント構成

このドキュメントでは、Linuxの技術概念を以下のカテゴリに分けて整理しています。

|カテゴリ|概要|
|---|---|
|[Kernel\&Boot](index01_linux_kernel&boot_doc.md)|カーネルアーキテクチャ、ブートプロセス、initシステム、カーネルモジュール、カーネルパラメータ|
|[Process](index02_linux_process_doc.md)|プロセス/スレッド、プロセスライフサイクル、シグナル、IPC、スケジューリング|
|[Memory](index03_linux_memory_doc.md)|仮想メモリ、スワップ、ページキャッシュ、OOM Killer、メモリマッピング|
|[FileSystem](index04_linux_filesystem_doc.md)|FHS、inode、リンク、マウント、パーミッション、ACL、特殊権限|
|[User\&Permission](index05_linux_user&permission_doc.md)|ユーザ/グループ、sudo、Capabilities、PAM、SELinux/AppArmor|
|[Network](index06_linux_network_doc.md)|ネットワークインターフェース、ルーティング、ソケット、netfilter、DNS、ネットワーク名前空間|
|[Container](index07_linux_container_doc.md)|namespace、cgroups、chroot、OverlayFS、Capabilities、seccomp|
|[Storage\&IO](index08_linux_storage&io_doc.md)|ブロック/キャラクタデバイス、LVM、RAID、I/Oスケジューラ|
|[Shell](index09_linux_shell_doc.md)|シェルの種類、環境変数、パイプ/リダイレクト、ジョブコントロール|
|[Logging\&Monitoring](index10_linux_logging&monitoring_doc.md)|syslog/journald、ログ管理、パフォーマンス監視ツール|
|[Package](index11_linux_package_doc.md)|パッケージマネージャ、依存関係解決の仕組み|
