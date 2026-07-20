const fs = require("fs");
const path = require("path");

const ORES_PATH = path.join(__dirname, "..", "data", "ores.json");
const STATE_PATH = path.join(__dirname, "..", "data", "market-state.json");

const HISTORY_LIMIT = 500; // 1鉱石あたり保持する履歴の最大件数
const DEFAULT_BASE_ORE = "gold"; // /rate info list で基準にする鉱石

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
            state.rates[id] = ore.value;
            state.history[id] = [{ t: Date.now(), v: ore.value }];
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
    getHistory,
    findValueNear,
    round,
};
