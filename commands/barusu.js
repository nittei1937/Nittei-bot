const { SlashCommandBuilder } = require("discord.js");

const BARUSU = require("../data/barusu.json");
const HANSYA = require("../data/hansya.json");

// -----------------------------
// 共通処理
// -----------------------------

function createAutocomplete(data) {
    return async (interaction) => {
        try {
            const focused = interaction.options.getFocused().toLowerCase();
            const choices = Object.entries(data)
                .filter(([id, value]) =>
                    id.toLowerCase().includes(focused) ||
                    value.name.toLowerCase().includes(focused)
                )
                .slice(0, 25)
                .map(([id, value]) => {
                    console.log(value.name.length, value.name);

                    return {
                        name: value.name,
                        value: id
                    };
                })
            await interaction.respond(choices);

        } catch (err) {
            console.error(err);

            if (!interaction.responded) {
                await interaction.respond([]);
            }
        }
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
            const time = trigger.toLocaleTimeString("ja-JP", {
                timeZone: "Asia/Tokyo",
                hour: "2-digit",
                minute: "2-digit"
            });
            message = message.replace("{time}", time);
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