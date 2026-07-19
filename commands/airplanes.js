const { SlashCommandBuilder } = require("discord.js");
const airplanes = require("../data/airplanes.json");
const { filterByType, getEntryById, buildInfoEmbed, buildListEmbed } = require("../utils/military.js");

const CATEGORY = "airplanes";
const CATEGORY_LABEL = "航空機";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("airplanes")
        .setDescription("航空機のデータベースを検索")
        .addSubcommand((sub) =>
            sub
                .setName("list")
                .setDescription("機種ごとの一覧を表示")
                .addStringOption((option) =>
                    option
                        .setName("type")
                        .setDescription("機種")
                        .setRequired(true)
                        .addChoices(
                            { name: "戦闘機", value: "FT" },
                            { name: "爆撃機", value: "BM" },
                            { name: "雷撃機", value: "TB" },
                            { name: "偵察機", value: "RC" },
                            { name: "輸送機", value: "TR" }
                        )
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("show")
                .setDescription("機体1機の詳細情報を表示")
                .addStringOption((option) =>
                    option
                        .setName("plane")
                        .setDescription("機体のID（入力補完から選択可）")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const choices = Object.entries(airplanes)
            .filter(
                ([id, plane]) =>
                    id.toLowerCase().includes(focused) || plane.name.toLowerCase().includes(focused)
            )
            .slice(0, 25)
            .map(([id, plane]) => ({ name: `${plane.name}（${id}）`, value: id }));

        await interaction.respond(choices);
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "list") {
            const type = interaction.options.getString("type");
            const entries = filterByType(airplanes, type);
            const embed = buildListEmbed({
                title: `${CATEGORY_LABEL}一覧：${type}`,
                category: CATEGORY,
                entries,
                emptyMessage: "該当する航空機は登録されていません。",
            });
            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === "show") {
            const id = interaction.options.getString("plane");
            const entry = getEntryById(airplanes, id);

            if (!entry) {
                return interaction.reply({
                    content: `ID「${id}」に該当する航空機は見つかりませんでした。`,
                    ephemeral: true,
                });
            }

            return interaction.reply({ embeds: [buildInfoEmbed(entry, CATEGORY)] });
        }
    },
};
