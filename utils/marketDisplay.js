const { EmbedBuilder } = require("discord.js");
const {
    loadOres,
    getRate
} = require("./market.js");

const COLOR = 0xd69e2e;
const BASE_ORE_ID = "gold";

/**
 * /rate info list 用
 */
function buildGoldRateListEmbed() {
    const ores = loadOres();

    const goldInfo = ores[BASE_ORE_ID];
    const goldValue = getRate(BASE_ORE_ID);

    if (!goldInfo || goldValue === undefined) {
        return new EmbedBuilder()
            .setTitle("⛏️ 鉱石為替レート")
            .setColor(COLOR)
            .setDescription("基準鉱石（gold）が data/ores.json に見つかりませんでした。");
    }

    const entries = Object.entries(ores)
        .filter(([id]) => id !== BASE_ORE_ID)
        .map(([id, ore]) => ({
            id,
            ...ore,
            rateFromGold: ore.gold_rate
        }))
        .sort((a, b) => b.rateFromGold - a.rateFromGold);

    const embed = new EmbedBuilder()
        .setTitle(`${goldInfo.emoji} 金基準 為替レート一覧`)
        .setColor(COLOR)
        .setDescription(
            [
                `基準：${goldInfo.emoji} **${goldInfo.name}** 1個`,
                "金1個と交換できる各鉱石の数量です。"
            ].join("\n")
        );

    entries.forEach((entry) => {
        embed.addFields({
            name: `${entry.emoji} ${entry.name}`,
            value: `1金 ＝ **${entry.rateFromGold}** 個`,
            inline: false
        });
    });

    embed.setFooter({
        text: "/rate set で管理者がレートを変更できます。"
    });

    return embed;
}

module.exports = {
    buildGoldRateListEmbed
};