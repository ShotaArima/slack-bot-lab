const { App, AwsLambdaReceiver } = require('@slack/bolt');
const sqlite3 = require('sqlite3');
const bcrypt = require('bcrypt');

/* 
This sample slack application uses SocketMode
For the companion getting started setup guide, 
see: https://slack.dev/bolt-js/tutorial/getting-started 
*/

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

// Listens to incoming messages that contain "hello"
app.message('hello', async ({ message, say }) => {
  // say() sends a message to the channel where the event was triggered
  await say({
    blocks: [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `Hey there <@${message.user}>!`
        },
        "accessory": {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Click Me"
          },
          "action_id": "button_click"
        }
      }
    ],
    text: `Hey there <@${message.user}>!`
  });
});

app.action('button_click', async ({ body, ack, say }) => {
  // Acknowledge the action
  await ack();
  await say(`<@${body.user.id}> clicked the button`);
});

// (async () => {
//   // Start your app
//   await app.start(process.env.PORT || 3000);

//   console.log('⚡️ Bolt app is running!');
// })();

const db = new sqlite3.Database('db/slack.db');

// Lambda 関数のイベントを処理します
module.exports.handler = async (event, context, callback) => {
  try 
  {
    console.log(event.queryStringParameters);
    if (event.queryStringParameters.act === "login") 
    {
      // TODO: Implement user authentication logic
      const student_id = event.queryStringParameters.student_id;
      const password = event.queryStringParameters.pass;
      
      const row = await new Promise((resolve, reject) => 
      {
        // データベースからユーザーの認証を試みます
        db.get('SELECT * FROM users WHERE student_id = ?', [student_id], (err, row) => 
        {
          if (err) 
          {
            reject(err);
          } else 
          {
            resolve(row);
          }
        });
      });
      
      if (row) 
      {
        // ユーザが存在する場合、パスワードのハッシュを比較して認証します
        const isPasswordValid = await bcrypt.compare(password, row.pass);

        if (row && isPasswordValid) 
        {
          // 認証成功時の処理
          return callback(null, 
          {
            statusCode: 307,
            body: JSON.stringify({
              message: 'ログイン成功',
            }),
            headers: 
            {
              'Location': 'https://slack-bot-real-key.s3.ap-northeast-1.amazonaws.com/main.html'
            }
          });
        } else 
        {
          // パスワードが一致しない場合
          throw new Error('Invalid password');
        }
      } else 
      {
        // 認証失敗時の処理
        return callback(null, {
          statusCode: 307,
          body: JSON.stringify({
            message: 'ログイン失敗',
          }),
          headers: {
            'Location': 'https://slack-bot-real-key.s3.ap-northeast-1.amazonaws.com/login.html'
          }
        });
      };
    } else if(event.queryStringParameters.act==="add") 
    {
      const student_id = event.queryStringParameters.student_id;
      const name = event.queryStringParameters.name;
      const plainPassword = event.queryStringParameters.pass;

      // パスワードをハッシュ化
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      // データベースに新しいユーザーを追加
      db.run('INSERT INTO users (student_id, name, pass) VALUES (?, ?, ?)', [student_id, name, hashedPassword], async (err) => {
        if (err) {
          console.error(err);
          return callback(err);
        }

        コネクションを閉じる
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
      });

    }else if(event.queryStringParameters.act==="entrance")
    {
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
    }
    else if (event.queryStringParameters.act==="logout")
    {
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
    console.error(error);

    return callback(null, {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal Server Error',
      }),
    });
  } finally {
    // データベース接続を閉じる
    db.close();
  }
  // await app.client.chat.postMessage({
  //   token: process.env.SLACK_BOT_TOKEN,
  //   channel: 'C06FLR2DGUX',
  //   text: 'Hello world!'
  // });
  // const handler = await awsLambdaReceiver.start();
  // return handler(event, context, callback);
  
};