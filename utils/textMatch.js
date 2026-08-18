const { getTokenizer } = require("./tokenizer");

// フォールバック用：漢字・カタカナの連続部分だけを拾う簡易版
// （形態素解析で辞書に無い語だった場合の保険）
const ATTACHED_CHAR = /[\u4E00-\u9FFF\u30A0-\u30FF\u31F0-\u31FF]/;

// contentの中からtermを大文字小文字を無視して探し、見つかった範囲を返す
function findIndex(content, term) {
    const lowerContent = content.toLowerCase();
    const lowerTerm = term.toLowerCase();
    const index = lowerContent.indexOf(lowerTerm);
    if (index === -1) return null;
    return { start: index, end: index + term.length };
}

function expandByCharClass(content, start, end) {
    let s = start;
    let e = end;

    while (s > 0 && ATTACHED_CHAR.test(content[s - 1])) s--;
    while (e < content.length && ATTACHED_CHAR.test(content[e])) e++;

    return content.slice(s, e);
}

// 形態素解析で、登録語を含むトークンの前後にある「名詞」の連続部分をまとめて拾う
async function expandByTokenizer(content, term) {
    try {
        const tokenizer = await getTokenizer();
        const tokens = tokenizer.tokenize(content);
        const lowerTerm = term.toLowerCase();
        const index = tokens.findIndex(t => t.surface_form.toLowerCase().includes(lowerTerm));

        if (index === -1) return null;

        let start = index;
        let end = index;
        const isNoun = t => t.pos === "名詞";

        while (start > 0 && isNoun(tokens[start - 1])) start--;
        while (end < tokens.length - 1 && isNoun(tokens[end + 1])) end++;

        return tokens
            .slice(start, end + 1)
            .map(t => t.surface_form)
            .join("");

    } catch (error) {

        console.error("[textMatch] 形態素解析に失敗しました。", error);
        return null;

    }
}

// 登録語が実際にcontentに含まれているかを確認したうえで、表示用テキストを組み立てる
// 形態素解析がうまくいけばそちらを優先し、ダメなら文字種ベースの簡易版にフォールバックする
async function findDisplayText(content, term) {
    const range = findIndex(content, term);
    if (!range) return null;

    const tokenized = await expandByTokenizer(content, term);
    if (tokenized) return tokenized;

    return expandByCharClass(content, range.start, range.end);
}

module.exports = { findIndex, findDisplayText };
