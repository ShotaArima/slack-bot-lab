const { App, AwsLambdaReceiver } = require('@slack/bolt');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');
const AWS = require('aws-sdk');//AWS SDKの読み込み
const fs = require('fs');

async function copyFile(sourcePath, destinationPath) {
  return new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(sourcePath);
      const writeStream = fs.createWriteStream(destinationPath);

      readStream.on('error', reject);
      writeStream.on('error', reject);

      writeStream.on('finish', () => {
          resolve();
      });

      readStream.pipe(writeStream);
  });
}

/* 
This sample slack application uses SocketMode
For the companion getting started setup guide, 
see: https://slack.dev/bolt-js/tutorial/getting-started 
*/
// AWS Lambdaのリージョンを設定
AWS.config.update({ region: 'ap-northeast-1' });

// S3 クライアントを作成
const s3 = new AWS.S3();


// カスタムのレシーバーを初期化します
const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Initializes your app with your bot token and app token
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: awsLambdaReceiver,

  // AwsLambdaReceiver を利用する場合は  `processBeforeResponse` は省略可能です。
  // OAuth フローに対応した ExpressReceiver など、他のレシーバーを使用する場合、
  // `processBeforeResponse: true` が必要になります。
  // このオプションは、ハンドラーの実行が完了するまで応答を返すのを遅延させます。
  // これによってハンドラーがトリガーとなった HTTP リクエストに応答を返すことでただちに終了されることを防ぐことができます。
    
    //processBeforeResponse: true

    // socketMode: true,
  // appToken: process.env.SLACK_APP_TOKEN
});

// Lambda 関数のイベントを処理します
module.exports.handler = async (event, context, callback) => {
  console.log("start handler.");
  let db; // データベースへの接続を保持する変数

  // データベースに接続(一時的にコメントアウト)
  // const db = new sqlite3.Database('db/slack.db');
  // S3からsqlite3データベースファイルをダウンロードする処理
  const params = {
    Bucket: 'slack-bot-real-key', // バケット名
    Key: 'db/slack.db', // ファイルのパス
  };
  console.log("get params");
    // ここでダウンロードしたsqlite3データベースファイルを一時的に保存してsqlite3データベースと連携します。

    try {
      const download_path = "/tmp/slack.db"
      const data = await s3.getObject(params).promise();
      fs.writeFileSync(download_path, data.Body);
      console.log("after writeFileSync");

      const download_path2 = "/tmp/slack2.db"
      await copyFile(download_path, download_path2);
    
      console.log('Before Connecting to SQLite database');
      // tmpデータベースに接続
        const conn = new sqlite3.Database(download_path, sqlite3.OPEN_READWRITE);
        console.log('conn', conn);
        console.log('Connected to SQLite database');

        db = conn;
        console.log('Before serialize');
          // await conn.get("SELECT mycolumn FROM message LIMIT 1");

          // await new Promise((resolve, reject) => {
          //   conn.get("SELECT mycolumn FROM message LIMIT 1", (err, row) => {
          //     if (err) {
          //       console.error('Error querying database:', err);
          //       reject(err);
          //     } else {
          //       console.log(row);
          //       resolve(row);
          //     }
          //   });
          // });
          

          // データベースへのアクセスや処理を行います
          // 例えば、認証処理やデータの取得などを行います
          console.log(event.queryStringParameters);
          if (event.queryStringParameters.act === "login") {
            // TODO: Implement user authentication logic
            const student_id = event.queryStringParameters.student_id;
            const password = event.queryStringParameters.pass;
            const row = await new Promise((resolve, reject) => {
              // データベースからユーザーの認証を試みます
              db.get('SELECT * FROM users WHERE student_id = ?', [student_id], (err, row) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(row);
                }
              });
            });
            
            if (row) {
              // ユーザが存在する場合、パスワードのハッシュを比較して認証します
              const isPasswordValid = await bcrypt.compare(password, row.pass);

              if (isPasswordValid) {
                // 認証成功時の処理
                return callback(null, {
                  statusCode: 307,
                  body: JSON.stringify({
                    message: 'ログイン成功',
                  }),
                  headers: {
                    'Location': 'https://slack-bot-real-key.s3.ap-northeast-1.amazonaws.com/main.html'
                  }
                });
              } else {
                // パスワードが一致しない場合
                throw new Error('Invalid password');
              }
            } else {
              // ユーザが存在しない場合
              throw new Error('User not found');
            }
          } else if(event.queryStringParameters.act==="add") {
            // 変数を取得
            const student_id = event.queryStringParameters.student_id;
            const name = event.queryStringParameters.name;
            const plainPassword = event.queryStringParameters.pass;
            console.log('get student_id, name, pass.');

            console.log('Start hashing password.');
              // パスワードをハッシュ化
              // const hashedPassword = await bcrypt.hash(plainPassword, 10);
              const hashedPassword = plainPassword;
              console.log('Complete hashedpassword.');

            // データベースに新しいユーザーを追加
            await db.run('INSERT INTO users (student_id, name, pass) VALUES (?, ?, ?)', [student_id, name, hashedPassword] );
            console.log('dbrun.');
            console.log('Select *', await db.all('SELECT * FROM users'));
            
            // コネクションを閉じる
            await db.close();
            console.log('db close');


            return callback(null, {
              statusCode: 307,
              body: JSON.stringify({
                message: 'ユーザーが追加されました',
              }),
              headers: {
                'Location': 'https://slack-bot-real-key.s3.ap-northeast-1.amazonaws.com/login.html'
              }
            });
          } else if(event.queryStringParameters.act==="entrance"){
            await app.client.chat.postMessage({
              token: process.env.SLACK_BOT_TOKEN,
              channel: 'C06FLR2DGUX',
              text: '入室しました'
            });
            return {
              statusCode: 307,
              body: JSON.stringify({
                message: 'メッセージを送信しました',
              }),
              headers: {
                'Location': 'https://slack-bot-real-key.s3.ap-northeast-1.amazonaws.com/logout.html'
              }
            };
          } else if (event.queryStringParameters.act==="logout"){
            await app.client.chat.postMessage({
              token: process.env.SLACK_BOT_TOKEN,
              channel: 'C06FLR2DGUX',
              text: '退室しました'
            });
            return {
              statusCode: 307,
              body: JSON.stringify({
                message: 'メッセージを送信しました',
              }),
              headers:
              {
                'Location': 'https://slack-bot-real-key.s3.ap-northeast-1.amazonaws.com/entrance.html'
              }
            };

          } else {
            throw new Error('Invalid action');
          }


        // 元のデータベースファイルと一時的なデータベースファイルを比較して変更が必要かどうかを確認
        const originalDatabaseContent = fs.readFileSync(download_path2, 'utf-8');
        const newDatabaseContent = fs.readFileSync(download_path, 'utf-8');
        if (originalDatabaseContent !== newDatabaseContent) {
          // 変更がある場合のみ元のデータベースファイルに変更を適用
          fs.copyFileSync(download_path, 'db/slack.db');
          console.log('変更が元のデータベースに反映されました');
        } else {
          console.log('変更は不要です');
        }
        conn.close((err) => {
          if (err) {
            console.error('Error closing database connection:', err);
            return;
          }
          console.log('Connection closed');
        });
    } catch (error) {
      console.error('Error downloading database from S3', error);
      console.error(error);

      return callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          message: 'Internal Server Error',
        }),
      });
    }
};