
import React, { useState } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { ArrowLeft, Pencil, Plus, Star, GripVertical, Check, Sun } from 'lucide-react';
import { CategoryStyle } from '../types';
import { ICON_MAP } from '../constants';

interface CustomPaletteScreenProps {
  onBack: () => void;
}

const AVAILABLE_ICONS = Object.entries(ICON_MAP).map(([name, component]) => ({
  name,
  component
}));

const hexToHsl = (hex: string) => {
  if (!hex) return { h: 0, s: 0, l: 0 };
  let r = parseInt(hex.slice(1, 3), 16)/ 255;
  let g = parseInt(hex.slice(3, 5), 16)/ 255;
  let b = parseInt(hex.slice(5, 7), 16)/ 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min)/ 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d/ (2 - max - min) : d/ (max + min);
    switch (max) {
      case r: h = (g - b)/ d + (g < b ? 6 : 0); break;
      case g: h = (b - r)/ d + 2; break;
      case b: h = (r - g)/ d + 4; break;
    }
    h/= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
};

const hslToHex = (h: number, s: number, l: number) => {
  l/= 100;
  const a = (s/ 100) * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h/ 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
};

export const CustomPaletteScreen: React.FC<CustomPaletteScreenProps> = ({ onBack }) => {
  const { customTemplate, saveCustomTemplate, accentColor, t } = useCalendar();
  const [categories, setCategories] = useState<CategoryStyle[]>(customTemplate.categories);
  const [editingIndex, setEditingIndex] = useState<number | null>(0);

  const handleSave = () => {
    saveCustomTemplate(categories);
    onBack();
  };

  const updateCategory = (index: number, updates: Partial<CategoryStyle>) => {
    const newCategories = [...categories];
    newCategories[index] = { ...newCategories[index], ...updates };
    setCategories(newCategories);
  };

  const handleColorChange = (index: number, h: number, l: number) => {
    const hex = hslToHex(h, 85, l);
    updateCategory(index, { color: hex });
  };

  const addCategory = () => {
    const newCategory: CategoryStyle = {
      type: 'other',
      label: t.new_category_default,
      icon: 'Star',
      color: '#B2D3A1'
    };
    setCategories([...categories, newCategory]);
    setEditingIndex(categories.length);
  };

  return (
    <div className="flex flex-col h-full bg-[#F8F9FA] [#0A0A0A] relative overflow-hidden transition-colors duration-300">
      <header className="px-6 pt-12 pb-4 flex items-center gap-4 relative">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full active:scale-90 transition-transform text-gray-900 ">
          <ArrowLeft size={24}/>
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900  tracking-tight leading-none">{t.design_categories_label}</h1>
          <p className="text-[13px] text-gray-400 font-medium mt-1">{t.unlimited_symbols_label}</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar px-6 pt-4 pb-12">
        <div className="space-y-4">
          {categories.map((cat, idx) => {
            const isEditing = editingIndex === idx;
            const IconComponent = ICON_MAP[cat.icon] || ICON_MAP.Star;
            const currentHsl = hexToHsl(cat.color);

            return (
              <div 
                key={idx}
                className={`bg-white [#121212] rounded-[2.5rem] p-6 transition-all duration-500 shadow-sm border ${isEditing ? 'ring-1 ring-opacity-20' : 'border-gray-50 '}`}
                style={{ borderColor: isEditing ? accentColor : 'transparent' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: cat.color }}>
                      <IconComponent size={24}/>
                    </div>
                    {isEditing ? (
                        <input 
                            className="text-lg font-bold text-gray-900  bg-transparent border-none p-0 focus:ring-0 w-40"
                            value={cat.label}
                            onChange={(e) => updateCategory(idx, { label: e.target.value })}
                            autoFocus
                       />
                    ) : (
                        <h3 className="text-lg font-bold text-gray-900 ">{cat.label}</h3>
                    )}
                  </div>
                  <button 
                    onClick={() => setEditingIndex(isEditing ? null : idx)}
                    className="p-2 transition-all duration-300 active:scale-75"
                    style={{ color: isEditing ? accentColor : '#CBD5E1' }}
                  >
                    {isEditing ? <Check size={24} strokeWidth={3}/> : <Pencil size={20}/>}
                  </button>
                </div>

                {isEditing && (
                  <div className="mt-8 space-y-10 animate-fade-in border-t border-gray-50  pt-8">
                    <div>
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4">{t.symbol_label}</p>
                      <div className="grid grid-cols-6 gap-4 max-h-[180px] overflow-y-auto no-scrollbar p-2 -m-2">
                        {AVAILABLE_ICONS.map((icon) => (
                          <button
                            key={icon.name}
                            onClick={() => updateCategory(idx, { icon: icon.name })}
                            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                              cat.icon === icon.name ? 'text-white shadow-lg scale-110' : 'bg-gray-50 [#1A1A1A] text-gray-300 hover:text-gray-400'
                            }`}
                            style={{ backgroundColor: cat.icon === icon.name ? cat.color : '' }}
                          >
                            <icon.component size={18}/>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-8">
                      <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4">{t.category_color_label}</p>
                      <div className="relative w-full h-5 rounded-full" style={{ background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)' }}>
                        <input 
                            type="range" min="0" max="360" value={currentHsl.h}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={(e) => handleColorChange(idx, parseInt(e.target.value), currentHsl.l)}
                       />
                        <div className="absolute top-1/2 w-6 h-6 bg-white rounded-full border-2 border-white shadow-md -translate-y-1/2 -translate-x-1/2 pointer-events-none" style={{ left: `${(currentHsl.h/ 360) * 100}%` }}></div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t.intensity_label}</span>
                            <Sun size={10} className="text-gray-400"/>
                        </div>
                        <div className="relative w-full h-5 rounded-full" style={{ 
                            background: `linear-gradient(to right, ${hslToHex(currentHsl.h, 100, 10)}, ${hslToHex(currentHsl.h, 100, 50)}, ${hslToHex(currentHsl.h, 100, 90)})` 
                        }}>
                            <input 
                                type="range" min="15" max="85" value={currentHsl.l}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                onChange={(e) => handleColorChange(idx, currentHsl.h, parseInt(e.target.value))}
                           />
                            <div className="absolute top-1/2 w-6 h-6 bg-white rounded-full border-2 border-white shadow-md -translate-y-1/2 -translate-x-1/2 pointer-events-none" style={{ left: `${((currentHsl.l - 15)/ 70) * 100}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <button 
            onClick={addCategory}
            className="w-full border-2 border-dashed border-gray-200  rounded-[2.5rem] p-6 flex items-center justify-center gap-3 text-gray-400 font-bold active:scale-95 transition-all mt-4"
          >
            <Plus size={22}/>
            <span>{t.add_category_label}</span>
          </button>
        </div>

        <div className="mt-16">
          <button 
            onClick={handleSave}
            className="w-full py-5 text-white rounded-[2.5rem] font-black text-[12px] uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all"
            style={{ backgroundColor: accentColor, boxShadow: `0 20px 40px -10px ${accentColor}66` }}
          >
            {t.save_template}
          </button>
        </div>
      </main>
    </div>
  );
};
