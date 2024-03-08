var express = require('express');
var router = express.Router();
var sqlite3 = require('sqlite3');
var bcrypt = require('bcrypt'); 
const session = require('express-session');

//データベースオブジェクトの取得
const db = new sqlite3.Database('./../db/slack-app.db');

// セッションの設定
router.use(session({
  secret: 'your-secret-key', // セッションの秘密鍵
  resave: false,
  saveUninitialized: true
}));


// ユーザ認証
router.post('/login', function(req, res, next) {
    const student_num = req.body.student_num;
    const password = req.body.password;

    const query = "SELECT * FROM user WHERE student_num = ?";
    db.get(query, [student_num], (err, user) => {
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
    const student_num = req.body.student_num;
    const name = req.body.name;
    const password = req.body.password;

    // パスワードをハッシュ化
    bcrypt.hash(password, 10, function(err, hash) {
        if (err) {
            // ハッシュ化エラー
            res.send('ユーザ追加失敗');
        } else {
            // ハッシュ化されたパスワードをデータベースに保存
            const query = "INSERT INTO user (student_num, name, pass) VALUES (?, ?, ?)";
            db.run(query, [student_num, name, hash], function(err) {
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

// Mainページのルート
router.get('/main', function(req, res, next) {
    // セッションからユーザ情報を取得
    const user = req.session.user;

    // ログイン状態の確認
    if (user) {
        // ログイン済みの場合
        res.render('main', { user });
    } else {
        // 未ログインの場合はログインページにリダイレクト
        res.redirect('/login');
    }
});

module.exports = router;

