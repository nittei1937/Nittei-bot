const fs = require("fs");
const path = require("path");

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
    const temporaryPath = `${watchPath}.tmp`;
    fs.writeFileSync(temporaryPath, `${JSON.stringify(watches, null, 2)}\n`, "utf8");
    fs.renameSync(temporaryPath, watchPath);
}

function addWatch(guildId, userId, channelId, message) {
    const watches = readWatches();
    watches[guildId] ??= {};
    watches[guildId][userId] = { channelId, message: message ?? null };
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

module.exports = { addWatch, removeWatch, getWatch, getAllWatches };
