const fs = require("fs");
const path = require("path");

const logPath = path.join(__dirname, "..", "data", "moderation", "usermeLog.json");

// 記録を残しておく期間（これより古い記録は書き込み時に自動で削除する）
const RETENTION_DAYS = 30;

function readLog() {
    try {
        const raw = fs.readFileSync(logPath, "utf8");
        return JSON.parse(raw);
    } catch (error) {
        return {};
    }
}

function writeLog(log) {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });

    // 古い記録を削除してファイルが際限なく大きくならないようにする
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const pruned = {};
    for (const [messageId, entry] of Object.entries(log)) {
        if (entry.timestamp >= cutoff) {
            pruned[messageId] = entry;
        }
    }

    const temporaryPath = `${logPath}.tmp`;
    fs.writeFileSync(temporaryPath, `${JSON.stringify(pruned, null, 2)}\n`, "utf8");
    fs.renameSync(temporaryPath, logPath);
}

// userme経由で投稿されたメッセージ1件分を記録する
function recordUserme({ messageId, authorId, targetUserId, channelId, guildId }) {
    const log = readLog();

    log[messageId] = {
        authorId,
        targetUserId,
        channelId,
        guildId,
        timestamp: Date.now(),
    };

    writeLog(log);
}

// messageIdから記録を取得する（無ければnull）
function getUsermeLog(messageId) {
    const log = readLog();
    return log[messageId] ?? null;
}

module.exports = { recordUserme, getUsermeLog };
