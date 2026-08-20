const fs = require("fs");
const path = require("path");
const { isProfanityDetectEnabled } = require("./profanityDetectSettings");
const { getContentRuns, matchInRuns, findIndex, expandByCharClass, isWordClean } = require("./textMatch");

const badWordsPath = path.join(__dirname, "..", "data", "moderation", "badwords.json");

let badWords = [];
let exceptions = [];

// 単語ごとの「辞書的にクリーンか」の判定結果のキャッシュ（毎メッセージ判定し直さないため）
const cleanCache = new Map();

async function isCleanCached(word) {
    if (!cleanCache.has(word)) {
        cleanCache.set(word, await isWordClean(word));
    }
    return cleanCache.get(word);
}

function loadBadWords() {
    try {
        const data = JSON.parse(fs.readFileSync(badWordsPath, "utf8"));

        badWords = (data.badwords ?? [])
            .filter(word => typeof word === "string" && word.length > 0)
            // 長い単語を先に判定する（部分一致でより具体的な単語を優先するため）
            .sort((a, b) => b.length - a.length);

        exceptions = (data.exceptions ?? []).filter(word => typeof word === "string" && word.length > 0);

        cleanCache.clear();

    } catch (error) {

        console.error("[profanityDetector] badwords.json の読み込みに失敗しました。", error);
        badWords = [];
        exceptions = [];

    }
}

loadBadWords();

// 例外語のいずれかがcontentに含まれているか（大文字小文字は無視）
function isExceptionMatched(content) {
    const lowerContent = content.toLowerCase();
    return exceptions.some(exception => lowerContent.includes(exception.toLowerCase()));
}

async function checkProfanityMessage(message) {
    if (message.author.bot) return;
    if (!message.content) return;
    if (!isProfanityDetectEnabled(message.guildId)) return;

    const runs = await getContentRuns(message.content);

    let matchedWord = null;
    let display = null;

    for (const word of badWords) {

        // runsが使えず、かつその単語自体が辞書的にクリーンでない場合は
        // 単純な部分一致（＋例外チェック）で判定する
        const useRaw = !runs || !(await isCleanCached(word));

        if (useRaw) {
            const range = findIndex(message.content, word);
            if (!range) continue;
            if (isExceptionMatched(message.content)) continue;

            matchedWord = word;
            display = expandByCharClass(message.content, range.start, range.end);
            break;
        }

        const hit = matchInRuns(runs, word, exceptions);
        if (hit) {
            matchedWord = word;
            display = hit;
            break;
        }
    }

    if (!matchedWord) return;

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