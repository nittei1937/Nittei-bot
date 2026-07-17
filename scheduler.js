const { EmbedBuilder } = require("discord.js");
const { applyRandomFluctuation } = require("./utils/market.js");

const NOTABLE_CHANGE_THRESHOLD = 3; // この％以上動いた鉱石だけ通知に載せる

/**
 * 定期的に鉱石市場をランダム変動させるスケジューラーを開始する。
 * .envのMARKET_ANNOUNCE_CHANNEL_IDが設定されていれば、値動きが大きかった鉱石をそのチャンネルに通知する。
 */
function startMarketScheduler(client) {
    const intervalMinutes = Number(process.env.FLUCTUATION_INTERVAL_MINUTES) || 60;
    const announceChannelId = process.env.MARKET_ANNOUNCE_CHANNEL_ID;

    setInterval(async () => {
        let changes;
        try {
            changes = applyRandomFluctuation();
            console.log(`[市場] 定期変動を適用しました（対象 ${changes.length} 件）`);
        } catch (error) {
            console.error("[市場] 定期変動の適用中にエラーが発生しました:", error);
            return;
        }

        if (!announceChannelId) return;

        const notable = changes
            .filter((c) => Math.abs(c.percent) >= NOTABLE_CHANGE_THRESHOLD)
            .sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent));

        if (notable.length === 0) return;

        try {
            const channel = await client.channels.fetch(announceChannelId);
            if (!channel) return;

            const embed = new EmbedBuilder()
                .setTitle("📊 鉱石市場が変動しました")
                .setColor(0xecc94b)
                .setDescription(
                    notable
                        .map((c) => {
                            const arrow = c.percent >= 0 ? "📈" : "📉";
                            const sign = c.percent >= 0 ? "+" : "";
                            return `${arrow} ${c.emoji} **${c.name}**：${c.previousValue} → ${c.newValue} pt（${sign}${c.percent.toFixed(1)}%）`;
                        })
                        .join("\n")
                );

            await channel.send({ embeds: [embed] });
        } catch (error) {
            console.error("[市場] 変動通知の送信に失敗しました:", error);
        }
    }, intervalMinutes * 60 * 1000);

    console.log(`市場スケジューラーを開始しました（${intervalMinutes}分間隔で変動）`);
}

module.exports = { startMarketScheduler };
