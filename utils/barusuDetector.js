const fs = require("fs");
const path = require("path");
const { isDetectEnabled } = require("./barusuDetectSettings");
const { findIndex, findDisplayText } = require("./textMatch");

const barusuPath = path.join(__dirname, "..", "data", "barusu", "barusu.json");

let barusuNames = [];

function loadBarusuNames() {
    try {
        const data = JSON.parse(fs.readFileSync(barusuPath, "utf8"));

        barusuNames = Object.values(data)
            .map(info => info.name)
            .filter(Boolean)
            // 長い名前を先に判定する（「バルス」より「超新星バルス」のような
            // より具体的な名前がヒットしていたらそちらを優先するため）
            .sort((a, b) => b.length - a.length);

    } catch (error) {

        console.error("[barusuDetector] barusu.json の読み込みに失敗しました。", error);
        barusuNames = [];

    }
}

loadBarusuNames();

async function checkBarusuMessage(message) {
    if (message.author.bot) return;
    if (!message.content) return;
    if (!isDetectEnabled(message.guildId)) return;

    const matched = barusuNames.find(name => findIndex(message.content, name));

    if (!matched) return;

    const display = (await findDisplayText(message.content, matched)) ?? matched;

    message
        .reply({
            content: `バルスを検出しました。\n「${display}」`,
            allowedMentions: { repliedUser: false },
        })
        .catch(error => {
            console.error("[barusuDetector] 返信に失敗しました。", error);
        });
}

module.exports = { checkBarusuMessage, loadBarusuNames };
