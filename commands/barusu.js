const fs = require("fs");
const path = require("path");

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const BARUSU = require("../data/barusu/barusu.json");
const HANSYA = require("../data/barusu/hansya.json");
const AUTHO = require("../data/barusu/authority.json");
const STATUS_FILE = path.join(__dirname, "../data/barusu/status.json");


const {
    addSchedule,
    removeSchedule,
    getSchedules,
    formatDiscordTime,
    getExecuteAt
} = require("../utils/schedule");


function loadStatus() {
    if (!fs.existsSync(STATUS_FILE)) return {};
    return JSON.parse(fs.readFileSync(STATUS_FILE, "utf8"));
}

function saveStatus(data) {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(data, null, 4));
}

function ensureStatus(data, guildId, userId) {
    if (!data[guildId]) {
        data[guildId] = {};
    }

    if (!data[guildId][userId]) {
        data[guildId][userId] = {
            used: 0,
            received: 0
        };
    }
}

function addBarusuCount(guildId, userId, targetId) {
    const status = loadStatus();

    ensureStatus(status, guildId, userId);
    ensureStatus(status, guildId, targetId);

    status[guildId][userId].used++;
    status[guildId][targetId].received++;

    saveStatus(status);
}

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

function hasPermission(userId, permission) {
    if (!permission) return true;

    // 管理者専用バルスの権限（authority.json の admins）
    if (permission === "admin") {
        return AUTHO.admins.includes(userId);
    }

    // 開発者専用バルスの権限（authority.json の owners）
    if (permission === "owner") {
        return AUTHO.owners.includes(userId);
    }

    // バルス無効化専用の権限（authority.json の nullifiers）
    if (permission === "nullifier") {
        return AUTHO.nullifiers?.includes(userId) ?? false;
    }

    // 自由入力バルス専用の権限（authority.json の customUsers）
    if (permission === "custom") {
        // return AUTHO.customUsers?.includes(userId) ?? false;
        return true; // ⚠️一時的に制限撤廃中
    }

    return false;
}

