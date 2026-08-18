const fs = require("fs");
const path = require("path");

const logPath = path.join(
    __dirname,
    "..",
    "data",
    "moderation",
    "usermeLog.json"
);

// 記録を残しておく期間
const RETENTION_DAYS = 30;

function readLog() {
    try {
        const raw = fs.readFileSync(logPath, "utf8");
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function writeLog(log) {
    fs.mkdirSync(
        path.dirname(logPath),
        { recursive: true }
    );

    // 古いログを削除
    const cutoff =
        Date.now() -
        RETENTION_DAYS * 24 * 60 * 60 * 1000;

    const pruned = {};

    for (const [messageId, entry] of Object.entries(log)) {
        if (entry.timestamp >= cutoff) {
            pruned[messageId] = entry;
        }
    }

    const temporaryPath = `${logPath}.tmp`;

    fs.writeFileSync(
        temporaryPath,
        `${JSON.stringify(pruned, null, 2)}\n`,
        "utf8"
    );

    fs.renameSync(
        temporaryPath,
        logPath
    );
}

// userme投稿を記録
function recordUserme({
    messageId,
    authorId,
    type = "user",
    targetUserId = null,
    targetName = null,
    avatarURL = null,
    channelId,
    guildId
}) {
    const log = readLog();

    log[messageId] = {
        authorId,
        type,
        targetUserId,
        targetName,
        avatarURL,
        channelId,
        guildId,
        timestamp: Date.now()
    };

    writeLog(log);
}

// messageIdから記録を取得
function getUsermeLog(messageId) {
    const log = readLog();

    return log[messageId] ?? null;
}

module.exports = {
    recordUserme,
    getUsermeLog
};