const { ContextMenuCommandBuilder, ApplicationCommandType, MessageFlags } = require("discord.js");
const { translate } = require("@vitalets/google-translate-api");

const QUOTE_MAX_LENGTH = 300;

function truncate(text) {
    if (text.length <= QUOTE_MAX_LENGTH) return text;
    return `${text.slice(0, QUOTE_MAX_LENGTH)}…`;
}

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName("翻訳")
        .setType(ApplicationCommandType.Message),

    async execute(interaction) {
        const targetMessage = interaction.targetMessage;
        const content = targetMessage.content;

        if (!content || content.trim().length === 0) {
            return interaction.reply({
                content: "翻訳できるテキストがこのメッセージにはありません。",
                flags: MessageFlags.Ephemeral,
            });
        }

        // 公開で表示するのでephemeralにはしない
        await interaction.deferReply();

        try {
            const result = await translate(content, { to: "ja" });
            const detectedLang = result.raw?.src ?? "?";

            if (detectedLang === "ja") {
                return interaction.editReply({
                    content: "このメッセージはすでに日本語のようです。",
                });
            }

            return interaction.editReply({
                content:
                    `🌐 **翻訳結果**（${detectedLang} → ja）\n` +
                    `> ${truncate(content).replace(/\n/g, "\n> ")}\n` +
                    `↓\n${result.text}\n` +
                    `-# 投稿者: <@${targetMessage.author.id}>`,
                allowedMentions: { parse: [] },
            });

        } catch (error) {

            console.error("[translate] 翻訳エラー:", error);

            return interaction.editReply(
                "翻訳に失敗しました。しばらくしてからもう一度試してください。"
            );

        }
    },
};