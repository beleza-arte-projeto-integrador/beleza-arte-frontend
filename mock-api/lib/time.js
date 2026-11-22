// Datas no horário de Brasília (UTC-03:00, sem horário de verão), como no backend
// (SALON_ZONE = America/Sao_Paulo). Dias são tratados como texto "YYYY-MM-DD".

const OFFSET = "-03:00";
const OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const pad = value => String(value).padStart(2, "0");

/** Instante (ms) em que começa o dia "YYYY-MM-DD" em Brasília. */
function startOfDay(day) {
    return Date.parse(`${day}T00:00:00${OFFSET}`);
}

/** "YYYY-MM-DD" do instante, em Brasília. */
function dayOf(instant) {
    const shifted = new Date(new Date(instant).getTime() - OFFSET_MS);
    return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

function today() {
    return dayOf(Date.now());
}

/** Soma dias a "YYYY-MM-DD". */
function addDays(day, days) {
    const [year, month, date] = day.split("-").map(Number);
    const result = new Date(Date.UTC(year, month - 1, date + days));
    return `${result.getUTCFullYear()}-${pad(result.getUTCMonth() + 1)}-${pad(result.getUTCDate())}`;
}

/** Soma meses a "YYYY-MM-DD" (usado com o dia 1). */
function addMonths(day, months) {
    const [year, month] = day.split("-").map(Number);
    const result = new Date(Date.UTC(year, month - 1 + months, 1));
    return `${result.getUTCFullYear()}-${pad(result.getUTCMonth() + 1)}-01`;
}

/** 0 = domingo … 6 = sábado. */
function weekdayOf(day) {
    const [year, month, date] = day.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, date)).getUTCDay();
}

/** "HH:mm" do instante, em Brasília. */
function timeOf(instant) {
    const shifted = new Date(new Date(instant).getTime() - OFFSET_MS);
    return `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

/** ISO com fuso de Brasília: "2026-11-20T14:00:00-03:00". */
function toIso(instant) {
    const shifted = new Date(new Date(instant).getTime() - OFFSET_MS);
    return `${dayOf(instant)}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}${OFFSET}`;
}

/** Agora, em ISO com fuso de Brasília. */
function nowIso() {
    return toIso(Date.now());
}

/** Instante de "YYYY-MM-DD" + "HH:mm" em Brasília. */
function at(day, time) {
    return Date.parse(`${day}T${time}:00${OFFSET}`);
}

function isValidDay(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
    const [year, month, date] = value.split("-").map(Number);
    const check = new Date(Date.UTC(year, month - 1, date));
    return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === date;
}

module.exports = { DAY_MS, startOfDay, dayOf, today, addDays, addMonths, weekdayOf, timeOf, toIso, nowIso, at, isValidDay };
