const { SlashCommandBuilder } = require("discord.js");
const aircraft = require("../data/aircraft.json");
const {
    filterByType,
    searchEntries,
    getEntryById,
    buildInfoEmbed,
    buildListEmbed,
} = require("../utils/military.js");

const CATEGORY = "aircraft";
const CATEGORY_LABEL = "航空機";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("aircraft")
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
                .setName("info")
                .setDescription("機体1機の詳細情報を表示")
                .addStringOption((option) =>
                    option
                        .setName("plane")
                        .setDescription("機体のID（例: zero）")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("search")
                .setDescription("名前・型式・愛称でキーワード検索")
                .addStringOption((option) =>
                    option
                        .setName("keyword")
                        .setDescription("検索キーワード")
                        .setRequired(true)
                )
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const choices = Object.entries(aircraft)
            .filter(
                ([id, plane]) =>
                    id.toLowerCase().includes(focused) ||
                    plane.name.toLowerCase().includes(focused)
            )
            .slice(0, 25)
            .map(([id, plane]) => ({ name: `${plane.name}（${id}）`, value: id }));

        await interaction.respond(choices);
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "list") {
            const type = interaction.options.getString("type");
            const entries = filterByType(aircraft, type);
            const embed = buildListEmbed({
                title: `${CATEGORY_LABEL}一覧：${type}`,
                category: CATEGORY,
                entries,
                emptyMessage: "該当する航空機は登録されていません。",
            });
            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === "info") {
            const id = interaction.options.getString("plane");
            const entry = getEntryById(aircraft, id);

            if (!entry) {
                return interaction.reply({
                    content: `ID「${id}」に該当する航空機は見つかりませんでした。`,
                    ephemeral: true,
                });
            }

            return interaction.reply({ embeds: [buildInfoEmbed(entry, CATEGORY)] });
        }

        if (subcommand === "search") {
            const keyword = interaction.options.getString("keyword");
            const entries = searchEntries(aircraft, keyword);
            const embed = buildListEmbed({
                title: `${CATEGORY_LABEL}検索結果：「${keyword}」`,
                category: CATEGORY,
                entries,
                emptyMessage: "該当する航空機は見つかりませんでした。",
            });
            return interaction.reply({ embeds: [embed] });
        }
    },
};
