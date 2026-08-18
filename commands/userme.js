const { SlashCommandBuilder } = require("discord.js");
const { recordUserme } = require("../utils/usermeLog");

const WEBHOOK_NAME = "UserMeBot";

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

module.exports = {
    data: new SlashCommandBuilder()
        .setName("userme")
        .setDescription("選択したユーザーとして文章を投稿")
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
        ),

    async execute(interaction) {
        if (!interaction.guild) {
            return interaction.reply({
                content: "このコマンドはサーバー内でのみ使用できます。",
                ephemeral: true
            });
        }

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

        await interaction.deferReply({ ephemeral: true });

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

            recordUserme({
                messageId: sentMessage.id,
                authorId: interaction.user.id,
                targetUserId: user.id,
                channelId: interaction.channel.id,
                guildId: interaction.guild.id,
            });

            // 「投稿しました」等の通知は表示しない
            return interaction.deleteReply();

        } catch (error) {
            console.error("[userme] 投稿エラー:", error);

            return interaction.editReply(
                "投稿に失敗しました。Botに「Webhookの管理」権限があるか確認してください。"
            );
        }
    }
};