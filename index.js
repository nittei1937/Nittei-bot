// index.js - NitteiBot メインプログラム

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const JSON5 = require("json5");

const {
    Client,
    Collection,
    GatewayIntentBits,
    Events,
    MessageFlags
} = require("discord.js");

const { startScheduleRunner } = require("./utils/schedule");
const { handleVoiceStateUpdate } = require("./utils/vcwatchHandler");

// ==============================
// 環境変数
// ==============================

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

if (!DISCORD_TOKEN) {
    console.error("❌ DISCORD_TOKEN が設定されていません。");
    process.exit(1);
}

// ==============================
// JSONデータ読み込み
// ==============================

function loadJson(filePath, defaultValue = {}) {
    try {
        if (!fs.existsSync(filePath)) {
            console.warn(
                `⚠️ JSONファイルが見つかりません: ${filePath}`
            );
            return defaultValue;
        }

        const raw = fs.readFileSync(filePath, "utf8");

        return JSON5.parse(raw);

    } catch (error) {
        console.error(
            `❌ JSON読み込みエラー: ${filePath}`
        );
        console.error(error);

        return defaultValue;
    }
}

function flattenData(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (data && typeof data === "object") {
        return Object.values(data)
            .filter(Array.isArray)
            .flat();
    }

    return [];
}

// ==============================
// 車・ハンデデータ
// ==============================

const carsRaw = loadJson(
    path.join(
        __dirname,
        "data",
        "random",
        "cars.json5"
    ),
    {}
);

const handicapsRaw = loadJson(
    path.join(
        __dirname,
        "data",
        "random",
        "handicaps.json5"
    ),
    {}
);

const cars = flattenData(carsRaw);
const handicaps = flattenData(handicapsRaw);

console.log(
    `🚗 車データ読み込み: ${cars.length}件`
);

console.log(
    `🏁 ハンデデータ読み込み: ${handicaps.length}件`
);

// ==============================
// 毎日メッセージ
// ==============================
//
// data/message/dailyMessage.json
//
// 例:
//
// {
//     "サーバーID": {
//         "channelId": "チャンネルID",
//         "message": "あけおめ"
//     }
// }
//
// 毎日、日本時間0:00:00に送信
// ==============================

const DAILY_MESSAGE_PATH = path.join(
    __dirname,
    "data",
    "message",
    "dailyMessage.json"
);

function loadDailyMessages() {
    try {
        if (!fs.existsSync(DAILY_MESSAGE_PATH)) {
            console.warn(
                `⚠️ dailyMessage.json が見つかりません: ${DAILY_MESSAGE_PATH}`
            );

            return {};
        }

        const raw = fs.readFileSync(
            DAILY_MESSAGE_PATH,
            "utf8"
        );

        const data = JSON.parse(raw);

        if (!data || typeof data !== "object") {
            console.warn(
                "⚠️ dailyMessage.json の形式が正しくありません。"
            );

            return {};
        }

        return data;

    } catch (error) {
        console.error(
            "❌ dailyMessage.json の読み込みに失敗しました。"
        );
        console.error(error);

        return {};
    }
}

// ==============================
// 日本時間取得
// ==============================

function getJapanDateParts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat(
        "ja-JP",
        {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        }
    );

    const parts = formatter.formatToParts(date);

    const result = {};

    for (const part of parts) {
        if (part.type !== "literal") {
            result[part.type] = Number(part.value);
        }
    }

    return result;
}

// ==============================
// 次の日本時間0:00:00を計算
// ==============================

function getMillisecondsUntilNextJapanMidnight() {
    const now = new Date();

    const japan = getJapanDateParts(now);

    // 現在の日本時間の日付の翌日0:00:00
    //
    // 日本はUTC+9なので、
    // UTCとして作った時刻から9時間戻す
    const nextMidnightUtc = Date.UTC(
        japan.year,
        japan.month - 1,
        japan.day + 1,
        0,
        0,
        0
    ) - (9 * 60 * 60 * 1000);

    return nextMidnightUtc - now.getTime();
}

// ==============================
// 毎日メッセージ送信
// ==============================

let dailyMessageTimer = null;

