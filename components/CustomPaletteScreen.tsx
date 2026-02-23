
import React, { useState } from 'react';
import { useCalendar } from '../contexts/CalendarContext';
import { ArrowLeft, Pencil, Plus, Star, GripVertical, Check, Sun } from 'lucide-react';
import { CategoryStyle } from '../types';
import { ICON_MAP } from '../constants';
import { getLocalizedCategoryLabel } from '../src/utils/translationHelpers';
import { ColorPicker } from './ColorPicker';

interface CustomPaletteScreenProps {
  onBack: () => void;
}

const AVAILABLE_ICONS = Object.entries(ICON_MAP).map(([name, component]) => ({
  name,
  component
}));



export const CustomPaletteScreen: React.FC<CustomPaletteScreenProps> = ({ onBack }) => {
  const { customTemplate, saveCustomTemplate, accentColor, t, language } = useCalendar();
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
    <div className="flex flex-col h-full bg-[#F8F9FA] dark:bg-[#0A0A0A] relative overflow-hidden transition-colors duration-300">
      <header className="px-6 pt-12 pb-4 flex items-center gap-4 relative">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full active:scale-90 transition-transform text-gray-900 dark:text-white">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-none">{t.design_categories_label}</h1>
          <p className="text-[13px] text-gray-400 font-medium mt-1">{t.unlimited_symbols_label}</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar px-6 pt-4 pb-12">
        <div className="space-y-4">
          {categories.map((cat, idx) => {
            const isEditing = editingIndex === idx;
            const IconComponent = ICON_MAP[cat.icon] || ICON_MAP.Star;

            return (
              <div
                key={idx}
                className={`bg-white dark:bg-[#121212] rounded-[2.5rem] p-6 transition-all duration-500 shadow-sm border ${isEditing ? 'ring-1 ring-opacity-20' : 'border-gray-50 dark:border-gray-900'}`}
                style={{ borderColor: isEditing ? accentColor : 'transparent' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: cat.color }}>
                      <IconComponent size={24} />
                    </div>
                    {isEditing ? (
                      <input
                        className="text-lg font-bold text-gray-900 dark:text-white bg-transparent border-none p-0 focus:ring-0 w-40"
                        value={cat.label}
                        onChange={(e) => updateCategory(idx, { label: e.target.value })}
                        autoFocus
                      />
                    ) : (
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{getLocalizedCategoryLabel(cat.label, language)}</h3>
                    )}
                  </div>
                  <button
                    onClick={() => setEditingIndex(isEditing ? null : idx)}
                    className="p-2 transition-all duration-300 active:scale-75"
                    style={{ color: isEditing ? accentColor : '#CBD5E1' }}
                  >
                    {isEditing ? <Check size={24} strokeWidth={3} /> : <Pencil size={20} />}
                  </button>
                </div>

                {isEditing && (
                  <div className="mt-8 space-y-8 animate-fade-in border-t border-gray-50 dark:border-gray-900 pt-8">

                    {/* --- ICONS --- */}
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-4 ml-1">{t.symbol_label}</p>
                      <div className="bg-gray-50 dark:bg-black/50 rounded-[2rem] p-4 border border-gray-100 dark:border-gray-800">
                        <div className="grid grid-cols-6 sm:grid-cols-8 gap-3 max-h-[220px] overflow-y-auto p-2 custom-scrollbar">
                          {AVAILABLE_ICONS.map((icon) => (
                            <button
                              key={icon.name}
                              onClick={() => updateCategory(idx, { icon: icon.name })}
                              className={`aspect-square rounded-2xl flex items-center justify-center transition-all duration-300 ${cat.icon === icon.name
                                ? 'text-white shadow-lg scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#121212]'
                                : 'bg-white dark:bg-[#1A1A1A] text-gray-300 hover:text-gray-500 hover:scale-105'
                                }`}
                              style={{
                                backgroundColor: cat.icon === icon.name ? cat.color : '',
                                '--tw-ring-color': cat.color
                              } as any}
                            >
                              <icon.component size={20} strokeWidth={cat.icon === icon.name ? 2.5 : 2} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* --- COLOR PICKER --- */}
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-4 ml-1">{t.category_color_label}</p>
                      <ColorPicker
                        color={cat.color}
                        onChange={(newColor) => updateCategory(idx, { color: newColor })}
                      />
                    </div>

                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={addCategory}
            className="w-full border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-[2.5rem] p-6 flex items-center justify-center gap-3 text-gray-400 font-bold active:scale-95 transition-all mt-4"
          >
            <Plus size={22} />
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
