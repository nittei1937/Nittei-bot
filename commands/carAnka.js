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

/**
 * JSON5を読み込む
 */
function loadJson5(filePath) {
    try {
        const raw = fs.readFileSync(filePath, "utf8");
        return JSON5.parse(raw);
    } catch (error) {
        console.error(`❌ JSON5読み込みエラー: ${filePath}`);
        console.error(error);
        return null;
    }
}

/**
 * 配列からランダムに1つ取得
 */
function randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * メーカー別データを1つの配列にまとめる
 */
function getAllCars(carData) {
    const cars = [];

    for (const [manufacturer, carList] of Object.entries(carData)) {
        if (!Array.isArray(carList)) continue;

        for (const car of carList) {
            cars.push({
                name: car,
                manufacturer
            });
        }
    }

    return cars;
}

/**
 * 日本メーカー
 */
const JAPANESE_MANUFACTURERS = [
    "Toyota",
    "Nissan",
    "Mazda",
    "Lexus",
    "Honda",
    "Subaru",
    "Mitsubishi"
];

/**
 * 外車メーカー
 *
 * cars.json5に新しい外車メーカーを追加した場合、
 * ここにも追加してください。
 */
const FOREIGN_MANUFACTURERS = [
    "Lamborghini"
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName("車安価")
        .setDescription("車とハンデをランダムで決定します")

        // =========================
        // 車縛り
        // =========================
        .addStringOption(option =>
            option
                .setName("車縛り")
                .setDescription("車の種類・メーカーを限定します")
                .setRequired(false)
                .addChoices(
                    {
                        name: "指定なし",
                        value: "none"
                    },
                    {
                        name: "🇯🇵 日本車限定",
                        value: "japanese"
                    },
                    {
                        name: "🌎 外車限定",
                        value: "foreign"
                    },
                    {
                        name: "Toyota",
                        value: "Toyota"
                    },
                    {
                        name: "Nissan",
                        value: "Nissan"
                    },
                    {
                        name: "Mazda",
                        value: "Mazda"
                    },
                    {
                        name: "Lexus",
                        value: "Lexus"
                    },
                    {
                        name: "Honda",
                        value: "Honda"
                    },
                    {
                        name: "Subaru",
                        value: "Subaru"
                    },
                    {
                        name: "Mitsubishi",
                        value: "Mitsubishi"
                    },
                    {
                        name: "Lamborghini",
                        value: "Lamborghini"
                    }
                )
        )

        // =========================
        // ハンデ縛り
        // =========================
        .addStringOption(option =>
            option
                .setName("ハンデ縛り")
                .setDescription("ハンデの種類を限定します")
                .setRequired(false)
                .addChoices(
                    {
                        name: "指定なし",
                        value: "none"
                    },
                    {
                        name: "待機",
                        value: "waiting"
                    }
                )
        ),

    async execute(interaction) {
        // ---------------------------------
        // データ読み込み
        // ---------------------------------
        const carData = loadJson5(carsPath);
        const handicaps = loadJson5(handicapsPath);

        if (!carData || typeof carData !== "object") {
            await interaction.reply({
                content: "❌ 車データの読み込みに失敗しました。",
                ephemeral: true
            });
            return;
        }

        if (!Array.isArray(handicaps)) {
            await interaction.reply({
                content: "❌ ハンデデータの読み込みに失敗しました。",
                ephemeral: true
            });
            return;
        }

        // ---------------------------------
        // オプション取得
        // ---------------------------------
        const carRestriction =
            interaction.options.getString("車縛り") ?? "none";

        const handicapRestriction =
            interaction.options.getString("ハンデ縛り") ?? "none";

        // ---------------------------------
        // 車データを整理
        // ---------------------------------
        const allCars = getAllCars(carData);

        if (allCars.length === 0) {
            await interaction.reply({
                content: "❌ 車データが登録されていません。",
                ephemeral: true
            });
            return;
        }

        // ---------------------------------
        // 車を絞り込む
        // ---------------------------------
        let availableCars = allCars;

        if (carRestriction === "japanese") {
            availableCars = allCars.filter(car =>
                JAPANESE_MANUFACTURERS.includes(car.manufacturer)
            );
        } else if (carRestriction === "foreign") {
            availableCars = allCars.filter(car =>
                FOREIGN_MANUFACTURERS.includes(car.manufacturer)
            );
        } else if (carRestriction !== "none") {
            availableCars = allCars.filter(car =>
                car.manufacturer === carRestriction
            );
        }

        if (availableCars.length === 0) {
            await interaction.reply({
                content: "❌ 指定された条件に該当する車がありません。",
                ephemeral: true
            });
            return;
        }

        const selectedCar = randomItem(availableCars);

        // ---------------------------------
        // ハンデを絞り込む
        // ---------------------------------
        let availableHandicaps = handicaps;

        if (handicapRestriction === "waiting") {
            availableHandicaps = handicaps.filter(handicap => {
                return (
                    typeof handicap === "string" &&
                    (
                        handicap.includes("秒待機") ||
                        handicap.includes("分待機")
                    )
                );
            });
        }

        if (availableHandicaps.length === 0) {
            await interaction.reply({
                content: "❌ 指定されたハンデ条件に該当するものがありません。",
                ephemeral: true
            });
            return;
        }

        const selectedHandicap = randomItem(availableHandicaps);

        // ---------------------------------
        // 表示用の車縛り名
        // ---------------------------------
        let carRestrictionName = "指定なし";

        if (carRestriction === "japanese") {
            carRestrictionName = "🇯🇵 日本車限定";
        } else if (carRestriction === "foreign") {
            carRestrictionName = "🌎 外車限定";
        } else if (carRestriction !== "none") {
            carRestrictionName = carRestriction;
        }

        // ---------------------------------
        // 表示用のハンデ縛り名
        // ---------------------------------
        let handicapRestrictionName = "指定なし";

        if (handicapRestriction === "waiting") {
            handicapRestrictionName = "待機";
        }

        // ---------------------------------
        // Embed作成
        // ---------------------------------
        const embed = new EmbedBuilder()
            .setTitle("🚗 車安価")
            .addFields(
                {
                    name: "🚘 車",
                    value: selectedCar.name,
                    inline: false
                },
                {
                    name: "🏭 メーカー",
                    value: selectedCar.manufacturer,
                    inline: true
                },
                {
                    name: "⚠️ ハンデ",
                    value: selectedHandicap,
                    inline: false
                },
                {
                    name: "🔧 車縛り",
                    value: carRestrictionName,
                    inline: true
                },
                {
                    name: "🔒 ハンデ縛り",
                    value: handicapRestrictionName,
                    inline: true
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