async function sendDailyMessages() {
    const dailyMessages = loadDailyMessages();

    const entries = Object.entries(dailyMessages);

    if (entries.length === 0) {
        console.log(
            "ℹ️ dailyMessage.json に送信設定がありません。"
        );

        return;
    }

    console.log(
        `📢 毎日メッセージ送信開始: ${entries.length}件`
    );

    for (const [guildId, config] of entries) {

        try {
            if (!config || typeof config !== "object") {
                console.warn(
                    `⚠️ dailyMessage設定が不正です: ${guildId}`
                );
                continue;
            }

            const channelId = config.channelId;
            const message = config.message;

            if (!channelId) {
                console.warn(
                    `⚠️ 送信先チャンネルIDがありません: ${guildId}`
                );
                continue;
            }

            if (
                typeof message !== "string" ||
                message.length === 0
            ) {
                console.warn(
                    `⚠️ 送信メッセージがありません: ${guildId}`
                );
                continue;
            }

            const channel = await client.channels.fetch(
                channelId
            ).catch(() => null);

            if (!channel) {
                console.warn(
                    `⚠️ チャンネルを取得できませんでした: ${channelId} / Guild ${guildId}`
                );
                continue;
            }

            if (!channel.isTextBased()) {
                console.warn(
                    `⚠️ テキスト送信できないチャンネルです: ${channelId}`
                );
                continue;
            }

            await channel.send(message);

            console.log(
                `📢 毎日メッセージ送信完了: Guild=${guildId} Channel=${channelId} Message=${message}`
            );

        } catch (error) {
            console.error(
                `❌ 毎日メッセージ送信エラー: Guild=${guildId}`
            );
            console.error(error);
        }
    }
}

// ==============================
// 毎日0:00:00スケジューラー
// ==============================

function scheduleDailyMessages() {

    if (dailyMessageTimer) {
        clearTimeout(dailyMessageTimer);
    }

    const delay =
        getMillisecondsUntilNextJapanMidnight();

    const nextRun = new Date(
        Date.now() + delay
    );

    const japan = getJapanDateParts(nextRun);

    console.log(
        `⏰ 次回「あけおめ」送信予定: ` +
        `${japan.year}/${String(japan.month).padStart(2, "0")}/` +
        `${String(japan.day).padStart(2, "0")} ` +
        `00:00:00 JST`
    );

    dailyMessageTimer = setTimeout(
        async () => {

            try {
                await sendDailyMessages();
            } catch (error) {
                console.error(
                    "❌ 毎日メッセージ処理でエラーが発生しました。"
                );
                console.error(error);
            }

            // 次の日の0:00をセット
            scheduleDailyMessages();

        },
        Math.max(delay, 1000)
    );
}

// ==============================
// Discord Client
// ==============================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// ==============================
// コマンド読み込み
// ==============================

client.commands = new Collection();

const commandsPath = path.join(
    __dirname,
    "commands"
);

if (fs.existsSync(commandsPath)) {

    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {

        try {

            const filePath = path.join(
                commandsPath,
                file
            );

            const command = require(filePath);

            if (Array.isArray(command)) {

                for (const cmd of command) {

                    if (
                        cmd?.data?.name &&
                        typeof cmd.execute === "function"
                    ) {

                        client.commands.set(
                            cmd.data.name,
                            cmd
                        );

                        console.log(
                            `✅ コマンド読込 : /${cmd.data.name}`
                        );
                    }
                }

            } else if (
                command?.data?.name &&
                typeof command.execute === "function"
            ) {

                client.commands.set(
                    command.data.name,
                    command
                );

                console.log(
                    `✅ コマンド読込 : /${command.data.name}`
                );

            } else {

                console.warn(
                    `⚠️ コマンド形式が不正です: ${file}`
                );
            }

        } catch (error) {

            console.error(
                `❌ コマンド読み込み失敗: ${file}`
            );

            console.error(error);
        }
    }
}

// ==============================
// ランダム選択
// ==============================

function randomItem(array) {

    if (
        !Array.isArray(array) ||
        array.length === 0
    ) {
        return null;
    }

    return array[
        Math.floor(
            Math.random() * array.length
        )
    ];
}

