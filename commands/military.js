const { SlashCommandBuilder } = require("discord.js");
const ships = require("../data/ships.json");
const tanks = require("../data/tanks.json");
const airplanes = require("../data/airplanes.json");
const { filterByType, getEntryById, buildInfoEmbed, buildListEmbed } = require("../utils/military.js");

// サブコマンドグループ名 -> { データ, カテゴリ名, IDオプション名, 表示ラベル, list用の種別選択肢 }
const GROUPS = {
    ships: {
        data: ships,
        category: "ships",
        idOption: "ship",
        label: "艦艇",
        typeChoices: [
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
        data: tanks,
        category: "tanks",
        idOption: "tank",
        label: "陸上兵器",
        typeChoices: [
            { name: "軽戦車", value: "LT" },
            { name: "中戦車", value: "MT" },
            { name: "重戦車", value: "HT" },
            { name: "駆逐戦車", value: "TD" },
            { name: "自走砲", value: "SPG" },
        ],
    },
    airplanes: {
        data: airplanes,
        category: "airplanes",
        idOption: "plane",
        label: "航空機",
        typeChoices: [
            { name: "戦闘機", value: "FT" },
            { name: "爆撃機", value: "BM" },
            { name: "雷撃機", value: "TB" },
            { name: "偵察機", value: "RC" },
            { name: "輸送機", value: "TR" },
        ],
    },
};

function makeSubcommandGroup(builderGroup, groupKey) {
    const group = GROUPS[groupKey];

    builderGroup.setName(groupKey).setDescription(`${group.label}のデータベースを検索`);

    builderGroup.addSubcommand((sub) => {
        sub.setName("list").setDescription(`${group.label}の種別ごとの一覧を表示`);
        sub.addStringOption((option) => {
            option.setName("type").setDescription("種別").setRequired(true);
            group.typeChoices.forEach((choice) => option.addChoices(choice));
            return option;
        });
        return sub;
    });

    builderGroup.addSubcommand((sub) =>
        sub
            .setName("show")
            .setDescription(`${group.label}1件の詳細情報を表示`)
            .addStringOption((option) =>
                option
                    .setName(group.idOption)
                    .setDescription("ID（入力補完から選択可）")
                    .setRequired(true)
                    .setAutocomplete(true)
            )
    );

    return builderGroup;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("military")
        .setDescription("軍事装備（艦艇・陸上兵器・航空機）のデータベースを検索")
        .addSubcommandGroup((group) => makeSubcommandGroup(group, "ships"))
        .addSubcommandGroup((group) => makeSubcommandGroup(group, "tanks"))
        .addSubcommandGroup((group) => makeSubcommandGroup(group, "airplanes")),

    async autocomplete(interaction) {
        const groupKey = interaction.options.getSubcommandGroup();
        const group = GROUPS[groupKey];
        if (!group) return interaction.respond([]);

        const focused = interaction.options.getFocused().toLowerCase();
        const choices = Object.entries(group.data)
            .filter(
                ([id, entry]) =>
                    id.toLowerCase().includes(focused) || entry.name.toLowerCase().includes(focused)
            )
            .slice(0, 25)
            .map(([id, entry]) => ({ name: `${entry.name}（${id}）`, value: id }));

        await interaction.respond(choices);
    },

    async execute(interaction) {
        const groupKey = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();
        const group = GROUPS[groupKey];

        if (!group) {
            return interaction.reply({ content: "不明なカテゴリです。", ephemeral: true });
        }

        if (subcommand === "list") {
            const type = interaction.options.getString("type");
            const entries = filterByType(group.data, type);
            const embed = buildListEmbed({
                title: `${group.label}一覧：${type}`,
                category: group.category,
                entries,
                emptyMessage: `該当する${group.label}は登録されていません。`,
            });
            return interaction.reply({ embeds: [embed] });
        }

        if (subcommand === "show") {
            const id = interaction.options.getString(group.idOption);
            const entry = getEntryById(group.data, id);

            if (!entry) {
                return interaction.reply({
                    content: `ID「${id}」に該当する${group.label}は見つかりませんでした。`,
                    ephemeral: true,
                });
            }

            return interaction.reply({ embeds: [buildInfoEmbed(entry, group.category)] });
        }
    },
};
