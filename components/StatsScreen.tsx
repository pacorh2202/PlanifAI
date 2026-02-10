
import React, { useMemo, useState } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Flame, TrendingUp, ChevronDown, Lightbulb, X, BookOpen, Clock, ArrowRight } from 'lucide-react';
import gradientGreen from '../src/assets/gradient-green.png';
import gradientPink from '../src/assets/gradient-pink.png';

// ─── Article content data ───────────────────────────────────────────────
const ARTICLES = [
  {
    id: 'pomodoro',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    image: gradientGreen,
    icon: '🍅',
    tag: 'PRODUCTIVIDAD',
    title: 'Optimiza tu flujo de trabajo con la técnica Pomodoro',
    desc: 'Descubre cómo pequeños descansos pueden aumentar tu productividad diaria.',
    readTime: '5 min',
    body: [
      {
        heading: '¿Qué es la técnica Pomodoro?',
        text: 'La técnica Pomodoro es un método de gestión del tiempo desarrollado por Francesco Cirillo a finales de los años 80. Consiste en dividir el trabajo en intervalos de 25 minutos (llamados "pomodoros"), separados por descansos cortos de 5 minutos.'
      },
      {
        heading: '¿Por qué funciona?',
        text: 'Nuestro cerebro no está diseñado para mantener la concentración durante horas seguidas. Los intervalos cortos mantienen la mente fresca y reducen la fatiga mental. Estudios demuestran que esta técnica puede aumentar la productividad hasta un 25%.'
      },
      {
        heading: 'Cómo implementarla',
        text: '1. Elige una tarea específica.\n2. Configura un temporizador a 25 minutos.\n3. Trabaja sin interrupciones hasta que suene.\n4. Toma un descanso de 5 minutos.\n5. Cada 4 pomodoros, toma un descanso largo de 15-30 minutos.'
      },
      {
        heading: 'Consejos avanzados',
        text: 'Combina la técnica Pomodoro con la regla de las 2 tareas: durante cada pomodoro, enfócate en máximo 2 objetivos. Registra cuántos pomodoros dedicas a cada proyecto para identificar dónde inviertes más energía.'
      }
    ]
  },
  {
    id: 'superfoods',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    image: gradientPink,
    icon: '🧠',
    tag: 'BIENESTAR',
    title: 'Superalimentos para mantener el cerebro activo',
    desc: 'La nutrición es clave para mantener un enfoque sostenido durante el día.',
    readTime: '4 min',
    body: [
      {
        heading: '¿Qué son los superalimentos?',
        text: 'Los superalimentos son alimentos ricos en nutrientes que ofrecen beneficios significativos para la salud. Para el cerebro, ciertos alimentos pueden mejorar la memoria, la concentración y la claridad mental.'
      },
      {
        heading: 'Top 5 para tu cerebro',
        text: '• Arándanos: Ricos en antioxidantes que protegen las neuronas.\n• Nueces: Contienen ácidos grasos omega-3 esenciales.\n• Aguacate: Promueve el flujo sanguíneo cerebral.\n• Chocolate negro: Mejora la concentración y el estado de ánimo.\n• Salmón: Alto en DHA, crucial para la función cerebral.'
      },
      {
        heading: 'Planifica tu alimentación',
        text: 'Incluye al menos 2-3 superalimentos en tu dieta diaria. Un desayuno con arándanos y nueces, un snack de chocolate negro por la tarde, y salmón para cenar puede transformar tu rendimiento cognitivo.'
      },
      {
        heading: 'Hidratación',
        text: 'No olvides el agua. La deshidratación, incluso leve, puede reducir la concentración hasta un 30%. Bebe al menos 8 vasos de agua al día y considera infusiones de té verde para un extra de antioxidantes.'
      }
    ]
  }
];

// ─── Main Component ─────────────────────────────────────────────────────
export const StatsScreen: React.FC = () => {
  const { stats, t, language, accentColor, activeTemplate } = useCalendar();
  const [selectedArticle, setSelectedArticle] = useState<typeof ARTICLES[0] | null>(null);

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
    <>
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

          {/* Comparison Cards – FIXED: proper chart margins */}
          <div className="space-y-4">
            <CategoryComparisonCard
              title="Deporte"
              data={categoryData.deporte}
              accentColor={categoryColors.exercise}
              t={t}
            />
            <CategoryComparisonCard
              title="Social"
              data={categoryData.social}
              accentColor={accentColor}
              t={t}
            />
          </div>

          {/* Mejorar Hábitos – IMPROVED: category-specific colors */}
          <section className="mt-2">
            <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-[0.2em] mb-4 ml-2">MEJORAR HÁBITOS</p>
            <div className="space-y-3">
              <HabitIndicator label="Hacer más ejercicio" current={12} total={30} color={categoryColors.exercise} />
              <HabitIndicator label="Levantarse pronto" current={22} total={30} color={categoryColors.wakeUp} />
              <HabitIndicator label="Comer sano" current={28} total={30} color={categoryColors.eatHealthy} />
            </div>
          </section>

          {/* Stress Load – REDESIGNED */}
          <section className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800 mt-4">
            <p className="text-[#94A3B8] text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-center">NIVEL DE ESTRÉS</p>
            <div className="relative flex justify-center mb-4">
              <StressGauge value={65} />
            </div>
            <div className="text-center mt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Tu nivel de estrés ha bajado un <span className="font-bold text-emerald-500">15%</span> esta semana</p>
            </div>
          </section>

          {/* Recommended Articles – REDESIGNED with gradients */}
          <section className="mt-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 ml-2">Artículos recomendados</h3>
            <div className="space-y-6">
              {ARTICLES.map(article => (
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
              <h4 className="font-bold text-gray-900 dark:text-white text-base">Tip de PlanifAI</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Tu concentración es mayor los miércoles por la mañana. ¿Agendamos tus tareas críticas ahí?
              </p>
            </div>
          </section>
        </main>
      </div>

      {/* Apple-Style Article Modal */}
      {selectedArticle && (
        <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} />
      )}
    </>
  );
};

// ─── Category Comparison Card (FIXED chart overflow) ────────────────────
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
    {/* FIXED: removed -ml-4 and added proper margins so chart is not clipped */}
    <div className="h-36 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
          <XAxis dataKey="day" hide />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </section>
);

