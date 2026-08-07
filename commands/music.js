const { SlashCommandBuilder } = require("discord.js");
const { DisTube } = require("distube");
const { YouTubePlugin } = require("@distube/youtube");
const { SpotifyPlugin } = require("@distube/spotify");
const ffmpegPath = require("ffmpeg-static");

// =========================
// DisTube インスタンス（プロセス内で1つだけ生成する）
// =========================

let distube = null;

const LEAVE_DELAY_MS = 60 * 1000; // 曲が止まってからVCに居続ける時間
const STOP_VOTES_REQUIRED = 3; // リクエスト者以外がstopするのに必要な票数

const leaveTimers = new Map(); // guildId -> Timeout
const stopVotes = new Map(); // guildId -> Set<userId>

function cancelLeaveTimer(guildId) {
    const timer = leaveTimers.get(guildId);
    if (timer) {
        clearTimeout(timer);
        leaveTimers.delete(guildId);
    }
}

function scheduleLeave(guildId) {
    cancelLeaveTimer(guildId);

    const timer = setTimeout(() => {
        leaveTimers.delete(guildId);

        // タイマー中に新しい再生が始まっていなければ退出する
        if (distube && !distube.getQueue(guildId)) {
            distube.voices.leave(guildId);
        }
    }, LEAVE_DELAY_MS);

    leaveTimers.set(guildId, timer);
}

function getDisTube(client) {
    if (distube) return distube;

    distube = new DisTube(client, {
        emitNewSongOnly: true,
        ffmpeg: { path: ffmpegPath },
        plugins: [
            new YouTubePlugin(),
            new SpotifyPlugin(),
        ],
    });

    distube.on("playSong", (queue, song) => {
        cancelLeaveTimer(queue.id);
        stopVotes.delete(queue.id);

        const channel = queue.textChannel;
        if (!channel) return;

        const requester = song.user ? `<@${song.user.id}>` : "不明";
        channel
            .send(`▶️ 再生中： **${song.name}**（${song.formattedDuration}） - リクエスト: ${requester}`)
            .catch(() => {});
    });

    distube.on("deleteQueue", queue => {
        stopVotes.delete(queue.id);
        scheduleLeave(queue.id);
    });

    distube.on("error", (error, queue, song) => {
        console.error("[music] DisTubeエラー:", error);

        const channel = queue?.textChannel;
        if (!channel) return;

        const label = song?.name ? `「${song.name}」の` : "";
        channel.send(`⚠️ ${label}再生中にエラーが発生しました。`).catch(() => {});
    });

    return distube;
}

// =========================
// サブコマンドごとの処理
// =========================

async function handleJoin(interaction, distube) {
    const voiceChannel = interaction.member.voice?.channel;

    if (!voiceChannel) {
        return interaction.reply({
            content: "先にボイスチャンネルに入ってから実行してください。",
            ephemeral: true,
        });
    }

    try {
        await distube.voices.join(voiceChannel);
        cancelLeaveTimer(interaction.guildId);
        return interaction.reply(`🔊 ${voiceChannel.name} に接続しました。`);
    } catch (error) {
        console.error("[music] join エラー:", error);
        return interaction.reply({
            content: "ボイスチャンネルへの接続に失敗しました。",
            ephemeral: true,
        });
    }
}

async function handleStart(interaction, distube) {
    const voiceChannel = interaction.member.voice?.channel;
    const url = interaction.options.getString("url", true);

    if (!voiceChannel) {
        return interaction.reply({
            content: "先にボイスチャンネルに入ってから実行してください。",
            ephemeral: true,
        });
    }

    await interaction.deferReply();

    try {
        await distube.play(voiceChannel, url, {
            member: interaction.member,
            textChannel: interaction.channel,
        });
        return interaction.editReply(`🎵 キューに追加しました： ${url}`);
    } catch (error) {
        console.error("[music] start エラー:", error);
        return interaction.editReply("再生に失敗しました。URLや検索ワードを確認してください。");
    }
}

