const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { getAllOreIds, getOreInfo, setRate, applyTrade, getHistory } = require("../utils/market.js");
const { buildGoldRateListEmbed, buildTradeResultEmbed, buildHistoryEmbed } = require("../utils/marketDisplay.js");

function oreAutocompleteChoices(focused) {
    const lower = focused.toLowerCase();
    return getAllOreIds()
        .map((id) => ({ id, info: getOreInfo(id) }))
        .filter(
            ({ id, info }) => id.toLowerCase().includes(lower) || info.name.toLowerCase().includes(lower)
        )
        .slice(0, 25)
        .map(({ id, info }) => ({ name: `${info.emoji} ${info.name}（${id}）`, value: id }));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rate")
        .setDescription("マイクラ鉱石の交換レート（為替）を管理")
        .addSubcommand((sub) =>
            sub
                .setName("set")
                .setDescription("【管理者用】鉱石の相場を手動で設定")
                .addStringOption((option) =>
                    option.setName("ore").setDescription("設定する鉱石").setRequired(true).setAutocomplete(true)
                )
                .addNumberOption((option) =>
                    option.setName("value").setDescription("設定する値（pt）").setRequired(true).setMinValue(0.01)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("trade")
                .setDescription("取引を記録し、需給に応じて相場を動かす")
                .addStringOption((option) =>
                    option.setName("ore").setDescription("取引する鉱石").setRequired(true).setAutocomplete(true)
                )
                .addIntegerOption((option) =>
                    option.setName("amount").setDescription("取引量").setRequired(true).setMinValue(1)
                )
                .addStringOption((option) =>
                    option
                        .setName("action")
                        .setDescription("買い・売り")
                        .setRequired(true)
                        .addChoices({ name: "買い", value: "buy" }, { name: "売り", value: "sell" })
                )
        )
        .addSubcommandGroup((group) =>
            group
                .setName("info")
                .setDescription("相場を表示")
                .addSubcommand((sub) =>
                    sub.setName("list").setDescription("金インゴット1個を基準にした、全鉱石の交換レート一覧を表示")
                )
                .addSubcommand((sub) =>
                    sub
                        .setName("history")
                        .setDescription("相場の推移をグラフで表示")
                        .addStringOption((option) =>
                            option
                                .setName("ore")
                                .setDescription("表示する鉱石")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName("points")
                                .setDescription("表示するデータ数（省略時30、最大100）")
                                .setRequired(false)
                                .setMinValue(5)
                                .setMaxValue(100)
                        )
                )
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        await interaction.respond(oreAutocompleteChoices(focused));
    },

    async execute(interaction) {
        const group = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand();

        // /rate info list, /rate info history
        if (group === "info") {
            if (subcommand === "list") {
                return interaction.reply({ embeds: [buildGoldRateListEmbed()] });
            }

            if (subcommand === "history") {
                const id = interaction.options.getString("ore");
                const points = interaction.options.getInteger("points") || 30;

                const oreInfo = getOreInfo(id);
                if (!oreInfo) {
                    return interaction.reply({
                        content: `ID「${id}」に該当する鉱石は見つかりませんでした。`,
                        ephemeral: true,
                    });
                }

                const history = getHistory(id, points);
                if (history.length < 2) {
                    return interaction.reply({
                        content: `「${oreInfo.name}」はまだ十分な履歴がありません。相場が数回変動してからお試しください。`,
                        ephemeral: true,
                    });
                }

                return interaction.reply({ embeds: [buildHistoryEmbed({ id, ...oreInfo }, history)] });
            }
            return;
        }

        // /rate set
        if (subcommand === "set") {
            const hasPermission = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);
            if (!hasPermission) {
                return interaction.reply({
                    content: "このコマンドはサーバー管理権限（メンバーの管理）を持つユーザーのみ使用できます。",
                    ephemeral: true,
                });
            }

            const id = interaction.options.getString("ore");
            const value = interaction.options.getNumber("value");

            const oreInfo = getOreInfo(id);
            if (!oreInfo) {
                return interaction.reply({
                    content: `ID「${id}」に該当する鉱石は見つかりませんでした。`,
                    ephemeral: true,
                });
            }

            const newValue = setRate(id, value);
            return interaction.reply(
                `${oreInfo.emoji} **${oreInfo.name}** の相場を **${newValue} pt** に手動設定しました。`
            );
        }

        // /rate trade
        if (subcommand === "trade") {
            const id = interaction.options.getString("ore");
            const amount = interaction.options.getInteger("amount");
            const action = interaction.options.getString("action");

            const oreInfo = getOreInfo(id);
            if (!oreInfo) {
                return interaction.reply({
                    content: `ID「${id}」に該当する鉱石は見つかりませんでした。`,
                    ephemeral: true,
                });
            }

            const result = applyTrade(id, amount, action);
            const embed = buildTradeResultEmbed({
                user: interaction.user,
                oreInfo: { id, ...oreInfo },
                amount,
                action,
                result,
            });
            return interaction.reply({ embeds: [embed] });
        }
    },
};
