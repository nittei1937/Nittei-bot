const { EmbedBuilder } = require("discord.js");
const { loadOres, loadState, findValueNear } = require("./market.js");

const COLOR = 0xd69e2e;
const DAY_MS = 24 * 60 * 60 * 1000;
const BASE_ORE_ID = "gold"; // /rate info list の基準にする鉱石

/**
 * 24時間前と比較した変化率(%)を計算する。履歴が足りない場合はnullを返す。
 */
function get24hChangePercent(oreId) {
    const state = loadState();
    const history = state.history[oreId] || [];
    if (history.length < 2) return null;

    const currentValue = state.rates[oreId];
    const pastValue = findValueNear(history, Date.now() - DAY_MS);
    if (!pastValue) return null;

    return ((currentValue - pastValue) / pastValue) * 100;
}

function formatChangeText(percent) {
    if (percent === null) return "（データ不足）";
    const arrow = percent > 0 ? "📈" : percent < 0 ? "📉" : "➡️";
    const sign = percent >= 0 ? "+" : "";
    return `${arrow} ${sign}${percent.toFixed(1)}%`;
}

/**
 * /rate info list 用のEmbedを作成する。
 * 金インゴット1個を基準に、それが他の各鉱石何個分に相当するかを一覧表示する。
 */
function buildGoldRateListEmbed() {
    const ores = loadOres();
    const state = loadState();

    const goldInfo = ores[BASE_ORE_ID];
    const goldValue = state.rates[BASE_ORE_ID];

    if (!goldInfo || goldValue === undefined) {
        const embed = new EmbedBuilder().setTitle("⛏️ 鉱石為替レート").setColor(COLOR);
        embed.setDescription("基準鉱石（gold）が data/ores.json に見つかりませんでした。");
        return embed;
    }

    const entries = Object.entries(ores)
        .filter(([id]) => id !== BASE_ORE_ID)
        .map(([id, ore]) => ({
            id,
            ...ore,
            value: state.rates[id],
            rateFromGold: state.rates[id],
            change: get24hChangePercent(id),
        }))
        .sort((a, b) => b.value - a.value);

    const embed = new EmbedBuilder()
        .setTitle(`${goldInfo.emoji} 金基準 為替レート一覧`)
        .setColor(COLOR)
        .setDescription(
            [
                `基準：${goldInfo.emoji} **${goldInfo.name}** 1個`,
                "金1個と交換できる各鉱石の数量です。",
            ].join("\n")
        );
    entries.forEach((entry) => {
        embed.addFields({
            name: `${entry.emoji} ${entry.name}`,
            value: `1金 ＝ **${entry.rateFromGold.toFixed(2)}** 個\n24時間変化：${formatChangeText(entry.change)}`,
            inline: false,
        });
    });

    embed.setFooter({ text: "/rate info history で相場推移を確認できます。" });

    return embed;
}

/**
 * /rate info history 用のQuickChart画像URLを生成する
 */
function buildHistoryChartUrl(oreInfo, points) {
    const labels = points.map((p) =>
        new Date(p.t).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
    );
    const values = points.map((p) => p.v);

    const chartConfig = {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: `${oreInfo.name}（pt）`,
                    data: values,
                    fill: false,
                    borderColor: "rgb(214, 158, 46)",
                    tension: 0.2,
                    pointRadius: 2,
                },
            ],
        },
        options: {
            plugins: { legend: { display: true } },
        },
    };

    const encoded = encodeURIComponent(JSON.stringify(chartConfig));
    return `https://quickchart.io/chart?width=700&height=350&backgroundColor=white&c=${encoded}`;
}

/**
 * /rate info history 用のEmbedを作成する
 */
function buildHistoryEmbed(oreInfo, points) {
    const embed = new EmbedBuilder()
        .setTitle(`${oreInfo.emoji} ${oreInfo.name} の相場推移`)
        .setColor(COLOR)
        .setDescription(`直近${points.length}件のデータを表示しています。`)
        .setImage(buildHistoryChartUrl(oreInfo, points));

    return embed;
}

module.exports = {
    BASE_ORE_ID,
    get24hChangePercent,
    buildGoldRateListEmbed,
    buildHistoryChartUrl,
    buildHistoryEmbed,
};