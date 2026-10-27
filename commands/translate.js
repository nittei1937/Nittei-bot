// commands/translate.js

const {
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    MessageFlags,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    EmbedBuilder,
} = require("discord.js");

const { translate } = require("@vitalets/google-translate-api");

const QUOTE_MAX_LENGTH = 300;
const EMBED_DESCRIPTION_MAX = 4000;
const SELECT_TIMEOUT = 60_000;

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

function truncate(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }

    return `${text.slice(0, maxLength - 1)}…`;
}

function getLanguageLabel(code) {
    const language = TRANSLATION_LANGUAGES.find(
        language => language.value === code
    );

    return language?.label ?? code;
}

function buildTranslationEmbed({
    sourceText,
    translatedText,
    detectedLang,
    targetLanguage,
    targetUserId,
}) {
    const sourceLanguageLabel = getLanguageLabel(detectedLang);
    const targetLanguageLabel = getLanguageLabel(targetLanguage);

    const embed = new EmbedBuilder()
        .setColor(0x4285F4)
        .setTitle("🌐 翻訳結果")
        .setDescription(
            `**翻訳元:** ${sourceLanguageLabel}\n` +
            `**翻訳先:** ${targetLanguageLabel}\n\n` +
            `### 翻訳文\n${truncate(
                translatedText,
                EMBED_DESCRIPTION_MAX
            )}`
        )
        .addFields({
            name: "原文",
            value: truncate(sourceText, 1000),
        })
        .setFooter({
            text: `元メッセージの投稿者ID: ${targetUserId}`,
        })
        .setTimestamp();

    return embed;
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
        const requests = interaction.client.translationRequests;
        const request = requests?.get(interaction.customId);

        if (!request) {
            return interaction.reply({
                content:
                    "⏰ この翻訳リクエストは期限切れです。もう一度翻訳を実行してください。",
                flags: MessageFlags.Ephemeral,
            });
        }

        // メニューを実行した本人以外は操作できない
        if (interaction.user.id !== request.userId) {
            return interaction.reply({
                content: "❌ この翻訳メニューは実行した本人のみ操作できます。",
                flags: MessageFlags.Ephemeral,
            });
        }

        const targetLanguage = interaction.values[0];

        // 3秒以内に応答してタイムアウトを防止
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

            requests.delete(interaction.customId);

            if (detectedLang === targetLanguage) {
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

            const embed = buildTranslationEmbed({
                sourceText: request.content,
                translatedText: result.text,
                detectedLang,
                targetLanguage,
                targetUserId: request.targetUserId,
            });

            // 翻訳結果は公開メッセージとして送信
            return interaction.followUp({
                embeds: [embed],
                allowedMentions: {
                    parse: [],
                },
            });
        } catch (error) {
            console.error("[translate] 翻訳エラー:", error);

            requests.delete(interaction.customId);

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