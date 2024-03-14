# slack-bot-lab

sqlite3によるデータベースを参照して、ユーザがログインし、そこからボタン操作による入室を知らせます。

- handler.jsは今回のメインのファイルでLambdaで実行する処理を書きます
- serverless.ymlはServerlessFrameworkを使う上での設定ファイルです
- .gitignoreはgit管理する際にServerlessFrameworkが生成する一時ファイルを管理対象外にするための記載が追加されています

URL: https://slack-bot-real-key.s3.ap-northeast-1.amazonaws.com/entrance.html

## トリガーについて
- 学生証のIDを使用して、入退室をスムーズに行う
- ラズパイを使用していくことも可能だが、スマホに読み取らせるのか少し嫌な感じになるひともいるかも
  - ICカードリーダが最適？
- できれば、大学のICカードの利用履歴をAPIで利用する方が画期的
