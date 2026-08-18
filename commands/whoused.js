const {
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    MessageFlags
} = require("discord.js");

const {
    getUsermeLog
} = require("../utils/usermeLog");

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName("送信者を確認")
        .setType(ApplicationCommandType.Message),

    async execute(interaction) {
        const targetMessage =
            interaction.targetMessage;

        const entry =
            getUsermeLog(targetMessage.id);

        if (!entry) {
            return interaction.reply({
                content:
                    "このメッセージはusermeによる投稿として記録されていません。",
                flags: MessageFlags.Ephemeral
            });
        }

        // 完全カスタム投稿
        if (entry.type === "custom") {
            return interaction.reply({
                content:
                    `このメッセージは <@${entry.authorId}> が ` +
                    `「${entry.targetName ?? "不明"}」として投稿したものです。`,
                flags: MessageFlags.Ephemeral
            });
        }

        // 通常のユーザー指定投稿
        return interaction.reply({
            content:
                `このメッセージは <@${entry.authorId}> が ` +
                `<@${entry.targetUserId}> として投稿したものです。`,
            flags: MessageFlags.Ephemeral
        });
    }
};