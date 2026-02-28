# TuneBoard

[![Build and Test](https://github.com/Tomoyuki-Kawaguchi/TuneBoard/actions/workflows/build-and-test.yaml/badge.svg)](https://github.com/Tomoyuki-Kawaguchi/TuneBoard/actions/workflows/build-and-test.yaml)

TuneBoard は、ライブ向けセッティングシートを管理するための Web アプリケーションです。  
管理者はライブ情報や入力項目を管理し、参加者はログインなしで公開 URL から入力できます。

## 要件概要

### おおざっぱな目標

- 記入者がログインなしで手軽に入力できること
- 入力しやすく、わかりやすい UI であること
- 管理者がライブ情報・入力項目を簡単に管理できること
- 回答内容を PDF 出力できること
- 曲の重複を管理者が発見しやすいこと
- 複数サークルで利用できること（マルチテナント）

### 主要フロー

1. 管理者がユーザー登録
2. 管理者がライブを作成
3. ライブごとに公開 URL（トークン付き）を発行
4. 参加者が公開 URL からセッティングシートを入力
5. 管理者が回答管理・重複確認・PDF 出力

## リポジトリ構成

- `backend/`: Spring Boot (Java 21, Gradle)
- `frontend/`: React + TypeScript + Vite
