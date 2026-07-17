// スラッシュコマンドをDiscordに登録するスクリプト
// 実行: node deploy-commands.js  (または npm run deploy)

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { REST, Routes } = require("discord.js");

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
    console.error("エラー: .envにDISCORD_TOKENとCLIENT_IDを設定してください。");
    process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ("data" in command && "execute" in command) {
        commands.push(command.data.toJSON());
    } else {
        console.warn(`警告: ${file} に data または execute がありません。スキップします。`);
    }
}

const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log(`${commands.length}個のスラッシュコマンドを登録します...`);

        let data;
        if (GUILD_ID) {
            // ギルド限定登録（即時反映されるので開発中はこちらがおすすめ）
            data = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
                body: commands,
            });
            console.log(`ギルド(${GUILD_ID})に${data.length}個のコマンドを登録しました。`);
        } else {
            // グローバル登録（反映まで最大1時間ほどかかる）
            data = await rest.put(Routes.applicationCommands(CLIENT_ID), {
                body: commands,
            });
            console.log(`グローバルに${data.length}個のコマンドを登録しました。`);
        }
    } catch (error) {
        console.error("コマンド登録中にエラーが発生しました:", error);
    }
})();
