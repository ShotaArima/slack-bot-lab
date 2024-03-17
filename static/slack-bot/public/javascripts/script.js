if (statusCode === 200) 
{
    alert('ログインに成功しました');
    window.location.href = 'https://slack-bot-real-key.s3.ap-northeast-1.amazonaws.com/slack-bot/public/main.html';
} else if (statusCode === 401) 
{
    alert('認証エラーが発生しました');
    window.location.href = 'https://slack-bot-real-key.s3.ap-northeast-1.amazonaws.com/login.html';
} else if (statusCode === 201) 
{
    alert('ユーザーを追加しました');
    window.location.href = 'https://slack-bot-real-key.s3.ap-northeast-1.amazonaws.com/slack-bot/public/login.html';
} else if (statusCode === 302) 
{
    alert('ユーザーはすでに存在します');
    window.location.href = 'https://slack-bot-real-key.s3.ap-northeast-1.amazonaws.com/slack-bot/public/add.html';
} else if (statusCode === 500) 
{
    alert('ユーザーの追加中にエラーが発生しました');
    window.location.href = 'https://slack-bot-real-key.s3.ap-northeast-1.amazonaws.com/slack-bot/public/add.html';
} else if (statusCode === 307) 
{
    alert('メッセージを送信しました');
    window.location.href = 'https://slack-bot-real-key.s3.ap-northeast-1.amazonaws.com/logout.html';
} else if (statusCode === 501) 
{
    alert('Internal Server Error');
    window.location.href = 'https://slack-bot-real-key.s3.ap-northeast-1.amazonaws.com/slack-bot/public/login.html';
}
