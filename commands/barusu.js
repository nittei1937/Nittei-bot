const { SlashCommandBuilder } = require("discord.js");

const BARUSU = require("../data/barusu.json");
const HANSYA = require("../data/hansya.json");

// -----------------------------
// 共通処理
// -----------------------------

function createAutocomplete(data) {
    return async (interaction) => {
        const focused = interaction.options.getFocused().toLowerCase();

        const choices = Object.entries(data)
            .filter(([id, value]) =>
                id.toLowerCase().includes(focused) ||
                value.name.toLowerCase().includes(focused)
            )
            .slice(0, 25)
            .map(([id, value]) => ({
                name: value.name,
                value: id
            }));

        await interaction.respond(choices);
    };
}

function createExecute(data) {
    return async (interaction) => {

        const type = interaction.options.getString("type");
        const member = interaction.options.getMember("user");

        const info = data[type];

        if (!info) {
            return interaction.reply({
                content: "その種類は存在しません。",
                ephemeral: true
            });
        }

        let message = info.message;

        if (info.delay) {

            const trigger = new Date(Date.now() + info.delay * 60 * 1000);

            const hh = String(trigger.getHours()).padStart(2, "0");
            const mm = String(trigger.getMinutes()).padStart(2, "0");

            message = message.replace("{time}", `${hh}:${mm}`);
        }

        return interaction.reply({
            content: `${member.displayName}${message}`
        });
    };
}

// -----------------------------
// /barusu
// -----------------------------

const barusuCommand = {

    data: new SlashCommandBuilder()
        .setName("barusu")
        .setDescription("バルスを放つ")
        .addStringOption(option =>
            option
                .setName("type")
                .setDescription("種類")
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("対象")
                .setRequired(true)
        ),

    autocomplete: createAutocomplete(BARUSU),

    execute: createExecute(BARUSU)
};

// -----------------------------
// /hansya
// -----------------------------

const hansyaCommand = {

    data: new SlashCommandBuilder()
        .setName("hansya")
        .setDescription("攻撃を反射する")
        .addStringOption(option =>
            option
                .setName("type")
                .setDescription("種類")
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addUserOption(option =>
            option
                .setName("user")
                .setDescription("対象")
                .setRequired(true)
        ),

    autocomplete: createAutocomplete(HANSYA),

    execute: createExecute(HANSYA)
};

// -----------------------------
// 複数コマンドをexport
// -----------------------------

module.exports = [
    barusuCommand,
    hansyaCommand
];