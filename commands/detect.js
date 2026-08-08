const fs = require("fs");
const path = require("path");
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { isDetectEnabled, setDetectEnabled } = require("../utils/barusuDetectSettings");

const authorityPath = path.join(__dirname, "..", "data", "barusu", "authority.json");

function loadOwners() {
    try {
        const data = JSON.parse(fs.readFileSync(authorityPath, "utf8"));
        return data.owners ?? [];
    } catch (error) {
        console.error("[detect] authority.json の読み込みに失敗しました。", error);
        return [];
    }
}

function canManageDetect(interaction) {
    const owners = loadOwners();
    if (owners.includes(interaction.user.id)) return true;

    return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("detect")
        .setDescription("チャット内バルス検出のON/OFF")
        .addSubcommand(sub => sub.setName("on").setDescription("バルス検出を有効にする"))
        .addSubcommand(sub => sub.setName("off").setDescription("バルス検出を無効にする"))
        .addSubcommand(sub => sub.setName("status").setDescription("現在の設定を確認")),

    execute: async interaction => {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        if (!guildId) {
            return interaction.reply({
                content: "このコマンドはサーバー内でのみ使用できます。",
                ephemeral: true,
            });
        }

        if (!canManageDetect(interaction)) {
            return interaction.reply({
                content: "このコマンドを使用する権限がありません。（サーバー管理権限が必要です）",
                ephemeral: true,
            });
        }

        if (subcommand === "status") {
            const enabled = isDetectEnabled(guildId);
            return interaction.reply({
                content: `現在バルス検出は **${enabled ? "有効" : "無効"}** です。`,
                ephemeral: true,
            });
        }

        const enabled = subcommand === "on";
        setDetectEnabled(guildId, enabled);

        return interaction.reply(`🔧 バルス検出を **${enabled ? "有効" : "無効"}** にしました。`);
    },
};