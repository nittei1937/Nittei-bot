const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const {
    getAllOreIds,
    getOreInfo,
    setRate
} = require("../utils/market.js");
const {
    buildGoldRateListEmbed
} = require("../utils/marketDisplay.js");

function oreAutocompleteChoices(focused) {
    const lower = focused.toLowerCase();

    return getAllOreIds()
        .map((id) => ({ id, info: getOreInfo(id) }))
        .filter(
            ({ id, info }) =>
                id.toLowerCase().includes(lower) ||
                info.name.toLowerCase().includes(lower)
        )
        .slice(0, 25)
        .map(({ id, info }) => ({
            name: `${info.emoji} ${info.name}（${id}）`,
            value: id
        }));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("rate")
        .setDescription("マイクラ鉱石の交換レートを管理")
        .addSubcommand((sub) =>
            sub
                .setName("set")
                .setDescription("【管理者用】鉱石の交換レートを設定")
                .addStringOption((option) =>
                    option
                        .setName("ore")
                        .setDescription("設定する鉱石")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addNumberOption((option) =>
                    option
                        .setName("value")
                        .setDescription("金1個と交換できる個数")
                        .setRequired(true)
                        .setMinValue(0.01)
                )
        )
        .addSubcommandGroup((group) =>
            group
                .setName("info")
                .setDescription("交換レートを表示")
                .addSubcommand((sub) =>
                    sub
                        .setName("list")
                        .setDescription("金1個を基準にした交換レート一覧を表示")
                )
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        await interaction.respond(oreAutocompleteChoices(focused));
    },

    async execute(interaction) {
        const group = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand();

        // /rate info list
        if (group === "info") {
            if (subcommand === "list") {
                return interaction.reply({
                    embeds: [buildGoldRateListEmbed()]
                });
            }
            return;
        }

        // /rate set
        if (subcommand === "set") {
            const hasPermission = interaction.memberPermissions?.has(
                PermissionFlagsBits.ManageGuild
            );

            if (!hasPermission) {
                return interaction.reply({
                    content: "このコマンドはサーバー管理権限（サーバーの管理）を持つユーザーのみ使用できます。",
                    ephemeral: true
                });
            }

            const id = interaction.options.getString("ore");
            const value = interaction.options.getNumber("value");

            const oreInfo = getOreInfo(id);

            if (!oreInfo) {
                return interaction.reply({
                    content: `ID「${id}」に該当する鉱石は見つかりませんでした。`,
                    ephemeral: true
                });
            }

            const newValue = setRate(id, value);

            return interaction.reply(
                `${oreInfo.emoji} **${oreInfo.name}** の交換レートを **金1個 = ${newValue}個** に設定しました。`
            );
        }
    },
};