const fs = require("fs");
const path = require("path");
const { isProfanityDetectEnabled } = require("./profanityDetectSettings");
const { getContentRuns, matchInRuns, findIndex, expandByCharClass } = require("./textMatch");

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

    const runs = await getContentRuns(message.content);

    let matched = null;
    let expanded = null;

    if (runs) {
        // 形態素解析が使えた場合：内容語のまとまりの中に含まれるものだけを検出対象にする
        for (const entry of badWords) {
            const hit = matchInRuns(runs, entry.word);
            if (hit) {
                matched = entry;
                expanded = hit;
                break;
            }
        }
    } else {
        // 解析自体が失敗した場合のみ、従来の単純な部分一致にフォールバックする
        for (const entry of badWords) {
            const range = findIndex(message.content, entry.word);
            if (range) {
                matched = entry;
                expanded = expandByCharClass(message.content, range.start, range.end);
                break;
            }
        }
    }

    if (!matched) return;

    // 手動でlabelが設定されている場合はそちらを優先し、無ければ検出時に拾ったまとまりを使う
    const hasCustomLabel = matched.label !== matched.word;
    const display = hasCustomLabel ? matched.label : expanded;

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
