const fs = require("fs");
const path = require("path");
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { isDetectEnabled, setDetectEnabled } = require("../utils/barusuDetectSettings");
const {
    isProfanityDetectEnabled,
    setProfanityDetectEnabled,
} = require("../utils/profanityDetectSettings");

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

// 検出種ごとに、表示名と設定の読み書き関数をまとめておく
const {
    isDailyMessageEnabled,
    setDailyMessageEnabled,
} = require("../utils/dailyMessageSettings");

const DETECT_TYPES = {
    barusu: {
        label: "バルス検出",
        isEnabled: isDetectEnabled,
        setEnabled: setDetectEnabled,
    },

    profanity: {
        label: "暴言検出",
        isEnabled: isProfanityDetectEnabled,
        setEnabled: setProfanityDetectEnabled,
    },

    daily: {
        label: "定時メッセージ",
        isEnabled: isDailyMessageEnabled,
        setEnabled: setDailyMessageEnabled,
    },
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("detect")
        .setDescription("チャット内検出機能のON/OFF")
        .addStringOption(option =>
            option
                .setName("type")
                .setDescription("対象の検出機能")
                .setRequired(true)
                .addChoices(
                    { name: "バルス検出", value: "barusu" },
                    { name: "暴言検出", value: "profanity" },
                    { name: "定時メッセージ", value: "daily" }
                )
        )
        .addStringOption(option =>
            option
                .setName("action")
                .setDescription("操作")
                .setRequired(true)
                .addChoices(
                    { name: "on", value: "on" },
                    { name: "off", value: "off" },
                    { name: "status", value: "status" }
                )
        ),

    execute: async interaction => {
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

        const type = interaction.options.getString("type", true);
        const action = interaction.options.getString("action", true);
        const target = DETECT_TYPES[type];

        if (!target) {
            return interaction.reply({
                content: `不明な検出種です: ${type}`,
                ephemeral: true,
            });
        }

        if (action === "status") {
            const enabled = target.isEnabled(guildId);
            return interaction.reply({
                content:
                    `現在、${target.label}は **${enabled ? "有効" : "無効"}** です。`,
                ephemeral: true,
            });
        }

        const enabled = action === "on";
        target.setEnabled(guildId, enabled);

        return interaction.reply(`🔧 ${target.label}を **${enabled ? "有効" : "無効"}** にしました。`);
    },
};