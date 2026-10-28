// commands/vcwatch.js

const fs = require("fs");
const path = require("path");

const {
    SlashCommandBuilder,
    PermissionFlagsBits,
} = require("discord.js");

const {
    getAllWatches,
    hasBaseWatch,
    setTemporaryMessage,
    resetTemporaryMessage,
    hasTemporaryMessage,
    excludeUser,
    restoreUser,
    isExcluded,
} = require("../utils/vcWatch");

const authorityPath = path.join(
    __dirname,
    "..",
    "data",
    "barusu",
    "authority.json"
);

function loadOwners() {
    try {
        const data = JSON.parse(
            fs.readFileSync(authorityPath, "utf8")
        );

        return data.owners ?? [];
    } catch (error) {
        console.error(
            "[vcwatch] authority.json の読み込みに失敗しました。",
            error
        );

        return [];
    }
}

function canManage(interaction) {
    const owners = loadOwners();

    if (owners.includes(interaction.user.id)) {
        return true;
    }

    return (
        interaction.memberPermissions?.has(
            PermissionFlagsBits.ManageGuild
        ) ?? false
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("vcwatch")
        .setDescription("VC入室監視の設定・通知文を管理する")

        .addSubcommand(sub =>
            sub
                .setName("list")
                .setDescription("現在の監視対象一覧を表示")
        )

        .addSubcommand(sub =>
            sub
                .setName("edit")
                .setDescription("監視対象ユーザーの通知文を一時変更する")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("変更する監視対象ユーザー")
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName("message")
                        .setDescription("変更後の通知文")
                        .setRequired(true)
                        .setMinLength(1)
                        .setMaxLength(2000)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("reset")
                .setDescription("通知文をJSON5の基本設定に戻す")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("リセットする監視対象ユーザー")
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("remove")
                .setDescription("ユーザーを一時的に監視排除する")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("監視排除するユーザー")
                        .setRequired(true)
                )
        )

        .addSubcommand(sub =>
            sub
                .setName("restore")
                .setDescription("ユーザーの監視排除を解除する")
                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("排除を解除するユーザー")
                        .setRequired(true)
                )
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
                content:
                    "このコマンドを使用する権限がありません。" +
                    "（サーバー管理権限が必要です）",
                ephemeral: true,
            });
        }

        const guildId = interaction.guildId;
        const subcommand = interaction.options.getSubcommand();

        // ------------------------------
        // remove：一時監視排除
        // ------------------------------
        if (subcommand === "remove") {
            const user = interaction.options.getUser("user", true);

            const result = excludeUser(guildId, user.id);

            return interaction.reply({
                content: result.alreadyExcluded
                    ? `${user} は既に一時監視排除されています。`
                    : `✅ ${user} を一時監視排除しました。\nBotの再起動で解除されます。`,
                ephemeral: true,
            });
        }

        // ------------------------------
        // restore：監視排除解除
        // ------------------------------
        if (subcommand === "restore") {
            const user = interaction.options.getUser("user", true);

            if (!isExcluded(guildId, user.id)) {
                return interaction.reply({
                    content: `${user} は監視排除されていません。`,
                    ephemeral: true,
                });
            }

            restoreUser(guildId, user.id);

            return interaction.reply({
                content: `✅ ${user} の監視排除を解除しました。`,
                ephemeral: true,
            });
        }

        // ------------------------------
        // list：監視対象一覧
        // ------------------------------
        if (subcommand === "list") {
            const watches = getAllWatches(guildId);
            const entries = Object.entries(watches);

            if (entries.length === 0) {
                return interaction.reply({
                    content: "現在監視しているユーザーはいません。",
                    ephemeral: true,
                });
            }

            const lines = entries.map(([userId, watch]) => {
                const vcLabel = watch.voiceChannelId
                    ? `<#${watch.voiceChannelId}>`
                    : "どのVCでも";

                const temporary = hasTemporaryMessage(
                    guildId,
                    userId
                )
                    ? "（文言変更中）"
                    : "";

                return (
                    `・<@${userId}>（${vcLabel}）` +
                    ` → <#${watch.channelId}>${temporary}`
                );
            });

            return interaction.reply({
                content: `🔔 監視中のユーザー:\n${lines.join("\n")}`,
                ephemeral: true,
            });
        }

        // ------------------------------
        // edit：通知文を一時変更
        // ------------------------------
        if (subcommand === "edit") {
            const user = interaction.options.getUser("user", true);
            const message = interaction.options.getString("message", true);

            if (!hasBaseWatch(guildId, user.id)) {
                return interaction.reply({
                    content:
                        `${user} は vcWatch.json5 に` +
                        "監視対象として登録されていません。",
                    ephemeral: true,
                });
            }

            const success = setTemporaryMessage(
                guildId,
                user.id,
                message
            );

            if (!success) {
                return interaction.reply({
                    content: "通知文の変更に失敗しました。",
                    ephemeral: true,
                });
            }

            return interaction.reply({
                content:
                    `✅ ${user} の通知文を一時変更しました。\n` +
                    `**変更後:**\n${message}\n\n` +
                    "Botの再起動、または `/vcwatch reset` で" +
                    " vcWatch.json5 の基本設定に戻ります。",
                ephemeral: true,
            });
        }

        // ------------------------------
        // reset：基本設定に戻す
        // ------------------------------
        if (subcommand === "reset") {
            const user = interaction.options.getUser("user", true);

            const result = resetTemporaryMessage(
                guildId,
                user.id
            );

            if (!result.success) {
                return interaction.reply({
                    content:
                        `${user} は vcWatch.json5 に` +
                        "監視対象として登録されていません。",
                    ephemeral: true,
                });
            }

            if (!result.hadOverride) {
                return interaction.reply({
                    content:
                        `${user} の通知文は既に基本設定です。`,
                    ephemeral: true,
                });
            }

            return interaction.reply({
                content:
                    `✅ ${user} の通知文を ` +
                    "`vcWatch.json5` の基本設定に戻しました。",
                ephemeral: true,
            });
        }
    },
};