const { SlashCommandBuilder } = require("discord.js");
const tanks = require("../data/tanks.json");
const { filterByType, getEntryById, buildInfoEmbed, buildListEmbed } = require("../utils/military.js");

const CATEGORY = "tanks";
const CATEGORY_LABEL = "陸上兵器";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tanks")
        .setDescription("戦車・陸上兵器のデータベースを検索")
        .addSubcommand((sub) =>
            sub
                .setName("list")
                .setDescription("車種ごとの一覧を表示")
                .addStringOption((option) =>
                    option
                        .setName("type")
                        .setDescription("車種")
                        .setRequired(true)
                        .addChoices(
                            { name: "軽戦車", value: "LT" },
                            { name: "中戦車", value: "MT" },
                            { name: "重戦車", value: "HT" },
                            { name: "駆逐戦車", value: "TD" },
                            { name: "自走砲", value: "SPG" }
                        )
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("show")
                .setDescription("車両1両の詳細情報を表示")
                .addStringOption((option) =>
                    option
                        .setName("tank")
                        .setDescription("車両のID（入力補完から選択可）")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const choices = Object.entries(tanks)
            .filter(
                ([id, tank]) =>
                    id.toLowerCase().includes(focused) || tank.name.toLowerCase().includes(focused)
            )
            .slice(0, 25)
            .map(([id, tank]) => ({ name: `${tank.name}（${id}）`, value: id }));

        await interaction.respond(choices);
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "list") {
            const type = interaction.options.getString("type");
            const entries = filterByType(tanks, type);
            const embed = buildListEmbed({
                title: `${CATEGORY_LABEL}一覧：${type}`,
                category: CATEGORY,
                entries,
                emptyMessage: "該当する車両は登録されていません。",
            });
            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === "show") {
            const id = interaction.options.getString("tank");
            const entry = getEntryById(tanks, id);

            if (!entry) {
                return interaction.reply({
                    content: `ID「${id}」に該当する車両は見つかりませんでした。`,
                    ephemeral: true,
                });
            }

            return interaction.reply({ embeds: [buildInfoEmbed(entry, CATEGORY)] });
        }
    },
};
