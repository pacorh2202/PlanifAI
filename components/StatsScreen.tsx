
import React, { useMemo } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Bell, Flame, TrendingUp, ChevronDown, Calendar, Lightbulb } from 'lucide-react';

export const StatsScreen: React.FC = () => {
  const { stats, t, language, accentColor } = useCalendar();

  // Mock data for comparison charts (You vs Friend)
  const categoryData = {
    deporte: [
      { day: 'L', you: 4, friend: 3 },
      { day: 'M', you: 3, friend: 4 },
      { day: 'X', you: 5, friend: 3 },
      { day: 'J', you: 4, friend: 4 },
      { day: 'V', you: 6, friend: 4 },
      { day: 'S', you: 8, friend: 5 },
      { day: 'D', you: 7, friend: 6 },
    ],
    social: [
      { day: 'L', you: 2, friend: 4 },
      { day: 'M', you: 3, friend: 3 },
      { day: 'X', you: 2, friend: 5 },
      { day: 'J', you: 4, friend: 4 },
      { day: 'V', you: 6, friend: 6 },
      { day: 'S', you: 8, friend: 7 },
      { day: 'D', you: 9, friend: 8 },
    ]
  };

  const streakProgress = stats?.current_streak || 0;
  const streakGoal = 20;

  return (
    <div
      className="flex flex-col h-full bg-[#F8FAFC] dark:bg-black overflow-y-auto no-scrollbar pb-40 transition-opacity duration-300"
      style={{ willChange: 'opacity', contain: 'content' }}
    >
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80 dark:bg-black/80 backdrop-blur-md z-20">
        <div className="w-10"></div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Estadísticas</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex flex-col gap-6 px-6 pt-2">
        {/* Card: Racha Actual */}
        <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-[0.2em] mb-1">RACHA ACTUAL</p>
              <h2 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">
                {streakProgress} <span className="text-2xl font-bold ml-1">días</span>
              </h2>
              <div className="flex items-center gap-1 mt-2 text-[#078809] font-bold text-xs">
                <TrendingUp size={14} />
                <span>+2% vs. mes anterior</span>
              </div>
            </div>
            <div className="relative w-24 h-24 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 overflow-visible">
                <circle className="text-gray-50 dark:text-gray-800" cx="50" cy="50" fill="transparent" r="42" stroke="currentColor" strokeWidth="10"></circle>
                <circle
                  cx="50"
                  cy="50"
                  fill="transparent"
                  r="42"
                  stroke={accentColor}
                  strokeWidth="10"
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
              <span className="text-gray-400">Progreso de racha</span>
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

        {/* Comparison Cards */}
        <div className="space-y-4">
          <CategoryComparisonCard
            title="Deporte"
            data={categoryData.deporte}
            accentColor={accentColor}
            t={t}
          />
          <CategoryComparisonCard
            title="Social"
            data={categoryData.social}
            accentColor={accentColor}
            t={t}
          />
        </div>

        {/* Mejorar Hábitos */}
        <section className="mt-2">
          <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-[0.2em] mb-4 ml-2">MEJORAR HÁBITOS</p>
          <div className="space-y-3">
            <HabitIndicator label="Hacer más ejercicio" current={12} total={30} accentColor={accentColor} />
            <HabitIndicator label="Levantarse pronto" current={22} total={30} accentColor={accentColor} />
            <HabitIndicator label="Comer sano" current={28} total={30} accentColor={accentColor} />
          </div>
        </section>

        {/* Stress Load */}
        <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800 mt-4">
          <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-[0.2em] mb-8 text-center">STRESS LOAD</p>
          <div className="relative flex justify-center mb-6">
            <StressGauge value={65} />
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Tu nivel de estrés ha bajado un 15% esta semana</p>
          </div>
        </section>

        {/* Recommended Articles */}
        <section className="mt-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 ml-2">Artículos recomendados</h3>
          <div className="space-y-6">
            <ArticleCard
              image="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?q=80&w=400&auto=format&fit=crop"
              title="Optimiza tu flujo de trabajo con la técnica Pomodoro"
              desc="Descubre cómo pequeños descansos pueden aumentar tu productividad diaria."
              gradient="from-rose-400/80 to-rose-200/80"
            />
            <ArticleCard
              image="https://images.unsplash.com/photo-1498837167922-ddd27525d352?q=80&w=400&auto=format&fit=crop"
              title="Superalimentos para mantener el cerebro activo"
              desc="La nutrición es clave para mantener un enfoque sostenido durante el día."
              gradient="from-emerald-400/80 to-emerald-200/80"
            />
          </div>
        </section>

        {/* PlanifAI Tip */}
        <section className="bg-rose-50/50 dark:bg-rose-950/20 rounded-[2.5rem] p-6 border border-rose-100 dark:border-rose-900/30 flex items-start gap-5 mt-4">
          <div className="w-14 h-14 shrink-0 rounded-[1.2rem] bg-rose-400 flex items-center justify-center text-white shadow-lg shadow-rose-400/20">
            <Lightbulb size={28} className="fill-white/20" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white text-base">Tip de PlanifAI</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Tu concentración es mayor los miércoles por la mañana. ¿Agendamos tus tareas críticas ahí?
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

const CategoryComparisonCard: React.FC<{ title: string; data: any[]; accentColor: string; t: any }> = ({ title, data, accentColor, t }) => (
  <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800">
    <div className="flex justify-between items-center mb-6">
      <div>
        <p className="text-[#94A3B8] text-[9px] font-black uppercase tracking-[0.2em] mb-1">CATEGORÍA</p>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h3>
      </div>
      <div className="flex gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }}></div>
          <span className="text-[10px] font-bold text-gray-400 uppercase">Tú</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-gray-200 dark:bg-gray-700"></div>
          <span className="text-[10px] font-bold text-gray-400 uppercase">Amigo</span>
        </div>
      </div>
    </div>
    <div className="h-32 w-full -ml-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-you-${title}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={accentColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="you"
            stroke={accentColor}
            strokeWidth={3}
            fillOpacity={1}
            fill={`url(#gradient-you-${title})`}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="friend"
            stroke="#E2E8F0"
            strokeWidth={2}
            fill="transparent"
            isAnimationActive={false}
          />
          <XAxis
            dataKey="day"
            hide
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </section>
);

const HabitIndicator: React.FC<{ label: string; current: number; total: number; accentColor: string }> = ({ label, current, total, accentColor }) => (
  <div className="bg-white dark:bg-gray-900 rounded-[1.5rem] p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col gap-3">
    <div className="flex justify-between items-center">
      <span className="text-sm font-bold text-gray-900 dark:text-white">{label}</span>
      <ChevronDown size={18} className="text-gray-300" />
    </div>
    <div className="flex items-center gap-4">
      <div className="flex-1 h-2 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${(current / total) * 100}%`, backgroundColor: accentColor }}
        ></div>
      </div>
      <span className="text-[10px] font-black text-rose-400 whitespace-nowrap">{current}/{total} días</span>
    </div>
  </div>
);

const StressGauge: React.FC<{ value: number }> = ({ value }) => (
  <div className="relative w-64 h-32 overflow-hidden">
    <svg viewBox="0 0 200 100" className="w-full h-full">
      <path
        d="M 20 100 A 80 80 0 0 1 180 100"
        fill="none"
        stroke="#F1F5F9"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d="M 20 100 A 80 80 0 0 1 180 100"
        fill="none"
        stroke="url(#stressGradient)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray="251.32"
        strokeDashoffset={251.32 - (251.32 * (value / 100))}
        className="transition-all duration-1000"
      />
      <defs>
        <linearGradient id="stressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
      </defs>
    </svg>
    <div className="absolute bottom-0 left-0 right-0 flex justify-between px-6 pb-1">
      <span className="text-[9px] font-bold text-emerald-500 uppercase">Óptimo</span>
      <span className="text-[9px] font-bold text-amber-500 uppercase">Regular</span>
      <span className="text-[9px] font-bold text-rose-500 uppercase">Muy estresado</span>
    </div>
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-4">
      <div className="w-4 h-4 bg-white border-2 border-gray-200 rounded-full shadow-sm"></div>
    </div>
  </div>
);

const ArticleCard: React.FC<{ image: string; title: string; desc: string; gradient: string }> = ({ image, title, desc, gradient }) => (
  <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
    <div className="relative h-44 flex items-center justify-center">
      <img src={image} alt={title} className="absolute inset-0 w-full h-full object-cover opacity-80" />
      <div className={`absolute inset-0 bg-gradient-to-b ${gradient}`}></div>
      <div className="relative text-center px-4">
        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-3">
          <Calendar className="text-white" size={24} />
        </div>
        <p className="text-white font-black text-xs uppercase tracking-widest opacity-80 mb-1">PRODUCTIVITY</p>
        <div className="h-[1px] w-20 bg-white/40 mx-auto"></div>
      </div>
    </div>
    <div className="p-8">
      <h4 className="text-lg font-bold text-gray-900 dark:text-white leading-snug mb-3">{title}</h4>
      <p className="text-[11px] text-gray-400 font-medium leading-relaxed">{desc}</p>
    </div>
  </div>
);
