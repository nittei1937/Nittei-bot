const fs = require("fs");
const path = require("path");
const { persistFile, flushPersist } = require("./githubPersist");

const settingsPath = path.join(__dirname, "..", "data", "moderation", "vcWatchSettings.json");

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
    const content = `${JSON.stringify(settings, null, 2)}\n`;

    const temporaryPath = `${settingsPath}.tmp`;
    fs.writeFileSync(temporaryPath, content, "utf8");
    fs.renameSync(temporaryPath, settingsPath);

    // GitHub連携が設定されていれば、5分操作が無いタイミングでまとめてコミットする
    persistFile(settingsPath, content);
}

// 保留中の変更があれば、待たずに今すぐGitHubへコミットする
function flushToGitHub() {
    return flushPersist(settingsPath);
}

// 未設定時はデフォルトで「制限あり（owners／サーバー管理権限者だけ使える）」
function isRestrictionEnabled() {
    const settings = readSettings();
    return settings.restrictionEnabled !== false;
}

function setRestrictionEnabled(enabled) {
    const settings = readSettings();
    settings.restrictionEnabled = enabled;
    writeSettings(settings);
}

module.exports = { isRestrictionEnabled, setRestrictionEnabled, flushToGitHub };
