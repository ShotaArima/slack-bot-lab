var express = require('express');
var router = express.Router();
var sqlite3 = require('sqlite3');
var bcrypt = require('bcrypt'); 

//データベースオブジェクトの取得
const db = new sqlite3.Database('./../db/slack-app.db');

// ユーザ認証
router.post('/login', function(req, res, next) {
    const icId = req.body.ic_id;
    const password = req.body.password;

    const query = "SELECT * FROM user WHERE ic_id = ?";
    db.get(query, [icId], (err, user) => {
        if (!err && user) {
            // データベースからユーザが見つかった場合
            bcrypt.compare(password, user.pass, function(err, result) {
                if (result) {
                    // パスワード一致 → ログイン成功
                    res.send('ログイン成功');
                } else {
                    // パスワード不一致 → ログイン失敗
                    res.send('ログイン失敗');
                }
            });
        } else {
            // ユーザが見つからなかった場合 or エラーが発生した場合
            res.send('ログイン失敗');
        }
    });
});



// ユーザ追加
const bcrypt = require('bcrypt');

router.post('/add-user', function(req, res, next) {
    const icId = req.body.ic_id;
    const name = req.body.name;
    const password = req.body.password;

    // パスワードをハッシュ化
    bcrypt.hash(password, 10, function(err, hash) {
        if (err) {
            // ハッシュ化エラー
            res.send('ユーザ追加失敗');
        } else {
            // ハッシュ化されたパスワードをデータベースに保存
            const query = "INSERT INTO user (ic_id, name, pass) VALUES (?, ?, ?)";
            db.run(query, [icId, name, hash], function(err) {
                if (!err) {
                    // ユーザ追加成功
                    res.send('ユーザ追加成功');
                } else {
                    // ユーザ追加失敗
                    res.send('ユーザ追加失敗');
                }
            });
        }
    });
});

module.exports = router;

