const { SlashCommandBuilder } = require("discord.js");
const { getAllOreIds, getOreInfo, setRate } = require("../utils/market.js");
const { buildIronRateListEmbed } = require("../utils/marketDisplay.js");

const RATE_MANAGER_ROLE_ID = "1519700792267772016";

// ==============================
// /rate の状態設定
// ==============================

// true  → 工事中（/rate のみ登録）
// false → 通常運用（/rate set /rate info list を登録）
const RATE_UNDER_CONSTRUCTION = false;

// 表示する工事内容
const RATE_STATUS = "工事中";

// 実際に表示するメッセージ
const RATE_STATUS_MESSAGE = `現在 \`/rate\` は**${RATE_STATUS}**です。`;

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
// /rate コマンド本体
// ==============================

const rateCommand = new SlashCommandBuilder()
    .setName("rate")
    .setDescription("マイクラ鉱石の交換レートを管理");

// ==============================
// 通常時のみサブコマンドを登録
// ==============================

if (!RATE_UNDER_CONSTRUCTION) {
    rateCommand
        // /rate set
        .addSubcommand((sub) =>
            sub
                .setName("set")
                .setDescription("対象アイテム1個に必要な鉄の量を変更")
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
                        .setDescription("対象アイテム1個に必要な鉄の量")
                        .setRequired(true)
                        .setMinValue(0.01)
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
        // 工事中はオートコンプリート不要
        if (RATE_UNDER_CONSTRUCTION) {
            return interaction.respond([]);
        }

        const focused = interaction.options.getFocused();

        const choices = oreAutocompleteChoices(focused);

        await interaction.respond(choices);
    },

    // ==============================
    // 実行
    // ==============================

    async execute(interaction) {
        // ==========================
        // 工事中
        // ==========================

        if (RATE_UNDER_CONSTRUCTION) {
            return interaction.reply({
                content: RATE_STATUS_MESSAGE,
            });
        }

        // ==========================
        // 通常時
        // ==========================

        const group = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand();

        // --------------------------
        // /rate info
        // --------------------------

        if (group === "info") {
            if (subcommand === "list") {
                return interaction.reply({
                    embeds: [buildIronRateListEmbed()],
                });
            }

            return;
        }

        // --------------------------
        // /rate set
        // --------------------------

        if (subcommand === "set") {
            // 権限チェック
            const hasRole =
                interaction.member.roles.cache.has(RATE_MANAGER_ROLE_ID);

            if (!hasRole) {
                return interaction.reply({
                    content: "❌ このコマンドを使用する権限がありません。",
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

            const newValue = setRate(id, value);

            return interaction.reply(
                `${oreInfo.emoji} **${oreInfo.name}** 1個に必要な鉄の量を **${newValue}個** に変更しました。`
            );
        }
    },
};