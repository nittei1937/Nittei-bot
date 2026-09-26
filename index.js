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

// ==============================
// 環境変数
// ==============================

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

if (!DISCORD_TOKEN) {
    console.error("❌ DISCORD_TOKEN が .env / Render の環境変数に設定されていません。");
    process.exit(1);
}

// ==============================
// Discord Client
// ==============================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// ==============================
// コマンド読み込み
// ==============================

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");

if (!fs.existsSync(commandsPath)) {
    console.error(`❌ commands ディレクトリが見つかりません: ${commandsPath}`);
} else {
    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {
        try {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath);

            // 配列でexportされているコマンドにも対応
            const commands = Array.isArray(command)
                ? command
                : [command];

            for (const cmd of commands) {
                if (!cmd?.data?.name) {
                    console.warn(`⚠️ コマンド名を取得できませんでした: ${file}`);
                    continue;
                }

                client.commands.set(cmd.data.name, cmd);

                console.log(`✅ コマンド読込 : /${cmd.data.name}`);
            }
        } catch (error) {
            console.error(`❌ コマンド読込エラー : ${file}`);
            console.error(error);
        }
    }
}

// ==============================
// Interaction
// ==============================

client.on(Events.InteractionCreate, async interaction => {

    // ------------------------------
    // Autocomplete
    // ------------------------------

    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);

        if (!command?.autocomplete) {
            return;
        }

        try {
            await command.autocomplete(interaction);
        } catch (error) {
            console.error(
                `❌ オートコンプリートエラー (${interaction.commandName})`
            );
            console.error(error);
        }

        return;
    }

    // ------------------------------
    // Slash Command
    // ------------------------------

    if (!interaction.isChatInputCommand()) {
        return;
    }

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.warn(
            `⚠️ 未登録のコマンドが実行されました: /${interaction.commandName}`
        );
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(
            `❌ コマンド実行エラー (${interaction.commandName})`
        );
        console.error(error);

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: "❌ コマンド実行中にエラーが発生しました。",
                    flags: MessageFlags.Ephemeral,
                });
            } else {
                await interaction.reply({
                    content: "❌ コマンド実行中にエラーが発生しました。",
                    flags: MessageFlags.Ephemeral,
                });
            }
        } catch (replyError) {
            console.error("❌ エラー通知の送信にも失敗しました。");
            console.error(replyError);
        }
    }
});

// ==============================
// Discord Debug / Warning
// ==============================

client.on("debug", message => {
    // Tokenそのものをログに出さない
    if (message.includes("Provided token:")) {
        console.log("[Discord Debug] Token received.");
        return;
    }

    console.log(`[Discord Debug] ${message}`);
});

client.on("warn", message => {
    console.warn(`[Discord Warn] ${message}`);
});

client.on("error", error => {
    console.error("❌ Discord Client Error");
    console.error(error);
});

// Gateway WebSocket関連
client.ws.on("INTERACTION_CREATE", data => {
    console.log("[Discord WS] INTERACTION_CREATE");
});

// Shard関連イベント
client.ws.on("DEBUG", message => {
    console.log(`[Discord WS Debug] ${message}`);
});

// ==============================
// Gateway接続状態
// ==============================

client.on("shardConnecting", shardId => {
    console.log(`🔌 Gateway接続中 : Shard ${shardId}`);
});

client.on("shardReady", (shardId, unavailableGuilds) => {
    console.log(`✅ Gateway接続完了 : Shard ${shardId}`);
});

client.on("shardReconnecting", shardId => {
    console.log(`🔄 Gateway再接続中 : Shard ${shardId}`);
});

client.on("shardDisconnect", (event, shardId) => {
    console.error(
        `❌ Gateway切断 : Shard ${shardId} / Code: ${event?.code}`
    );
    console.error(event);
});

client.on("shardError", (error, shardId) => {
    console.error(`❌ Gatewayエラー : Shard ${shardId}`);
    console.error(error);
});x

// ==============================
// Discord Ready
// ==============================

client.once(Events.ClientReady, readyClient => {
    console.log("========================================");
    console.log(`✅ Discordログイン完了 : ${readyClient.user.tag}`);
    console.log(`🌐 接続サーバー数 : ${readyClient.guilds.cache.size}`);
    console.log("========================================");

    // スケジュール処理開始
    try {
        startScheduleRunner(client);
        console.log("⏰ スケジュールランナーを開始しました。");
    } catch (error) {
        console.error("❌ スケジュールランナーの起動に失敗しました。");
        console.error(error);
    }
});

// ==============================
// Discord Login
// ==============================

process.on("unhandledRejection", error => {
    console.error("❌ Unhandled Promise Rejection");
    console.error(error);
});

process.on("uncaughtException", error => {
    console.error("❌ Uncaught Exception");
    console.error(error);
});

console.log("🔐 Discordへログインしています...");

// ==============================
// Discord Gateway 接続診断
// ==============================

client.on("shardConnecting", shardId => {
    console.log(`🔌 Shard ${shardId} : Gateway接続開始`);
});

client.on("shardReady", (shardId) => {
    console.log(`✅ Shard ${shardId} : Gateway接続完了`);
});

client.on("shardReconnecting", shardId => {
    console.log(`🔄 Shard ${shardId} : Gateway再接続`);
});

client.on("shardDisconnect", (event, shardId) => {
    console.error(`❌ Shard ${shardId} : Gateway切断`);
    console.error(`Code: ${event?.code}`);
    console.error(`Reason: ${event?.reason}`);
});

client.on("shardError", (error, shardId) => {
    console.error(`❌ Shard ${shardId} : Gatewayエラー`);
    console.error(error);
});

const https = require("https");

function testDiscordGateway() {
    console.log("🔎 Discord Gateway接続診断を開始します...");

    const req = https.get(
        "https://discord.com/api/v10/gateway",
        {
            timeout: 10000,
            headers: {
                "User-Agent": "NitteiBot/1.0",
            },
        },
        res => {
            console.log(`🔎 Discord Gateway HTTP Status : ${res.statusCode}`);

            let data = "";

            res.on("data", chunk => {
                data += chunk;
            });

            res.on("end", () => {
                console.log(`🔎 Discord Gateway Response : ${data}`);
            });
        }
    );

    req.on("timeout", () => {
        console.error("❌ Discord Gateway HTTP接続が10秒でタイムアウトしました。");
        req.destroy();
    });

    req.on("error", error => {
        console.error("❌ Discord Gateway HTTP接続エラー");
        console.error(error);
    });
}

testDiscordGateway();

console.log("🔐 Discordへログインしています...");

client.login(DISCORD_TOKEN).catch(error => {
    console.error("❌ Discordへのログインに失敗しました。");
    console.error(error);
    process.exit(1);
});

// ==============================
// Web Server
// Renderのヘルスチェック用
// ==============================

const app = express();

const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
    res.send("NitteiBot is running.");
});

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        discord: client.isReady(),
    });
});

app.listen(PORT, () => {
    console.log(`🌐 Web Server : Port ${PORT}`);
});

// ==============================
// SIGINT
// ==============================

process.on("SIGINT", async () => {
    console.log("🛑 SIGINTを受信しました。Botを終了します。");

    try {
        client.destroy();
    } catch (error) {
        console.error("❌ Discord Client終了時にエラーが発生しました。");
        console.error(error);
    }

    process.exit(0);
});