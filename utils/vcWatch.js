const fs = require("fs");
const path = require("path");
const { persistFile, flushPersist } = require("./githubPersist");

const watchPath = path.join(__dirname, "..", "data", "moderation", "vcWatch.json");

function readWatches() {
    try {
        const raw = fs.readFileSync(watchPath, "utf8");
        return JSON.parse(raw);
    } catch (error) {
        return {};
    }
}

function writeWatches(watches) {
    fs.mkdirSync(path.dirname(watchPath), { recursive: true });
    const content = `${JSON.stringify(watches, null, 2)}\n`;

    const temporaryPath = `${watchPath}.tmp`;
    fs.writeFileSync(temporaryPath, content, "utf8");
    fs.renameSync(temporaryPath, watchPath);

    // GitHub連携が設定されていれば、5分操作が無いタイミングでまとめてコミットする
    persistFile(watchPath, content);
}

// 保留中の変更があれば、待たずに今すぐGitHubへコミットする
function flushToGitHub() {
    return flushPersist(watchPath);
}

function addWatch(guildId, userId, channelId, message, voiceChannelId = null) {
    const watches = readWatches();
    watches[guildId] ??= {};
    watches[guildId][userId] = { channelId, message: message ?? null, voiceChannelId };
    writeWatches(watches);
}

function removeWatch(guildId, userId) {
    const watches = readWatches();
    if (watches[guildId]) {
        delete watches[guildId][userId];
    }
    writeWatches(watches);
}

function getWatch(guildId, userId) {
    const watches = readWatches();
    return watches[guildId]?.[userId] ?? null;
}

function getAllWatches(guildId) {
    const watches = readWatches();
    return watches[guildId] ?? {};
}

module.exports = { addWatch, removeWatch, getWatch, getAllWatches, flushToGitHub };
