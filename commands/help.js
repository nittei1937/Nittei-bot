const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const OPTION_TYPE = {
    SUBCOMMAND: 1,
    SUBCOMMAND_GROUP: 2,
};

const VALUE_TYPE_LABELS = {
    3: "文字列",
    4: "整数",
    5: "真偽値",
    6: "ユーザー",
    7: "チャンネル",
    8: "ロール",
    10: "数値",
};

const MAX_FIELD_LENGTH = 1024;

function safeText(value, fallback = "説明はありません。") {
    return typeof value === "string" && value.trim()
        ? value
        : fallback;
}

function limitText(value, maxLength = MAX_FIELD_LENGTH) {
    const text = safeText(value);
    return text.length > maxLength
        ? `${text.slice(0, maxLength - 3)}...`
        : text;
}

function flattenSubcommands(json) {
    const result = [];

    (json.options || []).forEach((opt) => {
        if (opt.type === OPTION_TYPE.SUBCOMMAND) {
            result.push({
                name: opt.name,
                description: opt.description,
                options: opt.options,
            });
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

function formatOptionDetail(opt) {
    const req = opt.required ? "必須" : "任意";
    const typeLabel = VALUE_TYPE_LABELS[opt.type] || "値";

    const extras = [];

    if (opt.autocomplete) {
        extras.push("入力補完あり");
    }

    if (opt.choices && opt.choices.length > 0) {
        extras.push(`選択肢: ${opt.choices.map((c) => c.name).join("/")}`);
    }

    if (opt.min_value !== undefined || opt.max_value !== undefined) {
        const min = opt.min_value !== undefined ? opt.min_value : "";
        const max = opt.max_value !== undefined ? opt.max_value : "";
        extras.push(`範囲: ${min}〜${max}`);
    }

    const extraText = extras.length > 0
        ? `（${typeLabel}・${req}、${extras.join("、")}）`
        : `（${typeLabel}・${req}）`;

    return `\`${opt.name}\`${extraText}：${safeText(opt.description, "説明なし")}`;
}

function buildOverviewEmbed(client) {
    const embed = new EmbedBuilder()
        .setTitle("コマンド一覧")
        .setColor(0x4a5568)
        .setDescription(
            "利用できるスラッシュコマンドの一覧です。`< >`は必須、`[ ]`は省略可の項目です。\n" +
            "`/help command:<コマンド名>` で各コマンドの詳細を確認できます。"
        );

    const sortedCommands = [...client.commands.values()].sort((a, b) =>
        safeText(a?.data?.name, "").localeCompare(safeText(b?.data?.name, ""))
    );

    let fieldCount = 0;

    for (const command of sortedCommands) {
        try {
            const json = command?.data?.toJSON?.();

            if (!json?.name) {
                console.warn("[help] コマンド名がないため一覧から除外しました。");
                continue;
            }

            const subcommands = flattenSubcommands(json);
            let value;

            if (subcommands.length > 0) {
                value = subcommands
                    .map((sub) => {
                        const params = (sub.options || [])
                            .map((opt) =>
                                opt.required ? `<${opt.name}>` : `[${opt.name}]`
                            )
                            .join(" ");

                        const usage = params
                            ? `${sub.name} ${params}`
                            : sub.name;

                        return `\`/${json.name} ${usage}\`\n${safeText(sub.description)}`;
                    })
                    .join("\n\n");
            } else {
                value = safeText(json.description);
            }

            // Discord Embedのフィールド上限に合わせて分割
            const chunks = [];
            const lines = value.split("\n");
            let current = "";

            for (const line of lines) {
                const next = current ? `${current}\n${line}` : line;

                if (next.length > MAX_FIELD_LENGTH) {
                    if (current) chunks.push(current);
                    current = line.slice(0, MAX_FIELD_LENGTH);
                } else {
                    current = next;
                }
            }

            if (current) chunks.push(current);

            for (let i = 0; i < chunks.length; i++) {
                if (fieldCount >= 25) {
                    console.warn("[help] Embedのフィールド上限に達しました。");
                    break;
                }

                embed.addFields({
                    name: limitText(
                        i === 0
                            ? `■ /${json.name}`
                            : `■ /${json.name}（続き）`,
                    256),
                    value: limitText(chunks[i]),
                });

                fieldCount++;
            }

            if (fieldCount >= 25) break;
        } catch (error) {
            console.error(
                `[help] コマンド一覧の生成に失敗: ${command?.data?.name || "unknown"}`,
                error
            );
        }
    }

    if (fieldCount === 0) {
        embed.addFields({
            name: "コマンド",
            value: "表示できるコマンドがありません。",
        });
    }

    return embed;
}

function buildCommandDetailEmbed(command) {
    const json = command.data.toJSON();
    const subcommands = flattenSubcommands(json);

    const embed = new EmbedBuilder()
        .setTitle(`/${safeText(json.name, "unknown")} の詳細`)
        .setColor(0x4a5568)
        .setDescription(safeText(json.description));

    if (subcommands.length === 0) {
        embed.addFields({
            name: `\`/${safeText(json.name, "unknown")}\``,
            value: "（追加のパラメータはありません）",
        });

        return embed;
    }

    let fieldCount = 0;

    for (const sub of subcommands) {
        if (fieldCount >= 25) break;

        const paramLines = (sub.options || []).length > 0
            ? sub.options.map(formatOptionDetail).join("\n")
            : "（パラメータなし）";

        const value = limitText(
            `${safeText(sub.description)}\n${paramLines}`
        );

        embed.addFields({
            name: limitText(`\`/${json.name} ${sub.name}\``, 256),
            value,
        });

        fieldCount++;
    }

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
            .map((name) => ({
                name: `/${name}`,
                value: name,
            }));

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

            return interaction.reply({
                embeds: [buildCommandDetailEmbed(command)],
            });
        }

        return interaction.reply({
            embeds: [buildOverviewEmbed(interaction.client)],
        });
    },
};