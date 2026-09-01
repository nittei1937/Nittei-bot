const fs = require("fs");
const path = require("path");

const settingsPath = path.join(__dirname, "..", "data", "moderation", "saySettings.json");

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

// 未設定時はデフォルトで「制限あり（speakUsersだけ使える）」
function isRestrictionEnabled() {
    const settings = readSettings();
    return settings.restrictionEnabled !== false;
}

function setRestrictionEnabled(enabled) {
    const settings = readSettings();
    settings.restrictionEnabled = enabled;
    writeSettings(settings);
}

module.exports = { isRestrictionEnabled, setRestrictionEnabled };
