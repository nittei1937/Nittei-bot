const { getWatch } = require("./vcWatch");

async function handleVoiceStateUpdate(oldState, newState) {
    // VCが変わっていない場合は無視
    // ミュート・カメラON/OFFなども無視
    if (oldState.channelId === newState.channelId) return;

    // VCから退出した場合は無視
    if (!newState.channelId) return;

    const guildId = newState.guild.id;
    const userId = newState.id;

    console.log(
        `[vcWatch] VC移動検知: user=${userId} channel=${newState.channelId}`
    );

    const watch = getWatch(guildId, userId);

    // 監視対象として登録されていない
    if (!watch) {
        console.log(
            `[vcWatch] 監視対象ではありません: ${userId}`
        );
        return;
    }

    // 特定のVCだけ監視する設定
    if (
        watch.voiceChannelId &&
        String(watch.voiceChannelId) !== String(newState.channelId)
    ) {
        console.log(
            `[vcWatch] 対象VCではありません: ` +
            `設定=${watch.voiceChannelId} / 入室=${newState.channelId}`
        );
        return;
    }

    // 通知先チャンネルを取得
    const textChannel = await newState.guild.channels
        .fetch(String(watch.channelId))
        .catch(error => {
            console.error(
                `[vcWatch] 通知先チャンネルの取得に失敗: ${watch.channelId}`
            );
            console.error(error);
            return null;
        });

    if (!textChannel) {
        console.warn(
            `[vcWatch] 通知先チャンネルを取得できませんでした: ${watch.channelId}`
        );
        return;
    }

    const defaultMessage =
        `🔔 <@${userId}> が <#${newState.channelId}> に入室しました。`;

    const message = watch.message
        ? String(watch.message)
            .replace(/\{user\}/g, `<@${userId}>`)
            .replace(/\{channel\}/g, `<#${newState.channelId}>`)
        : defaultMessage;

    try {
        await textChannel.send(message);

        console.log(
            `[vcWatch] 通知送信成功: ${userId} -> ${watch.channelId}`
        );
    } catch (error) {
        console.error(
            `[vcWatch] 通知の送信に失敗しました。`
        );
        console.error(error);
    }
}

module.exports = {
    handleVoiceStateUpdate
};