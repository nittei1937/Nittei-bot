const { getWatch } = require("./vcWatch");

async function handleVoiceStateUpdate(oldState, newState) {
    // チャンネルの変化がない場合
    // ミュート・カメラON/OFFなどは無視
    if (oldState.channelId === newState.channelId) return;

    // VCから退出した場合は無視
    if (!newState.channelId) return;

    const guildId = newState.guild.id;
    const userId = newState.id;

    const watch = getWatch(guildId, userId);

    // 監視対象として登録されていない
    if (!watch) return;

    // 特定のVCだけ監視する設定の場合
    if (
        watch.voiceChannelId &&
        watch.voiceChannelId !== newState.channelId
    ) {
        return;
    }

    // 通知先チャンネルを取得
    const textChannel = await newState.guild.channels
        .fetch(watch.channelId)
        .catch(() => null);

    if (!textChannel) {
        console.warn(
            `[vcWatch] 通知先チャンネルを取得できませんでした: ${watch.channelId}`
        );
        return;
    }

    const defaultMessage =
        `🔔 <@${userId}> が <#${newState.channelId}> に入室しました。`;

    const message = watch.message
        ? watch.message
            .replace(/\{user\}/g, `<@${userId}>`)
            .replace(/\{channel\}/g, `<#${newState.channelId}>`)
        : defaultMessage;

    await textChannel.send(message).catch(error => {
        console.error("[vcWatch] 通知の送信に失敗しました。");
        console.error(error);
    });
}

module.exports = {
    handleVoiceStateUpdate
};