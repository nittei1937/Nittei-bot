const kuromoji = require("kuromoji");
const path = require("path");

let tokenizerPromise = null;

// 辞書の読み込みは重いので、プロセス内で1回だけ行い使い回す
function getTokenizer() {
    if (!tokenizerPromise) {
        const dicPath = path.join(__dirname, "..", "node_modules", "kuromoji", "dict");

        tokenizerPromise = new Promise((resolve, reject) => {
            kuromoji.builder({ dicPath }).build((error, tokenizer) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(tokenizer);
            });
        });
    }

    return tokenizerPromise;
}

module.exports = { getTokenizer };
