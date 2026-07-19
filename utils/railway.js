const { EmbedBuilder } = require("discord.js");

// 各カテゴリごとの表示設定（路線/車両/鉄道会社でフィールドの意味が変わる部分）
const CATEGORY_CONFIGS = {
    lines: {
        label: "路線",
        color: 0x3182ce,
        fields: [
            { key: "company", label: "運営会社", refCategory: "companies" },
            { key: "opened", label: "開業" },
            { key: "status", label: "運行状況" },
            { key: "length_km", label: "営業距離" },
            { key: "stations_count", label: "駅数" },
        ],
    },
    cars: {
        label: "車両",
        color: 0x319795,
        fields: [
            { key: "operator", label: "運用会社", refCategory: "companies" },
            { key: "introduced", label: "登場" },
            { key: "status", label: "状態" },
            { key: "max_speed", label: "最高速度" },
            { key: "capacity", label: "定員" },
        ],
    },
    companies: {
        label: "鉄道会社",
        color: 0x805ad5,
        fields: [
            { key: "founded", label: "設立" },
            { key: "headquarters", label: "本社" },
            { key: "lines_operated", label: "運営路線", isArray: true, refCategory: "lines" },
        ],
    },
};

/**
 * データ(辞書形式)を配列に変換して返す。各要素にidを付与する。
 */
function toEntryArray(data) {
    return Object.entries(data).map(([id, value]) => ({ id, ...value }));
}

/**
 * 指定した種別(type)で絞り込む
 */
function filterByType(data, type) {
    return toEntryArray(data).filter((entry) => entry.type === type);
}

/**
 * IDから単一のエントリを取得する
 */
function getEntryById(data, id) {
    if (!data[id]) return null;
    return { id, ...data[id] };
}

/**
 * 他カテゴリのIDを名前に変換する（見つからなければIDのまま表示）
 * 例: 会社IDが入っている「運営会社」欄を会社名に変換する
 */
function resolveRefName(refData, id) {
    if (!refData || !refData[id]) return id;
    return refData[id].name;
}

/**
 * /railway <group> show 用のEmbedを作成する
 * @param {object} entry - getEntryByIdで取得したエントリ
 * @param {"lines"|"cars"|"companies"} category
 * @param {object} allData - { lines, cars, companies } 他カテゴリ参照解決用
 */
function buildInfoEmbed(entry, category, allData) {
    const config = CATEGORY_CONFIGS[category];

    const embed = new EmbedBuilder()
        .setTitle(`${entry.name}（${entry.id}）`)
        .setColor(config.color)
        .setDescription(`種別：${entry.type_name}(${entry.type})`);

    config.fields.forEach(({ key, label, isArray, refCategory }) => {
        const rawValue = entry[key];
        if (rawValue === undefined || rawValue === null) return;

        let displayValue;
        if (isArray) {
            const list = Array.isArray(rawValue) ? rawValue : [rawValue];
            displayValue = refCategory
                ? list.map((v) => resolveRefName(allData[refCategory], v)).join("、")
                : list.join("、");
        } else {
            displayValue = refCategory ? resolveRefName(allData[refCategory], rawValue) : String(rawValue);
        }

        embed.addFields({ name: label, value: displayValue || "不明", inline: true });
    });

    if (entry.notes) {
        embed.addFields({ name: "備考", value: entry.notes, inline: false });
    }

    return embed;
}

/**
 * /railway <group> list 用の一覧Embedを作成する（最大25件まで表示）
 */
function buildListEmbed({ title, category, entries, emptyMessage }) {
    const config = CATEGORY_CONFIGS[category];
    const embed = new EmbedBuilder().setTitle(title).setColor(config.color);

    if (entries.length === 0) {
        embed.setDescription(emptyMessage);
        return embed;
    }

    const shown = entries.slice(0, 25);
    shown.forEach((entry) => {
        embed.addFields({
            name: `${entry.name}（${entry.id}）`,
            value: `種別：${entry.type_name}(${entry.type})${entry.status ? ` ／ 状態：${entry.status}` : ""}`,
        });
    });

    if (entries.length > 25) {
        embed.setFooter({ text: `他 ${entries.length - 25} 件は表示しきれませんでした。` });
    }

    return embed;
}

module.exports = {
    CATEGORY_CONFIGS,
    toEntryArray,
    filterByType,
    getEntryById,
    buildInfoEmbed,
    buildListEmbed,
};
