const fs = require("fs");
const path = require("path");

const settingsPath = path.join(__dirname, "..", "data", "commandSettings.json");

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

function getDisabledCommands(guildId) {
    if (!guildId) return [];
    const settings = readSettings();
    return settings[guildId] ?? [];
}

function isCommandDisabled(guildId, commandName) {
    return getDisabledCommands(guildId).includes(commandName);
}

function disableCommand(guildId, commandName) {
    const settings = readSettings();
    const list = new Set(settings[guildId] ?? []);
    list.add(commandName);
    settings[guildId] = [...list];
    writeSettings(settings);
}

function enableCommand(guildId, commandName) {
    const settings = readSettings();
    const list = new Set(settings[guildId] ?? []);
    list.delete(commandName);
    settings[guildId] = [...list];
    writeSettings(settings);
}

module.exports = {
    getDisabledCommands,
    isCommandDisabled,
    disableCommand,
    enableCommand,
};
