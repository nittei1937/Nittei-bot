const { EmbedBuilder } = require("discord.js");
const { loadOres } = require("./market.js");

const COLOR = 0xd69e2e;
const BASE_ORE_ID = "iron";

/**
 * /rate info list 用
 * rate は「対象アイテム1個に必要な鉄の量」。
 */
function buildIronRateListEmbed() {
    const ores = loadOres();
    const ironInfo = ores[BASE_ORE_ID];

    if (!ironInfo || ironInfo.rate === undefined) {
        return new EmbedBuilder()
            .setTitle("⛏️ 鉱石交換レート")
            .setColor(COLOR)
            .setDescription("基準鉱石（iron）が data/rate.json に見つかりませんでした。");
    }

    const entries = Object.entries(ores)
        .filter(([id]) => id !== BASE_ORE_ID)
        .map(([id, ore]) => ({ id, ...ore, ironRequired: ore.rate }))
        .sort((a, b) => a.ironRequired - b.ironRequired);

    const embed = new EmbedBuilder()
        .setTitle(`${ironInfo.emoji} 鉄基準 交換レート一覧`)
        .setColor(COLOR)
        .setDescription(
            [
                "各アイテム1個を交換するのに必要な鉄の量です。",
                `基準：${ironInfo.emoji} **鉄インゴット 1個 = 鉄 1個**`
            ].join("\\n")
        );

    entries.forEach((entry) => {
        const amount = Number.isInteger(entry.ironRequired)
            ? entry.ironRequired
            : Number(entry.ironRequired.toFixed(8));
        embed.addFields({
            name: `${entry.emoji} ${entry.name}`,
            value: `${entry.name} 1個 ＝ **鉄 ${amount}個**`,
            inline: false
        });
    });

    embed.setFooter({
        text: "/rate set の value は「対象アイテム1個に必要な鉄の量」です。"
    });

    return embed;
}

module.exports = { buildIronRateListEmbed };
