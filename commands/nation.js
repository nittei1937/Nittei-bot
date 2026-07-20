const { SlashCommandBuilder } = require("discord.js");

const fictionNations = require("../data/nations/fiction.json");
const realNations = require("../data/nations/real.json");

const {
    toEntryArray,
    getNationById,
    buildNationDashboardEmbed,
    buildNationListEmbed,
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

function nationAutocompleteChoices(data, focused) {
    const lower = focused.toLowerCase();

    return Object.entries(data)
        .filter(
            ([id, nation]) =>
                id.toLowerCase().includes(lower) ||
                nation.name.toLowerCase().includes(lower)
        )
        .slice(0, 25)
        .map(([id, nation]) => ({
            name: `${nation.name}（${id}）`,
            value: id,
        }));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("nation")
        .setDescription("国家データベース")

        //========================
        // Fiction
        //========================
        .addSubcommandGroup(group =>
            group
                .setName("fiction")
                .setDescription("架空国家")

                .addSubcommand(sub =>
                    sub
                        .setName("info")
                        .setDescription("国家情報を表示")
                        .addStringOption(option =>
                            option
                                .setName("nation")
                                .setDescription("国家")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )

                .addSubcommand(sub =>
                    sub
                        .setName("list")
                        .setDescription("国家一覧を表示")
                )

                .addSubcommand(sub =>
                    sub
                        .setName("rank")
                        .setDescription("国家ランキング")
                        .addStringOption(option =>
                            option
                                .setName("stat")
                                .setDescription("ランキング項目")
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
                )
        )

        //========================
        // Real
        //========================
        .addSubcommandGroup(group =>
            group
                .setName("real")
                .setDescription("実在国家")

                .addSubcommand(sub =>
                    sub
                        .setName("info")
                        .setDescription("国家情報を表示")
                        .addStringOption(option =>
                            option
                                .setName("nation")
                                .setDescription("国家")
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )

                .addSubcommand(sub =>
                    sub
                        .setName("list")
                        .setDescription("国家一覧を表示")
                )

                .addSubcommand(sub =>
                    sub
                        .setName("rank")
                        .setDescription("国家ランキング")
                        .addStringOption(option =>
                            option
                                .setName("stat")
                                .setDescription("ランキング項目")
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
                )
        ),

    async autocomplete(interaction) {
        const group = interaction.options.getSubcommandGroup();
        const focused = interaction.options.getFocused();

        const data = group === "real"
            ? realNations
            : fictionNations;

        await interaction.respond(
            nationAutocompleteChoices(data, focused)
        );
    },

    async execute(interaction) {

        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        const nations = group === "real"
            ? realNations
            : fictionNations;

        //==================
        // info
        //==================
        if (subcommand === "info") {

            const id = interaction.options.getString("nation");
            const nation = getNationById(nations, id);

            if (!nation) {
                return interaction.reply({
                    content: `ID「${id}」に該当する国家は見つかりませんでした。`,
                    ephemeral: true,
                });
            }

            return interaction.reply({
                embeds: [buildNationDashboardEmbed(nation, nations)],
            });
        }

        //==================
        // list
        //==================
        if (subcommand === "list") {

            const entries = toEntryArray(nations);

            return interaction.reply({
                embeds: [buildNationListEmbed(entries)],
            });
        }

        //==================
        // rank
        //==================
        if (subcommand === "rank") {

            const stat = interaction.options.getString("stat");

            const entries = toEntryArray(nations);

            return interaction.reply({
                embeds: [
                    buildNationRankEmbed(
                        entries,
                        stat,
                        STAT_LABELS[stat]
                    ),
                ],
            });
        }
    },
};