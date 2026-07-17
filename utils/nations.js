const { EmbedBuilder } = require("discord.js");

const COLOR = 0x805ad5;

/**
 * データ(辞書形式)を配列に変換して返す。各要素にidを付与する。
 */
function toEntryArray(data) {
    return Object.entries(data).map(([id, value]) => ({ id, ...value }));
}

/**
 * IDから単一の国家データを取得する
 */
function getNationById(data, id) {
    if (!data[id]) return null;
    return { id, ...data[id] };
}

/**
 * 国名・首都・IDにキーワードが部分一致するものを検索する
 */
function searchNations(data, keyword) {
    const lower = keyword.toLowerCase();
    return toEntryArray(data).filter((entry) => {
        return (
            entry.id.toLowerCase().includes(lower) ||
            entry.name.toLowerCase().includes(lower) ||
            (entry.capital && entry.capital.toLowerCase().includes(lower))
        );
    });
}

/**
 * 同盟国のIDを国名に変換する（見つからなければIDのまま表示）
 */
function resolveAllyNames(data, allyIds) {
    if (!allyIds || allyIds.length === 0) return "なし";
    return allyIds
        .map((id) => (data[id] ? data[id].name : id))
        .join("、");
}

/**
 * /nation info 用のダッシュボードEmbedを作成する
 */
function buildNationDashboardEmbed(nation, data) {
    const embed = new EmbedBuilder()
        .setTitle(`${nation.name}（${nation.id}）`)
        .setColor(COLOR)
        .setDescription(
            [
                `政体：${nation.government}`,
                `首都：${nation.capital}`,
                `建国：${nation.founded}`,
                `国土面積：${nation.area}`,
            ].join("\n")
        )
        .addFields(
            { name: "人口", value: nation.population, inline: true },
            { name: "GDP", value: nation.gdp, inline: true },
            { name: "国防費", value: nation.military_budget, inline: true },
            { name: "現役兵力", value: nation.active_personnel, inline: true },
            { name: "予備役", value: nation.reserve_personnel, inline: true },
            { name: "核兵器", value: nation.has_nuclear ? "保有" : "非保有", inline: true },
            { name: "保有戦車", value: nation.tanks_count, inline: true },
            { name: "保有艦艇", value: nation.ships_count, inline: true },
            { name: "保有航空機", value: nation.aircraft_count, inline: true },
            { name: "同盟国", value: resolveAllyNames(data, nation.allies), inline: false }
        );

    if (nation.notes) {
        embed.addFields({ name: "備考", value: nation.notes, inline: false });
    }

    return embed;
}

/**
 * /nation list 用の一覧Embedを作成する（最大25件まで表示）
 */
function buildNationListEmbed(entries) {
    const embed = new EmbedBuilder().setTitle("空想国家一覧").setColor(COLOR);

    if (entries.length === 0) {
        embed.setDescription("登録されている国家はありません。");
        return embed;
    }

    const shown = entries.slice(0, 25);
    shown.forEach((nation) => {
        embed.addFields({
            name: `${nation.name}（${nation.id}）`,
            value: [
                `政体：${nation.government} ／ 首都：${nation.capital}`,
                `現役兵力：${nation.active_personnel} ／ 核兵器：${nation.has_nuclear ? "保有" : "非保有"}`,
            ].join("\n"),
        });
    });

    if (entries.length > 25) {
        embed.setFooter({ text: `他 ${entries.length - 25} 件は表示しきれませんでした。` });
    }

    return embed;
}

/**
 * /nation compare 用の比較Embedを作成する
 */
function buildNationCompareEmbed(nationA, nationB) {
    const embed = new EmbedBuilder()
        .setTitle(`${nationA.name} 🆚 ${nationB.name}`)
        .setColor(COLOR);

    const rows = [
        { label: "政体", key: "government" },
        { label: "首都", key: "capital" },
        { label: "人口", key: "population" },
        { label: "GDP", key: "gdp" },
        { label: "国防費", key: "military_budget" },
        { label: "現役兵力", key: "active_personnel" },
        { label: "予備役", key: "reserve_personnel" },
        { label: "保有戦車", key: "tanks_count" },
        { label: "保有艦艇", key: "ships_count" },
        { label: "保有航空機", key: "aircraft_count" },
    ];

    rows.forEach((row) => {
        embed.addFields({
            name: row.label,
            value: `${nationA.name}：${nationA[row.key]}\n${nationB.name}：${nationB[row.key]}`,
            inline: true,
        });
    });

    embed.addFields({
        name: "核兵器保有",
        value: `${nationA.name}：${nationA.has_nuclear ? "保有" : "非保有"}\n${nationB.name}：${nationB.has_nuclear ? "保有" : "非保有"}`,
        inline: true,
    });

    return embed;
}

/**
 * "3,200万人" "1兆2,000億ドル" のような日本語の単位付き数値文字列を
 * ランキング比較用のおおよその数値に変換する。
 * 厳密な計算用途ではなく、並び替えの大小比較にのみ使用する。
 */
function parseMagnitude(str) {
    if (!str) return 0;

    const cleaned = String(str).replace(/,/g, "");
    const unitMultipliers = { 兆: 1e12, 億: 1e8, 万: 1e4 };
    const regex = /([0-9]+(?:\.[0-9]+)?)(兆|億|万)?/g;

    let total = 0;
    let match;

    while ((match = regex.exec(cleaned)) !== null) {
        const num = parseFloat(match[1]);
        const unit = match[2];
        total += unit ? num * unitMultipliers[unit] : num;
    }

    return total;
}

/**
 * /nation rank 用のランキングEmbedを作成する
 * @param {Array<object>} entries - toEntryArray()で取得した国家一覧
 * @param {string} statKey - ランキング対象のフィールド名（例: "gdp"）
 * @param {string} statLabel - 表示用ラベル（例: "GDP"）
 */
function buildNationRankEmbed(entries, statKey, statLabel) {
    const embed = new EmbedBuilder().setTitle(`国家ランキング：${statLabel}`).setColor(COLOR);

    if (entries.length === 0) {
        embed.setDescription("登録されている国家はありません。");
        return embed;
    }

    const sorted = [...entries].sort(
        (a, b) => parseMagnitude(b[statKey]) - parseMagnitude(a[statKey])
    );

    const shown = sorted.slice(0, 25);
    const lines = shown.map((nation, index) => {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
        return `${medal} **${nation.name}**（${nation.id}） — ${nation[statKey]}`;
    });

    embed.setDescription(lines.join("\n"));

    if (sorted.length > 25) {
        embed.setFooter({ text: `他 ${sorted.length - 25} 件は表示しきれませんでした。` });
    }

    return embed;
}

module.exports = {
    toEntryArray,
    getNationById,
    searchNations,
    buildNationDashboardEmbed,
    buildNationListEmbed,
    buildNationCompareEmbed,
    buildNationRankEmbed,
};
