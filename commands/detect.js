const fs = require("fs");
const path = require("path");
const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
} = require("discord.js");

const {
    isDetectEnabled,
    setDetectEnabled,
} = require("../utils/barusuDetectSettings");

const {
    isProfanityDetectEnabled,
    setProfanityDetectEnabled,
} = require("../utils/profanityDetectSettings");

const {
    isDailyMessageEnabled,
    setDailyMessageEnabled,
} = require("../utils/dailyMessageSettings");

const authorityPath = path.join(
    __dirname,
    "..",
    "data",
    "barusu",
    "authority.json"
);

const barusuPath = path.join(
    __dirname,
    "..",
    "data",
    "barusu",
    "barusu.json"
);

const badwordsPath = path.join(
    __dirname,
    "..",
    "data",
    "moderation",
    "badwords.json"
);

// ====================================================
// 権限
// ====================================================

function loadOwners() {
    try {
        const data = JSON.parse(
            fs.readFileSync(authorityPath, "utf8")
        );

        return data.owners ?? [];

    } catch (error) {
        console.error(
            "[detect] authority.json の読み込みに失敗しました。",
            error
        );

        return [];
    }
}

function canManageDetect(interaction) {
    const owners = loadOwners();

    // Bot所有者
    if (owners.includes(interaction.user.id)) {
        return true;
    }

    // サーバー管理権限
    return (
        interaction.memberPermissions?.has(
            PermissionFlagsBits.ManageGuild
        ) ?? false
    );
}

// ====================================================
// バルス検出語読み込み
// ====================================================

function loadBarusuWords() {
    try {
        const data = JSON.parse(
            fs.readFileSync(barusuPath, "utf8")
        );

        return Object.values(data)
            .map(info => info.name)
            .filter(Boolean)
            .sort((a, b) =>
                a.localeCompare(b, "ja")
            );

    } catch (error) {
        console.error(
            "[detect] barusu.json の読み込みに失敗しました。",
            error
        );

        return [];
    }
}

// ====================================================
// 暴言検出語読み込み
// ====================================================

function loadProfanityWords() {
    try {
        const data = JSON.parse(
            fs.readFileSync(badwordsPath, "utf8")
        );

        return data
            .map(entry => {
                // 文字列形式
                if (typeof entry === "string") {
                    return entry;
                }

                // { word: "...", label: "..." } 形式にも対応
                if (
                    entry &&
                    typeof entry.word === "string"
                ) {
                    return entry.word;
                }

                return null;
            })
            .filter(Boolean)
            .sort((a, b) =>
                a.localeCompare(b, "ja")
            );

    } catch (error) {
        console.error(
            "[detect] badwords.json の読み込みに失敗しました。",
            error
        );

        return [];
    }
}

// ====================================================
// 検出設定
// ====================================================

const DETECT_TYPES = {
    barusu: {
        label: "バルス検出",
        isEnabled: isDetectEnabled,
        setEnabled: setDetectEnabled,
        getWords: loadBarusuWords,
    },

    profanity: {
        label: "暴言検出",
        isEnabled: isProfanityDetectEnabled,
        setEnabled: setProfanityDetectEnabled,
        getWords: loadProfanityWords,
    },

    daily: {
        label: "定時メッセージ",
        isEnabled: isDailyMessageEnabled,
        setEnabled: setDailyMessageEnabled,
    },
};

// ====================================================
// 長い一覧を分割
// Discord EmbedのDescription上限対策
// ====================================================

function splitWordList(words, maxLength = 3500) {
    const chunks = [];
    let current = "";

    for (const word of words) {
        const line = `・${word}\n`;

        if (
            current.length + line.length > maxLength &&
            current.length > 0
        ) {
            chunks.push(current);
            current = "";
        }

        current += line;
    }

    if (current.length > 0) {
        chunks.push(current);
    }

    return chunks;
}

// ====================================================
// コマンド
// ====================================================

