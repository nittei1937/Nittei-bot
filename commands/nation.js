const { SlashCommandBuilder } = require("discord.js");
const nations = require("../data/nations.json");
const {
    toEntryArray,
    getNationById,
    searchNations,
    buildNationDashboardEmbed,
    buildNationListEmbed,
    buildNationCompareEmbed,
    buildNationRankEmbed,
} = require("../utils/nations.js");

const STAT_LABELS = {
    population: "人口",
    gdp: "GDP",
    military_budget: "国防費",
    active_personnel: "現役兵力",
    reserve_personnel: "予備役",
    tanks_count: "保有戦車",
    ships_count: "保有艦艇",
    aircraft_count: "保有航空機",
};

function nationAutocompleteChoices(focused) {
    const lower = focused.toLowerCase();
    return Object.entries(nations)
        .filter(
            ([id, nation]) =>
                id.toLowerCase().includes(lower) || nation.name.toLowerCase().includes(lower)
        )
        .slice(0, 25)
        .map(([id, nation]) => ({ name: `${nation.name}（${id}）`, value: id }));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("nation")
        .setDescription("空想国家の総合力を表示")
        .addSubcommand((sub) =>
            sub
                .setName("info")
                .setDescription("1カ国の総合力をダッシュボード形式で表示")
                .addStringOption((option) =>
                    option
                        .setName("nation")
                        .setDescription("国家のID（例: sample_a）")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand((sub) => sub.setName("list").setDescription("登録されている国家の一覧を表示"))
        .addSubcommand((sub) =>
            sub
                .setName("search")
                .setDescription("国名・首都でキーワード検索")
                .addStringOption((option) =>
                    option
                        .setName("keyword")
                        .setDescription("検索キーワード")
                        .setRequired(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("compare")
                .setDescription("2カ国の国力を比較")
                .addStringOption((option) =>
                    option
                        .setName("nation1")
                        .setDescription("1カ国目のID")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addStringOption((option) =>
                    option
                        .setName("nation2")
                        .setDescription("2カ国目のID")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName("rank")
                .setDescription("指標で国家をランキング表示")
                .addStringOption((option) =>
                    option
                        .setName("stat")
                        .setDescription("ランキングする指標")
                        .setRequired(true)
                        .addChoices(
                            { name: "人口", value: "population" },
                            { name: "GDP", value: "gdp" },
                            { name: "国防費", value: "military_budget" },
                            { name: "現役兵力", value: "active_personnel" },
                            { name: "予備役", value: "reserve_personnel" },
                            { name: "保有戦車", value: "tanks_count" },
                            { name: "保有艦艇", value: "ships_count" },
                            { name: "保有航空機", value: "aircraft_count" }
                        )
                )
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        await interaction.respond(nationAutocompleteChoices(focused));
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "info") {
            const id = interaction.options.getString("nation");
            const nation = getNationById(nations, id);

            if (!nation) {
                return interaction.reply({
                    content: `ID「${id}」に該当する国家は見つかりませんでした。`,
                    ephemeral: true,
                });
            }

            return interaction.reply({ embeds: [buildNationDashboardEmbed(nation, nations)] });
        }

        if (subcommand === "list") {
            const entries = toEntryArray(nations);
            return interaction.reply({ embeds: [buildNationListEmbed(entries)] });
        }

        if (subcommand === "search") {
            const keyword = interaction.options.getString("keyword");
            const entries = searchNations(nations, keyword);
            return interaction.reply({ embeds: [buildNationListEmbed(entries)] });
        }

        if (subcommand === "compare") {
            const id1 = interaction.options.getString("nation1");
            const id2 = interaction.options.getString("nation2");
            const nationA = getNationById(nations, id1);
            const nationB = getNationById(nations, id2);

            if (!nationA || !nationB) {
                const missing = !nationA ? id1 : id2;
                return interaction.reply({
                    content: `ID「${missing}」に該当する国家は見つかりませんでした。`,
                    ephemeral: true,
                });
            }

            return interaction.reply({ embeds: [buildNationCompareEmbed(nationA, nationB)] });
        }

        if (subcommand === "rank") {
            const stat = interaction.options.getString("stat");
            const entries = toEntryArray(nations);
            const embed = buildNationRankEmbed(entries, stat, STAT_LABELS[stat]);
            return interaction.reply({ embeds: [embed] });
        }
    },
};
