const { SlashCommandBuilder } = require("discord.js");
const {
    getAllOreIds,
    getOreInfo,
    setRate,
} = require("../utils/market.js");
const {
    buildGoldRateListEmbed,
} = require("../utils/marketDisplay.js");

// 自分のDiscordユーザーIDに置き換える
const RATE_MANAGER_USER_ID = "1423144854078361682";

// 工事中なら true、通常運用なら false
const RATE_UNDER_CONSTRUCTION = false;

const RATE_STATUS = "工事中";
const RATE_STATUS_MESSAGE =
    `現在 \`/rate\` は**${RATE_STATUS}**です。`;

// ==============================
// 鉱石オートコンプリート
// ==============================

function oreAutocompleteChoices(focused) {
    const lower = focused.toLowerCase();

    return getAllOreIds()
        .map((id) => ({
            id,
            info: getOreInfo(id),
        }))
        .filter(({ id, info }) =>
            id.toLowerCase().includes(lower) ||
            info.name.toLowerCase().includes(lower)
        )
        .slice(0, 25)
        .map(({ id, info }) => ({
            name: `${info.emoji} ${info.name}（${id}）`,
            value: id,
        }));
}

// ==============================
// /rate コマンド
// ==============================

const rateCommand = new SlashCommandBuilder()
    .setName("rate")
    .setDescription("マイクラ鉱石の交換レートを管理");

if (!RATE_UNDER_CONSTRUCTION) {
    rateCommand
        // /rate set
        .addSubcommand((sub) =>
            sub
                .setName("set")
                .setDescription("鉱石の交換レートを変更")
                .addStringOption((option) =>
                    option
                        .setName("ore")
                        .setDescription("レートを変更する鉱石")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addNumberOption((option) =>
                    option
                        .setName("value")
                        .setDescription("対象鉱石1個に必要な鉄の量")
                        .setRequired(true)
                        .setMinValue(0.000001)
                )
        )
        // /rate info list
        .addSubcommandGroup((group) =>
            group
                .setName("info")
                .setDescription("鉱石の交換レート情報")
                .addSubcommand((sub) =>
                    sub
                        .setName("list")
                        .setDescription("現在の交換レート一覧を表示")
                )
        );
}

// ==============================
// エクスポート
// ==============================

module.exports = {
    data: rateCommand,

    // ==============================
    // オートコンプリート
    // ==============================

    async autocomplete(interaction) {
        if (RATE_UNDER_CONSTRUCTION) {
            return interaction.respond([]);
        }

        const focused = interaction.options.getFocused();
        const choices = oreAutocompleteChoices(focused);

        await interaction.respond(choices);
    },

    // ==============================
    // コマンド実行
    // ==============================

    async execute(interaction) {
        if (RATE_UNDER_CONSTRUCTION) {
            return interaction.reply({
                content: RATE_STATUS_MESSAGE,
                ephemeral: true,
            });
        }

        const group = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand();

        // ------------------------------
        // /rate info list
        // ------------------------------

        if (group === "info" && subcommand === "list") {
            return interaction.reply({
                embeds: [buildGoldRateListEmbed()],
            });
        }

        // ------------------------------
        // /rate set
        // ------------------------------

        if (subcommand === "set") {
            // 実行者をユーザーIDで確認
            if (interaction.user.id !== RATE_MANAGER_USER_ID) {
                return interaction.reply({
                    content:
                        "❌ このコマンドを使用できるのはBot管理者本人だけです。",
                    ephemeral: true,
                });
            }

            const id = interaction.options.getString("ore", true);
            const value = interaction.options.getNumber("value", true);

            const oreInfo = getOreInfo(id);

            if (!oreInfo) {
                return interaction.reply({
                    content: "❌ 指定された鉱石が見つかりません。",
                    ephemeral: true,
                });
            }

            try {
                const newValue = setRate(id, value);

                return interaction.reply({
                    content:
                        `${oreInfo.emoji} **${oreInfo.name}** の交換レートを ` +
                        `**鉄${newValue}個** に変更しました。\n` +
                        `（${oreInfo.name}1個 = 鉄${newValue}個）`,
                });
            } catch (error) {
                console.error("[rate set] レート変更エラー:", error);

                return interaction.reply({
                    content: "❌ レートの変更に失敗しました。",
                    ephemeral: true,
                });
            }
        }
    },
};