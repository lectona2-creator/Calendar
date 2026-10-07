(() => {
  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const SUPPLEMENT_COLORS = {
    "Vitamin D": "#d79a52",
    "Omega-3": "#6e8fc0",
    "Magnesium": "#65a97d"
  };

  function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function buildCalendarDays(viewDate) {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1 - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      return {
        date,
        dateKey: toDateKey(date),
        isCurrentMonth: date.getMonth() === viewDate.getMonth()
      };
    });
  }

  function getMonthLabel(date) {
    return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  function getSelectedItems(records, dateKey) {
    return records[dateKey] || [];
  }

  function getStats(records) {
    const loggedDays = Object.keys(records).filter((key) => records[key].length > 0).length;
    let streak = 0;
    const today = new Date();
    const todayKey = toDateKey(today);
    const startOffset = records[todayKey] && records[todayKey].length > 0 ? 0 : 1;
    for (let offset = startOffset; offset < 365; offset += 1) {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
      const key = toDateKey(date);
      if (records[key] && records[key].length > 0) {
        streak += 1;
      } else {
        break;
      }
    }
    return { loggedDays, streak };
  }

  const CalendarCore = { buildCalendarDays, getMonthLabel, getSelectedItems, getStats, toDateKey, SUPPLEMENT_COLORS };
  globalThis.CalendarCore = CalendarCore;

  if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
      const app = new DailyRitualApp();
      app.init();
    });
  }
})();
