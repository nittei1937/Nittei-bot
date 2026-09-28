const {
    ContextMenuCommandBuilder,
    ApplicationCommandType,
    MessageFlags,
    ActionRowBuilder,
    StringSelectMenuBuilder,
} = require("discord.js");

const { translate } = require("@vitalets/google-translate-api");

const QUOTE_MAX_LENGTH = 300;

// ==============================
// 翻訳先言語
// ==============================

const TRANSLATION_LANGUAGES = [
    {
        label: "🇯🇵 日本語",
        value: "ja",
    },
    {
        label: "🇺🇸 English",
        value: "en",
    },
    {
        label: "🇨🇳 简体中文",
        value: "zh-CN",
    },
    {
        label: "🇹🇼 繁體中文",
        value: "zh-TW",
    },
    {
        label: "🇰🇷 한국어",
        value: "ko",
    },
    {
        label: "🇫🇷 Français",
        value: "fr",
    },
    {
        label: "🇩🇪 Deutsch",
        value: "de",
    },
    {
        label: "🇪🇸 Español",
        value: "es",
    },
    {
        label: "🇷🇺 Русский",
        value: "ru",
    },
    {
        label: "🇮🇹 Italiano",
        value: "it",
    },
    {
        label: "🇵🇹 Português",
        value: "pt",
    },
    {
        label: "🇹🇷 Türkçe",
        value: "tr",
    },
    {
        label: "🇳🇱 Nederlands",
        value: "nl",
    },
    {
        label: "🇵🇱 Polski",
        value: "pl",
    },
    {
        label: "🇮🇳 हिन्दी",
        value: "hi",
    },
];

// ==============================
// 設定
// ==============================

const SELECT_TIMEOUT = 60_000;

// ==============================
// 補助関数
// ==============================

function truncate(text) {
    if (text.length <= QUOTE_MAX_LENGTH) return text;
    return `${text.slice(0, QUOTE_MAX_LENGTH)}…`;
}

function getLanguageLabel(code) {
    const language = TRANSLATION_LANGUAGES.find(
        (language) => language.value === code
    );

    return language?.label ?? code;
}

// ==============================
// コマンド
// ==============================

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName("翻訳")
        .setType(ApplicationCommandType.Message),

    async execute(interaction) {
        const targetMessage = interaction.targetMessage;
        const content = targetMessage.content;

        // 翻訳できる文章がない場合
        if (!content || content.trim().length === 0) {
            return interaction.reply({
                content: "翻訳できるテキストがこのメッセージにはありません。",
                flags: MessageFlags.Ephemeral,
            });
        }

        // ==============================
        // 翻訳先選択メニュー
        // ==============================

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId(`translate_language_${interaction.id}`)
            .setPlaceholder("翻訳先の言語を選択してください")
            .addOptions(
                TRANSLATION_LANGUAGES.map((language) => ({
                    label: language.label,
                    value: language.value,
                }))
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        // 選択画面は本人だけに表示
        await interaction.reply({
            content: "🌐 **翻訳先の言語を選択してください。**",
            components: [row],
            flags: MessageFlags.Ephemeral,
        });

        // ==============================
        // 選択待ち
        // ==============================

        try {
            const selection = await interaction.awaitMessageComponent({
                filter: (componentInteraction) =>
                    componentInteraction.customId ===
                        `translate_language_${interaction.id}` &&
                    componentInteraction.user.id === interaction.user.id,

                time: SELECT_TIMEOUT,
            });

            const targetLanguage = selection.values[0];

            // 選択メニューを処理中表示に変更
            await selection.update({
                content: `🌐 **${getLanguageLabel(targetLanguage)}** に翻訳しています……`,
                components: [],
            });

            // ==============================
            // 翻訳
            // ==============================

            try {
                const result = await translate(content, {
                    to: targetLanguage,
                });

                const detectedLang = result.raw?.src ?? "?";

                // 翻訳先と元の言語が同じ場合
                if (detectedLang === targetLanguage) {
                    await selection.editReply({
                        content: `このメッセージはすでに **${getLanguageLabel(targetLanguage)}** のようです。`,
                        components: [],
                    });

                    return;
                }

                // ==============================
                // 選択画面を消す
                // ==============================

                await selection.editReply({
                    content: "✅ 翻訳が完了しました。",
                    components: [],
                });

                // ==============================
                // 翻訳結果を公開表示
                // ==============================

                return interaction.followUp({
                    content:
                        `🌐 **翻訳結果**（${detectedLang} → ${targetLanguage}）\n` +
                        `**翻訳先:** ${getLanguageLabel(targetLanguage)}\n\n` +
                        `> ${truncate(content).replace(/\n/g, "\n> ")}\n` +
                        `↓\n` +
                        `${result.text}\n` +
                        `-# 投稿者: <@${targetMessage.author.id}>`,

                    allowedMentions: {
                        parse: [],
                    },
                });

            } catch (error) {
                console.error("[translate] 翻訳エラー:", error);

                return selection.editReply({
                    content:
                        "翻訳に失敗しました。しばらくしてからもう一度試してください。",
                    components: [],
                });
            }

        } catch (error) {
            // ==============================
            // 選択タイムアウト
            // ==============================

            if (error?.message?.includes("time")) {
                return interaction.editReply({
                    content: "⏰ 翻訳先が選択されなかったため、キャンセルしました。",
                    components: [],
                });
            }

            console.error("[translate] 言語選択エラー:", error);

            try {
                return interaction.editReply({
                    content: "翻訳先の選択中にエラーが発生しました。",
                    components: [],
                });
            } catch {
                return;
            }
        }
    },
};