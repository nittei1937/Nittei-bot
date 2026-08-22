const { getTokenizer } = require("./tokenizer");

// 助詞・助動詞・記号は「単語の切れ目」とみなし、これらをまたいだだけの
// 偶然の一致（例:「です」＋「し」＋「ねぇ」の「し」「ね」）は検出しない
const NON_CONTENT_POS = new Set(["助詞", "助動詞", "記号"]);

// フォールバック用：漢字・カタカナの連続部分だけを拾う簡易版
// （形態素解析そのものが使えない場合の保険）
const ATTACHED_CHAR = /[\u4E00-\u9FFF\u30A0-\u30FF\u31F0-\u31FF]/;

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

// トークン列から「内容語（助詞・助動詞・記号を除く）」が連続する部分をまとめた文字列の配列を作る
function buildContentRuns(tokens) {
    const runs = [];
    let current = "";

    for (const token of tokens) {
        if (NON_CONTENT_POS.has(token.pos)) {
            if (current) runs.push(current);
            current = "";
            continue;
        }
        current += token.surface_form;
    }

    if (current) runs.push(current);

    return runs;
}

// メッセージ本文を1回だけ形態素解析し、内容語の連続部分の配列を返す。
// 解析に失敗した場合はnullを返す（呼び出し側でフォールバック判断に使う）
async function getContentRuns(content) {
    try {
        const tokenizer = await getTokenizer();
        const tokens = tokenizer.tokenize(content);
        return buildContentRuns(tokens);

    } catch (error) {

        console.error("[textMatch] 形態素解析に失敗しました。", error);
        return null;

    }
}

// 内容語の連続部分の配列の中からtermを含むものを探す（大文字小文字は無視）
function matchInRuns(runs, term) {
    const lowerTerm = term.toLowerCase();
    return runs.find(run => run.toLowerCase().includes(lowerTerm)) ?? null;
}

// 単語単体を形態素解析し、内部に助詞・助動詞・記号が現れないか（＝辞書的に
// ひとまとまりの語として認識できるか）を判定する。
// 「きもい」「うぜぇ」のような辞書に無い俗語は、単体でも助詞が混ざって
// 分割されてしまうことがあり、そういう単語は厳密な判定だと逆に検出漏れになる。
async function isWordClean(word) {
    try {
        const tokenizer = await getTokenizer();
        const tokens = tokenizer.tokenize(word);
        return !tokens.some(t => NON_CONTENT_POS.has(t.pos));

    } catch (error) {

        console.error("[textMatch] 単語のクリーン判定に失敗しました。", error);
        return false;

    }
}

module.exports = { getContentRuns, matchInRuns, findIndex, expandByCharClass, isWordClean };