async function handleStop(interaction, distube) {
    const queue = distube.getQueue(interaction.guildId);

    if (!queue) {
        return interaction.reply({
            content: "現在再生中の曲はありません。",
            ephemeral: true,
        });
    }

    const requesterId = queue.songs[0]?.user?.id;
    const userId = interaction.user.id;

    // リクエストした本人は即座に停止できる
    if (requesterId && requesterId === userId) {
        stopVotes.delete(interaction.guildId);
        await queue.stop();
        return interaction.reply("⏹️ 停止しました。");
    }

    let votes = stopVotes.get(interaction.guildId);
    if (!votes) {
        votes = new Set();
        stopVotes.set(interaction.guildId, votes);
    }

    if (votes.has(userId)) {
        return interaction.reply({
            content: `すでに投票済みです。（現在 ${votes.size}/${STOP_VOTES_REQUIRED} 票）`,
            ephemeral: true,
        });
    }

    votes.add(userId);

    if (votes.size >= STOP_VOTES_REQUIRED) {
        stopVotes.delete(interaction.guildId);
        await queue.stop();
        return interaction.reply("⏹️ 投票により停止しました。");
    }

    return interaction.reply(
        `🗳️ 停止に投票しました。（${votes.size}/${STOP_VOTES_REQUIRED} 票、あと${STOP_VOTES_REQUIRED - votes.size}票で停止します）`
    );
}

async function handleTodayEnd(interaction, distube) {
    const voiceChannel = interaction.member.voice?.channel;

    if (!voiceChannel) {
        return interaction.reply({
            content: "先にボイスチャンネルに入ってから実行してください。",
            ephemeral: true,
        });
    }

    await interaction.deferReply();

    try {
        await distube.play(voiceChannel, "蛍の光 オルゴール", {
            member: interaction.member,
            textChannel: interaction.channel,
        });
        return interaction.editReply("🌙 本日の営業は終了しました。またのご利用をお待ちしております。");
    } catch (error) {
        console.error("[music] todayend エラー:", error);
        return interaction.editReply("再生に失敗しました。");
    }
}

async function handleLeave(interaction, distube) {
    const voice = distube.voices.get(interaction.guildId);

    if (!voice) {
        return interaction.reply({
            content: "ボイスチャンネルに接続していません。",
            ephemeral: true,
        });
    }

    const queue = distube.getQueue(interaction.guildId);
    if (queue) await queue.stop();

    cancelLeaveTimer(interaction.guildId);
    stopVotes.delete(interaction.guildId);
    distube.voices.leave(interaction.guildId);

    return interaction.reply("👋 ボイスチャンネルから退出しました。");
}

// =========================
// コマンド定義
// =========================

module.exports = {
    data: new SlashCommandBuilder()
        .setName("m")
        .setDescription("VCでの音楽再生")
        .addSubcommand(sub =>
            sub.setName("join").setDescription("ボイスチャンネルに参加")
        )
        .addSubcommand(sub =>
            sub
                .setName("start")
                .setDescription("曲を再生")
                .addStringOption(option =>
                    option
                        .setName("url")
                        .setDescription("YouTube / Spotify のURL、または検索ワード")
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName("stop").setDescription("再生を停止（リクエスト者以外は3票で停止）")
        )
        .addSubcommand(sub =>
            sub.setName("todayend").setDescription("本日の営業終了（蛍の光を再生）")
        )
        .addSubcommand(sub =>
            sub.setName("leave").setDescription("ボイスチャンネルから退出")
        ),

    execute: async interaction => {
        const distube = getDisTube(interaction.client);
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case "join":
                return handleJoin(interaction, distube);
            case "start":
                return handleStart(interaction, distube);
            case "stop":
                return handleStop(interaction, distube);
            case "todayend":
                return handleTodayEnd(interaction, distube);
            case "leave":
                return handleLeave(interaction, distube);
            default:
                return interaction.reply({
                    content: "不明なサブコマンドです。",
                    ephemeral: true,
                });
        }
    },
};
