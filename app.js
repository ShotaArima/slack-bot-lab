const { App, AwsLambdaReceiver } = require('@slack/bolt');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');
const AWS = require('aws-sdk');//AWS SDKの読み込み

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
  let db; // データベースへの接続を保持する変数

  // データベースに接続(一時的にコメントアウト)
  // const db = new sqlite3.Database('db/slack.db');
  // S3からSQLite3データベースファイルをダウンロードする処理
  const params = {
    Bucket: 'slack-bot-real-key', // バケット名
    Key: 'db/slack.db', // ファイルのパス
  };

  try {
    // ここでダウンロードしたSQLite3データベースファイルを一時的に保存してSQLite3データベースと連携します。
    db = new sqlite3.Database(':memory:');
    const s3Data = await s3.getObject(params).promise();
    const databaseContent = s3Data.Body.toString('utf-8');
    await new Promise((resolve, reject) => {
      db.exec(databaseContent, (err) => {
        if (err) {
          console.error(err);
          return callback(err);
        } else {
          resolve();
        }
      });
    });

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

      // パスワードをハッシュ化
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      // データベースに新しいユーザーを追加
      await new Promise((resolve, reject) => {
        db.run('INSERT INTO users (student_id, name, pass) VALUES (?, ?, ?)', [student_id, name, hashedPassword], async (err) => {
          if (err) {
            console.error(err);
            return callback(err);
          } else {
            resolve();
          }
        });
      });
      // コネクションを閉じる
      db.close();

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
  } catch (error) {
    console.error('Error downloading database from S3', error);
    console.error(error);

    return callback(null, {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal Server Error',
      }),
    });
  } finally {
    // データベースを閉じる
    if (db){
      db.close();
    }
  }
};