// ==============================
// メッセージ監視
// ==============================

client.on(
    Events.MessageCreate,
    async message => {

        // Bot自身のメッセージは無視
        if (message.author.bot) return;

        try {

            // ==========================
            // 車安価
            // ==========================

            if (message.content === "車安価") {

                const car = randomItem(cars);

                if (!car) {

                    await message.reply(
                        "❌ 車データが登録されていません。"
                    );

                    return;
                }

                await message.reply(
                    String(car)
                );

                return;
            }

            // ==========================
            // ハンデ
            // ==========================

            if (message.content === "ハンデ") {

                const handicap =
                    randomItem(handicaps);

                if (!handicap) {

                    await message.reply(
                        "❌ ハンデデータが登録されていません。"
                    );

                    return;
                }

                await message.reply(
                    String(handicap)
                );

                return;
            }

        } catch (error) {

            console.error(
                "❌ メッセージ処理中にエラーが発生しました。"
            );

            console.error(error);
        }
    }
);

// ==============================
// Interaction処理
// ==============================

client.on(
    Events.InteractionCreate,
    async interaction => {

        try {

            // ==========================
            // 翻訳セレクトメニュー
            // ==========================

            if (
                interaction.isStringSelectMenu() &&
                interaction.customId.startsWith(
                    "translate_language_"
                )
            ) {

                const translateCommand =
                    client.commands.get("翻訳");

                if (
                    translateCommand &&
                    typeof translateCommand.handleSelectMenu ===
                        "function"
                ) {

                    await translateCommand.handleSelectMenu(
                        interaction
                    );

                } else {

                    console.error(
                        "❌ 翻訳コマンドのhandleSelectMenuが見つかりません。"
                    );

                    if (
                        !interaction.replied &&
                        !interaction.deferred
                    ) {

                        await interaction.reply({
                            content:
                                "❌ 翻訳処理を実行できませんでした。",
                            flags:
                                MessageFlags.Ephemeral
                        });
                    }
                }

                return;
            }

            // ==========================
            // Autocomplete
            // ==========================

            if (interaction.isAutocomplete()) {

                const command =
                    client.commands.get(
                        interaction.commandName
                    );

                if (
                    !command ||
                    typeof command.autocomplete !==
                        "function"
                ) {
                    return;
                }

                try {

                    await command.autocomplete(
                        interaction
                    );

                } catch (error) {

                    console.error(
                        `❌ Autocompleteエラー: /${interaction.commandName}`
                    );

                    console.error(error);
                }

                return;
            }

            // ==========================
            // Chat Input / Context Menu
            // ==========================

            if (
                !interaction.isChatInputCommand() &&
                !interaction.isMessageContextMenuCommand() &&
                !interaction.isUserContextMenuCommand()
            ) {
                return;
            }

            const command =
                client.commands.get(
                    interaction.commandName
                );

            if (!command) {

                console.warn(
                    `⚠️ コマンドが見つかりません: ${interaction.commandName}`
                );

                return;
            }

            await command.execute(
                interaction
            );

        } catch (error) {

            console.error(
                "❌ コマンド実行中にエラーが発生しました。"
            );

            console.error(error);

            try {

                if (
                    interaction.replied ||
                    interaction.deferred
                ) {

                    await interaction.followUp({
                        content:
                            "❌ コマンド実行中にエラーが発生しました。",
                        flags:
                            MessageFlags.Ephemeral
                    });

                } else {

                    await interaction.reply({
                        content:
                            "❌ コマンド実行中にエラーが発生しました。",
                        flags:
                            MessageFlags.Ephemeral
                    });
                }

            } catch (replyError) {

                console.error(
                    "❌ エラー通知の送信にも失敗しました。"
                );

                console.error(replyError);
            }
        }
    }
);

// ==============================
// VC監視
// ==============================

client.on(
    Events.VoiceStateUpdate,
    async (oldState, newState) => {

        try {

            await handleVoiceStateUpdate(
                oldState,
                newState
            );

        } catch (error) {

            console.error(
                "❌ VC監視処理でエラーが発生しました。"
            );

            console.error(error);
        }
    }
);

