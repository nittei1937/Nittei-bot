const fs = require("fs");

const FILE = "./barusu.json";

function loadData() {
    if (!fs.existsSync(FILE)) return {};
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
}

function saveData(data) {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function ensureUser(data, id) {
    if (!data[id]) {
        data[id] = {
            used: 0,
            received: 0
        };
    }
}