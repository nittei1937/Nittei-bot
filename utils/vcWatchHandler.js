const { getWatch } = require("./vcWatch");

async function handleVoiceStateUpdate(oldState, newState) {
    // チャンネルの変化がない場合（ミュート/カメラON/OFFなど）は無視
    if (oldState.channelId === newState.channelId) return;

    // 何らかのVCに「入室」した時だけを対象にする（退出・移動元は対象外）
    if (!newState.channelId) return;

    const guildId = newState.guild.id;
    const userId = newState.id;

    const watch = getWatch(guildId, userId);
    if (!watch) return;

    const textChannel = await newState.guild.channels.fetch(watch.channelId).catch(() => null);
    if (!textChannel) return;

    const defaultMessage = `🔔 <@${userId}> が <#${newState.channelId}> に入室しました。`;

    const message = watch.message
        ? watch.message
            .replace(/\{user\}/g, `<@${userId}>`)
            .replace(/\{channel\}/g, `<#${newState.channelId}>`)
        : defaultMessage;

    textChannel.send(message).catch(error => {
        console.error("[vcWatch] 通知の送信に失敗しました。", error);
    });
}

module.exports = { handleVoiceStateUpdate };