// ─── Habit Indicator (NOW with per-category color) ──────────────────────
const HabitIndicator: React.FC<{ label: string; current: number; total: number; color: string }> = ({ label, current, total, color }) => {
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
          {current}/{total} días
        </span>
      </div>
    </div>
  );
};

// ─── Stress Gauge (REDESIGNED – thicker, better labels, needle, value) ──
const StressGauge: React.FC<{ value: number }> = ({ value }) => {
  // Clamp value 0-100
  const clamped = Math.max(0, Math.min(100, value));

  // Calculate needle angle: 0 = far left (180°), 100 = far right (0°)
  const needleAngle = 180 - (clamped / 100) * 180;
  // Convert to radians for calculation if needed, but we use rotate transform

  // Label for stress level
  let stressLabel = 'Óptimo';
  if (clamped > 70) { stressLabel = 'Muy estresado'; }
  else if (clamped > 40) { stressLabel = 'Regular'; }

  return (
    <div className="relative w-full max-w-[18rem] aspect-[2/1] flex flex-col items-center mb-6">
      <svg viewBox="0 0 200 110" className="w-full h-full overflow-visible">
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

        {/* Gauge ticks (optional apple polish) */}
        <text x="20" y="108" textAnchor="middle" className="text-[10px] fill-gray-400 font-bold uppercase tracking-wider">Bajo</text>
        <text x="180" y="108" textAnchor="middle" className="text-[10px] fill-gray-400 font-bold uppercase tracking-wider">Alto</text>
      </svg>

      {/* Center Value - Positioned absolutely below the pivot but 'inside' the layout flow via flex/margin if possible, or absolute centered */}
      <div className="absolute top-[60%] flex flex-col items-center pointer-events-none">
        {/* Value is now clearly separated from the arc text */}
        {/* Value removed */}
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0 bg-white/50 dark:bg-black/50 px-2 rounded-full backdrop-blur-sm">
          {stressLabel}
        </span>
      </div>
    </div>
  );
};

// ─── Article Card (REDESIGNED – CSS gradients, no images) ───────────────
const ArticleCard: React.FC<{ article: typeof ARTICLES[0]; onOpen: () => void }> = ({ article, onOpen }) => (
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
      <span className="relative z-10 text-5xl mb-3 drop-shadow-sm select-none transform transition-transform group-hover:scale-110">{article.icon}</span>
      <p className="text-white/90 font-black text-[10px] uppercase tracking-[0.3em]">{article.tag}</p>
      {/* Read time badge */}
      <div className="absolute top-4 right-5 flex items-center gap-1.5 bg-white/25 backdrop-blur-md rounded-full px-3 py-1 border border-white/20">
        <Clock className="text-white" size={12} />
        <span className="text-white text-[10px] font-bold">{article.readTime}</span>
      </div>
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
const ArticleModal: React.FC<{ article: typeof ARTICLES[0]; onClose: () => void }> = ({ article, onClose }) => (
  <div
    className="fixed inset-0 z-[200] flex flex-col bg-white dark:bg-gray-950 animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)]"
    style={{
      animationFillMode: 'forwards'
    }}
  >
    {/* Hero */}
    <div
      className="relative shrink-0 h-64 flex flex-col items-center justify-center -mt-10 pt-10 overflow-hidden"
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
        <span className="text-7xl mb-4 drop-shadow-lg">{article.icon}</span>
        <p className="text-white/90 font-black text-[10px] uppercase tracking-[0.3em] mb-2">{article.tag}</p>
        <div className="flex items-center gap-1.5 text-white/80 text-[11px] font-bold bg-black/10 px-3 py-1 rounded-full backdrop-blur-sm">
          <Clock size={12} />
          <span>{article.readTime} lectura</span>
        </div>
      </div>
    </div>

    {/* Content body */}
    <div className="flex-1 overflow-y-auto w-full">
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
