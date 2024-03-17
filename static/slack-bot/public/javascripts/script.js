if (statusCode === 200) {
    alert('ログインに成功しました');
}else if(statusCode === 401){
    alert('error message');
} else if(statusCode === 201){
    alert('ユーザーを追加しました');
}else if(statusCode === 302){
    alert('ユーザーはすでに存在します');
} else if(statusCode === 500){
    alert('ユーザーの追加中にエラーが発生しました');
} else if(statusCode === 307){
    alert('メッセージを送信しました');
} else if(statusCode === 501){
    alert('Internal Server Error');
}
