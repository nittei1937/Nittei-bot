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
            { name: "人口", value: `${formatJapaneseNumber(nation.population)}人`, inline: true },
            { name: "GDP", value: `$${formatJapaneseNumber(nation.gdp)}`, inline: true },
            { name: "国防費", value: `$${formatJapaneseNumber(nation.military_budget)}`, inline: true },
            { name: "現役兵力", value: `${formatJapaneseNumber(nation.active_personnel)}人`, inline: true },
            { name: "予備役", value: `${formatJapaneseNumber(nation.reserve_personnel)}人`, inline: true },
            { name: "核兵器", value: nation.has_nuclear ? "保有" : "非保有", inline: true },
            { name: "保有戦車", value: `${formatJapaneseNumber(nation.tanks_count)}輌`, inline: true },
            { name: "保有艦艇", value: `${formatJapaneseNumber(nation.ships_count)}隻`, inline: true },
            { name: "保有航空機", value: `${formatJapaneseNumber(nation.aircraft_count)}機`, inline: true },
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

    const infon = entries.slice(0, 25);
    infon.forEach((nation) => {
        embed.addFields({
            name: `${nation.name}（${nation.id}）`,
            value: [
                `政体：${nation.government} ／ 首都：${nation.capital}`,
                `現役兵力：${formatJapaneseNumber(nation.active_personnel)}人 ／ 核兵器：${nation.has_nuclear ? "保有" : "非保有"}`
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
            value: `${nationA.name}：${formatValue(row.key, nationA[row.key])}\n${nationB.name}：${formatValue(row.key, nationB[row.key])}`,
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
 * /nation rank 用のランキングEmbedを作成する
 * @param {Array<object>} entries - toEntryArray()で取得した国家一覧
 * @param {string} statKey - ランキング対象のフィールド名（例: "gdp"）
 * @param {string} statLabel - 表示用ラベル（例: "GDP"）
 */
function buildNationRankEmbed(entries, statKey, statLabel) {
    const embed = new EmbedBuilder()
        .setTitle(`国家ランキング：${statLabel}`)
        .setColor(COLOR);

    if (entries.length === 0) {
        embed.setDescription("登録されている国家はありません。");
        return embed;
    }

    const sorted = [...entries].sort(
        (a, b) => Number(b[statKey]) - Number(a[statKey])
    );

    const infon = sorted.slice(0, 25);

    const lines = infon.map((nation, index) => {
        const medal =
            index === 0 ? "🥇" :
            index === 1 ? "🥈" :
            index === 2 ? "🥉" :
            `${index + 1}.`;

        let value = nation[statKey];

        switch (statKey) {
            case "population":
            case "active_personnel":
            case "reserve_personnel":
                value = `${formatJapaneseNumber(value)}人`;
                break;

            case "gdp":
            case "military_budget":
                value = `$${formatJapaneseNumber(value)}`;
                break;

            case "tanks_count":
                value = `${formatJapaneseNumber(value)}輌`;
                break;

            case "ships_count":
                value = `${formatJapaneseNumber(value)}隻`;
                break;

            case "aircraft_count":
                value = `${formatJapaneseNumber(value)}機`;
                break;

            default:
                value = String(value);
        }

        return `${medal} **${nation.name}**（${nation.id}） — ${value}`;
    });

    embed.setDescription(lines.join("\n"));

    if (sorted.length > 25) {
        embed.setFooter({
            text: `他 ${sorted.length - 25} 件は表示しきれませんでした。`,
        });
    }

    return embed;
}

/**
 * 数値を日本語表記へ変換
 *
 * 1234 → 1,234
 * 12000 → 1万2,000
 * 123456789 → 1億2,345万6,789
 */
function formatJapaneseNumber(value) {
    if (value == null) return "-";

    value = Number(value);

    if (Number.isNaN(value)) return "-";

    if (value < 10000) {
        return value.toLocaleString("ja-JP");
    }

    const units = [
        { value: 1000000000000, label: "兆" },
        { value: 100000000, label: "億" },
        { value: 10000, label: "万" },
    ];

    let result = "";
    let remain = value;

    for (const unit of units) {
        if (remain >= unit.value) {
            const num = Math.floor(remain / unit.value);
            result += `${num}${unit.label}`;
            remain %= unit.value;
        }
    }

    if (remain > 0) {
        result += remain.toLocaleString("ja-JP");
    }

    return result;
}
const formatValue = (key, value) => {
    switch (key) {
        case "population":
        case "active_personnel":
        case "reserve_personnel":
            return `${formatJapaneseNumber(value)}人`;

        case "gdp":
        case "military_budget":
            return `$${formatJapaneseNumber(value)}`;

        case "tanks_count":
            return `${formatJapaneseNumber(value)}輌`;

        case "ships_count":
            return `${formatJapaneseNumber(value)}隻`;

        case "aircraft_count":
            return `${formatJapaneseNumber(value)}機`;

        default:
            return value;
    }
};

module.exports = {
    toEntryArray,
    getNationById,
    searchNations,
    buildNationDashboardEmbed,
    buildNationListEmbed,
    buildNationCompareEmbed,
    buildNationRankEmbed,
    formatJapaneseNumber,
};
