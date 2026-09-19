const path = require("path");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // 例: "your-name/Nittei-bot"
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || "main";

// 最後の変更からこの時間だけ操作が無ければ、まとめて1回だけコミットする
const DEBOUNCE_MS = 5 * 60 * 1000; // 5分

// このファイル(utils/githubPersist.js)から見て、リポジトリのルートは1つ上のフォルダという想定
const REPO_ROOT = path.join(__dirname, "..");

// absolutePath -> { content, timer }  コミット待ちの内容とタイマー
const pending = new Map();

function toRepoPath(absolutePath) {
    return path.relative(REPO_ROOT, absolutePath).split(path.sep).join("/");
}

// 実際にGitHub APIへコミットする（デバウンスや即時保存から呼ばれる）
async function commitNow(absolutePath, content) {
    if (!GITHUB_TOKEN || !GITHUB_REPO) return;

    const repoPath = toRepoPath(absolutePath);
    const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${repoPath}`;

    const headers = {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "NitteiBot-persist",
    };

    try {

        // 既存ファイルのshaを取得する（更新には必須、新規作成時は無くてもOK）
        let sha;
        const getRes = await fetch(`${apiUrl}?ref=${GITHUB_BRANCH}`, { headers });
        if (getRes.ok) {
            const data = await getRes.json();
            sha = data.sha;
        } else if (getRes.status !== 404) {
            console.error(`[githubPersist] ${repoPath} の取得に失敗しました。`, getRes.status, await getRes.text());
            return;
        }

        const putRes = await fetch(apiUrl, {
            method: "PUT",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
                message: `chore: update ${repoPath} via bot`,
                content: Buffer.from(content, "utf8").toString("base64"),
                branch: GITHUB_BRANCH,
                ...(sha ? { sha } : {}),
            }),
        });

        if (!putRes.ok) {
            console.error(`[githubPersist] ${repoPath} のコミットに失敗しました。`, putRes.status, await putRes.text());
        } else {
            console.log(`[githubPersist] ${repoPath} をコミットしました。`);
        }

    } catch (error) {

        console.error(`[githubPersist] ${repoPath} のコミット中にエラーが発生しました。`, error);

    }
}

// 変更を予約する。DEBOUNCE_MS の間に何度呼ばれても、最後の内容だけが1回コミットされる。
// GITHUB_TOKEN / GITHUB_REPO が未設定の場合は何もしない
// （ローカル保存だけで動作を継続できるようにするため、エラーにはしない）。
function persistFile(absolutePath, content) {
    if (!GITHUB_TOKEN || !GITHUB_REPO) return;

    const existing = pending.get(absolutePath);
    if (existing) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
        pending.delete(absolutePath);
        commitNow(absolutePath, content);
    }, DEBOUNCE_MS);

    // Renderのプロセスが終了する時に、このタイマーだけのせいでプロセスが
    // 生き続けてしまわないようにしておく
    timer.unref?.();

    pending.set(absolutePath, { content, timer });
}

// 保留中の変更があれば、待たずに今すぐコミットする。無ければ何もしない。
// 戻り値: 実際にコミットを実行したかどうか
async function flushPersist(absolutePath) {
    const existing = pending.get(absolutePath);
    if (!existing) return false;

    clearTimeout(existing.timer);
    pending.delete(absolutePath);

    await commitNow(absolutePath, existing.content);
    return true;
}

module.exports = { persistFile, flushPersist };
