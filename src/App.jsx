import {
  Activity,
  Archive,
  Award,
  BarChart3,
  Bell,
  BellRing,
  BookOpen,
  Brain,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Gauge,
  HeartPulse,
  Home,
  LogOut,
  Moon,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Timer,
  Trash2,
  TrendingDown,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

const USERS_KEY = "habit-flow:users:v2";
const SESSION_KEY = "habit-flow:session:v2";
const DATA_PREFIX = "habit-flow:data:v2:";

const colors = ["#2f80ed", "#1f9d7a", "#f29f05", "#e35d6a", "#8f5bdc", "#0f8b8d"];

const areas = [
  "Здоровье",
  "Спорт",
  "Развитие",
  "Фокус",
  "Финансы",
  "Дом",
  "Отношения",
  "Восстановление",
];

const habitTypes = {
  check: { label: "Отметка", unit: "раз", target: 1, helper: "Выполнено или нет" },
  count: { label: "Количество", unit: "раз", target: 5, helper: "Шаги, стаканы, подходы, задачи" },
  duration: { label: "Время", unit: "мин", target: 30, helper: "Медитация, чтение, тренировка" },
  rating: { label: "Оценка", unit: "баллов", target: 4, helper: "Сон, настроение, энергия по шкале 1-5" },
  avoid: { label: "Анти-привычка", unit: "срывов", target: 0, helper: "День считается хорошим, если срывов нет" },
};

const iconOptions = [
  { id: "activity", label: "Активность", Icon: Activity },
  { id: "water", label: "Вода", Icon: Droplets },
  { id: "book", label: "Чтение", Icon: BookOpen },
  { id: "sleep", label: "Сон", Icon: Moon },
  { id: "walk", label: "Шаги", Icon: Footprints },
  { id: "sport", label: "Спорт", Icon: Dumbbell },
  { id: "focus", label: "Фокус", Icon: Brain },
  { id: "health", label: "Здоровье", Icon: HeartPulse },
  { id: "rating", label: "Оценка", Icon: Star },
  { id: "avoid", label: "Анти-привычка", Icon: TrendingDown },
];

const templates = [
  template("Пить воду", "Здоровье", "water", "#2f80ed", "count", 8, "стаканов", "Поддерживать энергию в течение дня.", "10:00"),
  template("Прогулка", "Спорт", "walk", "#1f9d7a", "duration", 40, "мин", "Ежедневное движение без давления.", "18:30"),
  template("Чтение", "Развитие", "book", "#f29f05", "duration", 25, "мин", "Стабильный слот для идей.", "21:00"),
  template("Фокус-блок", "Фокус", "focus", "#0f8b8d", "duration", 50, "мин", "Работа без переключения контекста.", "11:00"),
  template("Сон до полуночи", "Восстановление", "sleep", "#8f5bdc", "check", 1, "раз", "Закрыть день спокойно.", "22:30"),
  template("Без сладкого", "Здоровье", "avoid", "#e35d6a", "avoid", 0, "срывов", "Отслеживать дни без срывов.", "20:00"),
  template("Настроение", "Восстановление", "rating", "#f29f05", "rating", 4, "баллов", "Оценка состояния по шкале 1-5.", "21:30"),
  template("Тренировка", "Спорт", "sport", "#1f9d7a", "check", 1, "раз", "Короткая тренировка тоже считается.", "19:00"),
];

const navItems = [
  { id: "today", label: "Сегодня", Icon: Home },
  { id: "calendar", label: "Календарь", Icon: CalendarDays },
  { id: "insights", label: "Аналитика", Icon: BarChart3 },
  { id: "settings", label: "Настройки", Icon: Settings },
];

function template(name, area, icon, color, type, target, unit, note, time) {
  return {
    name,
    area,
    icon,
    color,
    type,
    target,
    unit,
    note,
    schedule: { mode: "daily", days: [1, 2, 3, 4, 5, 6, 7], timesPerWeek: 3, interval: 2 },
    reminder: { enabled: true, time },
  };
}

function todayISO() {
  return toISO(new Date());
}

function toISO(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function parseISODate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(iso, amount) {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + amount);
  return toISO(date);
}

function formatHuman(iso, options = { day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat("ru-RU", options).format(parseISODate(iso));
}

function storageRead(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function defaultData() {
  return {
    onboarded: false,
    points: 0,
    rewards: [
      { id: "coffee", title: "Кофе без спешки", cost: 60, redeemed: 0 },
      { id: "movie", title: "Вечер фильма", cost: 140, redeemed: 0 },
      { id: "free-evening", title: "Свободный вечер", cost: 240, redeemed: 0 },
    ],
    habits: [],
    entries: {},
    remindersLog: {},
    preferences: {
      weeklyFocus: "Собрать свою систему",
      compactMode: false,
      notificationsEnabled: false,
      theme: "light",
    },
  };
}

function normalizeData(data) {
  const base = defaultData();
  return {
    ...base,
    ...data,
    onboarded: data.onboarded ?? Boolean(data.habits?.length),
    habits: (data.habits || []).map((habit) => ({
      ...habit,
      schedule: habit.schedule || baseSchedule(),
      reminder: habit.reminder || { enabled: false, time: "20:00" },
    })),
    rewards: data.rewards || base.rewards,
    preferences: { ...base.preferences, ...(data.preferences || {}) },
  };
}

function baseSchedule() {
  return { mode: "daily", days: [1, 2, 3, 4, 5, 6, 7], timesPerWeek: 3, interval: 2 };
}

function userDataKey(userId) {
  return `${DATA_PREFIX}${userId}`;
}

function makeId() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getIcon(iconId) {
  return iconOptions.find((item) => item.id === iconId)?.Icon || Activity;
}

function dayNumber(iso) {
  return ((parseISODate(iso).getDay() + 6) % 7) + 1;
}

function weekStartISO(iso) {
  return addDays(iso, -(dayNumber(iso) - 1));
}

function getWeekRange(iso) {
  const start = weekStartISO(iso);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function getSchedule(habit) {
  return habit.schedule || baseSchedule();
}

function isHabitDue(habit, date, entries = {}) {
  if (habit.archived) return false;
  const schedule = getSchedule(habit);
  const day = dayNumber(date);

  if (schedule.mode === "weekdays") return day <= 5;
  if (schedule.mode === "days") return (schedule.days || []).includes(day);
  if (schedule.mode === "interval") {
    const start = habit.createdAt || date;
    const diff = Math.max(0, Math.round((parseISODate(date) - parseISODate(start)) / 86400000));
    return diff % Math.max(1, Number(schedule.interval) || 1) === 0;
  }
  if (schedule.mode === "timesPerWeek") {
    const target = Math.max(1, Number(schedule.timesPerWeek) || 1);
    const completed = getWeekRange(date).filter((dayIso) => isComplete(habit, entries[dayIso]?.[habit.id])).length;
    return completed < target || isComplete(habit, entries[date]?.[habit.id]);
  }
  return true;
}

function scheduleLabel(habit) {
  const schedule = getSchedule(habit);
  const dayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  if (schedule.mode === "weekdays") return "по будням";
  if (schedule.mode === "days") return (schedule.days || []).map((day) => dayLabels[day - 1]).join(", ") || "выбранные дни";
  if (schedule.mode === "timesPerWeek") return `${schedule.timesPerWeek || 1} раз(а) в неделю`;
  if (schedule.mode === "interval") return `каждые ${schedule.interval || 1} дн.`;
  return "каждый день";
}

function defaultValue(habit) {
  return habit.type === "avoid" ? 0 : 0;
}

function progressFor(habit, value) {
  if (value === undefined || value === null || value === "") return 0;
  const actual = Number(value ?? defaultValue(habit));
  if (habit.type === "avoid") return actual > 0 ? 0 : 1;
  if (habit.type === "check") return actual >= 1 ? 1 : 0;
  if (!habit.target) return 0;
  return Math.min(1, actual / Number(habit.target));
}

function isComplete(habit, value) {
  return progressFor(habit, value) >= 1;
}

function getDayScore(habits, entries, date) {
  const active = habits.filter((habit) => isHabitDue(habit, date, entries));
  if (!active.length) return 0;
  const sum = active.reduce((acc, habit) => acc + progressFor(habit, entries[date]?.[habit.id]), 0);
  return Math.round((sum / active.length) * 100);
}

function getHabitStreak(habit, entries, startDate) {
  let date = startDate;
  let streak = 0;
  let guard = 0;
  while (guard < 365) {
    if (isHabitDue(habit, date, entries)) {
      if (!isComplete(habit, entries[date]?.[habit.id])) break;
      streak += 1;
    }
    date = addDays(date, -1);
    guard += 1;
  }
  return streak;
}

function getBestStreak(habit, entries) {
  const days = Object.keys(entries).sort();
  let best = 0;
  let current = 0;
  days.forEach((day) => {
    if (!isHabitDue(habit, day, entries)) return;
    if (isComplete(habit, entries[day]?.[habit.id])) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  });
  return best;
}

function getRange(endDate, days) {
  return Array.from({ length: days }, (_, index) => addDays(endDate, index - days + 1));
}

function App() {
  const [users, setUsers] = useState(() => storageRead(USERS_KEY, []));
  const [session, setSession] = useState(() => storageRead(SESSION_KEY, null));
  const [publicMode, setPublicMode] = useState("landing");
  const [authMode, setAuthMode] = useState("register");
  const currentUser = users.find((user) => user.id === session?.userId) || null;

  useEffect(() => localStorage.setItem(USERS_KEY, JSON.stringify(users)), [users]);
  useEffect(() => {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  }, [session]);

  function register({ name, email, password }) {
    const cleanEmail = email.trim().toLowerCase();
    if (users.some((user) => user.email === cleanEmail)) {
      return "Аккаунт с таким email уже есть.";
    }
    const user = { id: makeId(), name: name.trim() || "Пользователь", email: cleanEmail, password: btoa(password) };
    setUsers((list) => [...list, user]);
    localStorage.setItem(userDataKey(user.id), JSON.stringify(defaultData()));
    setSession({ userId: user.id });
    return null;
  }

  function login({ email, password }) {
    const user = users.find((item) => item.email === email.trim().toLowerCase() && item.password === btoa(password));
    if (!user) return "Неверный email или пароль.";
    setSession({ userId: user.id });
    return null;
  }

  function changePassword(userId, currentPassword, nextPassword) {
    const user = users.find((item) => item.id === userId);
    if (!user || user.password !== btoa(currentPassword)) return "Текущий пароль введён неверно.";
    if (nextPassword.length < 4) return "Новый пароль должен быть не короче 4 символов.";
    setUsers((list) => list.map((item) => (item.id === userId ? { ...item, password: btoa(nextPassword) } : item)));
    return null;
  }

  if (!currentUser) {
    if (publicMode === "auth") {
      return (
        <AuthScreen
          key={authMode}
          onLogin={login}
          onRegister={register}
          hasUsers={users.length > 0}
          initialMode={authMode}
          onBack={() => setPublicMode("landing")}
        />
      );
    }
    return (
      <LandingPage
        onLogin={() => {
          setAuthMode("login");
          setPublicMode("auth");
        }}
        onRegister={() => {
          setAuthMode("register");
          setPublicMode("auth");
        }}
      />
    );
  }

  return <HabitApp user={currentUser} onLogout={() => setSession(null)} onChangePassword={changePassword} />;
}

function HabitApp({ user, onLogout, onChangePassword }) {
  const [state, setState] = useState(() => normalizeData(storageRead(userDataKey(user.id), defaultData())));
  const [view, setView] = useState("today");
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [selectedHabitId, setSelectedHabitId] = useState("all");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    localStorage.setItem(userDataKey(user.id), JSON.stringify(state));
  }, [state, user.id]);

  const activeHabits = useMemo(() => state.habits.filter((habit) => !habit.archived), [state.habits]);
  const dueHabits = useMemo(
    () => activeHabits.filter((habit) => isHabitDue(habit, selectedDate, state.entries)),
    [activeHabits, selectedDate, state.entries],
  );
  const selectedHabit =
    selectedHabitId === "all" ? null : activeHabits.find((habit) => habit.id === selectedHabitId) || null;
  const dayEntries = state.entries[selectedDate] || {};
  const dayScore = getDayScore(state.habits, state.entries, selectedDate);
  const todayScore = getDayScore(state.habits, state.entries, todayISO());

  const filteredHabits = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return dueHabits.filter((habit) => {
      const matchesSelected = selectedHabitId === "all" || habit.id === selectedHabitId;
      const matchesSearch =
        !normalized || `${habit.name} ${habit.area} ${habit.type} ${habit.note}`.toLowerCase().includes(normalized);
      return matchesSelected && matchesSearch;
    });
  }, [dueHabits, query, selectedHabitId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const date = todayISO();
      activeHabits.forEach((habit) => {
        if (!habit.reminder?.enabled || habit.reminder.time !== currentTime) return;
        if (!isHabitDue(habit, date, state.entries)) return;
        if (isComplete(habit, state.entries[date]?.[habit.id])) return;
        const key = `${date}:${habit.id}:${currentTime}`;
        if (state.remindersLog[key]) return;

        const message = `Пора: ${habit.name}`;
        setToast({ title: "Напоминание", message });
        if (state.preferences.notificationsEnabled && "Notification" in window && Notification.permission === "granted") {
          new Notification("Habit Flow", { body: message });
        }
        setState((current) => ({ ...current, remindersLog: { ...current.remindersLog, [key]: true } }));
      });
    }, 30000);

    return () => window.clearInterval(interval);
  }, [activeHabits, state.entries, state.preferences.notificationsEnabled, state.remindersLog]);

  function setPreferences(preferences) {
    setState((current) => ({ ...current, preferences }));
  }

  function updateEntry(habitId, nextValue) {
    const habit = state.habits.find((item) => item.id === habitId);
    setState((current) => ({
      ...current,
      points:
        habit && !isComplete(habit, current.entries[selectedDate]?.[habitId]) && isComplete(habit, nextValue)
          ? (current.points || 0) + 10
          : current.points || 0,
      entries: {
        ...current.entries,
        [selectedDate]: {
          ...(current.entries[selectedDate] || {}),
          [habitId]: Math.max(0, Number(nextValue) || 0),
        },
      },
    }));
  }

  function quickComplete(habit) {
    const current = dayEntries[habit.id] ?? defaultValue(habit);
    if (habit.type === "avoid") updateEntry(habit.id, current > 0 ? 0 : 1);
    else if (habit.type === "check") updateEntry(habit.id, current ? 0 : 1);
    else updateEntry(habit.id, habit.target);
  }

  function saveHabit(payload) {
    setState((current) => {
      const id = payload.id || makeId();
      const typeDefaults = habitTypes[payload.type] || habitTypes.check;
      const habit = {
        ...payload,
        id,
        area: payload.area || "Личное",
        target: payload.type === "avoid" ? 0 : Math.max(1, Number(payload.target) || typeDefaults.target),
        unit: payload.unit || typeDefaults.unit,
        schedule: payload.schedule || baseSchedule(),
        reminder: payload.reminder || { enabled: false, time: "20:00" },
        createdAt: payload.createdAt || todayISO(),
      };
      const exists = current.habits.some((item) => item.id === id);
      return {
        ...current,
        habits: exists ? current.habits.map((item) => (item.id === id ? habit : item)) : [...current.habits, habit],
      };
    });
    setEditor(null);
  }

  function addTemplate(item) {
    saveHabit({ ...item, id: undefined, createdAt: todayISO() });
  }

  function finishOnboarding(selectedTemplates, focus) {
    setState((current) => ({
      ...current,
      onboarded: true,
      habits: [
        ...current.habits,
        ...selectedTemplates.map((item) => ({
          ...item,
          id: makeId(),
          createdAt: todayISO(),
          schedule: item.schedule || baseSchedule(),
        })),
      ],
      preferences: { ...current.preferences, weeklyFocus: focus || current.preferences.weeklyFocus },
    }));
  }

  function archiveHabit(id) {
    setState((current) => ({
      ...current,
      habits: current.habits.map((habit) => (habit.id === id ? { ...habit, archived: true } : habit)),
    }));
    if (selectedHabitId === id) setSelectedHabitId("all");
  }

  function clearUserData() {
    setState(defaultData());
    setSelectedHabitId("all");
    setSelectedDate(todayISO());
  }

  function redeemReward(rewardId) {
    setState((current) => {
      const reward = (current.rewards || []).find((item) => item.id === rewardId);
      if (!reward || (current.points || 0) < reward.cost) return current;
      return {
        ...current,
        points: current.points - reward.cost,
        rewards: current.rewards.map((item) => (item.id === rewardId ? { ...item, redeemed: (item.redeemed || 0) + 1 } : item)),
      };
    });
  }

  const chartHabit = selectedHabit || activeHabits[0] || null;
  const weeklyBars = getRange(selectedDate, 7).map((date) => ({
    date,
    score:
      selectedHabit && chartHabit
        ? Math.round(progressFor(chartHabit, state.entries[date]?.[chartHabit.id]) * 100)
        : getDayScore(state.habits, state.entries, date),
  }));

  if (!state.onboarded) {
    return <OnboardingScreen onComplete={finishOnboarding} onSkip={() => setState((current) => ({ ...current, onboarded: true }))} />;
  }

  return (
    <div className={`app-shell ${state.preferences.compactMode ? "compact" : ""}`} data-theme={state.preferences.theme || "light"}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={20} />
          </div>
          <div>
            <strong>Habit Flow</strong>
            <span>{user.name}</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Основные разделы">
          {navItems.map(({ id, label, Icon }) => (
            <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)} title={label}>
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="side-panel">
          <div className="side-panel-top">
            <span>Фокус недели</span>
            <Gauge size={18} />
          </div>
          <strong>{state.preferences.weeklyFocus}</strong>
          <p>Сегодня выполнено {todayScore}% от личного плана.</p>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">{formatHuman(selectedDate, { weekday: "long", day: "numeric", month: "long" })}</span>
            <h1>{viewTitle(view)}</h1>
          </div>
          <div className="topbar-actions">
            <DateStepper selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
            <button className="primary-action" onClick={() => setEditor(emptyHabit())}>
              <Plus size={18} />
              <span>Привычка</span>
            </button>
            <button className="ghost-action" onClick={onLogout} title="Выйти">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {view === "today" && (
          <TodayView
            habits={filteredHabits}
            activeHabits={dueHabits}
            allHabitsCount={activeHabits.length}
            entries={state.entries}
            selectedDate={selectedDate}
            dayEntries={dayEntries}
            dayScore={dayScore}
            query={query}
            setQuery={setQuery}
            selectedHabitId={selectedHabitId}
            setSelectedHabitId={setSelectedHabitId}
            updateEntry={updateEntry}
            quickComplete={quickComplete}
            editHabit={setEditor}
            archiveHabit={archiveHabit}
            addTemplate={addTemplate}
            points={state.points || 0}
            rewards={state.rewards || []}
            redeemReward={redeemReward}
          />
        )}

        {view === "calendar" && (
          <CalendarView
            habits={activeHabits}
            entries={state.entries}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedHabit={selectedHabit}
            selectedHabitId={selectedHabitId}
            setSelectedHabitId={setSelectedHabitId}
          />
        )}

        {view === "insights" && (
          <InsightsView
            habits={activeHabits}
            entries={state.entries}
            selectedDate={selectedDate}
            selectedHabit={selectedHabit}
            selectedHabitId={selectedHabitId}
            setSelectedHabitId={setSelectedHabitId}
            weeklyBars={weeklyBars}
            chartHabit={chartHabit}
          />
        )}

        {view === "settings" && (
          <SettingsView
            preferences={state.preferences}
            setPreferences={setPreferences}
            clearUserData={clearUserData}
            habits={activeHabits}
            user={user}
            onChangePassword={onChangePassword}
            archived={state.habits.filter((habit) => habit.archived)}
            restoreHabit={(id) =>
              setState((current) => ({
                ...current,
                habits: current.habits.map((habit) => (habit.id === id ? { ...habit, archived: false } : habit)),
              }))
            }
          />
        )}
      </main>

      {editor && <HabitEditor habit={editor} onClose={() => setEditor(null)} onSave={saveHabit} />}
      {toast && <ReminderToast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function LandingPage({ onLogin, onRegister }) {
  const features = [
    { Icon: CalendarDays, title: "Гибкое расписание", text: "Ежедневно, по будням, в выбранные дни, N раз в неделю или через интервал." },
    { Icon: BarChart3, title: "Понятный прогресс", text: "Тепловая карта, недельный обзор и динамика по каждой привычке." },
    { Icon: BellRing, title: "Напоминания", text: "Настройте время для каждой привычки и держите план дня под рукой." },
    { Icon: Award, title: "Награды", text: "Получайте очки за стабильность и обменивайте их на личные бонусы." },
  ];

  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={20} />
          </div>
          <div>
            <strong>Habit Flow</strong>
            <span>трекер привычек и ритма</span>
          </div>
        </div>
        <div className="landing-actions">
          <button className="link-action" onClick={onLogin}>Войти</button>
          <button className="primary-action" onClick={onRegister}>Начать</button>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-copy">
          <span className="eyebrow">осознанные привычки без хаоса</span>
          <h1>Планируйте привычки так, как живёте</h1>
          <p>
            Habit Flow помогает собрать личную систему: выбрать привычки, настроить расписание,
            видеть прогресс, получать напоминания и возвращаться к ритму без лишнего давления.
          </p>
          <div className="landing-actions hero-actions">
            <button className="primary-action" onClick={onRegister}>Создать аккаунт</button>
            <button className="ghost-action" onClick={onLogin}>У меня уже есть аккаунт</button>
          </div>
          <div className="landing-stats">
            <div>
              <strong>5</strong>
              <span>типов привычек</span>
            </div>
            <div>
              <strong>7</strong>
              <span>дней в обзоре</span>
            </div>
            <div>
              <strong>0</strong>
              <span>автодобавлений</span>
            </div>
          </div>
        </div>

        <div className="product-preview" aria-label="Превью интерфейса Habit Flow">
          <div className="preview-topline">
            <div>
              <span>Сегодня</span>
              <strong>86% плана</strong>
            </div>
            <div className="preview-score">86</div>
          </div>

          <div className="preview-task-list">
            {[
              ["Пить воду", "8 / 8 стаканов", true, Droplets],
              ["Фокус-блок", "35 / 50 мин", false, Brain],
              ["Прогулка", "18:30", false, Footprints],
            ].map(([title, detail, done, Icon]) => (
              <div className={done ? "done" : ""} key={title}>
                <Icon size={18} />
                <span>{title}</span>
                <small>{detail}</small>
              </div>
            ))}
          </div>

          <div className="preview-insight">
            <div>
              <span>Weekly Review</span>
              <strong>Стабильность выросла на 18%</strong>
            </div>
            <div className="preview-bars">
              <i style={{ height: "46%" }} />
              <i style={{ height: "72%" }} />
              <i style={{ height: "58%" }} />
              <i style={{ height: "92%" }} />
              <i style={{ height: "76%" }} />
            </div>
          </div>

          <div className="preview-heatmap">
            {Array.from({ length: 28 }, (_, index) => (
              <i key={index} data-level={(index * 7) % 5} />
            ))}
          </div>
        </div>
      </section>

      <section className="landing-grid">
        {features.map(({ Icon, title, text }) => (
          <article key={title}>
            <Icon size={22} />
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="workflow-band">
        <div className="workflow-intro">
          <span className="eyebrow">как это работает</span>
          <h2>От идеи до устойчивого ритма за несколько шагов</h2>
          <p>Habit Flow не заставляет жить по шаблону: вы выбираете фокус, расписание и темп, а приложение собирает это в понятный план.</p>
        </div>
        <div className="workflow-steps">
          {[
            ["01", "Выберите фокус", "Здоровье, спорт, развитие, сон или собственная сфера."],
            ["02", "Настройте расписание", "Не каждая привычка обязана быть ежедневной."],
            ["03", "Отмечайте день", "Вводите числа, ставьте оценки, закрывайте чек-лист."],
            ["04", "Смотрите обзор", "Неделя показывает, что помогает двигаться дальше."],
          ].map(([step, title, text]) => (
            <article key={step}>
              <strong>{step}</strong>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="reviews-band">
        <div className="section-head">
          <div>
            <span className="eyebrow">отзывы</span>
            <h2>Что пользователи ценят в Habit Flow</h2>
          </div>
        </div>
        <div className="reviews-grid">
          {[
            ["Алина", "UX-дизайнер", "Нравится, что приложение не ругает за пропуски, а показывает ритм недели. Так проще вернуться, а не бросить всё после одного плохого дня."],
            ["Максим", "Frontend-разработчик", "Расписание по дням недели спасает: тренировки, чтение и отдых наконец живут в разных ритмах, а не в одном ежедневном списке."],
            ["Игорь", "Студент", "Награды неожиданно мотивируют лучше, чем просто streak. Есть ощущение, что маленькие действия действительно складываются во что-то видимое."],
          ].map(([name, role, text]) => (
            <article key={name}>
              <div className="review-stars" aria-label="5 из 5">
                {[1, 2, 3, 4, 5].map((item) => (
                  <Star key={item} size={15} />
                ))}
              </div>
              <p>{text}</p>
              <div className="review-author">
                <span>{name.slice(0, 1)}</span>
                <div>
                  <strong>{name}</strong>
                  <small>{role}</small>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <div>
          <span className="eyebrow">готовы попробовать</span>
          <h2>Начните с чистого пространства и добавьте только нужные привычки</h2>
        </div>
        <button className="primary-action" onClick={onRegister}>Создать аккаунт</button>
      </section>
    </main>
  );
}

function AuthScreen({ onLogin, onRegister, hasUsers, initialMode, onBack }) {
  const [mode, setMode] = useState(initialMode || (hasUsers ? "login" : "register"));
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    if (!form.email.includes("@")) return setError("Введите корректный email.");
    if (form.password.length < 4) return setError("Пароль должен быть не короче 4 символов.");
    const message = mode === "login" ? onLogin(form) : onRegister(form);
    setError(message || "");
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="brand auth-brand">
          <div className="brand-mark">
            <Sparkles size={20} />
          </div>
          <div>
            <strong>Habit Flow</strong>
            <span>ваши привычки без предзаполненного шума</span>
          </div>
        </div>
        <h1>{mode === "login" ? "Вход" : "Регистрация"}</h1>

        <form onSubmit={submit} className="auth-form">
          {mode === "register" && (
            <label className="field">
              <span>Имя</span>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
          )}
          <label className="field">
            <span>Email</span>
            <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label className="field">
            <span>Пароль</span>
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-action">{mode === "login" ? "Войти" : "Создать аккаунт"}</button>
        </form>

        <button className="link-action" onClick={() => setMode(mode === "login" ? "register" : "login")}>
          {mode === "login" ? "Создать новый аккаунт" : "Уже есть аккаунт"}
        </button>
        <button className="link-action" type="button" onClick={onBack}>
          Вернуться на главную
        </button>
      </section>
    </main>
  );
}

function OnboardingScreen({ onComplete, onSkip }) {
  const [focus, setFocus] = useState("Здоровье");
  const [selected, setSelected] = useState(() => new Set([0, 1, 2]));
  const focusTemplates = templates.filter((item) => item.area === focus);
  const visibleTemplates = focusTemplates.length ? focusTemplates : templates.slice(0, 6);

  function toggle(index) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function complete() {
    const picked = templates.filter((_, index) => selected.has(index));
    onComplete(picked, focus);
  }

  return (
    <main className="onboarding-screen">
      <section className="onboarding-card">
        <div className="section-head">
          <div>
            <span className="eyebrow">быстрый старт</span>
            <h1>Настроим Habit Flow под вас</h1>
          </div>
          <Sparkles size={24} />
        </div>
        <p className="muted">Выберите фокус и несколько привычек. Ничего не добавится без вашего подтверждения.</p>

        <div className="choice-group">
          <span>Фокус</span>
          <div className="chip-grid">
            {areas.map((area) => (
              <button type="button" key={area} className={focus === area ? "active" : ""} onClick={() => setFocus(area)}>
                {area}
              </button>
            ))}
          </div>
        </div>

        <div className="onboarding-templates">
          {templates.map((item, index) => {
            const Icon = getIcon(item.icon);
            const highlighted = visibleTemplates.includes(item);
            return (
              <button
                type="button"
                key={`${item.name}-${item.area}`}
                className={`${selected.has(index) ? "active" : ""} ${highlighted ? "highlighted" : ""}`}
                onClick={() => toggle(index)}
                style={{ "--accent": item.color }}
              >
                <Icon size={19} />
                <span>{item.name}</span>
                <small>{item.area} · {scheduleLabel(item)}</small>
              </button>
            );
          })}
        </div>

        <div className="editor-actions">
          <button type="button" onClick={onSkip}>Пропустить</button>
          <button className="primary-action" type="button" onClick={complete}>
            <Check size={18} />
            <span>Начать с выбранными</span>
          </button>
        </div>
      </section>
    </main>
  );
}

function viewTitle(view) {
  return {
    today: "Панель привычек",
    calendar: "Календарь прогресса",
    insights: "Аналитика",
    settings: "Настройки",
  }[view];
}

function emptyHabit() {
  return {
    name: "",
    area: areas[0],
    icon: "activity",
    color: colors[0],
    target: habitTypes.check.target,
    unit: habitTypes.check.unit,
    type: "check",
    note: "",
    schedule: baseSchedule(),
    reminder: { enabled: false, time: "20:00" },
  };
}

function DateStepper({ selectedDate, setSelectedDate }) {
  return (
    <div className="date-stepper">
      <button onClick={() => setSelectedDate(addDays(selectedDate, -1))} title="Предыдущий день">
        <ChevronLeft size={18} />
      </button>
      <button className="date-pill" onClick={() => setSelectedDate(todayISO())}>
        <CalendarDays size={16} />
        <span>{selectedDate === todayISO() ? "Сегодня" : formatHuman(selectedDate)}</span>
      </button>
      <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} title="Следующий день">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function TodayView(props) {
  const {
    habits,
    activeHabits,
    allHabitsCount,
    entries,
    selectedDate,
    dayEntries,
    dayScore,
    query,
    setQuery,
    selectedHabitId,
    setSelectedHabitId,
    updateEntry,
    quickComplete,
    editHabit,
    archiveHabit,
    addTemplate,
    points,
    rewards,
    redeemReward,
  } = props;
  const completeCount = activeHabits.filter((habit) => isComplete(habit, dayEntries[habit.id])).length;
  const strongestStreak = activeHabits.reduce((best, habit) => Math.max(best, getHabitStreak(habit, entries, selectedDate)), 0);

  if (!allHabitsCount) {
    return <EmptyStart addTemplate={addTemplate} createHabit={() => editHabit(emptyHabit())} />;
  }

  if (!activeHabits.length) {
    return <NoDueToday selectedDate={selectedDate} createHabit={() => editHabit(emptyHabit())} />;
  }

  return (
    <>
      <section className="metrics-grid">
        <MetricCard icon={Target} label="День закрыт" value={`${dayScore}%`} detail={`${completeCount}/${activeHabits.length} привычек`} />
        <MetricCard icon={Flame} label="Текущая серия" value={`${strongestStreak} дн.`} detail="по плану дня" />
        <MetricCard icon={BellRing} label="Напоминания" value={activeHabits.filter((habit) => habit.reminder?.enabled).length} detail="включено" />
        <MetricCard icon={Award} label="Очки" value={points} detail="для наград" />
        <div className="score-card">
          <ProgressRing value={dayScore} />
          <div>
            <span>Пульс дня</span>
            <strong>{dayScore >= 80 ? "Сильный" : dayScore >= 45 ? "В работе" : "Мягкий старт"}</strong>
          </div>
        </div>
      </section>

      <TodayPlan habits={activeHabits} entries={entries} selectedDate={selectedDate} />

      <section className="toolbar">
        <div className="search-box">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск привычки или сферы" />
        </div>
        <HabitFilter habits={activeHabits} value={selectedHabitId} onChange={setSelectedHabitId} />
      </section>

      <section className="habit-grid">
        {habits.map((habit) => (
          <HabitCard
            key={habit.id}
            habit={habit}
            value={dayEntries[habit.id] ?? defaultValue(habit)}
            streak={getHabitStreak(habit, entries, selectedDate)}
            bestStreak={getBestStreak(habit, entries)}
            updateEntry={updateEntry}
            quickComplete={quickComplete}
            editHabit={editHabit}
            archiveHabit={archiveHabit}
          />
        ))}
      </section>

      <RewardsPanel points={points} rewards={rewards} redeemReward={redeemReward} />
    </>
  );
}

function NoDueToday({ selectedDate, createHabit }) {
  return (
    <section className="empty-panel">
      <CalendarDays size={28} />
      <h2>На {formatHuman(selectedDate)} ничего не запланировано</h2>
      <p>Можно отдохнуть, выбрать другую дату или создать привычку с расписанием на этот день.</p>
      <button className="primary-action" onClick={createHabit}>
        <Plus size={18} />
        <span>Создать привычку</span>
      </button>
    </section>
  );
}

function TodayPlan({ habits, entries, selectedDate }) {
  const done = habits.filter((habit) => isComplete(habit, entries[selectedDate]?.[habit.id]));
  const pending = habits.filter((habit) => !isComplete(habit, entries[selectedDate]?.[habit.id]));
  return (
    <section className="plan-panel">
      <div className="section-head">
        <div>
          <span className="eyebrow">план дня</span>
          <h2>{pending.length ? `Осталось ${pending.length}` : "Все закрыто"}</h2>
        </div>
        <Check size={20} />
      </div>
      <div className="plan-list">
        {[...pending, ...done].map((habit) => {
          const Icon = getIcon(habit.icon);
          const completed = isComplete(habit, entries[selectedDate]?.[habit.id]);
          return (
            <div className={completed ? "done" : ""} key={habit.id} style={{ "--accent": habit.color }}>
              <Icon size={18} />
              <span>{habit.name}</span>
              <small>{scheduleLabel(habit)}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RewardsPanel({ points, rewards, redeemReward }) {
  return (
    <section className="rewards-panel">
      <div className="section-head">
        <div>
          <span className="eyebrow">награды</span>
          <h2>Обменяйте стабильность на приятное</h2>
        </div>
        <Award size={20} />
      </div>
      <div className="rewards-grid">
        {rewards.map((reward) => (
          <article key={reward.id}>
            <strong>{reward.title}</strong>
            <span>{reward.cost} очков · получено {reward.redeemed || 0}</span>
            <button disabled={points < reward.cost} onClick={() => redeemReward(reward.id)}>
              Получить
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function EmptyStart({ addTemplate, createHabit }) {
  return (
    <section className="empty-start">
      <div className="empty-copy">
        <span className="eyebrow">чистый старт</span>
        <h2>Подбери свою привычку</h2>
        <p>Выберите готовые шаблоны или создайте свою привычку с типом, сферой, целью и напоминанием.</p>
        <button className="primary-action" onClick={createHabit}>
          <Plus size={18} />
          <span>Создать вручную</span>
        </button>
      </div>
      <TemplateGrid onAdd={addTemplate} />
    </section>
  );
}

function TemplateGrid({ onAdd }) {
  return (
    <div className="template-grid">
      {templates.map((item) => {
        const Icon = getIcon(item.icon);
        return (
          <article className="template-card" key={`${item.name}-${item.area}`} style={{ "--accent": item.color }}>
            <div className="habit-title">
              <div className="habit-icon">
                <Icon size={20} />
              </div>
              <div>
                <h2>{item.name}</h2>
                <span>{item.area} · {habitTypes[item.type].label}</span>
              </div>
            </div>
            <p>{item.note}</p>
            <button onClick={() => onAdd(item)}>
              <Plus size={17} />
              <span>Добавить</span>
            </button>
          </article>
        );
      })}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail }) {
  return (
    <article className="metric-card">
      <div className="metric-icon">
        <Icon size={20} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function ProgressRing({ value }) {
  return (
    <div className="progress-ring" style={{ "--progress": `${Math.max(0, Math.min(100, value))}%` }}>
      <span>{value}</span>
    </div>
  );
}

function HabitFilter({ habits, value, onChange }) {
  return (
    <div className="segmented">
      <button className={value === "all" ? "active" : ""} onClick={() => onChange("all")}>
        Все
      </button>
      {habits.slice(0, 5).map((habit) => (
        <button key={habit.id} className={value === habit.id ? "active" : ""} onClick={() => onChange(habit.id)}>
          {habit.name}
        </button>
      ))}
    </div>
  );
}

function HabitCard({ habit, value, streak, bestStreak, updateEntry, quickComplete, editHabit, archiveHabit }) {
  const Icon = getIcon(habit.icon);
  const percent = Math.round(progressFor(habit, value) * 100);
  const complete = percent >= 100;

  return (
    <article className={`habit-card ${complete ? "complete" : ""}`} style={{ "--accent": habit.color }}>
      <div className="habit-card-head">
        <div className="habit-title">
          <div className="habit-icon">
            <Icon size={21} />
          </div>
          <div>
            <h2>{habit.name}</h2>
            <span>{habit.area} · {habitTypes[habit.type]?.label}</span>
          </div>
        </div>
        <div className="icon-actions">
          <button onClick={() => editHabit(habit)} title="Редактировать">
            <Pencil size={17} />
          </button>
          <button onClick={() => archiveHabit(habit.id)} title="Архивировать">
            <Archive size={17} />
          </button>
        </div>
      </div>

      <p className="habit-note">{habit.note || habitTypes[habit.type]?.helper}</p>

      <div className="habit-progress-row">
        <div className="mini-ring" style={{ "--progress": `${percent}%`, "--accent": habit.color }}>
          <span>{percent}</span>
        </div>
        <div className="habit-progress-copy">
          <strong>{renderValue(habit, value)}</strong>
          <span>серия {streak} дн. · рекорд {bestStreak} дн.</span>
          {habit.reminder?.enabled && <span>напоминание в {habit.reminder.time}</span>}
        </div>
      </div>

      <HabitInput habit={habit} value={value} updateEntry={updateEntry} quickComplete={quickComplete} />
    </article>
  );
}

function renderValue(habit, value) {
  if (habit.type === "avoid") return Number(value) > 0 ? `${value} ${habit.unit}` : "без срывов";
  if (habit.type === "check") return value ? "выполнено" : "не отмечено";
  return `${value} / ${habit.target} ${habit.unit}`;
}

function HabitInput({ habit, value, updateEntry, quickComplete }) {
  if (habit.type === "check") {
    return (
      <button className={`check-row ${value ? "checked" : ""}`} onClick={() => quickComplete(habit)}>
        {value ? <Check size={18} /> : <Circle size={18} />}
        <span>{value ? "Выполнено" : "Отметить"}</span>
      </button>
    );
  }

  if (habit.type === "avoid") {
    return (
      <div className="direct-entry">
        <label>
          <span>Срывов</span>
          <input
            type="number"
            min="0"
            step="1"
            value={value}
            onChange={(event) => updateEntry(habit.id, event.target.value)}
          />
        </label>
        <div className="stepper">
          <button onClick={() => updateEntry(habit.id, 0)}>Без срывов</button>
          <button onClick={() => updateEntry(habit.id, Number(value) + 1)}>+ срыв</button>
        </div>
      </div>
    );
  }

  if (habit.type === "rating") {
    return (
      <div className="rating-row">
        {[1, 2, 3, 4, 5].map((item) => (
          <button key={item} className={Number(value) >= item ? "active" : ""} onClick={() => updateEntry(habit.id, item)}>
            <Star size={18} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="direct-entry">
      <label>
        <span>Внесено</span>
        <input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(event) => updateEntry(habit.id, event.target.value)}
        />
      </label>
      <input
        type="range"
        min="0"
        max={Math.max(Number(habit.target), 1)}
        step="1"
        value={Math.min(Number(value) || 0, Math.max(Number(habit.target), 1))}
        onChange={(event) => updateEntry(habit.id, event.target.value)}
        style={{ "--accent": habit.color }}
      />
      <div className="stepper">
        <button onClick={() => updateEntry(habit.id, Number(value) - 1)}>-</button>
        <button onClick={() => quickComplete(habit)}>Цель</button>
        <button onClick={() => updateEntry(habit.id, Number(value) + 1)}>+</button>
      </div>
    </div>
  );
}

function CalendarView({ habits, entries, selectedDate, setSelectedDate, selectedHabit, selectedHabitId, setSelectedHabitId }) {
  const monthRange = getRange(selectedDate, 84);
  const strongDays = monthRange.filter((date) =>
    selectedHabit ? isComplete(selectedHabit, entries[date]?.[selectedHabit.id]) : getDayScore(habits, entries, date) >= 80,
  ).length;

  if (!habits.length) return <EmptyAnalytics title="Календарь появится после добавления привычек" />;

  return (
    <section className="calendar-layout">
      <div className="calendar-main">
        <div className="section-head">
          <div>
            <span className="eyebrow">последние 12 недель</span>
            <h2>Тепловая карта</h2>
          </div>
          <HabitFilter habits={habits} value={selectedHabitId} onChange={setSelectedHabitId} />
        </div>
        <div className="heatmap" role="grid" aria-label="Тепловая карта прогресса">
          {monthRange.map((date) => {
            const value = selectedHabit
              ? Math.round(progressFor(selectedHabit, entries[date]?.[selectedHabit.id]) * 100)
              : getDayScore(habits, entries, date);
            return (
              <button
                key={date}
                className="heat-cell"
                data-level={value >= 90 ? 4 : value >= 65 ? 3 : value >= 35 ? 2 : value > 0 ? 1 : 0}
                onClick={() => setSelectedDate(date)}
                title={`${formatHuman(date)} · ${value}%`}
              >
                <span>{parseISODate(date).getDate()}</span>
              </button>
            );
          })}
        </div>
      </div>
      <aside className="calendar-side">
        <MetricCard icon={Award} label="Сильных дней" value={strongDays} detail="за 12 недель" />
        <div className="timeline">
          {getRange(selectedDate, 7).map((date) => (
            <button key={date} className={date === selectedDate ? "active" : ""} onClick={() => setSelectedDate(date)}>
              <span>{formatHuman(date, { weekday: "short" })}</span>
              <strong>{selectedHabit ? entries[date]?.[selectedHabit.id] ?? 0 : `${getDayScore(habits, entries, date)}%`}</strong>
            </button>
          ))}
        </div>
      </aside>
    </section>
  );
}

function InsightsView({ habits, entries, selectedDate, selectedHabit, selectedHabitId, setSelectedHabitId, weeklyBars, chartHabit }) {
  if (!habits.length) return <EmptyAnalytics title="Аналитика появится после первых отметок" />;

  const last30 = getRange(selectedDate, 30);
  const monthAverage = Math.round(
    last30.reduce(
      (acc, date) => acc + (selectedHabit ? progressFor(selectedHabit, entries[date]?.[selectedHabit.id]) * 100 : getDayScore(habits, entries, date)),
      0,
    ) / last30.length,
  );
  const strongest = habits
    .map((habit) => ({
      habit,
      score: Math.round(last30.reduce((acc, date) => acc + progressFor(habit, entries[date]?.[habit.id]) * 100, 0) / last30.length),
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <section className="insights-layout">
      <div className="insight-panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">динамика</span>
            <h2>{selectedHabit ? selectedHabit.name : "Общий прогресс"}</h2>
          </div>
          <HabitFilter habits={habits} value={selectedHabitId} onChange={setSelectedHabitId} />
        </div>
        <BarChart data={weeklyBars} color={selectedHabit?.color || chartHabit?.color || "#2f80ed"} />
      </div>

      <div className="insight-column">
        <WeeklyReview habits={habits} entries={entries} selectedDate={selectedDate} />
        <MetricCard icon={BarChart3} label="Среднее за месяц" value={`${monthAverage}%`} detail="по выбранному срезу" />
        <div className="ranking-panel">
          <div className="section-head small">
            <h2>Стабильность</h2>
            <Flame size={18} />
          </div>
          {strongest.map(({ habit, score }) => {
            const Icon = getIcon(habit.icon);
            return (
              <div className="rank-row" key={habit.id} style={{ "--accent": habit.color }}>
                <Icon size={18} />
                <span>{habit.name}</span>
                <div className="rank-track">
                  <i style={{ width: `${score}%` }} />
                </div>
                <strong>{score}%</strong>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function WeeklyReview({ habits, entries, selectedDate }) {
  const week = getWeekRange(selectedDate);
  const duePairs = week.flatMap((date) => habits.filter((habit) => isHabitDue(habit, date, entries)).map((habit) => ({ date, habit })));
  const completed = duePairs.filter(({ date, habit }) => isComplete(habit, entries[date]?.[habit.id])).length;
  const score = duePairs.length ? Math.round((completed / duePairs.length) * 100) : 0;
  const ranked = habits
    .map((habit) => {
      const dueDays = week.filter((date) => isHabitDue(habit, date, entries));
      const doneDays = dueDays.filter((date) => isComplete(habit, entries[date]?.[habit.id]));
      return { habit, score: dueDays.length ? Math.round((doneDays.length / dueDays.length) * 100) : 0, due: dueDays.length };
    })
    .filter((item) => item.due > 0)
    .sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const weak = ranked[ranked.length - 1];

  return (
    <div className="weekly-review">
      <div className="section-head small">
        <h2>Weekly Review</h2>
        <Award size={18} />
      </div>
      <strong>{score}% недели закрыто</strong>
      <p>{completed}/{duePairs.length || 0} запланированных отметок выполнено.</p>
      <div className="review-facts">
        <span>Лучше всего: {best ? best.habit.name : "пока нет данных"}</span>
        <span>Зона внимания: {weak ? weak.habit.name : "пока нет данных"}</span>
      </div>
    </div>
  );
}

function EmptyAnalytics({ title }) {
  return (
    <section className="empty-panel">
      <BarChart3 size={28} />
      <h2>{title}</h2>
      <p>Данные не генерируются автоматически: графики строятся только по вашим привычкам и отметкам.</p>
    </section>
  );
}

function BarChart({ data, color }) {
  const width = 760;
  const height = 300;
  const gap = 18;
  const barWidth = (width - gap * (data.length - 1)) / data.length;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="График прогресса за неделю">
        <defs>
          <linearGradient id="barFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#77c9b6" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((line) => (
          <g key={line}>
            <line x1="0" x2={width} y1={height - (line / 100) * 240 - 36} y2={height - (line / 100) * 240 - 36} />
            <text x="0" y={height - (line / 100) * 240 - 42}>{line}%</text>
          </g>
        ))}
        {data.map((item, index) => {
          const barHeight = Math.max(8, (item.score / 100) * 230);
          const x = index * (barWidth + gap);
          const y = height - barHeight - 36;
          return (
            <g key={item.date}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx="8" fill="url(#barFill)" />
              <text className="chart-date" x={x + barWidth / 2} y={height - 8} textAnchor="middle">
                {formatHuman(item.date, { weekday: "short" })}
              </text>
              <text className="chart-value" x={x + barWidth / 2} y={y - 10} textAnchor="middle">
                {item.score}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SettingsView({ preferences, setPreferences, clearUserData, habits, user, onChangePassword, archived, restoreHabit }) {
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", repeat: "" });
  const [passwordMessage, setPasswordMessage] = useState("");

  async function enableNotifications() {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    setPreferences({ ...preferences, notificationsEnabled: permission === "granted" });
  }

  function submitPassword(event) {
    event.preventDefault();
    if (passwordForm.next !== passwordForm.repeat) {
      setPasswordMessage("Новый пароль и повтор не совпадают.");
      return;
    }
    const error = onChangePassword(user.id, passwordForm.current, passwordForm.next);
    if (error) {
      setPasswordMessage(error);
      return;
    }
    setPasswordForm({ current: "", next: "", repeat: "" });
    setPasswordMessage("Пароль изменён.");
  }

  return (
    <section className="settings-layout">
      <div className="settings-panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">персонализация</span>
            <h2>Режим работы</h2>
          </div>
          <Palette size={20} />
        </div>
        <label className="field">
          <span>Фокус недели</span>
          <input value={preferences.weeklyFocus} onChange={(event) => setPreferences({ ...preferences, weeklyFocus: event.target.value })} />
        </label>
        <label className="switch-row">
          <input
            type="checkbox"
            checked={preferences.compactMode}
            onChange={(event) => setPreferences({ ...preferences, compactMode: event.target.checked })}
          />
          <span>Компактный режим карточек</span>
        </label>
        <div className="choice-group">
          <span>Тема</span>
          <div className="theme-toggle">
            <button
              type="button"
              className={(preferences.theme || "light") === "light" ? "active" : ""}
              onClick={() => setPreferences({ ...preferences, theme: "light" })}
            >
              Светлая
            </button>
            <button
              type="button"
              className={preferences.theme === "dark" ? "active" : ""}
              onClick={() => setPreferences({ ...preferences, theme: "dark" })}
            >
              Тёмная
            </button>
          </div>
        </div>
        <button className="danger-action" onClick={clearUserData}>
          <RotateCcw size={18} />
          <span>Очистить мои данные</span>
        </button>
      </div>

      <div className="settings-panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">уведомления</span>
            <h2>Напоминания</h2>
          </div>
          <Bell size={20} />
        </div>
        <p className="muted">
          Напоминания работают, когда приложение открыто в браузере. Для уведомлений вне открытой вкладки нужен backend, service worker и push-сервер.
        </p>
        <button className="primary-action settings-action" onClick={enableNotifications}>
          <ShieldCheck size={18} />
          <span>{preferences.notificationsEnabled ? "Уведомления включены" : "Разрешить уведомления"}</span>
        </button>
        <div className="reminder-center">
          {habits.filter((habit) => habit.reminder?.enabled).length === 0 ? (
            <p className="muted">Активных напоминаний пока нет.</p>
          ) : (
            habits
              .filter((habit) => habit.reminder?.enabled)
              .map((habit) => {
                const Icon = getIcon(habit.icon);
                return (
                  <div key={habit.id} style={{ "--accent": habit.color }}>
                    <Icon size={18} />
                    <span>{habit.name}</span>
                    <strong>{habit.reminder.time}</strong>
                    <small>{scheduleLabel(habit)}</small>
                  </div>
                );
              })
          )}
        </div>
      </div>

      <div className="settings-panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">аккаунт</span>
            <h2>Смена пароля</h2>
          </div>
          <ShieldCheck size={20} />
        </div>
        <form className="password-form" onSubmit={submitPassword}>
          <label className="field">
            <span>Текущий пароль</span>
            <input
              type="password"
              value={passwordForm.current}
              onChange={(event) => setPasswordForm({ ...passwordForm, current: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Новый пароль</span>
            <input
              type="password"
              value={passwordForm.next}
              onChange={(event) => setPasswordForm({ ...passwordForm, next: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Повторите пароль</span>
            <input
              type="password"
              value={passwordForm.repeat}
              onChange={(event) => setPasswordForm({ ...passwordForm, repeat: event.target.value })}
            />
          </label>
          {passwordMessage && <p className={passwordMessage === "Пароль изменён." ? "form-success" : "form-error"}>{passwordMessage}</p>}
          <button className="primary-action settings-action">
            <Save size={18} />
            <span>Сохранить пароль</span>
          </button>
        </form>
      </div>

      <div className="settings-panel">
        <div className="section-head">
          <div>
            <span className="eyebrow">управление</span>
            <h2>Архив</h2>
          </div>
          <Archive size={20} />
        </div>
        {archived.length === 0 ? (
          <p className="muted">Архив пуст.</p>
        ) : (
          archived.map((habit) => (
            <div className="archive-row" key={habit.id}>
              <span>{habit.name}</span>
              <button onClick={() => restoreHabit(habit.id)}>Вернуть</button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function HabitEditor({ habit, onClose, onSave }) {
  const [draft, setDraft] = useState(habit);
  const typeMeta = habitTypes[draft.type] || habitTypes.check;
  const isValid = draft.name.trim().length > 1;

  function update(field, value) {
    setDraft((current) => {
      if (field === "type") {
        const meta = habitTypes[value];
        return { ...current, type: value, target: meta.target, unit: meta.unit };
      }
      return { ...current, [field]: value };
    });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="habit-editor"
        onSubmit={(event) => {
          event.preventDefault();
          if (isValid) onSave({ ...draft, name: draft.name.trim(), area: draft.area.trim() || "Личное" });
        }}
      >
        <div className="editor-head">
          <div>
            <span className="eyebrow">{draft.id ? "редактирование" : "новая привычка"}</span>
            <h2>{draft.id ? draft.name : "Создать привычку"}</h2>
          </div>
          <button type="button" onClick={onClose} title="Закрыть">
            <X size={20} />
          </button>
        </div>

        <label className="field">
          <span>Название</span>
          <input value={draft.name} onChange={(event) => update("name", event.target.value)} autoFocus />
        </label>

        <div className="choice-group">
          <span>Сфера</span>
          <div className="chip-grid">
            {areas.map((area) => (
              <button type="button" key={area} className={draft.area === area ? "active" : ""} onClick={() => update("area", area)}>
                {area}
              </button>
            ))}
          </div>
        </div>

        <div className="choice-group">
          <span>Тип привычки</span>
          <div className="type-grid">
            {Object.entries(habitTypes).map(([id, item]) => (
              <button type="button" key={id} className={draft.type === id ? "active" : ""} onClick={() => update("type", id)}>
                <strong>{item.label}</strong>
                <span>{item.helper}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="editor-grid">
          <label className="field">
            <span>Цель</span>
            <input
              type="number"
              min="0"
              disabled={draft.type === "avoid"}
              value={draft.target}
              onChange={(event) => update("target", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Единица</span>
            <input value={draft.unit} onChange={(event) => update("unit", event.target.value)} />
          </label>
        </div>
        <p className="muted editor-hint">{typeMeta.helper}</p>

        <ScheduleEditor schedule={draft.schedule || baseSchedule()} onChange={(schedule) => update("schedule", schedule)} />

        <div className="choice-group">
          <span>Иконка</span>
          <div className="icon-choice-grid">
            {iconOptions.map(({ id, label, Icon }) => (
              <button type="button" key={id} className={draft.icon === id ? "active" : ""} onClick={() => update("icon", id)} title={label}>
                <Icon size={19} />
              </button>
            ))}
          </div>
        </div>

        <div className="choice-group">
          <span>Цвет</span>
          <div className="color-choice-grid">
            {colors.map((color) => (
              <button
                type="button"
                key={color}
                className={draft.color === color ? "active" : ""}
                style={{ background: color }}
                onClick={() => update("color", color)}
                title={color}
              />
            ))}
          </div>
        </div>

        <div className="editor-grid">
          <label className="switch-row reminder-switch">
            <input
              type="checkbox"
              checked={draft.reminder?.enabled || false}
              onChange={(event) => update("reminder", { ...(draft.reminder || {}), enabled: event.target.checked })}
            />
            <span>Напоминать</span>
          </label>
          <label className="field">
            <span>Время</span>
            <input
              type="time"
              value={draft.reminder?.time || "20:00"}
              onChange={(event) => update("reminder", { ...(draft.reminder || {}), time: event.target.value })}
            />
          </label>
        </div>

        <label className="field">
          <span>Заметка</span>
          <textarea value={draft.note} onChange={(event) => update("note", event.target.value)} rows="3" />
        </label>

        <div className="editor-actions">
          <button type="button" onClick={onClose}>
            Отмена
          </button>
          <button className="primary-action" disabled={!isValid}>
            <Save size={18} />
            <span>Сохранить</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function ScheduleEditor({ schedule, onChange }) {
  const dayLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const current = { ...baseSchedule(), ...schedule };

  function setMode(mode) {
    onChange({ ...current, mode });
  }

  function toggleDay(day) {
    const days = current.days || [];
    const next = days.includes(day) ? days.filter((item) => item !== day) : [...days, day].sort((a, b) => a - b);
    onChange({ ...current, mode: "days", days: next });
  }

  return (
    <div className="choice-group schedule-editor">
      <span>Расписание</span>
      <div className="schedule-modes">
        {[
          ["daily", "Каждый день"],
          ["weekdays", "Будни"],
          ["days", "Дни недели"],
          ["timesPerWeek", "N раз/нед"],
          ["interval", "Интервал"],
        ].map(([id, label]) => (
          <button type="button" key={id} className={current.mode === id ? "active" : ""} onClick={() => setMode(id)}>
            {label}
          </button>
        ))}
      </div>

      {current.mode === "days" && (
        <div className="weekday-grid">
          {dayLabels.map((label, index) => {
            const day = index + 1;
            return (
              <button type="button" key={label} className={(current.days || []).includes(day) ? "active" : ""} onClick={() => toggleDay(day)}>
                {label}
              </button>
            );
          })}
        </div>
      )}

      {current.mode === "timesPerWeek" && (
        <label className="field inline-field">
          <span>Раз в неделю</span>
          <input
            type="number"
            min="1"
            value={current.timesPerWeek || 1}
            onChange={(event) => onChange({ ...current, timesPerWeek: Math.max(1, Number(event.target.value) || 1) })}
          />
        </label>
      )}

      {current.mode === "interval" && (
        <label className="field inline-field">
          <span>Каждые N дней</span>
          <input
            type="number"
            min="1"
            value={current.interval || 1}
            onChange={(event) => onChange({ ...current, interval: Math.max(1, Number(event.target.value) || 1) })}
          />
        </label>
      )}
    </div>
  );
}

function ReminderToast({ toast, onClose }) {
  return (
    <div className="reminder-toast">
      <BellRing size={20} />
      <div>
        <strong>{toast.title}</strong>
        <span>{toast.message}</span>
      </div>
      <button onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}

export default App;
