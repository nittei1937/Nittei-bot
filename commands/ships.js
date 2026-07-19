const { SlashCommandBuilder } = require("discord.js");
const ships = require("../data/ships.json");
const { filterByType, getEntryById, buildInfoEmbed, buildListEmbed } = require("../utils/military.js");

const CATEGORY = "ships";
const CATEGORY_LABEL = "艦艇";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ships")
        .setDescription("艦艇のデータベースを検索")
        .addSubcommand((sub) =>
            sub
                .setName("list")
                .setDescription("艦種ごとの一覧を表示")
                .addStringOption((option) =>
                    option
                        .setName("type")
                        .setDescription("艦種")
                        .setRequired(true)
                        .addChoices(
                            { name: "駆逐艦", value: "DD" },
                            { name: "軽巡洋艦", value: "CL" },
                            { name: "重巡洋艦", value: "CA" },
                            { name: "巡洋戦艦", value: "BC" },
                            { name: "戦艦", value: "BB" },
                            { name: "航空母艦", value: "CV" },
                            { name: "潜水艦", value: "SS" }
                        )
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("show")
                .setDescription("艦艇1隻の詳細情報を表示")
                .addStringOption((option) =>
                    option
                        .setName("ship")
                        .setDescription("艦名のID（入力補完から選択可）")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const choices = Object.entries(ships)
            .filter(
                ([id, ship]) =>
                    id.toLowerCase().includes(focused) || ship.name.toLowerCase().includes(focused)
            )
            .slice(0, 25)
            .map(([id, ship]) => ({ name: `${ship.name}（${id}）`, value: id }));

        await interaction.respond(choices);
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "list") {
            const type = interaction.options.getString("type");
            const entries = filterByType(ships, type);
            const embed = buildListEmbed({
                title: `${CATEGORY_LABEL}一覧：${type}`,
                category: CATEGORY,
                entries,
                emptyMessage: "該当する艦艇は登録されていません。",
            });
            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === "show") {
            const id = interaction.options.getString("ship");
            const entry = getEntryById(ships, id);

            if (!entry) {
                return interaction.reply({
                    content: `ID「${id}」に該当する艦艇は見つかりませんでした。`,
                    ephemeral: true,
                });
            }

            return interaction.reply({ embeds: [buildInfoEmbed(entry, CATEGORY)] });
        }
    },
};
