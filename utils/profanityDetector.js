const fs = require("fs");
const path = require("path");
const { isProfanityDetectEnabled } = require("./profanityDetectSettings");
const { findIndex, findDisplayText } = require("./textMatch");

const badWordsPath = path.join(__dirname, "..", "data", "moderation", "badwords.json");

let badWords = [];

// エントリは "文字列" でも { "word": "...", "label": "..." } でもOK。
// label省略時は word をそのまま表示に使う（＝形態素解析による自動拡張を使う）。
function normalizeEntry(entry) {
    if (typeof entry === "string") {
        return { word: entry, label: entry };
    }
    if (entry && typeof entry.word === "string") {
        return { word: entry.word, label: entry.label ?? entry.word };
    }
    return null;
}

function loadBadWords() {
    try {
        const data = JSON.parse(fs.readFileSync(badWordsPath, "utf8"));

        badWords = data
            .map(normalizeEntry)
            .filter(Boolean)
            .sort((a, b) => b.word.length - a.word.length);

    } catch (error) {

        console.error("[profanityDetector] badwords.json の読み込みに失敗しました。", error);
        badWords = [];

    }
}

loadBadWords();

async function checkProfanityMessage(message) {
    if (message.author.bot) return;
    if (!message.content) return;
    if (!isProfanityDetectEnabled(message.guildId)) return;

    const matched = badWords.find(entry => findIndex(message.content, entry.word));

    if (!matched) return;

    // 手動でlabelが設定されている場合はそちらを優先し、無ければ形態素解析で付随語を含めて表示する
    const hasCustomLabel = matched.label !== matched.word;
    const display = hasCustomLabel
        ? matched.label
        : (await findDisplayText(message.content, matched.word)) ?? matched.word;

    message
        .reply({
            content: `暴言を検出しました。\n「${display}」`,
            allowedMentions: { repliedUser: false },
        })
        .catch(error => {
            console.error("[profanityDetector] 返信に失敗しました。", error);
        });
}

module.exports = { checkProfanityMessage, loadBadWords };
