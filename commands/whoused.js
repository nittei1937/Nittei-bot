const { ContextMenuCommandBuilder, ApplicationCommandType, MessageFlags } = require("discord.js");
const { getUsermeLog } = require("../utils/usermeLog");

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName("送信者を確認")
        .setType(ApplicationCommandType.Message),

    async execute(interaction) {
        const targetMessage = interaction.targetMessage;

        const entry = getUsermeLog(targetMessage.id);

        if (!entry) {
            return interaction.reply({
                content: "このメッセージはusermeによる投稿として記録されていません。",
                flags: MessageFlags.Ephemeral,
            });
        }

        return interaction.reply({
            content:
                `このメッセージは <@${entry.authorId}> が ` +
                `<@${entry.targetUserId}> として投稿したものです。`,
            flags: MessageFlags.Ephemeral,
        });
    },
};
