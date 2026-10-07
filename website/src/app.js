class DailyRitualApp {
  constructor() {
    this.viewDate = new Date();
    this.selectedDate = new Date();
    this.activeView = "calendar";
    this.storageKey = "daily-ritual-v1";
    this.state = this.loadState();
    this.records = this.state.records || {};
    this.events = this.state.events || {};
    this.supplements = this.state.supplements || ["Vitamin D", "Omega-3", "Magnesium"];
    this.elements = {};
  }

  loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey));
      if (!saved) return { records: {}, events: {}, supplements: [] };
      if ((saved.version || 1) < 2) {
        Object.values(saved.events || {}).forEach((events) => {
          events.forEach((event) => {
            if (typeof event !== "string" && event.importance === 3) event.importance = 4;
          });
        });
        saved.version = 2;
      }
      if (saved.version < 3) {
        Object.values(saved.events || {}).forEach((events) => {
          events.forEach((event) => {
            if (typeof event === "string") return;
            event.importance = { 1: 2, 2: 3, 3: 1, 4: 4 }[event.importance] || 3;
          });
        });
        saved.version = 3;
      }
      return saved;
    } catch {
      return { records: {}, events: {}, supplements: [] };
    }
  }

  persist() {
    const snapshot = JSON.stringify({
      version: 3,
      lastSavedAt: new Date().toISOString(),
      records: this.records,
      events: this.events,
      supplements: this.supplements
    });
    localStorage.setItem(this.storageKey, snapshot);
    if (navigator.storage && typeof navigator.storage.persist === "function") {
      navigator.storage.persist().catch(() => {});
    }
  }

  init() {
    this.elements = {
      calendarGrid: document.querySelector("#calendarGrid"), monthTitle: document.querySelector("#monthTitle"),
      calendarTab: document.querySelector("#calendarTab"), eventsTab: document.querySelector("#eventsTab"),
      calendarView: document.querySelector("#calendarView"), eventsView: document.querySelector("#eventsView"),
      eventsSearch: document.querySelector("#eventsSearch"), allEventsCount: document.querySelector("#allEventsCount"),
      allEventsList: document.querySelector("#allEventsList"), allEventsEmpty: document.querySelector("#allEventsEmpty"),
      selectedDate: document.querySelector("#selectedDate"), dayBadge: document.querySelector("#dayBadge"),
      selectedItems: document.querySelector("#selectedItems"), supplementList: document.querySelector("#supplementList"),
      eventCount: document.querySelector("#eventCount"), eventForm: document.querySelector("#eventForm"),
      eventSubject: document.querySelector("#eventSubject"), eventDescription: document.querySelector("#eventDescription"),
      eventDialog: document.querySelector("#eventDialog"), eventDialogTitle: document.querySelector("#eventDialogTitle"),
      eventList: document.querySelector("#eventList"),
      supplementCount: document.querySelector("#supplementCount"), completedCount: document.querySelector("#completedCount"),
      streakCount: document.querySelector("#streakCount"), supplementForm: document.querySelector("#supplementForm"),
      supplementName: document.querySelector("#supplementName"), logDialog: document.querySelector("#logDialog"),
      quickMenuDialog: document.querySelector("#quickMenuDialog"),
      checklist: document.querySelector("#checklist"), dialogTitle: document.querySelector("#dialogTitle"),
      toast: document.querySelector("#toast"), storageStatus: document.querySelector("#storageStatus")
    };

    document.querySelector("#previousMonth").addEventListener("click", () => this.changeMonth(-1));
    this.elements.calendarTab.addEventListener("click", () => this.setView("calendar"));
    this.elements.eventsTab.addEventListener("click", () => this.setView("events"));
    this.elements.eventsSearch.addEventListener("input", () => this.renderEventsBrowser());
    document.addEventListener("keydown", (event) => this.handleKeyboardShortcut(event));
    window.addEventListener("pagehide", () => this.persist());
    window.addEventListener("beforeunload", () => this.persist());
    window.addEventListener("storage", (event) => {
      if (event.key === this.storageKey && event.newValue) {
        this.state = JSON.parse(event.newValue);
        this.records = this.state.records || {};
        this.events = this.state.events || {};
        this.supplements = this.state.supplements || [];
        this.renderAll();
      }
    });
    document.querySelector("#nextMonth").addEventListener("click", () => this.changeMonth(1));
    document.querySelector("#todayButton").addEventListener("click", () => this.goToday());
    document.querySelector("#logButton").addEventListener("click", () => this.openLogDialog());
    document.querySelector("#cancelButton").addEventListener("click", () => this.elements.logDialog.close());
    document.querySelector("#quickLogButton").addEventListener("click", () => {
      this.elements.quickMenuDialog.close();
      this.openLogDialog();
    });
    document.querySelector("#quickEventButton").addEventListener("click", () => {
      this.elements.quickMenuDialog.close();
      this.openEventDialog();
    });
    document.querySelector("#addEventButton").addEventListener("click", () => this.openEventDialog());
    document.querySelector("#cancelEventButton").addEventListener("click", () => this.elements.eventDialog.close());
    document.querySelector("#closeEventButton").addEventListener("click", () => this.elements.eventDialog.close());
    this.elements.quickMenuDialog.addEventListener("click", (event) => {
      if (event.target === this.elements.quickMenuDialog) this.elements.quickMenuDialog.close();
    });
    this.elements.eventDialog.addEventListener("click", (event) => {
      if (event.target === this.elements.eventDialog) this.elements.eventDialog.close();
    });
    this.elements.eventForm.addEventListener("submit", (event) => this.addEvent(event));
    this.elements.supplementForm.addEventListener("submit", (event) => this.addSupplement(event));
    document.querySelector("#logForm").addEventListener("submit", (event) => this.saveDay(event));
    this.elements.logDialog.addEventListener("click", (event) => {
      if (event.target === this.elements.logDialog) this.elements.logDialog.close();
    });

    if (!this.supplements.length) {
      this.supplements = ["Vitamin D", "Omega-3", "Magnesium"];
      this.persist();
    }
    if (navigator.storage && typeof navigator.storage.persist === "function") {
      navigator.storage.persist().then((granted) => {
        this.elements.storageStatus.textContent = granted
          ? "Restart-safe local storage"
          : "Restart-safe local storage";
      });
    }
    this.renderAll();
  }

  dateKey(date) { return CalendarCore.toDateKey(date); }

  handleKeyboardShortcut(event) {
    if (this.activeView !== "calendar" || event.altKey || event.ctrlKey || event.metaKey || this.elements.logDialog.open || this.elements.quickMenuDialog.open || this.elements.eventDialog.open) return;

    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || target.matches("input, textarea, select"))) return;

    if (event.code === "Space" || event.key === " ") {
      if (target instanceof HTMLElement && target.closest("button, a") && !target.closest("#logButton, .calendar-day")) return;
      event.preventDefault();
      this.openQuickMenu();
      return;
    }

    const movement = { w: -7, a: -1, s: 7, d: 1 }[event.key.toLowerCase()];
    if (!movement) return;

    event.preventDefault();
    const nextDate = new Date(this.selectedDate);
    nextDate.setDate(nextDate.getDate() + movement);
    this.selectedDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
    this.viewDate = new Date(nextDate.getFullYear(), nextDate.getMonth(), 1);
    this.renderAll();
  }

  renderAll() {
    this.renderCalendar();
    this.renderSupplements();
    this.renderSelected();
    this.renderEvents();
    this.renderEventsBrowser();
    this.renderStats();
  }

  setView(view) {
    this.activeView = view;
    const showCalendar = view === "calendar";
    this.elements.calendarTab.classList.toggle("active", showCalendar);
    this.elements.eventsTab.classList.toggle("active", !showCalendar);
    this.elements.calendarTab.setAttribute("aria-selected", String(showCalendar));
    this.elements.eventsTab.setAttribute("aria-selected", String(!showCalendar));
    this.elements.calendarView.hidden = !showCalendar;
    this.elements.eventsView.hidden = showCalendar;
    if (!showCalendar) this.renderEventsBrowser();
  }

  renderCalendar() {
    const days = CalendarCore.buildCalendarDays(this.viewDate);
    this.elements.monthTitle.textContent = CalendarCore.getMonthLabel(this.viewDate);
    this.elements.calendarGrid.replaceChildren();

    days.forEach(({ date, dateKey, isCurrentMonth }) => {
      const button = document.createElement("button");
      const items = CalendarCore.getSelectedItems(this.records, dateKey);
      const events = this.events[dateKey] || [];
      const completedEvents = events.filter((event) => this.eventDetails(event).completed).length;
      const incompleteEvents = events.filter((event) => !this.eventDetails(event).completed);
      const isToday = dateKey === this.dateKey(new Date());
      const isSelected = dateKey === this.dateKey(this.selectedDate);
      button.type = "button";
      button.className = `calendar-day${isCurrentMonth ? "" : " outside-month"}${isToday ? " today" : ""}${isSelected ? " selected" : ""}`;
      button.dataset.dateKey = dateKey;
      const description = [];
      if (items.length) description.push(`${items.length} supplement${items.length === 1 ? "" : "s"} logged`);
      if (events.length) description.push(`${events.length} event${events.length === 1 ? "" : "s"}`);
      if (completedEvents) description.push(`${completedEvents} completed`);
      button.setAttribute("aria-label", `${date.toLocaleDateString()}, ${description.join(", ") || "no supplements or events"}`);
      const dayNumber = document.createElement("span");
      dayNumber.className = "day-number";
      dayNumber.textContent = date.getDate();
      button.appendChild(dayNumber);

      const eventLabel = events.length ? `${events.length} event${events.length === 1 ? "" : "s"}` : null;
      const labels = eventLabel ? [eventLabel] : [];
      if (labels.length) {
        const dayItems = document.createElement("span");
        dayItems.className = "day-items";
        dayItems.textContent = `${labels.slice(0, 2).join(" · ")}${labels.length > 2 ? ` +${labels.length - 2}` : ""}`;
        button.appendChild(dayItems);
      }
      if (items.length) {
        const dot = document.createElement("i");
        dot.className = "day-dot";
        dot.style.setProperty("--dot-color", CalendarCore.SUPPLEMENT_COLORS[items[0]] || "#4e765f");
        button.appendChild(dot);
      }
      if (incompleteEvents.length) {
        const marker = document.createElement("i");
        const highestImportance = Math.max(...incompleteEvents.map((event) => this.eventDetails(event).importance));
        marker.className = `event-marker-calendar importance-${highestImportance}`;
        marker.setAttribute("aria-hidden", "true");
        button.appendChild(marker);
      }
      if (completedEvents) {
        const indicator = document.createElement("span");
        indicator.className = "event-completion-indicator";
        indicator.textContent = "✓";
        indicator.setAttribute("aria-hidden", "true");
        button.appendChild(indicator);
      }
      button.addEventListener("click", () => {
        this.selectedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        this.viewDate = new Date(date.getFullYear(), date.getMonth(), 1);
        this.renderAll();
      });
      this.elements.calendarGrid.appendChild(button);
    });
  }

  renderSelected() {
    const key = this.dateKey(this.selectedDate);
    const items = CalendarCore.getSelectedItems(this.records, key);
    this.elements.selectedDate.textContent = this.selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    this.elements.dayBadge.textContent = this.selectedDate.getDate();
    this.elements.selectedItems.replaceChildren();

    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Nothing logged yet. Add your routine for this day.";
      this.elements.selectedItems.appendChild(empty);
    } else {
      items.forEach((name) => {
        const row = document.createElement("div");
        row.className = "selected-item";
        row.style.setProperty("--item-color", CalendarCore.SUPPLEMENT_COLORS[name] || "#4e765f");
        row.innerHTML = `<i></i><span>${this.escapeHtml(name)}</span>`;
        this.elements.selectedItems.appendChild(row);
      });
    }
  }

  renderSupplements() {
    this.elements.supplementList.replaceChildren();
    this.elements.supplementCount.textContent = this.supplements.length;
    this.supplements.forEach((name) => {
      const row = document.createElement("div");
      row.className = "supplement-row";
      row.innerHTML = `<span class="supplement-name"><i style="--item-color:${CalendarCore.SUPPLEMENT_COLORS[name] || "#4e765f"}"></i><span>${this.escapeHtml(name)}</span></span>`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remove ${name}`);
      remove.addEventListener("click", () => this.removeSupplement(name));
      row.appendChild(remove);
      this.elements.supplementList.appendChild(row);
    });
  }

  renderStats() {
    const stats = CalendarCore.getStats(this.records);
    this.elements.completedCount.textContent = stats.loggedDays;
    this.elements.streakCount.textContent = stats.streak;
  }

  renderEvents() {
    const key = this.dateKey(this.selectedDate);
    const events = this.events[key] || [];
    this.elements.eventCount.textContent = events.length;
    this.elements.eventList.replaceChildren();

    if (!events.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No events scheduled.";
      this.elements.eventList.appendChild(empty);
      return;
    }

    events.forEach((event, index) => {
      const { subject, description, importance, completed, status: eventStatus } = this.eventDetails(event);
      const row = document.createElement("div");
      row.className = `event-row status-${eventStatus}${completed ? " completed" : ""}`;
      const copy = document.createElement("div");
      copy.className = "event-copy";
      const badge = document.createElement("span");
      const importanceLabel = ["", "Neutral", "Low", "Mild", "Very Important"][importance];
      badge.className = `event-importance importance-${importance}`;
      badge.textContent = `${importance} · ${importanceLabel}`;
      copy.appendChild(badge);
      const name = document.createElement("span");
      name.className = "event-name";
      name.textContent = subject;
      copy.appendChild(name);
      if (description) {
        const details = document.createElement("p");
        details.className = "event-description";
        details.textContent = description;
        copy.appendChild(details);
      }
      const actions = document.createElement("div");
      actions.className = "event-actions";
      const status = document.createElement("select");
      status.className = "event-status";
      status.setAttribute("aria-label", `Status for ${subject}`);
      [
        ["incomplete", "Incomplete"],
        ["neutral", "Neutral"],
        ["completed", "Completed"]
      ].forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        status.appendChild(option);
      });
      status.value = eventStatus;
      status.addEventListener("change", () => this.setEventStatus(key, index, status.value));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remove event ${subject}`);
      remove.addEventListener("click", () => this.removeEvent(key, index));
      actions.append(status, remove);
      row.append(copy, actions);
      this.elements.eventList.appendChild(row);
    });
  }

  renderEventsBrowser() {
    if (!this.elements.allEventsList) return;

    const query = this.elements.eventsSearch.value.trim().toLocaleLowerCase();
    const events = Object.entries(this.events)
      .flatMap(([dateKey, dayEvents]) => dayEvents.map((event) => ({ dateKey, ...this.eventDetails(event) })))
      .filter((event) => event.subject.toLocaleLowerCase().includes(query))
      .sort((first, second) => first.dateKey.localeCompare(second.dateKey) || first.subject.localeCompare(second.subject));

    this.elements.allEventsCount.textContent = events.length;
    this.elements.allEventsList.replaceChildren();
    this.elements.allEventsEmpty.hidden = events.length > 0;
    this.elements.allEventsEmpty.textContent = query ? "No matching events." : "No events yet.";

    events.forEach((event) => {
      const row = document.createElement("article");
      row.className = `event-browser-row${event.completed ? " completed" : ""}`;
      const details = document.createElement("div");
      details.className = "event-browser-details";
      const header = document.createElement("div");
      header.className = "event-browser-titleline";
      const subject = document.createElement("h3");
      subject.className = "event-browser-subject";
      subject.textContent = event.subject;
      const importance = document.createElement("span");
      importance.className = `event-importance importance-${event.importance}`;
      importance.textContent = `${event.importance} · ${["", "Neutral", "Low", "Mild", "Very Important"][event.importance]}`;
      const status = document.createElement("span");
      status.className = `event-status-label status-${event.status}`;
      status.textContent = { incomplete: "Incomplete", neutral: "Neutral", completed: "Completed" }[event.status];
      header.append(subject, importance, status);
      details.appendChild(header);
      if (event.description) {
        const description = document.createElement("p");
        description.className = "event-browser-description";
        description.textContent = event.description;
        details.appendChild(description);
      }

      const actions = document.createElement("div");
      actions.className = "event-browser-actions";
      const [year, month, day] = event.dateKey.split("-").map(Number);
      const date = new Date(year, month - 1, day);
      const dateLabel = document.createElement("time");
      dateLabel.dateTime = event.dateKey;
      dateLabel.textContent = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      const viewDate = document.createElement("button");
      viewDate.type = "button";
      viewDate.className = "view-date-button";
      viewDate.textContent = "View date";
      viewDate.addEventListener("click", () => this.goToDate(event.dateKey));
      actions.append(dateLabel, viewDate);
      row.append(details, actions);
      this.elements.allEventsList.appendChild(row);
    });
  }

  changeMonth(amount) {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + amount, 1);
    this.renderCalendar();
  }

  openQuickMenu() {
    const date = this.selectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    document.querySelector("#quickMenuTitle").textContent = `Add to ${date}`;
    this.elements.quickMenuDialog.showModal();
  }

  openEventDialog() {
    const date = this.selectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    this.elements.eventDialogTitle.textContent = `Add event for ${date}`;
    this.elements.eventSubject.value = "";
    this.elements.eventDescription.value = "";
    this.elements.eventForm.querySelectorAll('input[name="eventImportance"]').forEach((input) => {
      input.checked = false;
    });
    this.elements.eventDialog.showModal();
    this.elements.eventSubject.focus();
  }

  goToday() {
    this.viewDate = new Date();
    this.selectedDate = new Date();
    this.renderAll();
  }

  goToDate(dateKey) {
    const [year, month, day] = dateKey.split("-").map(Number);
    this.selectedDate = new Date(year, month - 1, day);
    this.viewDate = new Date(year, month - 1, 1);
    this.setView("calendar");
    this.renderAll();
  }

  addSupplement(event) {
    event.preventDefault();
    const name = this.elements.supplementName.value.trim();
    if (!name || this.supplements.some((item) => item.toLowerCase() === name.toLowerCase())) {
      this.showToast("That supplement is already in your routine.");
      return;
    }
    this.supplements.push(name);
    this.persist();
    this.elements.supplementName.value = "";
    this.renderSupplements();
    this.showToast(`${name} added.`);
  }

  addEvent(event) {
    event.preventDefault();
    const subject = this.elements.eventSubject.value.trim();
    const description = this.elements.eventDescription.value.trim();
    const importance = Number(this.elements.eventForm.querySelector('input[name="eventImportance"]:checked')?.value);
    if (!subject || ![1, 2, 3, 4].includes(importance)) return;

    const key = this.dateKey(this.selectedDate);
    this.events[key] = [...(this.events[key] || []), { subject, description, importance, status: "incomplete", completed: false }];
    this.persist();
    this.elements.eventDialog.close();
    this.renderCalendar();
    this.renderEvents();
    this.renderEventsBrowser();
    this.showToast("Event added.");
  }

  eventDetails(event) {
    if (typeof event === "string") return { subject: event, description: "", importance: 3, status: "incomplete", completed: false };
    const status = ["incomplete", "neutral", "completed"].includes(event.status)
      ? event.status
      : event.completed === true ? "completed" : "incomplete";
    return {
      ...event,
      importance: [1, 2, 3, 4].includes(event.importance) ? event.importance : 3,
      status,
      completed: status === "completed"
    };
  }

  setEventStatus(dateKey, index, status) {
    const details = this.eventDetails(this.events[dateKey][index]);
    this.events[dateKey][index] = { ...details, status, completed: status === "completed" };
    this.persist();
    this.renderCalendar();
    this.renderEvents();
    this.renderEventsBrowser();
    const label = { incomplete: "incomplete", neutral: "neutral", completed: "completed" }[status];
    this.showToast(`Event marked ${label}.`);
  }

  removeEvent(dateKey, index) {
    this.events[dateKey].splice(index, 1);
    if (!this.events[dateKey].length) delete this.events[dateKey];
    this.persist();
    this.renderCalendar();
    this.renderEvents();
    this.renderEventsBrowser();
    this.showToast("Event removed.");
  }

  removeSupplement(name) {
    this.supplements = this.supplements.filter((item) => item !== name);
    Object.keys(this.records).forEach((key) => {
      this.records[key] = this.records[key].filter((item) => item !== name);
      if (!this.records[key].length) delete this.records[key];
    });
    this.persist();
    this.renderAll();
    this.showToast(`${name} removed.`);
  }

  openLogDialog() {
    const key = this.dateKey(this.selectedDate);
    const checked = new Set(this.records[key] || []);
    this.elements.dialogTitle.textContent = `Log ${this.selectedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    this.elements.checklist.replaceChildren();
    this.supplements.forEach((name) => {
      const label = document.createElement("label");
      label.className = "check-option";
      label.style.setProperty("--item-color", CalendarCore.SUPPLEMENT_COLORS[name] || "#4e765f");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = name;
      checkbox.checked = checked.has(name);
      const text = document.createElement("span");
      text.textContent = name;
      const dot = document.createElement("i");
      label.append(checkbox, text, dot);
      this.elements.checklist.appendChild(label);
    });
    this.elements.logDialog.showModal();
  }

  saveDay(event) {
    event.preventDefault();
    const key = this.dateKey(this.selectedDate);
    const selected = [...this.elements.checklist.querySelectorAll("input:checked")].map((input) => input.value);
    if (selected.length) this.records[key] = selected;
    else delete this.records[key];
    this.persist();
    this.elements.logDialog.close();
    this.renderAll();
    this.showToast("Day saved.");
  }

  showToast(message) {
    this.elements.toast.textContent = message;
    this.elements.toast.classList.add("show");
    window.setTimeout(() => this.elements.toast.classList.remove("show"), 2200);
  }

  escapeHtml(value) {
    return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  }
}
