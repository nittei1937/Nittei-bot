const fs = require("fs");
const path = require("path");
const { SlashCommandBuilder, ChannelType } = require("discord.js");

const authorityPath = path.join(__dirname, "..", "data", "barusu", "authority.json");

// このコマンドを使える人だけを載せる専用リスト（authority.jsonのspeakUsersに自分のIDを追加してください）
function loadSpeakUsers() {
    try {
        const data = JSON.parse(fs.readFileSync(authorityPath, "utf8"));
        return data.speakUsers ?? [];
    } catch (error) {
        console.error("[say] authority.json の読み込みに失敗しました。", error);
        return [];
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("say")
        .setDescription("NitteiBotに好きな内容を喋らせる")
        .addStringOption(option =>
            option
                .setName("content")
                .setDescription("喋らせる内容")
                .setRequired(true)
                .setMaxLength(2000)
        )
        .addChannelOption(option =>
            option
                .setName("channel")
                .setDescription("投稿先チャンネル（省略時は今のチャンネル）")
                .addChannelTypes(ChannelType.GuildText)
        ),

    async execute(interaction) {
        const speakUsers = loadSpeakUsers();

        if (!speakUsers.includes(interaction.user.id)) {
            return interaction.reply({
                content: "このコマンドを使用する権限がありません。",
                ephemeral: true
            });
        }

        const content = interaction.options.getString("content", true);
        const channel = interaction.options.getChannel("channel") ?? interaction.channel;

        await interaction.deferReply({ ephemeral: true });

        try {
            await channel.send({
                content,
                allowedMentions: { parse: [] }
            });

            // 「投稿しました」等の通知は表示しない
            return interaction.deleteReply();

        } catch (error) {

            console.error("[say] 投稿エラー:", error);

            return interaction.editReply(
                "投稿に失敗しました。Botにそのチャンネルでの送信権限があるか確認してください。"
            );

        }
    }
};