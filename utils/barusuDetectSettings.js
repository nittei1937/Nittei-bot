const fs = require("fs");
const path = require("path");

const settingsPath = path.join(__dirname, "..", "data", "barusu", "detectSettings.json");

function readSettings() {
    try {
        const raw = fs.readFileSync(settingsPath, "utf8");
        return JSON.parse(raw);
    } catch (error) {
        return {};
    }
}

function writeSettings(settings) {
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
    const temporaryPath = `${settingsPath}.tmp`;
    fs.writeFileSync(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
    fs.renameSync(temporaryPath, settingsPath);
}

// 設定が無いギルドはデフォルトで「有効」とする
function isDetectEnabled(guildId) {
    if (!guildId) return false;
    const settings = readSettings();
    return settings[guildId] !== false;
}

function setDetectEnabled(guildId, enabled) {
    const settings = readSettings();
    settings[guildId] = enabled;
    writeSettings(settings);
}

module.exports = { isDetectEnabled, setDetectEnabled };
