const fs = require("fs");
const path = require("path");
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { getAllWatches } = require("../utils/vcWatch");

const authorityPath = path.join(__dirname, "..", "data", "barusu", "authority.json");

function loadOwners() {
    try {
        const data = JSON.parse(fs.readFileSync(authorityPath, "utf8"));
        return data.owners ?? [];
    } catch (error) {
        console.error("[vcwatch] authority.json の読み込みに失敗しました。", error);
        return [];
    }
}

function canManage(interaction) {
    const owners = loadOwners();
    if (owners.includes(interaction.user.id)) return true;

    return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
}

// 監視対象の追加・削除は data/moderation/vcWatch.json を直接編集して
// git push してください（Bot側からの書き込みは行いません）。
module.exports = {
    data: new SlashCommandBuilder()
        .setName("vcwatch")
        .setDescription("VC入室監視の設定を確認する（設定はvcWatch.jsonを直接編集してください）")
        .addSubcommand(sub =>
            sub.setName("list").setDescription("現在の監視対象一覧を表示")
        ),

    async execute(interaction) {
        if (!interaction.guildId) {
            return interaction.reply({
                content: "このコマンドはサーバー内でのみ使用できます。",
                ephemeral: true,
            });
        }

        if (!canManage(interaction)) {
            return interaction.reply({
                content: "このコマンドを使用する権限がありません。（サーバー管理権限が必要です）",
                ephemeral: true,
            });
        }

        const watches = getAllWatches(interaction.guildId);
        const entries = Object.entries(watches);

        if (entries.length === 0) {
            return interaction.reply({
                content: "現在監視しているユーザーはいません。（data/moderation/vcWatch.json を編集して追加してください）",
                ephemeral: true,
            });
        }

        const lines = entries.map(([userId, watch]) => {
            const vcLabel = watch.voiceChannelId ? `<#${watch.voiceChannelId}>` : "どのVCでも";
            return `・<@${userId}>（${vcLabel}） → <#${watch.channelId}>`;
        });

        return interaction.reply({
            content: `🔔 監視中のユーザー:\n${lines.join("\n")}`,
            ephemeral: true,
        });
    },
};
