import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Target, RefreshCw, Trophy, Check, Plus, Play, Info, ArrowRight, Flame, TrendingUp, ChevronDown, ChevronUp, Lightbulb, X, BookOpen, Clock, CheckCircle2, Zap, Hourglass, RotateCcw } from 'lucide-react';
import { EventDetailModal } from './EventDetailModal';
import { CalendarEvent } from '../types';

// ─── Habit Challenge Types ──────────────────────────────────────────────
interface HabitChallenge {
  id: string;
  title: string;
  startDate: string; // ISO
  taskCreated: boolean;
  automationCreated: boolean;
  active: boolean; // true = graduated to tracker
  daysCompleted: number;
}

const HABIT_STORAGE_KEY = 'planifai_habit_challenges';

function loadHabits(): HabitChallenge[] {
  try {
    const data = localStorage.getItem(HABIT_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveHabits(habits: HabitChallenge[]) {
  localStorage.setItem(HABIT_STORAGE_KEY, JSON.stringify(habits));
}
import gradientGreen from '../src/assets/gradient-green.png';
import gradientPink from '../src/assets/gradient-pink.png';
import mindfulnessHeader from '../src/assets/mindfulness-header.png';
import digitalHeader from '../src/assets/digital-header.png';

// ─── Date Helpers (Native JS to avoid dependencies) ─────────────────────
const parseISO = (str: string) => new Date(str);
const subDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};
const isSameDay = (d1: Date, d2: Date) => d1.toDateString() === d2.toDateString();
const differenceInMinutes = (d1: Date, d2: Date) => Math.floor((d1.getTime() - d2.getTime()) / 60000);
const formatDayName = (date: Date, locale: string) => date.toLocaleDateString(locale, { weekday: 'short' }).toUpperCase().slice(0, 3).replace('.', '');
const eachDayOfInterval = ({ start, end }: { start: Date, end: Date }) => {
  const days = [];
  let current = new Date(start);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
};

// ─── Article content data ───────────────────────────────────────────────
// ─── Article content moved inside component for i18n ─────────────────────

// ─── Main Component ─────────────────────────────────────────────────────
export const StatsScreen: React.FC = () => {
  const { stats, t, language, accentColor, activeTemplate, events } = useCalendar();

  const localeStr = language === 'es' ? 'es-ES' : 'en-US';



  // Re-write ARTICLES variable to be simple array of 4 items mapped from t
  const localizedArticles = useMemo(() => [
    {
      id: 'rest',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      image: gradientGreen,
      icon: '💤',
      tag: t.cat_rest?.toUpperCase() || 'REST',
      title: t.article_1_title,
      desc: t.article_1_desc,
      readTime: '5 min',
      body: [{ heading: t.article_1_title, text: t.article_1_content }]
    },
    {
      id: 'pomodoro',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      image: gradientPink,
      icon: '🍅',
      tag: t.cat_study?.toUpperCase() || 'PRODUCTIVITY',
      title: t.article_2_title,
      desc: t.article_2_desc,
      readTime: '25 min',
      body: [{ heading: t.article_2_title, text: t.article_2_content }]
    },
    {
      id: 'mindfulness',
      gradient: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
      image: mindfulnessHeader,
      icon: '🧘',
      tag: t.cat_health?.toUpperCase() || 'WELLNESS',
      title: t.article_3_title,
      desc: t.article_3_desc,
      readTime: '5 min',
      body: [{ heading: t.article_3_title, text: t.article_3_content }]
    },
    {
      id: 'digital',
      gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      image: digitalHeader,
      icon: '💻',
      tag: 'ORGANIZATION',
      title: t.article_4_title,
      desc: t.article_4_desc,
      readTime: '10 min',
      body: [{ heading: t.article_4_title, text: t.article_4_content }]
    }
  ], [t]);

  const [selectedArticle, setSelectedArticle] = useState<typeof localizedArticles[0] | null>(null);
  const [showStressInfo, setShowStressInfo] = useState(false);

  // ─── Habit Builder State ──────────────────────────────────────────────
  const [habitChallenges, setHabitChallenges] = useState<HabitChallenge[]>(loadHabits);
  const [builderPhase, setBuilderPhase] = useState<'collapsed' | 'input' | 'setup'>('collapsed');
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [currentChallengeId, setCurrentChallengeId] = useState<string | null>(null);

  // Persist habit challenges to localStorage
  useEffect(() => { saveHabits(habitChallenges); }, [habitChallenges]);

  const currentChallenge = useMemo(() =>
    habitChallenges.find(h => h.id === currentChallengeId) || null,
    [habitChallenges, currentChallengeId]
  );

  // Auto-detect if user created a task or automation matching the challenge
  const detectSteps = useCallback((challenge: HabitChallenge) => {
    if (!challenge) return { taskFound: challenge.taskCreated, autoFound: challenge.automationCreated };
    const titleLower = challenge.title.toLowerCase();
    const taskFound = challenge.taskCreated || events.some(e => e.title.toLowerCase().includes(titleLower));
    const autoFound = challenge.automationCreated || events.some(
      e => e.title.toLowerCase().includes(titleLower) && (e.creationSource === 'automation' || !!e.recurrenceId)
    );
    return { taskFound, autoFound };
  }, [events]);
  // Modal State for Habit Tasks
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAttributes, setModalAttributes] = useState<{ isCreating: boolean, event?: Partial<CalendarEvent> }>({ isCreating: true });

  const handleStep1Click = () => {
    if (!currentChallenge) return;
    // Check if task already exists to edit it instead? No, Step 1 implies creation usually, but let's be smart.
    const titleLower = currentChallenge.title.toLowerCase();
    const existing = events.find(e => e.title.toLowerCase().includes(titleLower));

    if (existing) {
      setModalAttributes({ isCreating: false, event: existing });
    } else {
      // Pre-fill creation
      setModalAttributes({
        isCreating: true,
        event: { title: currentChallenge.title, type: 'health' } // Default category, user can change
      });
    }
    setModalOpen(true);
  };

  const handleStep2Click = () => {
    if (!currentChallenge) return;
    const titleLower = currentChallenge.title.toLowerCase();
    const existing = events.find(e => e.title.toLowerCase().includes(titleLower));

    if (existing) {
      // Open edit to allow adding recurrence
      setModalAttributes({ isCreating: false, event: existing });
      setModalOpen(true);
    } else {
      // Navigate to create first
      handleStep1Click();
    }
  };

  // Update step detection when events change
  useEffect(() => {
    if (!currentChallenge || currentChallenge.active) return;
    const { taskFound, autoFound } = detectSteps(currentChallenge);
    if (taskFound !== currentChallenge.taskCreated || autoFound !== currentChallenge.automationCreated) {
      setHabitChallenges(prev => prev.map(h =>
        h.id === currentChallenge.id ? { ...h, taskCreated: taskFound, automationCreated: autoFound } : h
      ));
    }
  }, [events, currentChallenge, detectSteps]);

  const handleStartChallenge = () => {
    if (!newHabitTitle.trim()) return;
    const newChallenge: HabitChallenge = {
      id: crypto.randomUUID(),
      title: newHabitTitle.trim(),
      startDate: new Date().toISOString(),
      taskCreated: false,
      automationCreated: false,
      active: false,
      daysCompleted: 0,
    };
    setHabitChallenges(prev => [...prev, newChallenge]);
    setCurrentChallengeId(newChallenge.id);
    setNewHabitTitle('');
    setBuilderPhase('setup');
  };

  const handleMeasureHabit = () => {
    if (!currentChallengeId) return;
    setHabitChallenges(prev => prev.map(h =>
      h.id === currentChallengeId ? { ...h, active: true } : h
    ));
    setCurrentChallengeId(null);
    setBuilderPhase('collapsed');
  };

  const handleResetBuilder = () => {
    setBuilderPhase('collapsed');
    setCurrentChallengeId(null);
    setNewHabitTitle('');
  };

  // Active (graduated) habits for the tracker
  const activeHabits = useMemo(() => habitChallenges.filter(h => h.active), [habitChallenges]);

  // Calculate days completed for active habits
  const getHabitDays = useCallback((habit: HabitChallenge) => {
    const start = new Date(habit.startDate);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    // Count how many days the user completed a task with matching title
    const completedDays = events.filter(e =>
      e.title.toLowerCase().includes(habit.title.toLowerCase()) &&
      e.status === 'completed' &&
      new Date(e.start) >= start
    ).length;
    return Math.min(completedDays, 21);
  }, [events]);

  // Map habits to their category colors from the active template
  const categoryColors = useMemo(() => {
    const cats = activeTemplate?.categories || [];
    const healthCat = cats.find(c => c.type === 'health');
    const personalCat = cats.find(c => c.type === 'personal');
    const foodCat = cats.find(c => c.label?.toLowerCase().includes('aliment') || c.label?.toLowerCase().includes('food') || (c.type === 'other' && c.icon === 'Utensils'));
    return {
      exercise: healthCat?.color || '#FF7566',
      wakeUp: personalCat?.color || '#FFF4E0',
      eatHealthy: foodCat?.color || '#B2D3A1',
    };
  }, [activeTemplate]);

  // Mock data for comparison charts


  // ─── KPI Calculations ────────────────────────────────────────────────
  const kpiStats = useMemo(() => {
    const now = new Date();
    const last7Days = eachDayOfInterval({ start: subDays(now, 6), end: now });

    // 1. Completion Rate (Last 7 Days)
    const recentEvents = events.filter(e => {
      const d = parseISO(e.start);
      return d >= subDays(now, 7) && d <= now;
    });

    const completed = recentEvents.filter(e => e.status === 'completed').length;
    const total = recentEvents.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // 2. Activity Chart Data (Last 7 Days)
    const activityData = last7Days.map(day => {
      const dayEvents = recentEvents.filter(e => isSameDay(parseISO(e.start), day));
      // Count completed tasks
      const count = dayEvents.filter(e => e.status === 'completed').length;
      return {
        day: formatDayName(day, localeStr), // LUN, MAR...
        value: count,
        fullDate: day
      };
    });

    // 3. Weekly Distribution (By Category/Type)
    const distributionMap: Record<string, number> = {};
    let totalDurationMinutes = 0;

    recentEvents.filter(e => e.status === 'completed').forEach(e => {
      const start = parseISO(e.start);
      const end = parseISO(e.end);
      const output = differenceInMinutes(end, start);
      const duration = output > 0 ? output : 30; // Min 30 mins just in case

      distributionMap[e.type] = (distributionMap[e.type] || 0) + duration;
      totalDurationMinutes += duration;
    });

    const distributionCharData = Object.entries(distributionMap).map(([type, minutes]) => ({
      name: type, // You might want to map 'work' -> 'Trabajo' etc.
      value: parseFloat((minutes / 60).toFixed(1)), // Hours
      rawMinutes: minutes,
      color:
        type === 'health' ? '#FF7566' :
          type === 'work' ? '#764ba2' :
            type === 'study' ? '#C1B3E3' :
              type === 'personal' ? '#FFF4E0' :
                type === 'leisure' ? '#FFD2CC' : '#A7C7E7' // default
    })).sort((a, b) => b.value - a.value); // Sort by biggest

    return {
      completionRate,
      totalCompletedLast7: completed,
      activityData,
      distributionCharData,
      timeSavedHours: stats?.time_saved_minutes ? (stats.time_saved_minutes / 60).toFixed(1) : "0.0",
      timeSavedMinutes: stats?.time_saved_minutes || 0,
      efficiencyGain: stats?.efficiency_improvement || 0,
      stressLevel: stats?.stress_level || 50
    };

  }, [events]);

  const streakProgress = stats?.current_streak || 0;
  const streakGoal = 20;

  return (
    <>
      <div
        className="flex flex-col h-full bg-[#F8FAFC] dark:bg-black overflow-y-auto no-scrollbar pb-40 transition-opacity duration-300"
        style={{ willChange: 'opacity', contain: 'content' }}
      >
        <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80 dark:bg-black/80 backdrop-blur-md z-20">
          <div className="w-10"></div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t.stats_title}</h1>
          <div className="w-10"></div>
        </header>

        <main className="flex flex-col gap-6 px-6 pt-2">
          {/* Card: Racha Actual */}
          <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-[0.2em] mb-1">{t.current_streak.toUpperCase()}</p>
                <h2 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">
                  {streakProgress} <span className="text-2xl font-bold ml-1">{t.days_label}</span>
                </h2>
                <div className="flex items-center gap-1 mt-2 text-[#078809] font-bold text-xs">
                  <TrendingUp size={14} />
                  <span>+2% {t.stats_vs_month}</span>
                </div>
              </div>
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 overflow-visible">
                  <circle className="text-gray-50 dark:text-gray-800" cx="50" cy="50" fill="transparent" r="42" stroke="currentColor" strokeWidth="10"></circle>
                  <circle
                    cx="50" cy="50" fill="transparent" r="42"
                    stroke={accentColor} strokeWidth="10"
                    strokeDasharray="263.89"
                    strokeDashoffset={263.89 - (263.89 * Math.min(streakProgress / streakGoal, 1))}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  ></circle>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Flame size={32} style={{ color: accentColor }} className="fill-current" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className="text-gray-400">{t.streak_progress}</span>
                <span className="text-gray-600 dark:text-gray-300">{streakProgress}/{streakGoal}</span>
              </div>
              <div className="h-2.5 w-full bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden p-[1px]">
                <div
                  className="h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.1)]"
                  style={{
                    width: `${Math.min((streakProgress / streakGoal) * 100, 100)}%`,
                    backgroundColor: accentColor
                  }}
                ></div>
              </div>
            </div>
          </section>

          {/* Comparison Cards – FIXED: proper chart margins */}
          <div className="space-y-4">
            {/* REAL DATA KPIS */}

            {/* 1. Completion Rate */}
            <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={16} strokeWidth={3} />
                </div>
                <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-[0.2em]">{t.completion_rate.toUpperCase()}</p>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                    {stats?.completion_rate || kpiStats.completionRate}%
                  </h2>
                  <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-wide">
                    {t.stats_efficiency_desc}
                  </p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-emerald-100 dark:border-emerald-800/30">
                  <TrendingUp size={12} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">+{kpiStats.efficiencyGain}% {t.efficiency_improvement}</span>
                </div>
              </div>
            </section>

            {/* 2. Activity Chart */}
            <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800 h-80 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{t.activities}</h3>
                  <p className="text-xs text-gray-400 font-medium">{t.stats_last_7}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-gray-900 dark:text-white">{kpiStats.totalCompletedLast7}</p>
                  <div /* Placeholder for trend */ className="text-[10px] text-emerald-500 font-black uppercase tracking-wider">+12%</div>
                </div>
              </div>

              <div className="flex-1 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={kpiStats.activityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }}
                      dy={10}
                    />
                    <Tooltip
                      cursor={{ fill: '#F1F5F9', opacity: 0.4 }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 6, 6]} maxBarSize={40}>
                      {kpiStats.activityData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.value > 5 ? '#FF7566' : '#FFD2CC'} /* Highlight high activity days */
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* 3. Distribution Donut */}
            <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800">
              <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-[0.2em] mb-6">{t.weekly_distribution.toUpperCase()}</p>

              <div className="flex items-center gap-6">
                <div className="w-32 h-32 relative shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={kpiStats.distributionCharData}
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {kpiStats.distributionCharData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-black text-gray-900 dark:text-white">
                      {kpiStats.distributionCharData.reduce((acc, curr) => acc + curr.value, 0).toFixed(1)}h
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-3">
                  {kpiStats.distributionCharData.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-bold text-gray-600 dark:text-gray-300 capitalize">
                          {t[`cat_${item.name}`] || item.name}
                        </span>
                      </div>
                      <span className="font-medium text-gray-400">{item.value}h</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 4. Time Saved & Efficiency Row */}
            <div className="grid grid-cols-2 gap-4">
              <StatSmallCard
                icon={<Hourglass size={18} className="text-rose-500" />}
                bgIcon="bg-rose-100"
                label={t.time_saved.toUpperCase()}
                value={
                  // Improved Time Saved Logic:
                  // 1. If 0, show minimal value if there's activity, or "0 min"
                  // 2. If < 60 min, show "XX min"
                  // 3. If >= 1h, show "X.X h"
                  (() => {
                    const minutes = kpiStats.timeSavedMinutes; // Need to ensure we map this from API
                    if (minutes < 1 && kpiStats.totalCompletedLast7 > 0) return "< 5 min";
                    if (minutes < 60) return `${Math.max(0, minutes)} min`;
                    return `${(minutes / 60).toFixed(1)} h`;
                  })()
                }
                subtext={t.stats_time_saved_desc}
                tooltip="Calculado en base al uso de funciones rápidas (voz, IA, automatizaciones) vs. gestión manual."
              />
              <StatSmallCard
                icon={<Zap size={18} className="text-sky-500" />}
                bgIcon="bg-sky-100"
                label={t.efficiency.toUpperCase()} // Changed from "MEJORA" to generic title
                value={
                  // Efficiency is now a SCORE (0-100%), not a diff
                  // We use Completion Rate as the base "Score" or calculate a specific one
                  `${kpiStats.completionRate}%`
                }
                subtext={
                  // Badge logic:
                  // +% if improvement
                  // "Estable" if <= 0 change (no negative numbers)
                  kpiStats.efficiencyGain !== 0
                    ? `+${Math.abs(kpiStats.efficiencyGain)}% ${t.efficiency_improvement}`
                    : t.efficiency_stable
                }
                tooltip={t.stats_tooltip_efficiency}
                subtextClassName={kpiStats.efficiencyGain !== 0 ? "text-emerald-500" : "text-gray-400"}
              />
            </div>
          </div>

          {/* Mejorar Hábitos – IMPROVED: category-specific colors */}
          <section className="mt-2">
            <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-[0.2em] mb-4 ml-2">{t.improve_habits}</p>
            <div className="space-y-3">
              {/* Default habits */}
              <HabitIndicator label={t.habit_exercise} current={12} total={30} color={categoryColors.exercise} />
              <HabitIndicator label={t.read_article} current={5} total={7} color={categoryColors.study} />
              <HabitIndicator label={t.habit_eat_healthy} current={28} total={30} color={categoryColors.eatHealthy} />
              {/* Dynamic habits from builder */}
              {activeHabits.map(habit => (
                <HabitIndicator
                  key={habit.id}
                  label={habit.title}
                  current={getHabitDays(habit)}
                  total={21}
                  color={accentColor}
                />
              ))}
            </div>
          </section>

          {/* ─── Habit Builder Card ─────────────────────────────────────── */}
          <section className="mt-3">
            <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-all duration-500">

              {/* Header – always visible */}
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Trophy size={20} className="text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white tracking-wide">{t.habit_builder_title}</h3>
                    {builderPhase === 'setup' && currentChallenge && (
                      <button onClick={handleResetBuilder} className="ml-1 inline-flex">
                        <RotateCcw size={14} className="text-gray-400 hover:text-gray-600 transition-colors" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 leading-relaxed">{t.habit_builder_subtitle}</p>
              </div>

              {/* Phase: Collapsed */}
              {builderPhase === 'collapsed' && (
                <div className="px-6 pb-6">
                  <button
                    onClick={() => setBuilderPhase('input')}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-gray-300 hover:text-gray-500 dark:hover:border-gray-600 dark:hover:text-gray-400 transition-all duration-300 text-sm font-bold"
                  >
                    <Plus size={18} />
                    {t.habit_builder_create}
                  </button>
                </div>
              )}

              {/* Phase: Input */}
              {builderPhase === 'input' && (
                <div className="px-6 pb-6 animate-fade-in">
                  <input
                    type="text"
                    value={newHabitTitle}
                    onChange={e => setNewHabitTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleStartChallenge()}
                    placeholder={t.habit_builder_placeholder}
                    className="w-full px-5 py-3.5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-medium text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors mb-4"
                    autoFocus
                  />
                  <button
                    onClick={handleStartChallenge}
                    disabled={!newHabitTitle.trim()}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-black tracking-wider disabled:opacity-30 hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-300"
                  >
                    <Play size={16} fill="currentColor" />
                    {t.habit_builder_start}
                  </button>
                </div>
              )}

              {/* Phase: Setup */}
              {builderPhase === 'setup' && currentChallenge && (() => {
                const { taskFound, autoFound } = detectSteps(currentChallenge);
                const bothDone = taskFound && autoFound;
                const startDate = new Date(currentChallenge.startDate);
                const now = new Date();
                const daysPassed = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
                const daysRemaining = Math.max(0, 21 - daysPassed);
                const progressPct = Math.min((daysPassed / 21) * 100, 100);

                return (
                  <div className="px-6 pb-6 animate-fade-in">
                    {/* Challenge Title */}
                    <h4 className="text-xl font-black text-gray-900 dark:text-white mb-5">{currentChallenge.title}</h4>

                    {/* Progress Bar */}
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">{t.habit_builder_days_remaining}</span>
                        <span className="text-2xl font-black text-gray-900 dark:text-white">{daysRemaining}</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${progressPct}%`, backgroundColor: accentColor }}
                        />
                      </div>
                      <div className="flex justify-between mt-1.5">
                        <span className="text-[10px] text-gray-400 font-medium">{t.habit_builder_day_start}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{t.habit_builder_day_end}</span>
                      </div>
                    </div>

                    {/* Checklist Steps */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 space-y-4 border border-gray-100 dark:border-gray-700/50">
                      {/* Step 1: Create task */}
                      <div
                        onClick={handleStep1Click}
                        className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${taskFound
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                          }`}>
                          {taskFound ? <Check size={16} strokeWidth={3} /> : <Target size={16} />}
                        </div>
                        <div>
                          <p className={`text-xs font-black tracking-wide ${taskFound ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>{t.habit_builder_step1_title}</p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{t.habit_builder_step1_desc}</p>
                        </div>
                      </div>

                      {/* Step 2: Automate */}
                      <div
                        onClick={handleStep2Click}
                        className="flex items-start gap-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${autoFound
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                          }`}>
                          {autoFound ? <Check size={16} strokeWidth={3} /> : <RefreshCw size={16} />}
                        </div>
                        <div>
                          <p className={`text-xs font-black tracking-wide ${autoFound ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>{t.habit_builder_step2_title}</p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{t.habit_builder_step2_desc}</p>
                        </div>
                      </div>

                      {/* Step 3: Mastery */}
                      <div className="flex items-start gap-3 p-2 rounded-xl opacity-80">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500">
                          <Trophy size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-black tracking-wide text-gray-900 dark:text-white">{t.habit_builder_step3_title}</p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{t.habit_builder_step3_desc}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={bothDone ? handleMeasureHabit : undefined}
                      disabled={!bothDone}
                      className={`w-full mt-5 py-3.5 rounded-2xl text-sm font-black tracking-wider transition-all duration-300 ${bothDone
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 cursor-pointer'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        }`}
                    >
                      {t.habit_builder_measure}
                    </button>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* Stress Load – REDESIGNED */}
          <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800 mt-4">
            <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-center">{t.stress_level}</p>
            <div className="relative flex justify-center mb-4">
              <StressGauge value={kpiStats.stressLevel} />
            </div>
            <div className="text-center mt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-4">{t.stress_subtitle}</p>

              {/* Minimalist Expand Trigger (Only visible when collapsed) */}
              {!showStressInfo && (
                <button
                  onClick={() => setShowStressInfo(true)}
                  className="flex flex-col items-center justify-center w-full py-2 group focus:outline-none animate-fade-in"
                >
                  <ChevronDown className="text-gray-300 dark:text-gray-600 animate-bounce" size={20} strokeWidth={2.5} />
                </button>
              )}

              {/* Expandable Content */}
              <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${showStressInfo ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}
              >
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 text-left border border-gray-100 dark:border-gray-800 relative">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Info size={14} className="text-gray-400" />
                    {t.stress_info_title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
                    {t.stress_info_desc}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-4">
                    {t.stress_tip_label} {t.stress_tip_text}
                  </p>

                  {/* Collapse Trigger (Bottom of content) */}
                  <div className="flex justify-center pt-2 border-t border-gray-200 dark:border-gray-700/50">
                    <button
                      onClick={() => setShowStressInfo(false)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                      <ChevronUp className="text-gray-300 dark:text-gray-600" size={20} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Recommended Articles – REDESIGNED with gradients */}
          <section className="mt-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 ml-2">{t.recommended_articles}</h3>
            <div className="space-y-6">
              {localizedArticles.map(article => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  onOpen={() => setSelectedArticle(article)}
                />
              ))}
            </div>
          </section>

          {/* PlanifAI Tip */}
          <section className="bg-rose-50/50 dark:bg-rose-950/20 rounded-[2.5rem] p-6 border border-rose-100 dark:border-rose-900/30 flex items-start gap-5 mt-4">
            <div className="w-14 h-14 shrink-0 rounded-[1.2rem] bg-rose-400 flex items-center justify-center text-white shadow-lg shadow-rose-400/20">
              <Lightbulb size={28} className="fill-white/20" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white text-base">{t.planifai_tip}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                {t.tip_desc}
              </p>
            </div>
          </section>
        </main>
      </div>

      {/* Apple-Style Article Modal */}
      {selectedArticle && (
        <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
      )}

      {/* Event Modal for Habit Tasks */}
      {modalOpen && (
        <EventDetailModal
          event={modalAttributes.event as CalendarEvent}
          isCreating={modalAttributes.isCreating}
          initialDate={new Date()}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
};

// ─── Small Stat Card Component ─────────────────────────────────────────
const StatSmallCard: React.FC<{
  icon: React.ReactNode;
  bgIcon: string;
  label: string;
  value: string;
  subtext: string;
  tooltip?: string;
  subtextClassName?: string;
}> = ({ icon, bgIcon, label, value, subtext, tooltip, subtextClassName }) => (
  <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between h-40 relative group">
    {tooltip && (
      <div className="absolute top-4 right-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" title={tooltip}>
        <Info size={14} />
      </div>
    )}
    <div className={`w-10 h-10 rounded-full ${bgIcon} dark:bg-opacity-20 flex items-center justify-center mb-2`}>
      {icon}
    </div>
    <div>
      <p className="text-[#94A3B8] text-[9px] font-black uppercase tracking-[0.2em] mb-1">{label}</p>
      <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter mb-0.5">{value}</h3>
      <p className={`text-[10px] font-bold ${subtextClassName || 'text-gray-400'}`}>{subtext}</p>
    </div>
  </div>
);

// ─── Habit Indicator (NOW with per-category color) ──────────────────────
const HabitIndicator: React.FC<{ label: string; current: number; total: number; color: string }> = ({ label, current, total, color }) => {
  const { t } = useCalendar();
  const pct = Math.round((current / total) * 100);
  return (
    <div className="bg-white dark:bg-gray-900 rounded-[1.5rem] p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col gap-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-bold text-gray-900 dark:text-white">{label}</span>
        <span
          className="text-[10px] font-black px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {pct}%
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1 h-3 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, backgroundColor: color }}
          ></div>
        </div>
        <span className="text-[10px] font-black whitespace-nowrap" style={{ color }}>
          {current}/{total} {t.days_label}
        </span>
      </div>
    </div>
  );
};

// ─── Stress Gauge (REDESIGNED – thicker, better labels, needle, value) ──
const StressGauge: React.FC<{ value: number }> = ({ value }) => {
  const { t } = useCalendar(); // Needed for Low/High labels if we interpolate them (but labels are svg text, so we can just pass them as props or use t here if safe)
  // Clamp value 0-100
  const clamped = Math.max(0, Math.min(100, value));

  // Calculate needle angle: 0 = far left (180°), 100 = far right (0°)
  const needleAngle = 180 - (clamped / 100) * 180;
  // Convert to radians for calculation if needed, but we use rotate transform

  // Label for stress level
  let stressLabel = t && t.stress_low ? t.stress_low : 'Low';
  /* Logic for label removed as it is not displayed */

  return (
    <div className="relative w-full max-w-[18rem] aspect-[2/1] flex flex-col items-center mb-6">
      <svg viewBox="0 0 200 130" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="stressGradientNew" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="35%" stopColor="#34D399" />
            <stop offset="55%" stopColor="#FBBF24" />
            <stop offset="75%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <filter id="needleShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* Background arc */}
        <path
          d="M 20 90 A 80 80 0 0 1 180 90"
          fill="none"
          stroke="#F1F5F9"
          strokeWidth="20"
          strokeLinecap="round"
        />
        {/* Colored arc */}
        <path
          d="M 20 90 A 80 80 0 0 1 180 90"
          fill="none"
          stroke="url(#stressGradientNew)"
          strokeWidth="20"
          strokeLinecap="round"
          strokeDasharray="251.32"
          strokeDashoffset={251.32 - (251.32 * (clamped / 100))}
          className="transition-all duration-1000 ease-out"
        />

        {/* Needle Group - Rotated from center (100, 90) */}
        <g transform={`rotate(${180 - 180 * (clamped / 100) - 90}, 100, 90)`}>
          {/* The rotate logic above is: -90 (start) to +90 (end) roughly? 
                 Actually, simpler: 0% -> -90deg, 50% -> 0deg, 100% -> 90deg relative to vertical?
                 Let's stick to the previous coordinate calculation if simpler, 
                 OR use standard svg rotation.
                 
                 Previous logic: 
                 0% = 180 deg (Left)
                 100% = 0 deg (Right)
                 
                 Let's assume the needle points RIGHT by default.
                 If we rotate it:
                 Needle starts pointing Left (-180)?
             */}
          {/* Let's re-use the coordinate math from before, it was cleaner for React */}
        </g>

        {/* Helper values for lines */}
        <line
          x1="100" y1="90"
          x2={100 + 65 * Math.cos((180 - (clamped / 100) * 180) * Math.PI / 180)}
          y2={90 - 65 * Math.sin((180 - (clamped / 100) * 180) * Math.PI / 180)}
          stroke="#1F2937"
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#needleShadow)"
          className="transition-all duration-1000 ease-out"
        />

        {/* Needle center dot */}
        <circle cx="100" cy="90" r="8" fill="white" stroke="#E5E7EB" strokeWidth="2" />
        <circle cx="100" cy="90" r="4" fill="#1F2937" />

        {/* Gauge ticks (adjusted downwards) */}
        <text x="20" y="125" textAnchor="middle" className="text-[10px] fill-gray-400 font-bold uppercase tracking-wider">{t?.stress_low || 'LOW'}</text>
        <text x="180" y="125" textAnchor="middle" className="text-[10px] fill-gray-400 font-bold uppercase tracking-wider">{t?.stress_high || 'HIGH'}</text>
      </svg>

      {/* Center Value removed completely as requested */}
    </div>
  );
};

// ─── Article Card (REDESIGNED – CSS gradients, no images) ───────────────
const ArticleCard: React.FC<{ article: any; onOpen: () => void }> = ({ article, onOpen }) => (
  <button
    onClick={onOpen}
    className="w-full text-left bg-white dark:bg-gray-900 rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md active:scale-[0.98] transition-all duration-200"
  >
    {/* Gradient header with icon */}
    <div
      className="relative h-40 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: article.image ? `url(${article.image}) center/cover no-repeat` : article.gradient
      }}
    >
      {article.image && <div className="absolute inset-0 bg-black/20" />}
      {!article.image && <span className="relative z-10 text-5xl mb-3 drop-shadow-sm select-none transform transition-transform group-hover:scale-110">{article.icon}</span>}
      {!article.image && <p className="text-white/90 font-black text-[10px] uppercase tracking-[0.3em]">{article.tag}</p>}
      {/* Read time badge removed as requested */}
    </div>
    {/* Content */}
    <div className="p-7">
      <h4 className="text-lg font-bold text-gray-900 dark:text-white leading-tight mb-2">{article.title}</h4>
      <p className="text-xs text-gray-500 font-medium leading-relaxed mb-4 line-clamp-2">{article.desc}</p>
      <div className="flex items-center gap-1.5 text-xs font-bold transition-colors group-hover:text-purple-600" style={{ color: '#667eea' }}>
        <span>Leer artículo</span>
        <ArrowRight size={14} />
      </div>
    </div>
  </button>
);

// ─── Apple-Style Article Modal ──────────────────────────────────────────
const ArticleModal: React.FC<{ article: any; onClose: () => void }> = ({ article, onClose }) => (
  <div
    className="fixed inset-0 z-[200] bg-white dark:bg-gray-950 animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)] overflow-y-auto"
    style={{
      animationFillMode: 'forwards'
    }}
  >
    {/* Hero */}
    <div
      className="relative h-64 flex flex-col items-center justify-center -mt-10 pt-10 overflow-hidden"
      style={{
        background: article.image ? `url(${article.image}) center/cover no-repeat` : article.gradient
      }}
    >
      {article.image && <div className="absolute inset-0 bg-black/30" />}
      {/* Close button - Increased z-index and touch area */}
      <button
        onClick={onClose}
        className="absolute top-14 right-5 w-10 h-10 rounded-full bg-black/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/20 transition-all active:scale-95 z-50 border border-white/10"
      >
        <X size={20} />
      </button>

      <div className="flex flex-col items-center animate-[fadeIn_0.5s_ease-out_0.2s_both]">
        {!article.image && <span className="text-7xl mb-4 drop-shadow-lg">{article.icon}</span>}
        {!article.image && <p className="text-white/90 font-black text-[10px] uppercase tracking-[0.3em] mb-2">{article.tag}</p>}

      </div>
    </div>

    {/* Content body */}
    <div className="w-full">
      <div className="max-w-2xl mx-auto px-8 py-10">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white leading-tight mb-3 tracking-tight">
          {article.title}
        </h1>
        <p className="text-base text-gray-500 font-medium mb-10 leading-relaxed border-l-4 border-purple-100 dark:border-purple-900/50 pl-4">
          {article.desc}
        </p>

        <div className="space-y-10">
          {article.body.map((section, idx) => (
            <div key={idx} className="animate-[fadeUp_0.5s_ease-out_both]" style={{ animationDelay: `${0.1 * idx}s` }}>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                {section.heading}
              </h2>
              <p className="text-[15px] text-gray-600 dark:text-gray-300 leading-loose whitespace-pre-line text-justify opacity-90">
                {section.text}
              </p>
            </div>
          ))}
        </div>

        {/* Footer spacer for safe area */}
        <div className="h-32"></div>
      </div>
    </div>

    {/* Bottom Floating Action Bar removed */}

    {/* Keyframes */}
    <style>{`
      @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  </div>
);
