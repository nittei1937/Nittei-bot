const {
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    MessageFlags,
    ActionRowBuilder,
    StringSelectMenuBuilder,
} = require("discord.js");

const { translate } = require("@vitalets/google-translate-api");

const QUOTE_MAX_LENGTH = 300;

const TRANSLATION_LANGUAGES = [
    { label: "🇯🇵 日本語", value: "ja" },
    { label: "🇺🇸 English", value: "en" },
    { label: "🇨🇳 简体中文", value: "zh-CN" },
    { label: "🇹🇼 繁體中文", value: "zh-TW" },
    { label: "🇰🇷 한국어", value: "ko" },
    { label: "🇫🇷 Français", value: "fr" },
    { label: "🇩🇪 Deutsch", value: "de" },
    { label: "🇪🇸 Español", value: "es" },
    { label: "🇷🇺 Русский", value: "ru" },
    { label: "🇮🇹 Italiano", value: "it" },
    { label: "🇵🇹 Português", value: "pt" },
    { label: "🇹🇷 Türkçe", value: "tr" },
    { label: "🇳🇱 Nederlands", value: "nl" },
    { label: "🇵🇱 Polski", value: "pl" },
    { label: "🇮🇳 हिन्दी", value: "hi" },
];

const SELECT_TIMEOUT = 60_000;

function truncate(text) {
    if (text.length <= QUOTE_MAX_LENGTH) {
        return text;
    }

    return `${text.slice(0, QUOTE_MAX_LENGTH)}…`;
}

function getLanguageLabel(code) {
    const language = TRANSLATION_LANGUAGES.find(
        language => language.value === code
    );

    return language?.label ?? code;
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

        const customId = `translate_language_${interaction.id}`;

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(customId)
            .setPlaceholder("翻訳先の言語を選択してください")
            .addOptions(
                TRANSLATION_LANGUAGES.map(language => ({
                    label: language.label,
                    value: language.value,
                }))
            );

        const row = new ActionRowBuilder()
            .addComponents(selectMenu);

        await interaction.reply({
            content: "🌐 **翻訳先の言語を選択してください。**",
            components: [row],
            flags: MessageFlags.Ephemeral,
        });

        if (!interaction.client.translationRequests) {
            interaction.client.translationRequests = new Map();
        }

        interaction.client.translationRequests.set(customId, {
            userId: interaction.user.id,
            content,
            targetUserId: targetMessage.author.id,
            createdAt: Date.now(),
        });

        setTimeout(() => {
            interaction.client.translationRequests.delete(customId);
        }, SELECT_TIMEOUT);
    },

    async handleSelectMenu(interaction) {
        const request =
            interaction.client.translationRequests?.get(
                interaction.customId
            );

        if (!request) {
            return interaction.reply({
                content:
                    "⏰ この翻訳リクエストは期限切れです。もう一度翻訳を実行してください。",
                flags: MessageFlags.Ephemeral,
            });
        }

        // 別のユーザーが操作できないようにする
        if (interaction.user.id !== request.userId) {
            return interaction.reply({
                content: "❌ この翻訳メニューは実行した本人のみ操作できます。",
                flags: MessageFlags.Ephemeral,
            });
        }

        const targetLanguage = interaction.values[0];

        // まず3秒以内に応答する
        await interaction.update({
            content:
                `🌐 **${getLanguageLabel(targetLanguage)}** に翻訳しています……`,
            components: [],
        });

        try {
            const result = await translate(request.content, {
                to: targetLanguage,
            });

            const detectedLang = result.raw?.src ?? "?";

            if (detectedLang === targetLanguage) {
                interaction.client.translationRequests.delete(
                    interaction.customId
                );

                return interaction.editReply({
                    content:
                        `このメッセージはすでに **${getLanguageLabel(
                            targetLanguage
                        )}** のようです。`,
                    components: [],
                });
            }

            await interaction.editReply({
                content: "✅ 翻訳が完了しました。",
                components: [],
            });

            interaction.client.translationRequests.delete(
                interaction.customId
            );

            return interaction.followUp({
                content:
                    `🌐 **翻訳結果**（${detectedLang} → ${targetLanguage}）\n` +
                    `**翻訳先:** ${getLanguageLabel(targetLanguage)}\n\n` +
                    `> ${truncate(request.content).replace(
                        /\n/g,
                        "\n> "
                    )}\n` +
                    `↓\n` +
                    `${result.text}\n` +
                    `-# 投稿者: <@${request.targetUserId}>`,

                allowedMentions: {
                    parse: [],
                },
            });

        } catch (error) {
            console.error("[translate] 翻訳エラー:", error);

            interaction.client.translationRequests.delete(
                interaction.customId
            );

            return interaction.editReply({
                content:
                    "翻訳に失敗しました。しばらくしてからもう一度試してください。",
                components: [],
            });
        }
    },

    isTranslationSelectMenu(customId) {
        return customId?.startsWith("translate_language_");
    },
};