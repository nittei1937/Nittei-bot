const fs = require("fs");
const path = require("path");

const ORES_PATH = path.join(__dirname, "..", "data", "ores.json");
const STATE_PATH = path.join(__dirname, "..", "data", "market-state.json");

const HISTORY_LIMIT = 500; // 1鉱石あたり保持する履歴の最大件数
const MAX_TRADE_IMPACT = 0.2; // 1回の取引で動かせる価格変動の上限（±20%）
const DEFAULT_BASE_ORE = "gold"; // /rate show list で基準にする鉱石

/**
 * data/ores.json（鉱石の設定・静的データ）を読み込む
 */
function loadOres() {
    return JSON.parse(fs.readFileSync(ORES_PATH, "utf8"));
}

/**
 * data/market-state.json（現在の相場・履歴。実行時に自動生成/更新される）を読み込む。
 * ores.jsonに新しい鉱石が追加されていれば、初期値で自動的に補完する。
 */
function loadState() {
    const ores = loadOres();
    let state;

    if (fs.existsSync(STATE_PATH)) {
        state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
    } else {
        state = { rates: {}, history: {} };
    }

    let changed = false;
    Object.entries(ores).forEach(([id, ore]) => {
        if (!(id in state.rates)) {
            state.rates[id] = ore.initial_value;
            state.history[id] = [{ t: Date.now(), v: ore.initial_value }];
            changed = true;
        }
    });

    if (changed) saveState(state);

    return state;
}

function saveState(state) {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf8");
}

function recordHistory(state, oreId, value) {
    if (!state.history[oreId]) state.history[oreId] = [];
    state.history[oreId].push({ t: Date.now(), v: value });
    if (state.history[oreId].length > HISTORY_LIMIT) {
        state.history[oreId].shift();
    }
}

function round(value) {
    return Math.round(value * 100) / 100;
}

function getAllOreIds() {
    return Object.keys(loadOres());
}

function getOreInfo(oreId) {
    const ores = loadOres();
    return ores[oreId] || null;
}

function getRate(oreId) {
    const state = loadState();
    return state.rates[oreId];
}

/**
 * oreIdAの1単位がoreIdBに換算していくつになるかを返す（クロスレート）
 */
function computeExchangeRate(oreIdA, oreIdB) {
    const state = loadState();
    const valueA = state.rates[oreIdA];
    const valueB = state.rates[oreIdB];
    if (valueA === undefined || valueB === undefined) return null;
    return valueA / valueB;
}

/**
 * 管理者によるレートの手動設定
 */
function setRate(oreId, value) {
    const state = loadState();
    if (!(oreId in state.rates)) return null;

    const newValue = round(Math.max(0.01, value));
    state.rates[oreId] = newValue;
    recordHistory(state, oreId, newValue);
    saveState(state);

    return newValue;
}

/**
 * 取引による価格インパクトを反映する（単純な需給インパクトモデル）
 * 取引量が大きいほど、また鉱石のliquidity（流動性）が小さいほど値動きが大きくなる。
 * @param {string} oreId
 * @param {number} amount - 取引量
 * @param {"buy"|"sell"} action - buy=買い（価格上昇方向） / sell=売り（価格下落方向）
 */
function applyTrade(oreId, amount, action) {
    const ores = loadOres();
    const ore = ores[oreId];
    if (!ore) return null;

    const state = loadState();
    const currentValue = state.rates[oreId];

    const direction = action === "buy" ? 1 : -1;
    const rawImpact = (amount / ore.liquidity) * direction;
    const clampedImpact = Math.max(-MAX_TRADE_IMPACT, Math.min(MAX_TRADE_IMPACT, rawImpact));

    const newValue = round(Math.max(0.01, currentValue * (1 + clampedImpact)));

    state.rates[oreId] = newValue;
    recordHistory(state, oreId, newValue);
    saveState(state);

    return {
        previousValue: currentValue,
        newValue,
        impactPercent: clampedImpact * 100,
        clamped: Math.abs(rawImpact) > MAX_TRADE_IMPACT,
    };
}

/**
 * 全鉱石にランダムな時価変動を適用する（定期実行用）
 * @returns {Array<object>} 各鉱石の変動結果
 */
function applyRandomFluctuation() {
    const ores = loadOres();
    const state = loadState();
    const changes = [];

    Object.entries(ores).forEach(([id, ore]) => {
        const currentValue = state.rates[id];
        const volatility = typeof ore.volatility === "number" ? ore.volatility : 0.03;
        const randomPercent = (Math.random() * 2 - 1) * volatility; // -volatility 〜 +volatility
        const newValue = round(Math.max(0.01, currentValue * (1 + randomPercent)));

        state.rates[id] = newValue;
        recordHistory(state, id, newValue);

        changes.push({
            id,
            name: ore.name,
            emoji: ore.emoji,
            previousValue: currentValue,
            newValue,
            percent: randomPercent * 100,
        });
    });

    saveState(state);
    return changes;
}

/**
 * 指定した鉱石の履歴を直近limit件取得する
 */
function getHistory(oreId, limit = 50) {
    const state = loadState();
    const history = state.history[oreId] || [];
    return history.slice(-limit);
}

/**
 * 履歴の中から指定時刻に一番近い値を取得する（例: 24時間前比較に使用）
 */
function findValueNear(history, targetTime) {
    if (!history || history.length === 0) return null;

    let closest = history[0];
    let closestDiff = Math.abs(history[0].t - targetTime);

    for (const point of history) {
        const diff = Math.abs(point.t - targetTime);
        if (diff < closestDiff) {
            closest = point;
            closestDiff = diff;
        }
    }

    return closest.v;
}

module.exports = {
    DEFAULT_BASE_ORE,
    loadOres,
    loadState,
    saveState,
    getAllOreIds,
    getOreInfo,
    getRate,
    computeExchangeRate,
    setRate,
    applyTrade,
    applyRandomFluctuation,
    getHistory,
    findValueNear,
    round,
};
