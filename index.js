// index.js - NitteiBot メインプログラム

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const {
    Client,
    Collection,
    GatewayIntentBits,
    Events,
    MessageFlags,
} = require("discord.js");
const { startScheduleRunner } = require("./utils/schedule");
const { checkBarusuMessage } = require("./utils/barusuDetector");
const { checkProfanityMessage } = require("./utils/profanityDetector");
const { isCommandDisabled } = require("./utils/commandSettings");
const { startDailyMessageRunner } = require("./utils/dailyMessage");
const { getTokenizer } = require("./utils/tokenizer");

// 起動時に辞書を読み込んでおく（最初のメッセージ判定が遅れないように）
getTokenizer().catch(error => {
    console.error("❌ 形態素解析辞書の読み込みに失敗しました。", error);
});

// =========================
// Discord Client
// =========================

const { DISCORD_TOKEN } = process.env;

if (!DISCORD_TOKEN) {
    console.error("❌ DISCORD_TOKEN が .env に設定されていません。");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// =========================
// コマンド読み込み
// =========================

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);
        if (Array.isArray(command)) {
            for (const cmd of command) {
                client.commands.set(cmd.data.name, cmd);
                console.log(`✅ コマンド読込 : /${cmd.data.name}`);
            }
        } else {
            client.commands.set(command.data.name, command);
            console.log(`✅ コマンド読込 : /${command.data.name}`);
        }

    } catch (error) {

        console.error(`❌ ${file} の読み込みに失敗しました。`);
        console.error(error);

    }

}

// =========================
// Bot起動完了
// =========================

client.once(Events.ClientReady, (readyClient) => {
    console.log("====================================");
    console.log("🎉 NitteiBot 起動完了");
    console.log(`🤖 Bot : ${readyClient.user.tag}`);
    console.log(`📊 サーバー数 : ${readyClient.guilds.cache.size}`);

    readyClient.guilds.cache.forEach(guild => {
        console.log(`- ${guild.name} (${guild.id})`);
    });

    console.log("====================================");

    startScheduleRunner(readyClient);
    startDailyMessageRunner(readyClient);
});

// =========================
// チャット内バルス検出
// =========================

client.on(Events.MessageCreate, message => {
    checkBarusuMessage(message).catch(error => {
        console.error("[barusuDetector] 予期しないエラー:", error);
    });
    checkProfanityMessage(message).catch(error => {
        console.error("[profanityDetector] 予期しないエラー:", error);
    });
});

// =========================
// スラッシュコマンド
// =========================

client.on(Events.InteractionCreate, async interaction => {

    // ---------- Autocomplete ----------

    if (interaction.isAutocomplete()) {

        const command = client.commands.get(interaction.commandName);

        if (!command) return;

        if (typeof command.autocomplete !== "function") return;

        try {

            await command.autocomplete(interaction);

        } catch (error) {

            console.error(
                `❌ Autocompleteエラー (${interaction.commandName})`
            );

            console.error(error);

        }

        return;

    }

    // ---------- Slash Command / Context Menu ----------

    if (!interaction.isChatInputCommand() && !interaction.isMessageContextMenuCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {

        console.error(
            `❌ 未登録コマンド : ${interaction.commandName}`
        );

        return;

    }

    if (
        interaction.guildId &&
        interaction.commandName !== "servercommand" &&
        isCommandDisabled(interaction.guildId, interaction.commandName)
    ) {
        return interaction.reply({
            content: `\`/${interaction.commandName}\` はこのサーバーでは無効化されています。`,
            flags: MessageFlags.Ephemeral,
        });
    }

    try {

        await command.execute(interaction);

    } catch (error) {

        console.error(
            `❌ コマンド実行エラー (${interaction.commandName})`
        );

        console.error(error);

        const reply = {
            content: "コマンドの実行中にエラーが発生しました。",
            flags: MessageFlags.Ephemeral,
        };

        if (interaction.replied || interaction.deferred) {

            await interaction.followUp(reply);

        } else {

            await interaction.reply(reply);

        }

    }

});

// =========================
// Discord Error
// =========================

client.on("error", error => {

    console.error("❌ Discord Client Error");
    console.error(error);

});

client.on(Events.ShardError, error => {
    console.error("❌ Shard Error:", error);
});

client.on(Events.ShardDisconnect, (event, shardId) => {
    console.error(`⚠️ Shard ${shardId} disconnected:`, event?.code, event?.reason);
});

client.on(Events.Invalidated, () => {
    console.error("❌ セッションが無効化されました（Invalidated）。トークンやIntentの設定を確認してください。");
});

// ログインが一定時間で完了しない場合に気づけるようにする（診断用）
const loginTimeout = setTimeout(() => {
    console.error("⏰ ログイン処理が30秒経っても完了していません。ネットワークまたはIntent設定を確認してください。");
}, 30000);

client.once(Events.ClientReady, () => {
    clearTimeout(loginTimeout);
});

// =========================
// 終了処理
// =========================

process.on("SIGINT", () => {

    console.log("");
    console.log("🛑 Botを終了します");

    client.destroy();

    process.exit(0);

});

// =========================
// Discord Login
// =========================

// 診断用：Discordへの疎通確認（認証不要なエンドポイント）
console.log("🔍 Discord APIへの疎通を確認中...");

const https = require("https");

const diagnosticStart = Date.now();
const diagnosticReq = https.get("https://discord.com/api/v10/gateway", res => {
    console.log(`✅ Discord APIに到達できました（${Date.now() - diagnosticStart}ms, status: ${res.statusCode}）`);
    res.resume();
});

diagnosticReq.setTimeout(10000, () => {
    console.error("❌ Discord APIへの接続が10秒でタイムアウトしました。ネットワーク経路に問題がある可能性が高いです。");
    diagnosticReq.destroy();
});

diagnosticReq.on("error", error => {
    console.error("❌ Discord APIへの接続でエラーが発生しました:", error.message);
});

client.login(DISCORD_TOKEN).catch(error => {

    console.error("❌ Discordへのログインに失敗しました。");
    console.error(error);

    process.exit(1);

});

// =========================
// Express (Render)
// =========================

const app = express();

const port = process.env.PORT || 3000;

app.get("/", (req, res) => {

    res.json({
        status: "Bot is running! 🤖",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });

});

app.get("/health", (req, res) => {

    res.json({
        status: "ok",
        uptime: process.uptime(),
    });

});

app.listen(port, () => {

    console.log(`🌐 Web Server : Port ${port}`);

});
