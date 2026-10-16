const fs = require("fs");
const path = require("path");

const RATE_PATH = path.join(__dirname, "..", "data", "rate.json");

/**
 * data/rate.json を読み込む
 */
function loadOres() {
    return JSON.parse(fs.readFileSync(RATE_PATH, "utf8"));
}

/**
 * 小数第2位まで丸める
 */
function round(value) {
    return Math.round(value * 100000000) / 100000000;
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
 * 各アイテム1個あたりに必要な鉄の量を取得
 */
function getRate(oreId) {
    const ores = loadOres();
    return ores[oreId]?.rate;
}

/**
 * クロスレート計算
 * rate は「アイテム1個あたりに必要な鉄の量」。
 * 例：ダイヤ1個から鉄何個分か、またはアイテム間の交換数量を計算。
 */
function computeExchangeRate(oreIdA, oreIdB) {
    const ores = loadOres();

    const valueA = ores[oreIdA]?.rate;
    const valueB = ores[oreIdB]?.rate;

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

    const newValue = round(Math.max(0.00000001, value));

    ores[oreId].rate = newValue;

    fs.writeFileSync(
        RATE_PATH,
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