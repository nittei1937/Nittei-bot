const { EmbedBuilder } = require("discord.js");

// 各カテゴリごとのラベル定義（艦艇/戦車/航空機で「艦級」「車級」等の呼び方が変わる部分）
const CATEGORY_CONFIGS = {
    ships: {
        label: "艦艇",
        classLabel: "艦級",
        typeLabel: "艦種",
        countryLabel: "建造国",
        builderLabel: "建造所",
        weightLabel: "排水量",
        color: 0x2b6cb0,
    },
    tanks: {
        label: "陸上兵器",
        classLabel: "車級",
        typeLabel: "車種",
        countryLabel: "製造国",
        builderLabel: "製造所",
        weightLabel: "重量",
        color: 0x744210,
    },
    airplanes: {
        label: "航空機",
        classLabel: "機級",
        typeLabel: "機種",
        countryLabel: "製造国",
        builderLabel: "製造所",
        weightLabel: "重量",
        color: 0x276749,
    },
};

const HEADER_LINE = "━".repeat(20);
const LABEL_WIDTH = 5; // ラベル部分の全角換算幅（この幅になるよう「　」でパディングする）

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
 * ラベルを固定幅になるよう全角スペースでパディングし「：」を付ける
 * 例: padLabel("艦級") -> "艦級　　　："
 */
function padLabel(label) {
    const pad = Math.max(0, LABEL_WIDTH - label.length);
    return label + "　".repeat(pad) + "：";
}

/**
 * /info 用の整形済みテキストを組み立てる（Embedのdescriptionに使う本文部分）
 * タイトル(艦名)・上下の罫線はEmbed側のtitle/カード枠が担うため、本文には含めない。
 * @param {object} entry - getEntryByIdで取得したエントリ
 * @param {"ships"|"tanks"|"airplanes"} category
 */
function buildInfoBody(entry, category) {
    const config = CATEGORY_CONFIGS[category];

    const lines = [];

    lines.push("【基本情報】");
    lines.push(padLabel(config.classLabel) + entry.class);
    lines.push(padLabel(config.typeLabel) + `${entry.type_name}(${entry.type})`);
    lines.push(padLabel(config.countryLabel) + entry.country_built);
    lines.push(padLabel("運用国") + entry.country_operator);
    lines.push(padLabel(config.builderLabel) + entry.builder);
    lines.push(padLabel("就役") + entry.commissioned);
    lines.push(padLabel("退役") + entry.decommissioned);
    lines.push(padLabel("状態") + entry.status);
    lines.push(padLabel("愛称") + entry.nickname);

    lines.push("");
    lines.push("【諸元】");
    lines.push(padLabel(config.weightLabel) + entry.weight);
    lines.push(padLabel("全長") + entry.length);
    lines.push(padLabel("全幅") + entry.width);
    lines.push(padLabel("馬力") + entry.power);
    lines.push(padLabel("速力") + entry.speed);
    lines.push(padLabel("航続距離") + entry.range);
    lines.push(padLabel("乗員") + entry.crew);

    lines.push("");
    lines.push("【兵装】");
    (entry.armament || []).forEach((item) => lines.push(`・${item}`));

    lines.push("");
    lines.push("【備考】");
    lines.push(entry.notes || "特になし");

    return lines.join("\n");
}

/**
 * /info 用のEmbedを組み立てる。
 * タイトル部分に艦名＋ID、左の色帯はカテゴリごとの色、本文はbuildInfoBody()のテキストをそのまま使う。
 * @param {object} entry - getEntryByIdで取得したエントリ
 * @param {"ships"|"tanks"|"airplanes"} category
 */
function buildInfoEmbed(entry, category) {
    const config = CATEGORY_CONFIGS[category];

    return new EmbedBuilder()
        .setTitle(`${entry.name}（${entry.id}）`)
        .setColor(config.color)
        .setDescription(buildInfoBody(entry, category));
}

/**
 * list 用の一覧Embedを作成する（最大25件まで表示）
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
        const nicknamePart =
            entry.nickname && entry.nickname !== "特になし"
                ? `（${entry.nickname}）`
                : "";

        embed.addFields({
            name: `${entry.name}${nicknamePart}`,
            value: [
                `ID: \`${entry.id}\``,
                `${config.classLabel}: ${entry.class} / ${config.typeLabel}: ${entry.type_name}(${entry.type})`,
                `運用国: ${entry.country_operator} / 状態: ${entry.status}`,
                `速力: ${entry.speed}`,
            ].join("\n"),
        });
    });

    if (entries.length > 25) {
        embed.setFooter({
            text: `他 ${entries.length - 25} 件は表示しきれませんでした。検索条件を絞ってください。`,
        });
    }

    return embed;
}
module.exports = {
    CATEGORY_CONFIGS,
    toEntryArray,
    filterByType,
    getEntryById,
    buildInfoBody,
    buildInfoEmbed,
    buildListEmbed,
};
