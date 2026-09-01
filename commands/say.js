const fs = require("fs");
const path = require("path");
const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { isRestrictionEnabled, setRestrictionEnabled } = require("../utils/saySettings");

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

function isSpeakUser(interaction) {
    return loadSpeakUsers().includes(interaction.user.id);
}

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
        )
        .addSubcommand(sub =>
            sub
                .setName("restriction")
                .setDescription("send の使用制限（自分だけ／誰でも）を切り替える")
                .addStringOption(option =>
                    option
                        .setName("action")
                        .setDescription("操作")
                        .setRequired(true)
                        .addChoices(
                            { name: "on（自分だけ使える）", value: "on" },
                            { name: "off（誰でも使える）", value: "off" },
                            { name: "status（今の設定を確認）", value: "status" }
                        )
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // restrictionの切り替え自体は常にspeakUsers限定
        // （制限offの状態でも、誰でも切り替えられてしまわないようにするため）
        if (subcommand === "restriction") {
            if (!isSpeakUser(interaction)) {
                return interaction.reply({
                    content: "このコマンドを使用する権限がありません。",
                    ephemeral: true
                });
            }

            const action = interaction.options.getString("action", true);

            if (action === "status") {
                const enabled = isRestrictionEnabled();
                return interaction.reply({
                    content: `現在 \`/say send\` は **${enabled ? "自分だけ使える状態" : "誰でも使える状態"}** です。`,
                    ephemeral: true
                });
            }

            const enabled = action === "on";
            setRestrictionEnabled(enabled);

            return interaction.reply({
                content: `🔧 \`/say send\` を **${enabled ? "自分だけ使える" : "誰でも使える"}** ように設定しました。`,
                ephemeral: true
            });
        }

        // ---------- send ----------

        const restricted = isRestrictionEnabled();

        if (restricted && !isSpeakUser(interaction)) {
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
