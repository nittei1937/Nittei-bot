const { SlashCommandBuilder } = require("discord.js");
const ships = require("../data/military/ships.json");
const tanks = require("../data/military/tanks.json");
const airplanes = require("../data/military/airplanes.json");
const { filterByType, getEntryById, buildInfoEmbed, buildListEmbed } = require("../utils/military.js");

// group（サブコマンドグループ）ごとの設定を1箇所にまとめる。
// データを追加・変更するときはこことdata配下のjsonだけ触ればいい。
const GROUPS = {
    ships: {
        label: "艦艇",
        database: ships,
        emptyMessage: "該当する艦艇は登録されていません。",
        notFoundMessage: (id) => `ID「${id}」に該当する艦艇は見つかりませんでした。`,
        types: [
            { name: "駆逐艦", value: "DD" },
            { name: "軽巡洋艦", value: "CL" },
            { name: "重巡洋艦", value: "CA" },
            { name: "巡洋戦艦", value: "BC" },
            { name: "戦艦", value: "BB" },
            { name: "航空母艦", value: "CV" },
            { name: "潜水艦", value: "SS" },
        ],
    },
    tanks: {
        label: "陸上兵器",
        database: tanks,
        emptyMessage: "該当する車両は登録されていません。",
        notFoundMessage: (id) => `ID「${id}」に該当する車両は見つかりませんでした。`,
        types: [
            { name: "軽戦車", value: "LT" },
            { name: "中戦車", value: "MT" },
            { name: "重戦車", value: "HT" },
            { name: "駆逐戦車", value: "TD" },
            { name: "自走砲", value: "SPG" },
        ],
    },
    airplanes: {
        label: "航空機",
        database: airplanes,
        emptyMessage: "該当する航空機は登録されていません。",
        notFoundMessage: (id) => `ID「${id}」に該当する航空機は見つかりませんでした。`,
        types: [
            { name: "戦闘機", value: "FT" },
            { name: "爆撃機", value: "BM" },
            { name: "雷撃機", value: "TB" },
            { name: "偵察機", value: "RC" },
            { name: "輸送機", value: "TR" },
        ],
    },
};

function buildSubcommandGroup(groupName) {
    const group = GROUPS[groupName];

    return (sub) =>
        sub
            .setName(groupName)
            .setDescription(`${group.label}のデータベースを検索`)
            .addSubcommand((info) =>
                info
                    .setName("info")
                    .setDescription(`${group.label}1件の詳細情報を表示`)
                    .addStringOption((option) =>
                        option
                            .setName("id")
                            .setDescription("IDまたは名称（入力補完から選択可）")
                            .setRequired(true)
                            .setAutocomplete(true)
                    )
            )
            .addSubcommand((list) =>
                list
                    .setName("list")
                    .setDescription("種類ごとの一覧を表示")
                    .addStringOption((option) =>
                        option
                            .setName("type")
                            .setDescription("種類")
                            .setRequired(true)
                            .addChoices(...group.types)
                    )
            );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("military")
        .setDescription("軍事データベースを検索")
        .addSubcommandGroup(buildSubcommandGroup("ships"))
        .addSubcommandGroup(buildSubcommandGroup("tanks"))
        .addSubcommandGroup(buildSubcommandGroup("airplanes")),

    async autocomplete(interaction) {
        const groupName = interaction.options.getSubcommandGroup();
        const group = GROUPS[groupName];
        if (!group) return interaction.respond([]);

        const focused = interaction.options.getFocused().toLowerCase();
        const choices = Object.entries(group.database)
            .filter(([id, entry]) =>
                id.toLowerCase().includes(focused) ||
                (entry.name ?? "").toLowerCase().includes(focused)
            )
            .slice(0, 25)
            .map(([id, entry]) => ({ name: `${entry.name}（${id}）`, value: id }));

        await interaction.respond(choices);
    },

    async execute(interaction) {
        const groupName = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();
        const group = GROUPS[groupName];

        if (subcommand === "list") {
            const type = interaction.options.getString("type");
            const entries = filterByType(group.database, type);
            const embed = buildListEmbed({
                title: `${group.label}一覧：${type}`,
                category: groupName,
                entries,
                emptyMessage: group.emptyMessage,
            });
            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === "info") {
            const id = interaction.options.getString("id");
            const entry = getEntryById(group.database, id);

            if (!entry) {
                return interaction.reply({
                    content: group.notFoundMessage(id),
                    ephemeral: true,
                });
            }

            return interaction.reply({ embeds: [buildInfoEmbed(entry, groupName)] });
        }
    },
};