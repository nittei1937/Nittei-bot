const fs = require("fs");
const path = require("path");

const schedulePath = path.join(__dirname, "..", "data", "barusu", "schedule.json");
let timer;
let isRunning = false;

function readSchedules() {
    try {
        const data = JSON.parse(fs.readFileSync(schedulePath, "utf8"));
        return Array.isArray(data) ? data : [];
    } catch (error) {
        if (error.code === "ENOENT") return [];
        console.error("予約データを読み込めませんでした。", error);
        return [];
    }
}

function writeSchedules(schedules) {
    fs.mkdirSync(path.dirname(schedulePath), { recursive: true });
    const temporaryPath = `${schedulePath}.tmp`;
    fs.writeFileSync(temporaryPath, `${JSON.stringify(schedules, null, 2)}\n`, "utf8");
    fs.renameSync(temporaryPath, schedulePath);
}

function addSchedule(schedule) {
    const schedules = readSchedules();
    schedules.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        createdAt: Date.now(),
        ...schedule
    });
    writeSchedules(schedules);
}

function removeSchedule(id) {
    writeSchedules(readSchedules().filter(schedule => schedule.id !== id));
}

function retrySchedule(id) {
    const schedules = readSchedules().map(schedule =>
        schedule.id === id
            ? { ...schedule, executeAt: Date.now() + 60 * 1000 }
            : schedule
    );
    writeSchedules(schedules);
}

function formatDiscordTime(executeAt) {
    return `<t:${Math.floor(executeAt / 1000)}:F>`;
}

function getTokyoDateParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(date);
    const number = type => Number(parts.find(part => part.type === type).value);
    return { year: number("year"), month: number("month"), day: number("day") };
}

function getExecuteAt({ delay, hour, minute }) {
    if (delay !== null && delay !== undefined) return Date.now() + delay * 60 * 1000;
    if (hour === null || hour === undefined) return Date.now() + 60 * 1000;

    const today = getTokyoDateParts();
    let executeAt = Date.UTC(today.year, today.month - 1, today.day, hour - 9, minute);
    if (executeAt <= Date.now()) executeAt += 24 * 60 * 60 * 1000;
    return executeAt;
}

async function runDueSchedules(client) {
    if (isRunning) return;
    isRunning = true;

    const schedules = readSchedules();
    try {
        for (const schedule of schedules) {
            if (schedule.executeAt > Date.now()) continue;

            try {
                const channel = await client.channels.fetch(schedule.channelId);
                if (!channel || !channel.isTextBased()) throw new Error("送信先チャンネルが見つかりません。");
                await channel.send(schedule.content);
                removeSchedule(schedule.id);
            } catch (error) {
                console.error(`予約 ${schedule.id} の送信に失敗しました。`, error);
                retrySchedule(schedule.id);
            }
        }
    } finally {
        isRunning = false;
    }
}

function startScheduleRunner(client) {
    if (timer) return;
    runDueSchedules(client).catch(error => console.error("予約の確認に失敗しました。", error));
    timer = setInterval(() => {
        runDueSchedules(client).catch(error => console.error("予約の確認に失敗しました。", error));
    }, 1000);
}

module.exports = { addSchedule, formatDiscordTime, getExecuteAt, startScheduleRunner };
