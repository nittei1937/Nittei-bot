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

        // 選択処理は index.js 側で行う
        // 翻訳に必要な情報を一時保存
        if (!interaction.client.translationRequests) {
            interaction.client.translationRequests = new Map();
        }

        interaction.client.translationRequests.set(customId, {
            userId: interaction.user.id,
            targetMessageId: targetMessage.id,
            targetUserId: targetMessage.author.id,
            content,
            createdAt: Date.now(),
        });

        // 60秒後に自動削除
        setTimeout(() => {
            interaction.client.translationRequests.delete(customId);
        }, 60_000);
    },

    TRANSLATION_LANGUAGES,
    getLanguageLabel,
    truncate,
};