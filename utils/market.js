const fs = require("fs");
const path = require("path");

const ORES_PATH = path.join(__dirname, "..", "data", "ores.json");

/**
 * data/ores.json を読み込む
 */
function loadOres() {
    return JSON.parse(fs.readFileSync(ORES_PATH, "utf8"));
}

/**
 * 小数第2位まで丸める
 */
function round(value) {
    return Math.round(value * 100) / 100;
}

/**
 * 全鉱石IDを取得
 */
function getAllOreIds() {
    return Object.keys(loadOres());
}

/**
 * 鉱石情報を取得
 */
function getOreInfo(oreId) {
    const ores = loadOres();
    return ores[oreId] || null;
}

/**
 * 金基準レートを取得
 */
function getRate(oreId) {
    const ores = loadOres();
    return ores[oreId]?.gold_rate;
}

/**
 * クロスレート計算
 * （例：ダイヤ→鉄）
 */
function computeExchangeRate(oreIdA, oreIdB) {
    const ores = loadOres();

    const valueA = ores[oreIdA]?.gold_rate;
    const valueB = ores[oreIdB]?.gold_rate;

    if (valueA === undefined || valueB === undefined) {
        return null;
    }

    return round(valueA / valueB);
}

/**
 * レート変更
 */
function setRate(oreId, value) {
    const ores = loadOres();

    if (!ores[oreId]) {
        return null;
    }

    const newValue = round(Math.max(0.01, value));

    ores[oreId].gold_rate = newValue;

    fs.writeFileSync(
        ORES_PATH,
        JSON.stringify(ores, null, 2),
        "utf8"
    );

    return newValue;
}

module.exports = {
    loadOres,
    getAllOreIds,
    getOreInfo,
    getRate,
    computeExchangeRate,
    setRate,
    round,
};