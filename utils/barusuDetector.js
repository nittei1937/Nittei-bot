const fs = require("fs");
const path = require("path");

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

function checkBarusuMessage(message) {
    if (message.author.bot) return;
    if (!message.content) return;

    const matched = barusuNames.find(name => message.content.includes(name));

    if (!matched) return;

    message
        .reply({
            content: `バルスを検出しました。\n「${matched}」`,
            allowedMentions: { repliedUser: false },
        })
        .catch(error => {
            console.error("[barusuDetector] 返信に失敗しました。", error);
        });
}

module.exports = { checkBarusuMessage, loadBarusuNames };
