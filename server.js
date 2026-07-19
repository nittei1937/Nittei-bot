const express = require("express");

/**
 * Render等のホスティング環境向けの簡易HTTPサーバー。
 * Renderの無料Webサービスは「ポートを開けて待ち受けているか」で稼働判定するため、
 * Discord Botの接続とは別に、最低限のヘルスチェック用エンドポイントを立てておく。
 * UptimeRobotなどの外形監視サービスからこのURLに定期アクセスしてもらうと、
 * 無料プランでのスリープ（一定時間アクセスがないとサービスが止まる）対策にもなる。
 */
function startHealthCheckServer() {
    const app = express();
    const port = process.env.PORT || 3000;

    app.get("/", (req, res) => {
        res.send("Nittei-Bot is running.");
    });

    app.get("/health", (req, res) => {
        res.json({ status: "ok", uptime: process.uptime() });
    });

    app.listen(port, () => {
        console.log(`ヘルスチェック用サーバーがポート${port}で起動しました。`);
    });
}

module.exports = { startHealthCheckServer };
