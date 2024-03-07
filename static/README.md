# 概要
このディレクトリでは、Lambda関数によってRDBのSQLiteにアクセスするためのもので、Express-Generatorによって作成されています。

## 操作方法
1. `npm start`によって実行開始
2. `http://localhost:3000/slack/`にアクセス

## ファイル構成

### bin
アプリを実行するためのコマンドとなるファイルが保管されています。基本的には触りません。
### db
SQLite３のデータベースシステムが格納されています。
### public/
CSSや画像を置きます。
### routes/
このディレクトリでは、ルート（URL）ごとの処理がまとめられています。用意するページごとにここにファイルを追加します。
- slack.js : CRUD処理を実装したファイル
    ※CRUDとは、
### views/
画面がわを作る上で必要なviewファイルを置きます。サーバサイドからこのファイルに対して、値を渡すことができます。
- slack/login.ejs : ログイン画面のページ
- slack/add.ejs : 新規ユーザ追加のページ
- error.ejs : エラーを表示するページ
### node_modules/
`npm install`するとパッケージ類はこのディレクトリに入ってきます。基本的には触りません。
### app.js
メインのプログラムです。Expressの設定周りを担っています。

### 参考文献
- [Node.js基本編 Express+SQLiteで超定番のTo Doメモアプリを作る](https://qiita.com/hisashi_matsui/items/79cc7b4b95a195b51535)