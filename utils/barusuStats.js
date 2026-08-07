const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "data", "commandCounts.json");

// JSON読み込み
function loadCounts() {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, "{}");
    }

    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// JSON保存
function saveCounts(counts) {
    fs.writeFileSync(filePath, JSON.stringify(counts, null, 4));
}

// カウント追加
function increment(commandName) {
    const counts = loadCounts();

    counts[commandName] = (counts[commandName] || 0) + 1;

    saveCounts(counts);

    return counts[commandName];
}

// カウント取得
function getCount(commandName) {
    const counts = loadCounts();
    return counts[commandName] || 0;
}

module.exports = {
    increment,
    getCount
};