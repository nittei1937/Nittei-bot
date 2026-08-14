const fs = require("fs");
const path = require("path");

const dailyMessagePath = path.join(
    __dirname,
    "..",
    "data",
    "message",
    "dailyMessage.json"
);

const detectSettingsPath = path.join(
    __dirname,
    "..",
    "data",
    "message",
    "detectSettings.json"
);

let timer = null;
let isRunning = false;

// ギルドごとの最終送信日
const lastSentDates = new Map();


// ============================================================
// dailyMessage.json 読み込み
// ============================================================

function readDailyMessages() {
    try {
        const data = JSON.parse(
            fs.readFileSync(dailyMessagePath, "utf8")
        );

        return data && typeof data === "object"
            ? data
            : {};

    } catch (error) {

        if (error.code === "ENOENT") {
            console.error(
                "[daily] dailyMessage.json が見つかりません。"
            );

            return {};
        }

        console.error(
            "[daily] dailyMessage.json の読み込みに失敗しました。",
            error
        );

        return {};
    }
}


// ============================================================
// detectSettings.json 読み込み
// ============================================================

function readDetectSettings() {
    try {
        const data = JSON.parse(
            fs.readFileSync(detectSettingsPath, "utf8")
        );

        return data && typeof data === "object"
            ? data
            : {};

    } catch (error) {

        if (error.code === "ENOENT") {
            return {};
        }

        console.error(
            "[daily] detectSettings.json の読み込みに失敗しました。",
            error
        );

        return {};
    }
}


// ============================================================
// 日本時間の日付を YYYY-MM-DD で取得
// ============================================================

function getTokyoDateString() {
    const parts = new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "Asia/Tokyo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    ).formatToParts(new Date());

    const getPart = type =>
        parts.find(
            part => part.type === type
        )?.value;

    return `${getPart("year")}-${getPart("month")}-${getPart("day")}`;
}


// ============================================================
// 現在の日本時間を取得
// ============================================================

function getTokyoTime() {
    const parts = new Intl.DateTimeFormat(
        "en-US",
        {
            timeZone: "Asia/Tokyo",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        }
    ).formatToParts(new Date());

    const getNumber = type =>
        Number(
            parts.find(
                part => part.type === type
            )?.value ?? 0
        );

    return {
        hour: getNumber("hour"),
        minute: getNumber("minute"),
        second: getNumber("second")
    };
}


// ============================================================
// 定時メッセージ送信
// ============================================================

async function sendDailyMessages(client) {

    if (isRunning) {
        return;
    }

    isRunning = true;

    try {

        const dailyMessages =
            readDailyMessages();

        const detectSettings =
            readDetectSettings();

        const today =
            getTokyoDateString();


        for (
            const [guildId, config]
            of Object.entries(dailyMessages)
        ) {

            // ------------------------------------------------
            // 設定確認
            // ------------------------------------------------

            if (!config) {
                continue;
            }

            const channelId =
                config.channelId;

            const message =
                config.message;

            if (!channelId || !message) {
                console.warn(
                    `[daily] 設定不備: guild=${guildId}`
                );
                continue;
            }


            // ------------------------------------------------
            // /detect daily off の場合は送信しない
            //
            // detectSettings.json の値が false の場合のみ
            // 無効と判定する。
            // ------------------------------------------------

            if (detectSettings[guildId] === false) {
                continue;
            }


            // ------------------------------------------------
            // 今日すでに送信済みならスキップ
            // ------------------------------------------------

            if (
                lastSentDates.get(guildId) === today
            ) {
                continue;
            }


            // ------------------------------------------------
            // Botがそのサーバーにいるか確認
            // ------------------------------------------------

            const guild =
                client.guilds.cache.get(guildId);

            if (!guild) {

                console.error(
                    `[daily] Botがサーバーに参加していません: ${guildId}`
                );

                continue;
            }


            // ------------------------------------------------
            // チャンネル取得
            // ------------------------------------------------

            let channel;

            try {

                channel =
                    await client.channels.fetch(
                        channelId
                    );

            } catch (error) {

                console.error(
                    `[daily] チャンネル取得失敗: guild=${guildId} channel=${channelId}`
                );

                console.error(error);

                continue;
            }


            if (
                !channel ||
                !channel.isTextBased()
            ) {

                console.error(
                    `[daily] 送信先チャンネルが見つからないか、テキストチャンネルではありません: ${channelId}`
                );

                continue;
            }


            // ------------------------------------------------
            // メッセージ送信
            // ------------------------------------------------

            try {

                await channel.send(
                    message
                );

                lastSentDates.set(
                    guildId,
                    today
                );

                console.log(
                    `[daily] ✅ 定時メッセージ送信成功: ${guild.name} (${channelId})`
                );

            } catch (error) {

                console.error(
                    `[daily] ❌ 定時メッセージ送信失敗: guild=${guildId} channel=${channelId}`
                );

                console.error(error);
            }
        }

    } finally {

        isRunning = false;
    }
}


// ============================================================
// Runner
// ============================================================

function startDailyMessageRunner(client) {

    if (timer) {
        return;
    }

    console.log(
        "[daily] 日次メッセージRunnerを起動しました。"
    );


    // --------------------------------------------------------
    // 1秒ごとに日本時間を確認
    // --------------------------------------------------------

    timer = setInterval(() => {

        const time =
            getTokyoTime();

        // 日本時間 00:00:00 のときだけ処理
        if (
            time.hour === 0 &&
            time.minute === 0 &&
            time.second === 0
        ) {

            sendDailyMessages(
                client
            ).catch(error => {

                console.error(
                    "[daily] 定時メッセージ処理でエラーが発生しました。",
                    error
                );
            });
        }

    }, 1000);
}


// ============================================================
// Export
// ============================================================

module.exports = {
    startDailyMessageRunner
};