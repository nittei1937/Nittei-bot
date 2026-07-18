require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const { Client, Collection, GatewayIntentBits, Events, MessageFlags } = require("discord.js");
const { startMarketScheduler } = require("./scheduler.js");

const { DISCORD_TOKEN } = process.env;

if (!DISCORD_TOKEN) {
    console.error("エラー: .envにDISCORD_TOKENを設定してください。");
    process.exit(1);
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

// コマンドを動的に読み込み、client.commandsに格納する
client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ("data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
        console.log(`コマンドを読み込みました: /${command.data.name}`);
    } else {
        console.warn(`警告: ${filePath} に data または execute プロパティがありません。`);
    }
}

client.once(Events.ClientReady, (readyClient) => {
    console.log(`準備完了: ${readyClient.user.tag} としてログインしました。`);
    startMarketScheduler(readyClient);
});

client.on(Events.InteractionCreate, async (interaction) => {
    // オートコンプリート（艦名/車両名/機体名の入力補完）への対応
    if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (!command || typeof command.autocomplete !== "function") return;

        try {
            await command.autocomplete(interaction);
        } catch (error) {
            console.error(`オートコンプリートエラー (${interaction.commandName}):`, error);
        }
        return;
    }

    // スラッシュコマンド本体への対応
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`未登録のコマンドが呼ばれました: ${interaction.commandName}`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`コマンド実行エラー (${interaction.commandName}):`, error);

        const errorReply = {
            content: "コマンドの実行中にエラーが発生しました。",
            flags: MessageFlags.Ephemeral,
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorReply);
        } else {
            await interaction.reply(errorReply);
        }
    }
});

// -------------------------
// Render Keep Alive
// -------------------------

const app = express();

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("NitteiBot is running!");
});

app.listen(PORT, () => {
    console.log(`Web Server : Port ${PORT}`);
});

client.login(DISCORD_TOKEN);
