
import React, { useMemo } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { BarChart, Bar, ResponsiveContainer, Cell, PieChart as RPieChart, Pie, XAxis } from 'recharts';
import { TrendingUp, CheckCircle, Clock, Rocket, ShieldCheck, Flame, ArrowUpRight, Lightbulb } from 'lucide-react';

export const StatsScreen: React.FC = () => {
  const { stats, t, language } = useCalendar();

  const ACTIVITY_DATA = useMemo(() => {
    return language === 'es'
      ? [
        { name: 'LUN', value: 65 }, { name: 'MAR', value: 40 }, { name: 'MIÉ', value: 85 },
        { name: 'JUE', value: 60 }, { name: 'VIE', value: 95 }, { name: 'SÁB', value: 30 }, { name: 'DOM', value: 45 }
      ]
      : [
        { name: 'MON', value: 65 }, { name: 'TUE', value: 40 }, { name: 'WED', value: 85 },
        { name: 'THU', value: 60 }, { name: 'FRI', value: 95 }, { name: 'SAT', value: 30 }, { name: 'SUN', value: 45 }
      ];
  }, [language]);

  const DISTRIBUTION_DATA = useMemo(() => {
    if (!stats || !stats.distribution || Object.keys(stats.distribution).length === 0) {
      return language === 'es'
        ? [
          { name: 'Sin datos', value: 100, color: '#CBD5E1' },
        ]
        : [
          { name: 'No data', value: 100, color: '#CBD5E1' },
        ];
    }

    const colors = ['#ff7566', '#6A99A8', '#818CF8', '#10B981', '#F59E0B'];
    return Object.entries(stats.distribution).map(([name, value], index) => ({
      name: name === 'Focus' && language === 'es' ? 'Enfoque' :
        name === 'Health' && language === 'es' ? 'Salud' :
          name === 'Leisure' && language === 'es' ? 'Ocio' : name,
      value: value as number,
      color: colors[index % colors.length]
    }));
  }, [stats, language]);

  const ActivityChart = useMemo(() => (
    <div className="h-40 w-full" style={{ contain: 'layout size' }}>
      <ResponsiveContainer width="100%" height="100%" debounce={100}>
        <BarChart data={ACTIVITY_DATA}>
          <Bar dataKey="value" radius={[12, 12, 12, 12]} isAnimationActive={false}>
            {ACTIVITY_DATA.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === 4 ? '#ff7566' : '#F1F5F9'}
                className={index === 4 ? 'drop-shadow-[0_10px_10px_rgba(255,117,102,0.4)]' : ''}
              />
            ))}
          </Bar>
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 9, fontWeight: 900, fill: '#CBD5E1' }}
            interval={0}
            dy={10}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  ), [ACTIVITY_DATA]);

  const DistributionChart = useMemo(() => (
    <div className="flex items-center gap-6" style={{ contain: 'layout' }}>
      <div className="relative flex shrink-0 items-center justify-center w-32 h-32">
        <ResponsiveContainer width="100%" height="100%" debounce={100}>
          <RPieChart>
            <Pie
              data={DISTRIBUTION_DATA}
              innerRadius={45}
              outerRadius={55}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
              isAnimationActive={true}
            >
              {DISTRIBUTION_DATA.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} cornerRadius={10} />
              ))}
            </Pie>
          </RPieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-black text-[#1d0e0c] dark:text-white tracking-tighter leading-none">
            {stats?.total_tasks || 0}
          </span>
          <span className="text-[9px] text-gray-400 font-bold mt-1 uppercase">{t.tasks_label}</span>
        </div>
      </div>
      <div className="flex flex-col gap-3 flex-1">
        {DISTRIBUTION_DATA.filter(i => i.name !== 'Sin datos' && i.name !== 'No data').map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
              <span className="text-[10px] font-black text-gray-600 dark:text-gray-300 uppercase">{item.name}</span>
            </div>
            <span className="text-[10px] font-black text-gray-900 dark:text-white">
              {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  ), [DISTRIBUTION_DATA, stats, t]);

  return (
    <div
      className="flex flex-col h-full bg-[#F8FAFC] dark:bg-black overflow-y-auto no-scrollbar pb-52 transition-opacity duration-300"
      style={{ willChange: 'transform, opacity' }}
    >
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80 dark:bg-black/80 backdrop-blur-md z-20">
        <div className="w-10"></div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t.stats_title}</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex flex-col gap-4 px-6 pt-2">
        <section className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 shadow-sm border border-gray-50 dark:border-gray-800">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-[0.2em]">{t.current_streak}</p>
              <h1 className="text-5xl font-black mt-2 text-[#1d0e0c] dark:text-white tracking-tighter">
                {stats?.current_streak || 0} {t.days_label}
              </h1>
              <div className="flex items-center gap-1 mt-2 text-[#078809] font-bold text-xs">
                <TrendingUp size={14} />
                <span>+{(stats?.current_streak || 0) > 0 ? '5' : '0'}% {t.stats_vs_month}</span>
              </div>
            </div>
            <div className="relative w-20 h-20 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 overflow-visible">
                <circle className="text-gray-100 dark:text-gray-800" cx="50" cy="50" fill="transparent" r="42" stroke="currentColor" strokeWidth="8"></circle>
                <circle
                  className="text-rose-500"
                  cx="50"
                  cy="50"
                  fill="transparent"
                  r="42"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray="263.89"
                  strokeDashoffset={263.89 - (263.89 * Math.min((stats?.current_streak || 0) / 30, 1))}
                  strokeLinecap="round"
                ></circle>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Flame size={24} className="text-rose-500 fill-rose-500" />
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
              <span className="text-gray-400">{t.streak_progress}</span>
              <span className="text-rose-400">{stats?.current_streak || 0}/{Math.max((stats?.best_streak || 0) + 5, 10)}</span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.3)] transition-all duration-1000"
                style={{ width: `${Math.min(((stats?.current_streak || 0) / Math.max((stats?.best_streak || 0) + 5, 10)) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-rose-400 font-bold uppercase mt-1 tracking-tight">
              {stats?.current_streak === stats?.best_streak && stats?.current_streak > 0 ? '¡Récord personal!' : t.streak_goal}
            </p>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 shadow-sm border border-gray-50 dark:border-gray-800 flex items-center justify-between group">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600">
                <CheckCircle size={18} />
              </div>
              <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-[0.2em]">{t.completion_rate}</p>
            </div>
            <h3 className="text-4xl font-black text-[#1d0e0c] dark:text-white tracking-tighter">
              {stats?.completion_rate || 0}%
            </h3>
            <p className="text-[10px] text-gray-400 font-medium mt-1">{t.stats_last_7}</p>
          </div>
          <div className="flex items-center text-[#078809] bg-[#078809]/10 px-2.5 py-1 rounded-lg">
            <ArrowUpRight size={14} className="mr-1" />
            <span className="text-xs font-black">{(stats?.completion_rate || 0) > 50 ? '+5%' : '0%'}</span>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 shadow-sm border border-gray-50 dark:border-gray-800">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h3 className="text-xl font-black text-[#1d0e0c] dark:text-white leading-none uppercase tracking-tighter">{t.activities}</h3>
              <p className="text-gray-400 text-[10px] font-bold mt-1 uppercase tracking-widest">{t.stats_last_7}</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-[#1d0e0c] dark:text-white tracking-tighter">
                {stats?.total_tasks || 0}
              </span>
              <p className="text-[#078809] text-[10px] font-black uppercase">
                +{(stats?.completed || 0)} total
              </p>
            </div>
          </div>
          {ActivityChart}
        </section>

        <section className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 shadow-sm border border-gray-50 dark:border-gray-800">
          <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-[0.2em] mb-1">{t.weekly_distribution}</p>
          <p className="text-[10px] text-gray-400 font-medium mb-6">{t.stats_last_7}</p>
          {DistributionChart}
        </section>

        <div className="grid grid-cols-2 gap-4">
          <section className="bg-white dark:bg-gray-900 rounded-[2rem] p-5 shadow-sm border border-gray-50 dark:border-gray-800 flex flex-col justify-between aspect-square">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 mb-2">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-[#94A3B8] text-[9px] font-black mb-1 uppercase tracking-[0.2em] leading-tight">{t.efficiency}</p>
              <h4 className="text-2xl font-black text-[#1d0e0c] dark:text-white tracking-tighter">
                {stats?.avg_daily || 0}
              </h4>
              <p className="text-[10px] text-indigo-600 font-bold mt-1 uppercase tracking-tight">{t.stats_efficiency_desc}</p>
            </div>
          </section>
          <section className="bg-white dark:bg-gray-900 rounded-[2rem] p-5 shadow-sm border border-gray-50 dark:border-gray-800 flex flex-col justify-between aspect-square">
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 mb-2">
              <Rocket size={22} />
            </div>
            <div>
              <p className="text-[#94A3B8] text-[9px] font-black mb-1 uppercase tracking-[0.2em] leading-tight">PREDICCIONES</p>
              <h4 className="text-2xl font-black text-[#1d0e0c] dark:text-white tracking-tighter">
                {stats?.pending_tasks || 0}
              </h4>
              <p className="text-[10px] text-orange-600 font-bold mt-1 uppercase tracking-tight">Tareas pendientes</p>
            </div>
          </section>
        </div>

        <section className="bg-rose-500/10 dark:bg-rose-500/20 rounded-[2rem] p-6 border border-rose-500/20 flex items-start gap-4 mb-4">
          <div className="w-12 h-12 shrink-0 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
            <Lightbulb size={24} className="fill-white/20" />
          </div>
          <div>
            <h4 className="font-black text-[#1d0e0c] dark:text-white text-base uppercase tracking-tighter">{t.tip_title}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              {stats && stats.completed > 0
                ? `¡Llevas ${stats.completed} tareas completadas! Sigue así para aumentar tu racha actual de ${stats.current_streak} días.`
                : t.tip_desc}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};
