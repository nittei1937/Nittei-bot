const { EmbedBuilder } = require("discord.js");
const {
    loadOres,
    getRate
} = require("./market.js");

const COLOR = 0xd69e2e;
const BASE_ORE_ID = "iron";

/**
 * /rate info list 用
 */
function buildIronRateListEmbed() {
    const ores = loadOres();

    const ironInfo = ores[BASE_ORE_ID];
    const ironValue = getRate(BASE_ORE_ID);

    if (!ironInfo || ironValue === undefined) {
        return new EmbedBuilder()
            .setTitle("⛏️ 鉱石為替レート")
            .setColor(COLOR)
            .setDescription("基準鉱石（iron）が data/rate.json に見つかりませんでした。");
    }

    const entries = Object.entries(ores)
        .filter(([id]) => id !== BASE_ORE_ID)
        .map(([id, ore]) => ({
            id,
            ...ore,
            rateFromIron: ore.rate
        }))
        .sort((a, b) => b.rateFromIron - a.rateFromIron);

    const embed = new EmbedBuilder()
        .setTitle(`${ironInfo.emoji} 鉄基準 為替レート一覧`)
        .setColor(COLOR)
        .setDescription(
            [
                `基準：${ironInfo.emoji} **${ironInfo.name}** 1個`,
                "鉄1個と交換できる各アイテムの数量です。"
            ].join("\n")
        );

    entries.forEach((entry) => {
        embed.addFields({
            name: `${entry.emoji} ${entry.name}`,
            value: `1鉄 ＝ **${entry.rateFromIron}** 個`,
            inline: false
        });
    });

    embed.setFooter({
        text: "/rate set で管理者がレートを変更できます。"
    });

    return embed;
}

module.exports = {
    buildIronRateListEmbed
};