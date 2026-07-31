const { SlashCommandBuilder } = require("discord.js");

const BARUSU = require("../data/barusu/barusu.json");
const HANSYA = require("../data/barusu/hansya.json");
const ADMINS = require("../data/barusu/admins.json");
const { addSchedule, formatDiscordTime, getExecuteAt } = require("../utils/schedule");

function createAutocomplete(data) {
    return async interaction => {
        try {
            const focused = interaction.options.getFocused().toLowerCase();
            const choices = Object.entries(data)
                .filter(([id, value]) => id.toLowerCase().includes(focused) || value.name.toLowerCase().includes(focused))
                .slice(0, 25)
                .map(([id, value]) => ({ name: value.name, value: id }));
            await interaction.respond(choices);
        } catch (error) {
            console.error(error);
            if (!interaction.responded) await interaction.respond([]);
        }
    };
}

function getTarget(interaction, optionName = "user") {
    const member = interaction.options.getMember(optionName);
    const user = interaction.options.getUser(optionName);
    return {
        id: user.id,
        name: member?.displayName ?? user.username
    };
}

function createSchedule(interaction, target, message, executeAt) {
    addSchedule({
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        userId: target.id,
        userName: target.name,
        content: `<@${target.id}>${message}`,
        executeAt
    });
}

function getTimeOptions(interaction) {
    const delay = interaction.options.getInteger("delay");
    const hour = interaction.options.getInteger("hour");
    const minute = interaction.options.getInteger("minute");

    if ((hour === null) !== (minute === null)) return null;
    return { delay, hour, minute };
}

function createExecute(data) {
    return async interaction => {
        const type = interaction.options.getString("type");
        const info = data[type];

        if (!info) {
            return interaction.reply({
                content: "その種類は存在しません。",
                ephemeral: true
            });
        }

        // 管理者限定
        if (
            info.permission === "admin" &&
            !ADMINS.users.includes(interaction.user.id)
        ) {
            return interaction.reply({
                content: "このバルスは管理者専用です。",
                ephemeral: true
            });
        }

        const target = getTarget(interaction);
        const mode = info.mode ?? "normal";

        if (mode === "physical") {
            const actorName = interaction.member?.displayName
                ?? interaction.user.globalName
                ?? interaction.user.username;
            return interaction.reply({
                content: `${target.name}へ物理的バルス！${actorName}も物理的バルス！`
            });
        }

        if (mode === "ricochet") {
            const secondUser = interaction.options.getUser("user2");
            if (!secondUser) {
                return interaction.reply({ content: "跳弾式バルスでは「user2」も指定してください。", ephemeral: true });
            }

            const secondTarget = getTarget(interaction, "user2");
            return interaction.reply({
                content: `${target.name}と${secondTarget.name}に跳弾式バルス！`
            });
        }

        if (mode === "delayed") {
            const timeOptions = getTimeOptions(interaction);
            if (!timeOptions) {
                return interaction.reply({
                    content: "時刻指定では「hour」と「minute」を両方入力してください。",
                    ephemeral: true
                });
            }

            const executeAt = getExecuteAt(timeOptions);
            createSchedule(interaction, target, info.message, executeAt);
            return interaction.reply({
                content: `${target.name}へ時間差式バルス！\n発動予定：${formatDiscordTime(executeAt)}`
            });
        }

        if (mode === "multi_delayed") {
            const delays = ["delay", "delay2", "delay3"]
                .map(option => interaction.options.getInteger(option))
                .filter(delay => delay !== null);

            if (delays.length === 0) {
                return interaction.reply({
                    content: "多段時間差式バルスでは「delay」を1つ以上入力してください。",
                    ephemeral: true
                });
            }

            const executeAts = delays.map(delay => getExecuteAt({ delay, hour: null, minute: null }));
            for (const executeAt of executeAts) {
                createSchedule(interaction, target, info.message, executeAt);
            }

            return interaction.reply({
                content: `${target.name}へ多段時間差式バルス！\n発動予定：\n${executeAts.map(formatDiscordTime).join("\n")}`
            });
        }

        return interaction.reply({ content: `${target.name}${info.message}` });
    };
}

const barusuCommand = {
    data: new SlashCommandBuilder()
        .setName("barusu")
        .setDescription("バルスを放つ")
        .addStringOption(option => option.setName("type").setDescription("種類").setRequired(true).setAutocomplete(true))
        .addUserOption(option => option.setName("user").setDescription("対象").setRequired(true))
        .addUserOption(option => option.setName("user2").setDescription("跳弾先（跳弾式バルスのみ）"))
        .addIntegerOption(option => option.setName("delay").setDescription("発動までの分数（時間差式・多段時間差式）").setMinValue(1).setMaxValue(525600))
        .addIntegerOption(option => option.setName("delay2").setDescription("2回目までの分数（多段時間差式のみ）").setMinValue(1).setMaxValue(525600))
        .addIntegerOption(option => option.setName("delay3").setDescription("3回目までの分数（多段時間差式のみ）").setMinValue(1).setMaxValue(525600))
        .addIntegerOption(option => option.setName("hour").setDescription("発動時（0〜23、時間差式のみ）").setMinValue(0).setMaxValue(23))
        .addIntegerOption(option => option.setName("minute").setDescription("発動分（0〜59、時間差式のみ）").setMinValue(0).setMaxValue(59)),
    autocomplete: createAutocomplete(BARUSU),
    execute: createExecute(BARUSU)
};

const hansyaCommand = {
    data: new SlashCommandBuilder()
        .setName("hansya")
        .setDescription("反射を放つ")
        .addStringOption(option => option.setName("type").setDescription("種類").setRequired(true).setAutocomplete(true))
        .addUserOption(option => option.setName("user").setDescription("対象").setRequired(true)),
    autocomplete: createAutocomplete(HANSYA),
    execute: createExecute(HANSYA)
};

module.exports = [barusuCommand, hansyaCommand];
