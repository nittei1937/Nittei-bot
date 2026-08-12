const fs = require("fs");
const path = require("path");
const { isProfanityDetectEnabled } = require("./profanityDetectSettings");

const badWordsPath = path.join(__dirname, "..", "data", "moderation", "badwords.json");

let badWords = [];

function loadBadWords() {
    try {
        const data = JSON.parse(fs.readFileSync(badWordsPath, "utf8"));

        badWords = data
            .filter(Boolean)
            // 長い単語を先に判定する（部分一致でより具体的な単語を優先するため）
            .sort((a, b) => b.length - a.length);

    } catch (error) {

        console.error("[profanityDetector] badwords.json の読み込みに失敗しました。", error);
        badWords = [];

    }
}

loadBadWords();

function checkProfanityMessage(message) {
    if (message.author.bot) return;
    if (!message.content) return;
    if (!isProfanityDetectEnabled(message.guildId)) return;

    const content = message.content.toLowerCase();
    const matched = badWords.find(word => content.includes(word.toLowerCase()));

    if (!matched) return;

    message
        .reply({
            content: `暴言を検出しました。\n「${matched}」`,
            allowedMentions: { repliedUser: false },
        })
        .catch(error => {
            console.error("[profanityDetector] 返信に失敗しました。", error);
        });
}

module.exports = { checkProfanityMessage, loadBadWords };
