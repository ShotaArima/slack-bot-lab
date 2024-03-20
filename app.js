const { App, AwsLambdaReceiver } = require('@slack/bolt');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');
const AWS = require('aws-sdk');//AWS SDKの読み込み
const fs = require('fs');

// Lambda 関数内でメッセージを取得し、次の遷移先のページに送信する例
module.exports.handler = async (event, context, callback) => {
  // メッセージの取得や処理など

  const message = 'メッセージが送信されました'; // ここにメッセージを設定
  const nextPagePath = '/next-page'; // 遷移先のページのパス

  // 次の遷移先のページにメッセージを送信
  sendMessageToNextPage(message, nextPagePath);

  // Lambda 関数のレスポンスを返すなどの処理
};


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
        console.log('Before serialize');

          // データベースへのアクセスや処理を行います
          // 例えば、認証処理やデータの取得などを行います
          console.log(event.queryStringParameters);
          if (event.queryStringParameters.act === "login") {
            console.log('login act.');
            try {
              // TODO: Implement user authentication logic
              const student_id = event.queryStringParameters.student_id;
              const password = event.queryStringParameters.pass;
              console.log('get student_id, pass.');

              const row = await new Promise((resolve, reject) => {
                // データベースからユーザーの認証を試みます
                conn.get('SELECT * FROM users WHERE student_id = ?', [student_id], (err, row) => {
                  console.log('get row.');
                  console.log('row', row);
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
                  const username = row.name
                  const room_flg = row.room_flg

                  // メッセージの送信
                  if (room_flg === 0) {
                    await app.client.chat.postMessage({
                      token: process.env.SLACK_BOT_TOKEN,
                      channel: 'C06FLR2DGUX',
                      text: username + 'さんが入室しました'
                    });
                  } else if (room_flg === 1) {
                    await app.client.chat.postMessage({
                      token: process.env.SLACK_BOT_TOKEN,
                      channel: 'C06FLR2DGUX',
                      text: username + 'さんが退室しました'
                    });
                  } else {
                    throw new Error('Invalid room_flg');
                  }

                  // 認証成功時の処理
                  return callback(null, {
                    statusCode: 300,
                    headers: {
                      'Location': 'https://slack-bot-real-key.s3.ap-northeast-1.amazonaws.com/slack-bot/public/main.html'
                    },
                    body: JSON.stringify({
                      message: 'ログイン成功',
                    }),
                  });
                } else {
                  // パスワードが一致しない場合
                  throw new Error('Invalid password');
                }
              } else {
                // ユーザが存在しない場合
                throw new Error('User not found');
              } 
            } catch (error) {
              return callback(null, {
                statusCode: 301,
                body: JSON.stringify({
                  message: 'error.message',
                }),
              });
            }
          } else if(event.queryStringParameters.act==="add") {
            try {
              // 変数を取得
              const student_id = event.queryStringParameters.student_id;
              const name = event.queryStringParameters.name;
              const plainPassword = event.queryStringParameters.pass;
              const confirmPassword = event.queryStringParameters.confirmpass;
              console.log('get student_id, name, pass.');
              console.log('plainPassword', plainPassword);
              console.log('confirmPassword', confirmPassword);

              if (plainPassword !== confirmPassword) {
                throw new Error('Passwords do not match');
              } else {
                
                const row = await new Promise((resolve, reject) => {
                  // データベースからユーザーの存在を確認
                  conn.get('SELECT * FROM users WHERE student_id = ?', [student_id], (err, row) => {
                    if (err) {
                      reject(err);
                    } else {
                      resolve(row);
                    }
                  });
                });
            
                if (row) {
                  // ユーザが存在する場合、エラーを返す
                  throw new Error('User already exists');
                }
            
                console.log('Start hashing password.');
                // パスワードをハッシュ化
                const hashedPassword = await bcrypt.hash(plainPassword, 10);
                console.log('Complete hashedpassword.');
            
                // データベースに新しいユーザーを追加
                await new Promise((resolve, reject) => {
                  conn.run('INSERT INTO users (student_id, name, pass) VALUES (?, ?, ?)', [student_id, name, hashedPassword], function(err) {
                    if (err) {
                      reject(err);
                    } else {
                      resolve();
                    }
                  });
                });
                console.log('dbrun.');
              }
              // 残りのコード（ユーザー数の取得、データベースの閉じる、変更の反映など）
          
              return callback(null, {
                statusCode: 302,
                headers: {
                  'Location': 'https://slack-bot-real-key.s3.ap-northeast-1.amazonaws.com/slack-bot/public/login.html'
                },
                body: JSON.stringify({
                  message: 'ユーザーが追加されました',
                }),
              });
            } catch (error) {
              console.error('Error:', error);
          
              if (error.message === 'User already exists') {
                return callback(null, {
                  statusCode: 303,
                  headers: {
                    'Location': 'https://slack-bot-real-key.s3.ap-northeast-1.amazonaws.com/slack-bot/public/add.html'
                  },
                  body: JSON.stringify({
                    message: 'ユーザーはすでに存在します',
                  }),
                });
              } else if (error.message === 'Passwords do not match') {
                return callback(null, {
                  statusCode: 304,
                  headers: {
                    'Location': 'https://slack-bot-real-key.s3.ap-northeast-1.amazonaws.com/slack-bot/public/add.html'
                  },
                  body: JSON.stringify({
                    message: 'パスワードが一致しません',
                  }),
                });
              }
              else {
                return callback(null, {
                  statusCode: 305,
                  headers: {
                    'Location': 'https://slack-bot-real-key.s3.ap-northeast-1.amazonaws.com/slack-bot/public/add.html'
                  },
                  body: JSON.stringify({
                    message: 'ユーザーの追加中にエラーが発生しました',
                  }),
                });
              }
            }
          } else if(event.queryStringParameters.act==="entrance"){
            await app.client.chat.postMessage({
              token: process.env.SLACK_BOT_TOKEN,
              channel: 'C06FLR2DGUX',
              text: '入室しました'
            });
            return {
              statusCode: 306,
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
        statusCode: 308,
        body: JSON.stringify({
          message: 'Internal Server Error',
        }),
      });
    }
};