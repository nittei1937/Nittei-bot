const fs = require("fs");
const path = require("path");
const JSON5 = require("json5");

const watchPath = path.join(__dirname, "..", "data", "moderation", "vcWatch.json5");

function readWatches() {
    try {
        const raw = fs.readFileSync(watchPath, "utf8");
        return JSON5.parse(raw);
    } catch (error) {
        console.error("[vcWatch] vcWatch.json5 の読み込みに失敗しました。", error);
        return {};
    }
}

// 指定ユーザーの監視設定を取得する（無ければnull）
function getWatch(guildId, userId) {
    const watches = readWatches();
    return watches[guildId]?.[userId] ?? null;
}

// そのサーバーの監視設定を全部取得する
function getAllWatches(guildId) {
    const watches = readWatches();
    return watches[guildId] ?? {};
}

module.exports = { getWatch, getAllWatches };
