const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const OPTION_TYPE = {
    SUBCOMMAND: 1,
    SUBCOMMAND_GROUP: 2,
};

// SlashCommandOptionType（一部）の表示用ラベル
const VALUE_TYPE_LABELS = {
    3: "文字列",
    4: "整数",
    5: "真偽値",
    6: "ユーザー",
    7: "チャンネル",
    8: "ロール",
    10: "数値",
};

/**
 * SlashCommandBuilderのtoJSON()出力から、サブコマンドグループも含めて
 * 「表示用コマンド名 / 説明 / パラメータ」のフラットなリストを作る。
 * 例: info グループの中の list サブコマンド -> name: "info list"
 */
function flattenSubcommands(json) {
    const result = [];

    (json.options || []).forEach((opt) => {
        if (opt.type === OPTION_TYPE.SUBCOMMAND) {
            result.push({ name: opt.name, description: opt.description, options: opt.options });
        } else if (opt.type === OPTION_TYPE.SUBCOMMAND_GROUP) {
            (opt.options || []).forEach((sub) => {
                result.push({
                    name: `${opt.name} ${sub.name}`,
                    description: sub.description,
                    options: sub.options,
                });
            });
        }
    });

    return result;
}

/**
 * 1個のパラメータを詳細表示用の1行に整形する
 * 例: `ore`（文字列・必須、入力補完あり）：取引する鉱石
 */
function formatOptionDetail(opt) {
    const req = opt.required ? "必須" : "任意";
    const typeLabel = VALUE_TYPE_LABELS[opt.type] || "値";

    const extras = [];
    if (opt.autocomplete) extras.push("入力補完あり");
    if (opt.choices && opt.choices.length > 0) {
        extras.push(`選択肢: ${opt.choices.map((c) => c.name).join("/")}`);
    }
    if (opt.min_value !== undefined || opt.max_value !== undefined) {
        const min = opt.min_value !== undefined ? opt.min_value : "";
        const max = opt.max_value !== undefined ? opt.max_value : "";
        extras.push(`範囲: ${min}〜${max}`);
    }

    const extraText = extras.length > 0 ? `（${typeLabel}・${req}、${extras.join("、")}）` : `（${typeLabel}・${req}）`;

    return `\`${opt.name}\`${extraText}：${opt.description}`;
}

/**
 * client.commands（index.jsで読み込み済みの全コマンド）から
 * コマンド一覧の概要Embedを組み立てる。
 */
function buildOverviewEmbed(client) {
    const embed = new EmbedBuilder()
        .setTitle("コマンド一覧")
        .setColor(0x4a5568)
        .setDescription(
            "利用できるスラッシュコマンドの一覧です。`< >`は必須、`[ ]`は省略可の項目です。\n" +
                "`/help command:<コマンド名>` で各コマンドの詳細（パラメータの説明つき）を見られます。"
        );

    const sortedCommands = [...client.commands.values()].sort((a, b) =>
        a.data.name.localeCompare(b.data.name)
    );

    sortedCommands.forEach((command) => {
        const json = command.data.toJSON();
        const subcommands = flattenSubcommands(json);

        let value;
        if (subcommands.length > 0) {
            value = subcommands
                .map((sub) => {
                    const params = (sub.options || [])
                        .map((opt) => (opt.required ? `<${opt.name}>` : `[${opt.name}]`))
                        .join(" ");
                    const usage = params ? `${sub.name} ${params}` : sub.name;
                    return `\`/${json.name} ${usage}\`\n${sub.description}`;
                })
                .join("\n\n");
        } else {
            value = json.description;
        }

        embed.addFields({ name: `■ /${json.name}`, value });
    });

    return embed;
}

/**
 * 1コマンドの詳細Embed（サブコマンドごとの全パラメータ説明つき）を組み立てる。
 */
function buildCommandDetailEmbed(command) {
    const json = command.data.toJSON();
    const subcommands = flattenSubcommands(json);

    const embed = new EmbedBuilder().setTitle(`/${json.name} の詳細`).setColor(0x4a5568).setDescription(json.description);

    if (subcommands.length === 0) {
        embed.addFields({ name: `\`/${json.name}\``, value: "（追加のパラメータはありません）" });
        return embed;
    }

    subcommands.forEach((sub) => {
        const paramLines =
            (sub.options || []).length > 0
                ? sub.options.map(formatOptionDetail).join("\n")
                : "（パラメータなし）";

        embed.addFields({
            name: `\`/${json.name} ${sub.name}\``,
            value: `${sub.description}\n${paramLines}`,
        });
    });

    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("利用できるコマンドの一覧、またはコマンド別の詳細を表示")
        .addStringOption((option) =>
            option
                .setName("command")
                .setDescription("詳細を見たいコマンド名（省略時は全体の一覧を表示）")
                .setRequired(false)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const choices = [...interaction.client.commands.keys()]
            .filter((name) => name.toLowerCase().includes(focused))
            .sort()
            .slice(0, 25)
            .map((name) => ({ name: `/${name}`, value: name }));

        await interaction.respond(choices);
    },

    async execute(interaction) {
        const commandName = interaction.options.getString("command");

        if (commandName) {
            const command = interaction.client.commands.get(commandName);

            if (!command) {
                return interaction.reply({
                    content: `コマンド「${commandName}」が見つかりませんでした。`,
                    ephemeral: true,
                });
            }

            return interaction.reply({ embeds: [buildCommandDetailEmbed(command)] });
        }

        return interaction.reply({ embeds: [buildOverviewEmbed(interaction.client)] });
    },
};
