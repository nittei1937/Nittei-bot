const {
    SlashCommandBuilder,
    EmbedBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const JSON5 = require("json5");

const carsPath = path.join(
    __dirname,
    "..",
    "data",
    "random",
    "cars.json5"
);

const handicapsPath = path.join(
    __dirname,
    "..",
    "data",
    "random",
    "handicaps.json5"
);

function loadJson5(filePath) {
    try {
        const raw = fs.readFileSync(filePath, "utf8");
        return JSON5.parse(raw);
    } catch (error) {
        console.error(`❌ JSON5読み込みエラー: ${filePath}`);
        console.error(error);
        return [];
    }
}

function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("車安価")
        .setDescription("車とハンデをランダムで決定します"),

    async execute(interaction) {
        const cars = loadJson5(carsPath);
        const handicaps = loadJson5(handicapsPath);

        if (cars.length === 0) {
            await interaction.reply({
                content: "❌ 車データが登録されていません。"
            });
            return;
        }

        if (handicaps.length === 0) {
            await interaction.reply({
                content: "❌ ハンデデータが登録されていません。"
            });
            return;
        }

        const car = randomItem(cars);
        const handicap = randomItem(handicaps);

        const embed = new EmbedBuilder()
            .setTitle("🚗 車安価")
            .addFields(
                {
                    name: "🚘 車",
                    value: String(car),
                    inline: false
                },
                {
                    name: "⚠️ ハンデ",
                    value: String(handicap),
                    inline: false
                }
            )
            .setFooter({
                text: `実行者: ${interaction.user.username}`
            })
            .setTimestamp();

        await interaction.reply({
            embeds: [embed]
        });
    }
};