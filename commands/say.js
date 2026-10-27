// commands/say.js

const {
    SlashCommandBuilder,
    ChannelType,
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("say")
        .setDescription("NitteiBotに好きな内容を喋らせる")
        .addSubcommand(sub =>
            sub
                .setName("send")
                .setDescription("指定した内容をNitteiBotとして投稿する")
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
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand !== "send") {
            return interaction.reply({
                content: "不明なサブコマンドです。",
                ephemeral: true,
            });
        }

        const content = interaction.options.getString("content", true);
        const channel =
            interaction.options.getChannel("channel") ??
            interaction.channel;

        if (!channel || !channel.isTextBased() || !channel.send) {
            return interaction.reply({
                content: "投稿先チャンネルが無効です。",
                ephemeral: true,
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            await channel.send({
                content,
                // 意図しないメンション通知を防止
                allowedMentions: {
                    parse: [],
                },
            });

            // 投稿完了メッセージは表示しない
            return interaction.deleteReply();
        } catch (error) {
            console.error("[say] 投稿エラー:", error);

            return interaction.editReply(
                "投稿に失敗しました。Botにそのチャンネルでの送信権限があるか確認してください。"
            );
        }
    },
};