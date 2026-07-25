# Git

Gitは、Linus Torvaldsによって開発された分散型バージョン管理システムです。ソースコードの変更履歴を「スナップショット」として記録し、ブランチによる並行開発、リモートリポジトリを介したチーム開発を支える基盤として、現在ほぼ標準的に使われています。

## 全体像

Gitのデータは全て`.git`ディレクトリ内にオブジェクトとして保存され、コミットは親コミットへの参照を持つことで、プロジェクト全体の履歴が1つのグラフ構造として構成されます。開発者はこの履歴に対して、ブランチで並行作業を行い、マージ/リベースで統合し、リモートリポジトリを介して他の開発者と共有します。

## ドキュメント構成

このドキュメントでは、Gitの技術概念を以下のカテゴリに分けて整理しています。

|カテゴリ|概要|
|---|---|
|[Fundamentals](index01_git_fundamentals_doc.md)|Gitオブジェクトモデル(blob/tree/commit)、リポジトリ構造、ステージングエリア|
|[Branch\&Merge](index02_git_branch&merge_doc.md)|ブランチ、マージ、コンフリクト、リベース|
|[Remote](index03_git_remote_doc.md)|リモートリポジトリ、fetch/pull/push、Pull Request|
|[History\&Inspection](index04_git_history&inspection_doc.md)|log、diff、blame、bisect、タグ|
|[UndoingChanges](index05_git_undoingchanges_doc.md)|restore、reset、revert、reflog|
|[Collaboration](index06_git_collaboration_doc.md)|コードレビュー、マージ方式、ブランチ戦略、コミット規約|
|[AdvancedTools](index07_git_advancedtools_doc.md)|stash、cherry-pick、submodule、hooks、インタラクティブリベース|
