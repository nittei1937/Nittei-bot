const { SlashCommandBuilder } = require("discord.js");
const { recordUserme } = require("../utils/usermeLog");

const WEBHOOK_NAME = "UserMeBot";

// このチャンネルのUserMeBot用Webhookを取得。
// 存在しなければ作成する。
async function getWebhook(channel, client) {
    if (!channel || typeof channel.fetchWebhooks !== "function") {
        throw new Error("このチャンネルではWebhookを使用できません。");
    }

    const webhooks = await channel.fetchWebhooks();

    let webhook = webhooks.find(
        hook =>
            hook.name === WEBHOOK_NAME &&
            hook.owner?.id === client.user.id
    );

    if (!webhook) {
        webhook = await channel.createWebhook({
            name: WEBHOOK_NAME,
            reason: "userme機能用Webhook"
        });
    }

    return webhook;
}

// 画像URLの最低限の確認
function isValidUrl(value) {
    try {
        const url = new URL(value);

        return (
            url.protocol === "http:" ||
            url.protocol === "https:"
        );
    } catch {
        return false;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("userme")
        .setDescription("ユーザーまたは任意の名前・画像として文章を投稿")

        // =========================
        // 実在ユーザー版
        // /userme user
        // =========================
        .addSubcommand(subcommand =>
            subcommand
                .setName("user")
                .setDescription("サーバー内のユーザーとして文章を投稿")

                .addUserOption(option =>
                    option
                        .setName("user")
                        .setDescription("投稿者として表示するユーザー")
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("word")
                        .setDescription("投稿する文章")
                        .setRequired(true)
                        .setMaxLength(2000)
                )
        )

        // =========================
        // 完全カスタム版
        // /userme custom
        // =========================
        .addSubcommand(subcommand =>
            subcommand
                .setName("custom")
                .setDescription("任意の名前と画像として文章を投稿")

                .addStringOption(option =>
                    option
                        .setName("name")
                        .setDescription("投稿者として表示する名前")
                        .setRequired(true)
                        .setMinLength(1)
                        .setMaxLength(80)
                )

                .addStringOption(option =>
                    option
                        .setName("avatar")
                        .setDescription("投稿者として表示する画像URL")
                        .setRequired(true)
                )

                .addStringOption(option =>
                    option
                        .setName("word")
                        .setDescription("投稿する文章")
                        .setRequired(true)
                        .setMaxLength(2000)
                )
        ),

    async execute(interaction) {
        // DMでは使用不可
        if (!interaction.guild) {
            return interaction.reply({
                content: "このコマンドはサーバー内でのみ使用できます。",
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        // =========================
        // 実在ユーザー版
        // =========================
        if (subcommand === "user") {
            const user = interaction.options.getUser("user", true);
            const word = interaction.options.getString("word", true);

            const member = await interaction.guild.members
                .fetch(user.id)
                .catch(() => null);

            if (!member) {
                return interaction.reply({
                    content: "そのユーザーはこのサーバーのメンバーではありません。",
                    ephemeral: true
                });
            }

            await interaction.deferReply({
                ephemeral: true
            });

            try {
                const webhook = await getWebhook(
                    interaction.channel,
                    interaction.client
                );

                const username =
                    member.displayName ??
                    member.user.globalName ??
                    member.user.username;

                const avatarURL = member.displayAvatarURL({
                    extension: "png",
                    size: 256
                });

                const sentMessage = await webhook.send({
                    username,
                    avatarURL,
                    content: word,
                    allowedMentions: {
                        parse: []
                    }
                });

                try {
                    recordUserme({
                        messageId: sentMessage.id,
                        authorId: interaction.user.id,
                        type: "user",
                        targetUserId: user.id,
                        targetName: username,
                        channelId: interaction.channel.id,
                        guildId: interaction.guild.id
                    });
                } catch (logError) {
                    console.error(
                        "[userme] ログ記録に失敗しました:",
                        logError
                    );
                }

                // 通知なしで終了
                return interaction.deleteReply();

            } catch (error) {
                console.error("[userme] 投稿エラー:", error);

                return interaction.editReply(
                    "投稿に失敗しました。Botに「Webhookの管理」権限があるか確認してください。"
                );
            }
        }

        // =========================
        // 完全カスタム版
        // =========================
        if (subcommand === "custom") {
            const name = interaction.options.getString("name", true);
            const avatar = interaction.options.getString("avatar", true);
            const word = interaction.options.getString("word", true);

            // URL確認
            if (!isValidUrl(avatar)) {
                return interaction.reply({
                    content:
                        "avatarには http:// または https:// から始まる有効な画像URLを指定してください。",
                    ephemeral: true
                });
            }

            await interaction.deferReply({
                ephemeral: true
            });

            try {
                const webhook = await getWebhook(
                    interaction.channel,
                    interaction.client
                );

                const sentMessage = await webhook.send({
                    username: name,
                    avatarURL: avatar,
                    content: word,
                    allowedMentions: {
                        parse: []
                    }
                });

                try {
                    recordUserme({
                        messageId: sentMessage.id,
                        authorId: interaction.user.id,
                        type: "custom",
                        targetUserId: null,
                        targetName: name,
                        avatarURL: avatar,
                        channelId: interaction.channel.id,
                        guildId: interaction.guild.id
                    });
                } catch (logError) {
                    console.error(
                        "[userme] カスタム投稿のログ記録に失敗しました:",
                        logError
                    );
                }

                // 「投稿しました」などは表示しない
                return interaction.deleteReply();

            } catch (error) {
                console.error("[userme] カスタム投稿エラー:", error);

                return interaction.editReply(
                    "投稿に失敗しました。画像URLがDiscordから取得可能か、またはBotに「Webhookの管理」権限があるか確認してください。"
                );
            }
        }
    }
};