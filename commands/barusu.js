const { SlashCommandBuilder } = require("discord.js");

const BARUSU = require("../data/barusu/barusu.json");
const HANSYA = require("../data/barusu/hansya.json");
const { addSchedule, formatDiscordTime, getExecuteAt } = require("../utils/schedule");

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
                .map(([id, value]) => ({ name: value.name, value: id }));

            await interaction.respond(choices);
        } catch (error) {
            console.error(error);
            if (!interaction.responded) await interaction.respond([]);
        }
    };
}

function getTargetName(interaction, member) {
    return member?.displayName ?? interaction.options.getUser("user").username;
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

        if (type === "zikansaSiki_barusu") {
            const delay = interaction.options.getInteger("delay");
            const hour = interaction.options.getInteger("hour");
            const minute = interaction.options.getInteger("minute");

            if ((hour === null) !== (minute === null)) {
                return interaction.reply({
                    content: "時刻指定では「hour」と「minute」を両方入力してください。",
                    ephemeral: true
                });
            }

            const executeAt = getExecuteAt({ delay, hour, minute });
            const target = member ?? interaction.options.getUser("user");
            const targetName = getTargetName(interaction, member);

            addSchedule({
                channelId: interaction.channelId,
                guildId: interaction.guildId,
                userId: target.id,
                userName: targetName,
                content: `${targetName}へ時間差式バルス！！！`,
                executeAt
            });

            return interaction.reply({
                content: `${targetName}へ時間差式バルス！\n発動予定：${formatDiscordTime(executeAt)}`
            });
        }

        return interaction.reply({
            content: `${getTargetName(interaction, member)}${info.message}`
        });
    };
}

const barusuCommand = {
    data: new SlashCommandBuilder()
        .setName("barusu")
        .setDescription("バルスを放つ")
        .addStringOption(option =>
            option.setName("type").setDescription("種類").setRequired(true).setAutocomplete(true)
        )
        .addUserOption(option =>
            option.setName("user").setDescription("対象").setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName("delay").setDescription("発動までの分数（時間差式バルスのみ）")
                .setMinValue(1).setMaxValue(525600)
        )
        .addIntegerOption(option =>
            option.setName("hour").setDescription("発動時（0〜23、時間差式バルスのみ）")
                .setMinValue(0).setMaxValue(23)
        )
        .addIntegerOption(option =>
            option.setName("minute").setDescription("発動分（0〜59、時間差式バルスのみ）")
                .setMinValue(0).setMaxValue(59)
        ),
    autocomplete: createAutocomplete(BARUSU),
    execute: createExecute(BARUSU)
};

const hansyaCommand = {
    data: new SlashCommandBuilder()
        .setName("hansya")
        .setDescription("反射を放つ")
        .addStringOption(option =>
            option.setName("type").setDescription("種類").setRequired(true).setAutocomplete(true)
        )
        .addUserOption(option =>
            option.setName("user").setDescription("対象").setRequired(true)
        ),
    autocomplete: createAutocomplete(HANSYA),
    execute: createExecute(HANSYA)
};

module.exports = [barusuCommand, hansyaCommand];
