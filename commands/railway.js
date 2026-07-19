const { SlashCommandBuilder } = require("discord.js");
const lines = require("../data/lines.json");
const cars = require("../data/cars.json");
const companies = require("../data/companies.json");
const { filterByType, getEntryById, buildInfoEmbed, buildListEmbed } = require("../utils/railway.js");

const ALL_DATA = { lines, cars, companies };

// サブコマンドグループ名 -> { データ, カテゴリ名, IDオプション名, 表示ラベル, list用の種別選択肢 }
const GROUPS = {
    lines: {
        data: lines,
        category: "lines",
        idOption: "line",
        label: "路線",
        typeChoices: [
            { name: "本線", value: "MAIN" },
            { name: "支線", value: "BRANCH" },
            { name: "貨物線", value: "FREIGHT" },
            { name: "連絡線", value: "CONNECTOR" },
        ],
    },
    cars: {
        data: cars,
        category: "cars",
        idOption: "car",
        label: "車両",
        typeChoices: [
            { name: "通勤形", value: "COMMUTER" },
            { name: "近郊形", value: "SUBURBAN" },
            { name: "特急形", value: "LIMITED_EXPRESS" },
            { name: "貨物用", value: "FREIGHT" },
            { name: "事業用", value: "WORK" },
        ],
    },
    companies: {
        data: companies,
        category: "companies",
        idOption: "company",
        label: "鉄道会社",
        typeChoices: [
            { name: "民鉄", value: "PRIVATE" },
            { name: "公営", value: "PUBLIC" },
            { name: "第三セクター", value: "THIRD_SECTOR" },
            { name: "JR", value: "JR" },
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
        .setName("railway")
        .setDescription("鉄道（路線・車両・鉄道会社）のデータベースを検索")
        .addSubcommandGroup((group) => makeSubcommandGroup(group, "lines"))
        .addSubcommandGroup((group) => makeSubcommandGroup(group, "cars"))
        .addSubcommandGroup((group) => makeSubcommandGroup(group, "companies")),

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

            return interaction.reply({ embeds: [buildInfoEmbed(entry, group.category, ALL_DATA)] });
        }
    },
};
