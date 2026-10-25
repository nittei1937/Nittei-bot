// utils/vcWatch.js
// vcWatch.json5 を基準にし、変更した文言だけメモリ上で一時上書きする。

const fs = require("fs");
const path = require("path");
const JSON5 = require("json5");

const watchPath = path.join(
    __dirname,
    "..",
    "data",
    "moderation",
    "vcWatch.json5"
);

// guildId -> Map(userId -> 一時的な通知文)
// ファイルには保存しないため、Botの再起動でリセットされる。
const temporaryMessages = new Map();

function readWatches() {
    try {
        const raw = fs.readFileSync(watchPath, "utf8");
        return JSON5.parse(raw);
    } catch (error) {
        console.error(
            "[vcWatch] vcWatch.json5 の読み込みに失敗しました。",
            error
        );
        return {};
    }
}

function getTemporaryMessages(guildId) {
    return temporaryMessages.get(String(guildId));
}

// JSON5を基準に、指定ユーザーの監視設定を取得する。
function getWatch(guildId, userId) {
    const watches = readWatches();
    const baseWatch = watches[String(guildId)]?.[String(userId)];

    if (!baseWatch) {
        return null;
    }

    const messages = getTemporaryMessages(guildId);

    if (!messages || !messages.has(String(userId))) {
        return baseWatch;
    }

    // 基本設定は維持し、通知文だけを一時的に上書きする。
    return {
        ...baseWatch,
        message: messages.get(String(userId)),
    };
}

// サーバー内の監視設定一覧を取得する。
// 一覧にも一時的な通知文を反映する。
function getAllWatches(guildId) {
    const watches = readWatches();
    const baseWatches = watches[String(guildId)] ?? {};
    const result = {};

    for (const [userId, watch] of Object.entries(baseWatches)) {
        result[userId] = getWatch(guildId, userId) ?? watch;
    }

    return result;
}

// JSON5に登録されているユーザーか確認する。
function hasBaseWatch(guildId, userId) {
    const watches = readWatches();

    return Boolean(
        watches[String(guildId)]?.[String(userId)]
    );
}

// 通知文をメモリ上だけで変更する。
// JSON5は変更しない。
function setTemporaryMessage(guildId, userId, message) {
    guildId = String(guildId);
    userId = String(userId);

    if (!hasBaseWatch(guildId, userId)) {
        return false;
    }

    if (typeof message !== "string" || !message.trim()) {
        return false;
    }

    let messages = temporaryMessages.get(guildId);

    if (!messages) {
        messages = new Map();
        temporaryMessages.set(guildId, messages);
    }

    messages.set(userId, message.trim());

    console.log(
        `[vcWatch] 通知文を一時変更: guild=${guildId} user=${userId}`
    );

    return true;
}

// 一時変更を解除し、JSON5の通知文に戻す。
function resetTemporaryMessage(guildId, userId) {
    guildId = String(guildId);
    userId = String(userId);

    if (!hasBaseWatch(guildId, userId)) {
        return { success: false, hadOverride: false };
    }

    const messages = temporaryMessages.get(guildId);

    if (!messages || !messages.has(userId)) {
        return { success: true, hadOverride: false };
    }

    messages.delete(userId);

    if (messages.size === 0) {
        temporaryMessages.delete(guildId);
    }

    console.log(
        `[vcWatch] 通知文を基本設定に復元: guild=${guildId} user=${userId}`
    );

    return { success: true, hadOverride: true };
}

// 一時変更中かどうかを確認する。
function hasTemporaryMessage(guildId, userId) {
    const messages = getTemporaryMessages(guildId);

    return Boolean(messages?.has(String(userId)));
}

module.exports = {
    getWatch,
    getAllWatches,
    hasBaseWatch,
    setTemporaryMessage,
    resetTemporaryMessage,
    hasTemporaryMessage,
};