// ==============================
// Discord Debug
// ==============================

client.on("debug", info => {

    // トークンそのものがログに出ないようにする
    if (
        info.includes("Provided token:")
    ) {

        console.log(
            "[Discord Debug] Token received."
        );

        return;
    }

    console.log(
        `[Discord Debug] ${info}`
    );
});

client.on("warn", info => {

    console.warn(
        `[Discord Warn] ${info}`
    );
});

client.on("error", error => {

    console.error(
        "❌ Discord Client Error"
    );

    console.error(error);
});

// ==============================
// Gateway / Shard
// ==============================

client.on(
    "shardConnecting",
    shardId => {

        console.log(
            `🔄 Discord Gateway 接続中... Shard ${shardId}`
        );
    }
);

client.on(
    "shardReady",
    shardId => {

        console.log(
            `🟢 Discord Gateway 接続完了。Shard ${shardId}`
        );
    }
);

client.on(
    "shardReconnecting",
    shardId => {

        console.log(
            `🔁 Discord Gateway 再接続中... Shard ${shardId}`
        );
    }
);

client.on(
    "shardDisconnect",
    (event, shardId) => {

        console.warn(
            `⚠️ Discord Gateway 切断。Shard ${shardId}`,
            event
        );
    }
);

client.on(
    "shardError",
    (error, shardId) => {

        console.error(
            `❌ Discord Gateway Error。Shard ${shardId}`
        );

        console.error(error);
    }
);

// ==============================
// Process Error
// ==============================

process.on(
    "unhandledRejection",
    error => {

        console.error(
            "❌ Unhandled Promise Rejection"
        );

        console.error(error);
    }
);

process.on(
    "uncaughtException",
    error => {

        console.error(
            "❌ Uncaught Exception"
        );

        console.error(error);
    }
);

// ==============================
// Discord Ready
// ==============================

client.once(
    Events.ClientReady,
    readyClient => {

        console.log(
            `✅ Discordログイン完了: ${readyClient.user.tag}`
        );

        // ==========================
        // 通常スケジュール
        // ==========================

        try {

            startScheduleRunner(
                readyClient
            );

            console.log(
                "✅ スケジュール処理を開始しました。"
            );

        } catch (error) {

            console.error(
                "❌ スケジュール処理の開始に失敗しました。"
            );

            console.error(error);
        }

        // ==========================
        // 毎日0:00メッセージ
        // ==========================

        try {

            scheduleDailyMessages();

            console.log(
                "✅ 毎日0:00メッセージ処理を開始しました。"
            );

        } catch (error) {

            console.error(
                "❌ 毎日0:00メッセージ処理の開始に失敗しました。"
            );

            console.error(error);
        }
    }
);

// ==============================
// Discord Login
// ==============================

console.log(
    "🔐 Discordへログインしています..."
);

client.login(
    DISCORD_TOKEN
).catch(error => {

    console.error(
        "❌ Discordログインに失敗しました。"
    );

    console.error(error);
});

// ==============================
// Express
// Render用ヘルスチェック
// ==============================

const app = express();

app.get(
    "/",
    (req, res) => {

        res.send(
            "NitteiBot is running."
        );
    }
);

app.get(
    "/health",
    (req, res) => {

        res.status(200).json({
            status: "ok",
            discordReady: client.isReady()
        });
    }
);

const PORT =
    process.env.PORT || 10000;

app.listen(
    PORT,
    () => {

        console.log(
            `🌐 Web Server : Port ${PORT}`
        );
    }
);

// ==============================
// 終了処理
// ==============================

process.on(
    "SIGINT",
    () => {

        console.log(
            "🛑 SIGINTを受信しました。"
        );

        if (dailyMessageTimer) {
            clearTimeout(
                dailyMessageTimer
            );
        }

        client.destroy();

        process.exit(0);
    }
);

process.on(
    "SIGTERM",
    () => {

        console.log(
            "🛑 SIGTERMを受信しました。"
        );

        if (dailyMessageTimer) {
            clearTimeout(
                dailyMessageTimer
            );
        }

        client.destroy();

        process.exit(0);
    }
);