module.exports = {
    data: new SlashCommandBuilder()
        .setName("detect")
        .setDescription("検出機能の設定・一覧表示")

        // ================================================
        // /detect switch
        // ================================================
        .addSubcommand(subcommand =>
            subcommand
                .setName("switch")
                .setDescription("検出機能をON/OFFする")

                .addStringOption(option =>
                    option
                        .setName("type")
                        .setDescription("対象の検出機能")
                        .setRequired(true)
                        .addChoices(
                            {
                                name: "バルス検出",
                                value: "barusu"
                            },
                            {
                                name: "暴言検出",
                                value: "profanity"
                            },
                            {
                                name: "定時メッセージ",
                                value: "daily"
                            }
                        )
                )

                .addStringOption(option =>
                    option
                        .setName("action")
                        .setDescription("操作")
                        .setRequired(true)
                        .addChoices(
                            {
                                name: "on",
                                value: "on"
                            },
                            {
                                name: "off",
                                value: "off"
                            },
                            {
                                name: "status",
                                value: "status"
                            }
                        )
                )
        )

        // ================================================
        // /detect list
        // ================================================
        .addSubcommand(subcommand =>
            subcommand
                .setName("list")
                .setDescription("検出語一覧を表示")

                .addStringOption(option =>
                    option
                        .setName("type")
                        .setDescription("表示する検出語の種類")
                        .setRequired(true)
                        .addChoices(
                            {
                                name: "バルス検出",
                                value: "barusu"
                            },
                            {
                                name: "暴言検出",
                                value: "profanity"
                            }
                        )
                )
        ),

    execute: async interaction => {
        const guildId = interaction.guildId;

        // ====================================================
        // サーバー内限定
        // ====================================================

        if (!guildId) {
            return interaction.reply({
                content:
                    "このコマンドはサーバー内でのみ使用できます。",
                ephemeral: true,
            });
        }

        // ====================================================
        // 権限確認
        // ====================================================

        if (!canManageDetect(interaction)) {
            return interaction.reply({
                content:
                    "このコマンドを使用する権限がありません。（サーバー管理権限が必要です）",
                ephemeral: true,
            });
        }

        const subcommand =
            interaction.options.getSubcommand();

        // ====================================================
        // /detect switch
        // ====================================================

        if (subcommand === "switch") {
            const type =
                interaction.options.getString(
                    "type",
                    true
                );

            const action =
                interaction.options.getString(
                    "action",
                    true
                );

            const target =
                DETECT_TYPES[type];

            if (!target) {
                return interaction.reply({
                    content:
                        `不明な検出種です: ${type}`,
                    ephemeral: true,
                });
            }

            // ----------------------------
            // 状態確認
            // ----------------------------

            if (action === "status") {
                const enabled =
                    target.isEnabled(guildId);

                return interaction.reply({
                    content:
                        `現在、${target.label}は **${enabled ? "有効" : "無効"}** です。`,
                    ephemeral: true,
                });
            }

            // ----------------------------
            // ON / OFF
            // ----------------------------

            const enabled =
                action === "on";

            target.setEnabled(
                guildId,
                enabled
            );

            return interaction.reply(
                `🔧 ${target.label}を **${enabled ? "有効" : "無効"}** にしました。`
            );
        }

        // ====================================================
        // /detect list
        // ====================================================

        if (subcommand === "list") {
            const type =
                interaction.options.getString(
                    "type",
                    true
                );

            const target =
                DETECT_TYPES[type];

            // list非対応
            if (!target || !target.getWords) {
                return interaction.reply({
                    content:
                        "この検出モードには検出語一覧がありません。",
                    ephemeral: true,
                });
            }

            const words =
                target.getWords();

            if (words.length === 0) {
                return interaction.reply({
                    content:
                        `${target.label}の検出語は登録されていません。`,
                    ephemeral: true,
                });
            }

            // 長い一覧を分割
            const chunks =
                splitWordList(words);

            const embeds =
                chunks.map((chunk, index) => {
                    const embed =
                        new EmbedBuilder()
                            .setColor(
                                type === "barusu"
                                    ? 0xff0000
                                    : 0xff9900
                            )
                            .setTitle(
                                index === 0
                                    ? `📋 ${target.label}の検出語一覧`
                                    : `📋 ${target.label}の検出語一覧（続き）`
                            )
                            .setDescription(chunk);

                    if (index === 0) {
                        embed.setFooter({
                            text:
                                `登録数：${words.length}件`
                        });
                    }

                    return embed;
                });

            return interaction.reply({
                embeds,
                ephemeral: true,
            });
        }
    },
};