function createExecute(data) {

    return async interaction => {
        const customText = interaction.options.getString("custom");
        const type = interaction.options.getString("type");

        let info;
        if (customText) {
            // 自由入力バルス：typeの代わりに任意のテキストでバルスを発動する
            info = {
                name: customText,
                message: `へ${customText}`,
                mode: "normal",
                permission: "custom"
            };
        } else {
            if (!type) {
                return interaction.reply({
                    content: "「type」または「custom」のどちらかを指定してください。",
                    ephemeral: true
                });
            }

            info = data[type];
        }

        if (!info) {
            return interaction.reply({
                content: "その種類は存在しません。",
                ephemeral: true
            });
        }

        // 権限限定（管理者・オーナー・バルス無効化権限者）
        if (!hasPermission(interaction.user.id, info.permission)) {
            return interaction.reply({
                content: "このコマンドを使用する権限がありません。",
                ephemeral: true
            });
        }

        const target = getTarget(interaction);
        const mode = info.mode ?? "normal";

        function replyWithCount(replyOptions) {
            addBarusuCount(
                interaction.guildId,
                interaction.user.id,
                target.id
            );

            return interaction.reply(replyOptions);
        }

        if (mode === "physical") {
            const actorName = interaction.member?.displayName
                ?? interaction.user.globalName
                ?? interaction.user.username;
            const embed = new EmbedBuilder()
                .setColor(0x8b0000)
                .setTitle("💪 物理的バルス")
                .setDescription(
            `${target.name}へ物理的バルス！

            ${actorName}も物理的バルス！`
                );

            return replyWithCount({
                embeds: [embed]
            });
        }

        // 跳弾式
        if (mode === "ricochet") {
            const secondUser = interaction.options.getUser("user2");
            if (!secondUser) {
                return interaction.reply({ content: "跳弾式バルスでは「user2」も指定してください。", ephemeral: true });
            }

            const secondTarget = getTarget(interaction, "user2");
            const embed = new EmbedBuilder()
                .setColor(0x00bfff)
                .setTitle("🪞 跳弾式バルス")
                .setDescription(
            `${target.name}と${secondTarget.name}に跳弾式バルス！`
                );

            return replyWithCount({
                embeds: [embed]
            });
        }

        // 時間差式
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
            const embed = new EmbedBuilder()
                .setColor(0xFF9900)
                .setDescription(
            `${info.name}

            発動予定：${formatDiscordTime(executeAt)}`
                );

            return replyWithCount({
                content: `${target.name}へ`,
                embeds: [embed]
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

            const embed = new EmbedBuilder()
                .setColor(0xFFCC00)
                .setDescription(
            `${info.name}

            発動予定
            ${executeAts.map(formatDiscordTime).join("\n")}`
                );

            return replyWithCount({
                content: `${target.name}へ`,
                embeds: [embed]
            });
        }

        // バルス無効化（予約済みの時間差式・多段時間差式バルスを取り消す）
        if (mode === "nullify") {
            const removed = getSchedules().filter(schedule =>
                schedule.guildId === interaction.guildId && schedule.userId === target.id
            );

            for (const schedule of removed) {
                removeSchedule(schedule.id);
            }

            if (removed.length === 0) {
                return interaction.reply({
                    content: `${target.name}への予約バルスは見つかりませんでした。`,
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor(0x00ff7f)
                .setTitle("🛡️ バルス無効化")
                .setDescription(`${target.name}への予約バルス（${removed.length}件）を無効化しました。`)
                .setFooter({
                    text: `実行者：${interaction.member?.displayName ?? interaction.user.username}`
                });

            return interaction.reply({
                embeds: [embed]
            });
        }

        // 管理者バルス
        if (info.permission === "admin" && info.permission === "owner") {
            const embed = new EmbedBuilder()
                .setColor(0x8B0000)
                .setDescription(info.name)
                .setFooter({
                    text: `実行者：${interaction.member?.displayName ?? interaction.user.username}`
                });

            return replyWithCount({
                content: `${target.name}へ`,
                embeds: [embed]
            });
        }

        // 通常バルス／反射
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setDescription(info.name);

        return replyWithCount({
            content: `${target.name}へ`,
            embeds: [embed]
        });
    };
}

function createListExecute(data) {
    return async interaction => {
        const userId = interaction.user.id;
        const groups = { normal: [], admin: [], owner: [] };

        for (const info of Object.values(data)) {
            const tier = info.permission === "admin" ? "admin"
                : info.permission === "owner" ? "owner"
                : "normal";
            groups[tier].push(info.name);
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle("📜 バルス一覧")
            .addFields({
                name: `🌀 通常バルス（${groups.normal.length}）`,
                value: groups.normal.length > 0 ? groups.normal.map(name => `・${name}`).join("\n") : "なし"
            });

        if (hasPermission(userId, "admin") && groups.admin.length > 0) {
            embed.addFields({
                name: `⚠️ 管理者バルス（${groups.admin.length}）`,
                value: groups.admin.map(name => `・${name}`).join("\n")
            });
        }

        if (hasPermission(userId, "owner") && groups.owner.length > 0) {
            embed.addFields({
                name: `👑 開発者専用バルス（${groups.owner.length}）`,
                value: groups.owner.map(name => `・${name}`).join("\n")
            });
        }

        return interaction.reply({ embeds: [embed], ephemeral: true });
    };
}

const barusuCommand = {
    data: new SlashCommandBuilder()
        .setName("barusu")
        .setDescription("バルス関連コマンド")
        .addSubcommand(sub =>
            sub.setName("barusu")
                .setDescription("バルスを放つ")
                .addUserOption(option => option.setName("user").setDescription("対象").setRequired(true))
                .addStringOption(option => option.setName("type").setDescription("種類（customを指定した場合は無視されます）").setRequired(false).setAutocomplete(true))
                .addStringOption(option => option.setName("custom").setDescription("自由入力（指定するとtypeより優先されます）").setMaxLength(100))
                .addUserOption(option => option.setName("user2").setDescription("跳弾先（跳弾式バルスのみ）"))
                .addIntegerOption(option => option.setName("delay").setDescription("発動までの分数（時間差式・多段時間差式）").setMinValue(1).setMaxValue(525600))
                .addIntegerOption(option => option.setName("delay2").setDescription("2回目までの分数（多段時間差式のみ）").setMinValue(1).setMaxValue(525600))
                .addIntegerOption(option => option.setName("delay3").setDescription("3回目までの分数（多段時間差式のみ）").setMinValue(1).setMaxValue(525600))
                .addIntegerOption(option => option.setName("hour").setDescription("発動時（0〜23、時間差式のみ）").setMinValue(0).setMaxValue(23))
                .addIntegerOption(option => option.setName("minute").setDescription("発動分（0〜59、時間差式のみ）").setMinValue(0).setMaxValue(59))
        )
        .addSubcommand(sub =>
            sub.setName("hansya")
                .setDescription("反射・バルス無効化を放つ")
                .addStringOption(option => option.setName("type").setDescription("種類").setRequired(true).setAutocomplete(true))
                .addUserOption(option => option.setName("user").setDescription("対象").setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName("list")
                .setDescription("使用できるバルスの一覧を表示")
        )
        .addSubcommand(sub =>
            sub.setName("status")
                .setDescription("バルス統計を表示")
        ),
    autocomplete: async interaction => {
        const data = interaction.options.getSubcommand() === "hansya" ? HANSYA : BARUSU;
        return createAutocomplete(data)(interaction);
    },
    execute: async interaction => {
        const subcommand = interaction.options.getSubcommand();
        if (subcommand === "list") {
            return createListExecute(BARUSU)(interaction);
        }
        if (subcommand === "status") {
            const status = loadStatus();
            const guildStatus = status[interaction.guildId] ?? {};
            const receivedRanking = Object.entries(guildStatus)
                .sort(([, a], [, b]) => b.received - a.received)
                .map(([id, data], index) =>
                    `${index + 1}. <@${id}>：**${data.received}回**`
                )
                .join("\n");

            const receivedRanking = Object.entries(status)
                .sort(([, a], [, b]) => b.received - a.received)
                .map(([id, data], index) =>
                    `${index + 1}. <@${id}>：**${data.received}回**`
                )
                .join("\n");

            const embed = new EmbedBuilder()
                .setColor(0x00AEFF)
                .setTitle("📊 バルス統計")
                .addFields(
                    {
                        name: "🔥 バルスした回数ランキング",
                        value: usedRanking || "まだ記録がありません。"
                    },
                    {
                        name: "💥 バルスされた回数ランキング",
                        value: receivedRanking || "まだ記録がありません。"
                    }
                );

            return interaction.reply({
                embeds: [embed]
            });
        }
        const data = subcommand === "hansya" ? HANSYA : BARUSU;
        return createExecute(data)(interaction);
    }
};

module.exports = [barusuCommand];
