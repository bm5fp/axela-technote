# Logging&Monitoring

## syslog / journald

Linuxシステムやアプリケーションが出力するログを一元的に収集・管理するための仕組みとして、伝統的にsyslogが使われてきました。現在はsystemd環境において journald が主流になっています。

|項目|syslog|journald|
|---|---|---|
|ログの実体|主にテキストファイル（/var/log/messagesなど）|バイナリ形式のジャーナルファイル|
|構造化|基本はプレーンテキスト|メタデータ（PID, 優先度, ユニット名等）を構造化して保持|
|主な実装|rsyslog, syslog-ng|systemd-journald|
|閲覧コマンド|cat, tail, grep|journalctl|

syslogでは、メッセージに「ファシリティ」（メッセージの発生元カテゴリ、例：kern, mail, cron）と「プライオリティ」（重要度、emerg〜debug）が付与され、これに基づいてログの振り分けルールを `/etc/rsyslog.conf` 等に定義します。

journaldを使う環境でも、互換性のためにsyslog形式へ転送・変換する設定がよく行われます。`journalctl -u <service>` のように、systemdのユニット単位でログを絞り込んで確認できる点がjournaldの大きな利点です。

## /var/log配下のログ管理

`/var/log` は、システムやアプリケーションの各種ログファイルが格納される標準的なディレクトリです（FHSに準拠）。

|ファイル/ディレクトリ|内容|
|---|---|
|/var/log/syslog, /var/log/messages|システム全体の一般的なログ|
|/var/log/auth.log, /var/log/secure|認証関連（ログイン、sudo実行など）のログ|
|/var/log/kern.log|カーネルが出力するログ|
|/var/log/dmesg|起動時のカーネルメッセージ（デバイス認識など）|
|/var/log/cron|cronジョブの実行ログ|

ログファイルは放置すると際限なく肥大化し、ディスクを圧迫するため、`logrotate` というツールで「一定サイズ・一定期間ごとにログを分割・圧縮・古いものを削除する」運用が標準的に行われます。設定は `/etc/logrotate.conf` や `/etc/logrotate.d/` 配下の個別設定ファイルで管理されます。

## パフォーマンス監視ツール（top, vmstat, iostat, sarなど）

システムの稼働状況（CPU、メモリ、ディスクI/O、ネットワークなど）をリアルタイムまたは統計的に把握するための標準的なコマンド群です。

|コマンド|主な用途|
|---|---|
|top / htop|CPU・メモリ使用率が高いプロセスをリアルタイムに一覧表示|
|vmstat|CPU・メモリ・スワップ・I/Oの概況を一定間隔でサマリ表示|
|iostat|ディスクデバイスごとのI/O状況（転送量、待ち時間など）を表示|
|sar|CPU・メモリ・ネットワークなど、時系列の統計情報を収集・表示（sysstatパッケージ）|
|free|物理メモリ・スワップの使用状況を表示|
|ss / netstat|ネットワーク接続やソケットの状態を表示|

これらのコマンドは、単発の障害調査だけでなく、`sar` のように定期的にデータを蓄積しておくことで、「先週から今週にかけてCPU使用率がどう変化したか」といった傾向分析にも活用できます。
