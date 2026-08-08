const fs = require("fs");
const path = require("path");
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const {
    getDisabledCommands,
    disableCommand,
    enableCommand,
} = require("../utils/commandSettings");

const authorityPath = path.join(__dirname, "..", "data", "barusu", "authority.json");

// このコマンド自身は無効化の対象から除外する（自分をロックアウトしないため）
const PROTECTED_COMMANDS = new Set(["servercommand"]);

function loadOwners() {
    try {
        const data = JSON.parse(fs.readFileSync(authorityPath, "utf8"));
        return data.owners ?? [];
    } catch (error) {
        console.error("[servercommand] authority.json の読み込みに失敗しました。", error);
        return [];
    }
}

function canManageCommands(interaction) {
    const owners = loadOwners();
    if (owners.includes(interaction.user.id)) return true;

    return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("servercommand")
        .setDescription("このサーバーで使えるコマンドを管理")
        .addSubcommand(sub =>
            sub
                .setName("disable")
                .setDescription("このサーバーでコマンドを無効化する")
                .addStringOption(option =>
                    option
                        .setName("command")
                        .setDescription("対象のコマンド名")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("enable")
                .setDescription("このサーバーでコマンドを有効化する")
                .addStringOption(option =>
                    option
                        .setName("command")
                        .setDescription("対象のコマンド名")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("list").setDescription("このサーバーで無効化されているコマンド一覧を表示")
        ),

    autocomplete: async interaction => {
        const focused = interaction.options.getFocused().toLowerCase();

        const names = [...interaction.client.commands.keys()]
            .filter(name => !PROTECTED_COMMANDS.has(name))
            .filter(name => name.toLowerCase().includes(focused))
            .slice(0, 25);

        await interaction.respond(names.map(name => ({ name: `/${name}`, value: name })));
    },

    execute: async interaction => {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        if (!guildId) {
            return interaction.reply({
                content: "このコマンドはサーバー内でのみ使用できます。",
                ephemeral: true,
            });
        }

        if (!canManageCommands(interaction)) {
            return interaction.reply({
                content: "このコマンドを使用する権限がありません。（サーバー管理権限が必要です）",
                ephemeral: true,
            });
        }

        if (subcommand === "list") {
            const disabled = getDisabledCommands(guildId);
            if (disabled.length === 0) {
                return interaction.reply({
                    content: "このサーバーで無効化されているコマンドはありません。",
                    ephemeral: true,
                });
            }

            return interaction.reply({
                content: `🚫 無効化中のコマンド:\n${disabled.map(name => `・/${name}`).join("\n")}`,
                ephemeral: true,
            });
        }

        const commandName = interaction.options.getString("command", true);

        if (!interaction.client.commands.has(commandName)) {
            return interaction.reply({
                content: `\`${commandName}\` というコマンドは存在しません。`,
                ephemeral: true,
            });
        }

        if (PROTECTED_COMMANDS.has(commandName)) {
            return interaction.reply({
                content: "このコマンド自体は無効化できません。",
                ephemeral: true,
            });
        }

        if (subcommand === "disable") {
            disableCommand(guildId, commandName);
            return interaction.reply(`🚫 \`/${commandName}\` をこのサーバーで無効化しました。`);
        }

        enableCommand(guildId, commandName);
        return interaction.reply(`✅ \`/${commandName}\` をこのサーバーで有効化しました。`);
    },
};
