const { App, AwsLambdaReceiver } = require('@slack/bolt');

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

// Lambda 関数のイベントを処理します
module.exports.handler = async (event, context, callback) => {
  console.log(event.queryStringParameters);
  if(event.queryStringParameters.act==="entrance")
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
  }
  // await app.client.chat.postMessage({
  //   token: process.env.SLACK_BOT_TOKEN,
  //   channel: 'C06FLR2DGUX',
  //   text: 'Hello world!'
  // });
  // const handler = await awsLambdaReceiver.start();
  // return handler(event, context, callback);
  
}