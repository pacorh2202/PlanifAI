
import React, { useState, useEffect } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { ChevronLeft, Check, Palette, Star, ChevronRight, Plus, Pencil, Sun, Sparkles } from 'lucide-react';
import { ICON_MAP } from '../constants';

interface ColorPaletteScreenProps {
  onBack: () => void;
  onOpenCustom: () => void;
}

const PRESET_ACCENTS = [
  '#B2D3A1', // Original Green
  '#3b82f6', // iOS Blue
  '#A7C7E7', // Soft Ocean
  '#1E293B', // Slate Deep
  '#FF7566', // Soft Red/Coral
  '#8B5CF6', // Vivid Purple
];

const hexToHsl = (hex: string) => {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
};

const hslToHex = (h: number, s: number, l: number) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
};

export const ColorPaletteScreen: React.FC<ColorPaletteScreenProps> = ({ onBack, onOpenCustom }) => {
  const { activeTemplate, defaultTemplates, customTemplate, accentColor, setTemplate, setAccentColor, t } = useCalendar();
  const [hsl, setHsl] = useState(() => hexToHsl(accentColor));
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const updateHsl = (newHsl: Partial<{ h: number, s: number, l: number }>) => {
    const updated = { ...hsl, ...newHsl };
    setHsl(updated);
    const hex = hslToHex(updated.h, updated.s, updated.l);
    setAccentColor(hex);
  };

  const selectPreset = (color: string) => {
    setAccentColor(color);
    setHsl(hexToHsl(color));
  };

  const isCustomActive = activeTemplate.id === 'custom';

  const renderTemplateCard = (template: any, isSelected: boolean, onClick: () => void, onEdit?: () => void) => (
    <div
      key={template.id}
      onClick={onClick}
      className={`bg-white dark:bg-[#121212] rounded-[2.5rem] p-7 relative border-2 transition-all duration-500 cursor-pointer shadow-sm ${isSelected ? 'ring-1 ring-opacity-20' : 'border-transparent'
        }`}
      style={{ borderColor: isSelected ? accentColor : 'transparent' }}
    >
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">{template.name}</h3>
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${isSelected ? 'shadow-lg' : 'bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700'
            }`}
          style={{ backgroundColor: isSelected ? accentColor : 'transparent' }}
        >
          {isSelected && <Check size={16} strokeWidth={4} className="text-white" />}
        </div>
      </div>

      <div className="grid grid-cols-6 gap-3">
        {template.categories.slice(0, 6).map((cat: any, idx: number) => {
          const IconComp = ICON_MAP[cat.icon] || Star;
          return (
            <div key={idx} className="flex flex-col items-center gap-2.5">
              <IconComp size={16} className="text-gray-400" />
              <span className="text-[10px] font-black text-gray-400 truncate w-full text-center uppercase tracking-tighter">{cat.label}</span>
              <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: cat.color }}></div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#F8F9FA] dark:bg-[#0A0A0A] relative overflow-hidden transition-colors duration-300">
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#F8F9FA]/80 dark:bg-[#0A0A0A]/80 backdrop-blur-md z-20">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800 transition-colors">
          <ChevronLeft className="text-gray-900 dark:text-white" size={28} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t.personalization}</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar px-6 pt-4 pb-12">
        <p className="text-[14px] text-gray-400 font-medium mb-8 px-2 text-center leading-relaxed">
          {t.personalize_desc}
        </p>

        <section className="mb-12">
          <h2 className="text-[11px] font-black text-[#CBD5E1] uppercase tracking-[0.3em] mb-6 ml-4">{t.accent_color_label}</h2>
          <div className="bg-white dark:bg-[#121212] rounded-[3rem] p-8 shadow-sm border border-gray-100 dark:border-gray-900 transition-all duration-500">
            <div className="flex flex-wrap gap-4 mb-10 justify-center">
              {PRESET_ACCENTS.map((color) => (
                <button
                  key={color}
                  onClick={() => selectPreset(color)}
                  className={`w-12 h-12 rounded-full border-4 transition-all active:scale-90 ${accentColor === color ? 'border-gray-900 dark:border-white scale-110 shadow-lg' : 'border-transparent'
                    }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <button
                onClick={() => setShowCustomPicker(!showCustomPicker)}
                className={`w-12 h-12 rounded-full border-4 flex items-center justify-center transition-all active:scale-90 ${showCustomPicker || !PRESET_ACCENTS.includes(accentColor)
                    ? 'border-gray-900 dark:border-white scale-110 shadow-lg'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400'
                  }`}
                style={{ backgroundColor: (showCustomPicker || !PRESET_ACCENTS.includes(accentColor)) ? accentColor : '' }}
              >
                <Palette size={20} className={(showCustomPicker || !PRESET_ACCENTS.includes(accentColor)) ? (hsl.l > 70 ? 'text-black' : 'text-white') : 'text-gray-400'} />
              </button>
            </div>

            {showCustomPicker && (
              <div className="space-y-10 animate-fade-in pt-8 border-t border-gray-50 dark:border-gray-800">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 h-20 rounded-[2rem] shadow-inner border border-gray-100 dark:border-gray-800 transition-all duration-500 flex items-center justify-center" style={{ backgroundColor: accentColor }}>
                    <Sparkles size={24} className={hsl.l > 60 ? 'text-black/20' : 'text-white/30'} />
                  </div>
                  <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 rounded-[1.5rem] border border-gray-100 dark:border-gray-800">
                    <span className="text-[14px] font-mono font-black text-gray-500 uppercase tracking-widest">{accentColor}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between px-2">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.hue_label}</span>
                    <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase">{Math.round(hsl.h)}°</span>
                  </div>
                  <div className="relative w-full h-6 rounded-full">
                    <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)' }}></div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={hsl.h}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={(e) => updateHsl({ h: parseInt(e.target.value) })}
                    />
                    <div
                      className="absolute top-1/2 pointer-events-none w-8 h-8 bg-white rounded-full border-4 border-white shadow-xl -translate-y-1/2 -translate-x-1/2 transition-all duration-100"
                      style={{ left: `${(hsl.h / 360) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between px-2">
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Sun size={12} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{t.intensity_label}</span>
                    </div>
                    <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase">{Math.round(hsl.l)}%</span>
                  </div>
                  <div className="relative w-full h-6 rounded-full overflow-hidden">
                    <div className="absolute inset-0 rounded-full" style={{
                      background: `linear-gradient(to right, ${hslToHex(hsl.h, 100, 10)} 0%, ${hslToHex(hsl.h, 100, 50)} 50%, ${hslToHex(hsl.h, 100, 90)} 100%)`
                    }}></div>
                    <input
                      type="range"
                      min="15"
                      max="85"
                      value={hsl.l}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={(e) => updateHsl({ l: parseInt(e.target.value), s: 85 })}
                    />
                    <div
                      className="absolute top-1/2 pointer-events-none w-8 h-8 bg-white rounded-full border-4 border-white shadow-xl -translate-y-1/2 -translate-x-1/2 transition-all duration-100"
                      style={{ left: `${((hsl.l - 15) / 70) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="mb-12">
          <h2 className="text-[11px] font-black text-[#CBD5E1] uppercase tracking-[0.3em] mb-6 ml-4">{t.your_config_label}</h2>
          {renderTemplateCard(
            customTemplate,
            isCustomActive,
            () => setTemplate('custom'),
            onOpenCustom
          )}
        </div>

        <div className="mb-16">
          <h2 className="text-[11px] font-black text-[#CBD5E1] uppercase tracking-[0.3em] mb-6 ml-4">{t.system_templates_label}</h2>
          <div className="space-y-6">
            {defaultTemplates.map((template) =>
              renderTemplateCard(template, activeTemplate.id === template.id, () => setTemplate(template.id))
            )}
          </div>
        </div>

        <div className="pt-4">
          <button
            onClick={onBack}
            className="w-full py-6 text-white rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
            style={{
              backgroundColor: accentColor,
              boxShadow: `0 20px 50px -10px ${accentColor}66`,
              color: hsl.l > 75 ? '#000000' : '#FFFFFF'
            }}
          >
            <Check size={18} strokeWidth={4} />
            {t.apply_changes}
          </button>
        </div>
      </main>
    </div>
  );
};
