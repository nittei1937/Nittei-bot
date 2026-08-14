const fs = require("fs");
const path = require("path");

const settingsPath = path.join(
    __dirname,
    "..",
    "data",
    "message",
    "detectSettings.json"
);

function readSettings() {
    try {
        return JSON.parse(
            fs.readFileSync(settingsPath, "utf8")
        );
    } catch (error) {
        return {};
    }
}

function writeSettings(settings) {
    fs.mkdirSync(
        path.dirname(settingsPath),
        { recursive: true }
    );

    const temporaryPath =
        `${settingsPath}.tmp`;

    fs.writeFileSync(
        temporaryPath,
        `${JSON.stringify(settings, null, 2)}\n`,
        "utf8"
    );

    fs.renameSync(
        temporaryPath,
        settingsPath
    );
}

// 設定がない場合は有効
function isDailyMessageEnabled(guildId) {
    if (!guildId) return false;

    const settings = readSettings();

    return settings[guildId] !== false;
}

function setDailyMessageEnabled(guildId, enabled) {
    const settings = readSettings();

    settings[guildId] = enabled;

    writeSettings(settings);
}

module.exports = {
    isDailyMessageEnabled,
    setDailyMessageEnabled,
};