const fs = require("fs");
const path = require("path");
const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require("discord.js");
const { addWatch, removeWatch, getAllWatches } = require("../utils/vcWatch");

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

module.exports = {
    data: new SlashCommandBuilder()
        .setName("vcwatch")
        .setDescription("特定ユーザーのVC入室を監視して通知する")
        .addSubcommand(sub =>
            sub
                .setName("add")
                .setDescription("監視対象を追加する")
                .addUserOption(option =>
                    option.setName("user").setDescription("監視するユーザー").setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName("channel")
                        .setDescription("通知先のテキストチャンネル")
                        .addChannelOption()
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName("voice_channel")
                        .setDescription("監視するVC（省略時はどのVCに入室しても通知）")
                        .addChannelTypes(ChannelType.GuildVoice)
                )
                .addStringOption(option =>
                    option
                        .setName("message")
                        .setDescription("通知文（{user}=ユーザー, {channel}=VC名 が使えます。省略時は標準メッセージ）")
                        .setMaxLength(200)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("remove")
                .setDescription("監視対象を解除する")
                .addUserOption(option =>
                    option.setName("user").setDescription("解除するユーザー").setRequired(true)
                )
        )
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

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        if (subcommand === "add") {
            const user = interaction.options.getUser("user", true);
            const channel = interaction.options.getChannel("channel", true);
            const voiceChannel = interaction.options.getChannel("voice_channel");
            const message = interaction.options.getString("message");

            addWatch(guildId, user.id, channel.id, message, voiceChannel?.id ?? null);

            const scope = voiceChannel ? `<#${voiceChannel.id}> に` : "どのVCでも";

            return interaction.reply(
                `🔔 ${user} が${scope}入室したら <#${channel.id}> に通知するよう設定しました。`
            );
        }

        if (subcommand === "remove") {
            const user = interaction.options.getUser("user", true);
            removeWatch(guildId, user.id);

            return interaction.reply(`🔕 ${user} の監視を解除しました。`);
        }

        // ---- list ----
        const watches = getAllWatches(guildId);
        const entries = Object.entries(watches);

        if (entries.length === 0) {
            return interaction.reply({
                content: "現在監視しているユーザーはいません。",
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
