import React, { useState, useEffect, useRef } from 'react';
import { Check, Hash, Grip, Palette, Sliders } from 'lucide-react';
import { useCalendar } from '../contexts/CalendarContext';

// --- Utils ---
const hexToRgb = (hex: string) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt("0x" + hex[1] + hex[1]);
        g = parseInt("0x" + hex[2] + hex[2]);
        b = parseInt("0x" + hex[3] + hex[3]);
    } else if (hex.length === 7) {
        r = parseInt("0x" + hex[1] + hex[2]);
        g = parseInt("0x" + hex[3] + hex[4]);
        b = parseInt("0x" + hex[5] + hex[6]);
    }
    return { r, g, b };
}

const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
}

const hexToHsl = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    let r1 = r / 255, g1 = g / 255, b1 = b / 255;
    let max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1);
    let h = 0, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r1: h = (g1 - b1) / d + (g1 < b1 ? 6 : 0); break;
            case g1: h = (b1 - r1) / d + 2; break;
            case b1: h = (r1 - g1) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}

const hslToHex = (h: number, s: number, l: number) => {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}


// --- Constants ---
const PRESET_COLORS = [
    // Vibrant Row
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E',
    // Pastel Row
    '#FECACA', '#FED7AA', '#FDE68A', '#FEF08A', '#D9F99D', '#BBF7D0', '#A7F3D0', '#99F6E4', '#A5F3FC', '#BAE6FD', '#BFDBFE', '#C7D2FE', '#DDD6FE', '#E9D5FF', '#F5D0FE', '#FBCFE8', '#FDE4CF',
    // Dark Row
    '#7F1D1D', '#7C2D12', '#78350F', '#713F12', '#365314', '#14532D', '#064E3B', '#134E4A', '#164E63', '#0C4A6E', '#1E3A8A', '#312E81', '#4C1D95', '#581C87', '#701A75', '#831843', '#881337',
    // Gray Scale
    '#FFFFFF', '#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#475569', '#334155', '#1E293B', '#0F172A', '#020617', '#000000',
];

interface ColorPickerProps {
    color: string;
    onChange: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
    const { accentColor } = useCalendar();
    const [tab, setTab] = useState<'grid' | 'spectrum' | 'sliders'>('grid');
    const [localHex, setLocalHex] = useState(color);

    useEffect(() => {
        setLocalHex(color);
    }, [color]);

    const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalHex(val);
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
            onChange(val);
        }
    };

    return (
        <div className="bg-white dark:bg-[#1A1A1A] rounded-[2rem] p-1 shadow-sm border border-gray-100 dark:border-gray-800">
            {/* Tabs */}
            <div className="flex bg-gray-100 dark:bg-black rounded-[1.8rem] p-1.5 mb-6">
                <button
                    onClick={() => setTab('grid')}
                    className={`flex-1 py-2.5 rounded-[1.4rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${tab === 'grid' ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white' : 'text-gray-400'}`}
                >
                    <Grip size={14} />
                    <span>Grid</span>
                </button>
                <button
                    onClick={() => setTab('spectrum')}
                    className={`flex-1 py-2.5 rounded-[1.4rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${tab === 'spectrum' ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white' : 'text-gray-400'}`}
                >
                    <Palette size={14} />
                    <span>Spectrum</span>
                </button>
                <button
                    onClick={() => setTab('sliders')}
                    className={`flex-1 py-2.5 rounded-[1.4rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${tab === 'sliders' ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white' : 'text-gray-400'}`}
                >
                    <Sliders size={14} />
                    <span>Sliders</span>
                </button>
            </div>

            <div className="px-4 pb-4 min-h-[220px]">
                {/* --- GRID TAB --- */}
                {tab === 'grid' && (
                    <div className="grid grid-cols-8 gap-3 animate-fade-in max-h-[240px] overflow-y-auto no-scrollbar p-1">
                        {PRESET_COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => onChange(c)}
                                className={`w-8 h-8 rounded-full shadow-sm transition-transform active:scale-90 border border-black/5 dark:border-white/10 ${color === c ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#1A1A1A]' : ''}`}
                                style={{ backgroundColor: c, borderColor: c === '#FFFFFF' ? '#E2E8F0' : 'transparent', '--tw-ring-color': c } as any}
                            />
                        ))}
                    </div>
                )}

                {/* --- SPECTRUM TAB --- */}
                {tab === 'spectrum' && (
                    <SpectrumView color={color} onChange={onChange} />
                )}

                {/* --- SLIDERS TAB --- */}
                {tab === 'sliders' && (
                    <SlidersView color={color} onChange={onChange} />
                )}
            </div>

            {/* Hex Input Footer */}
            <div className="mt-2 pt-4 border-t border-gray-100 dark:border-gray-800 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl shadow-inner border border-gray-100 dark:border-gray-700" style={{ backgroundColor: color }}></div>
                    <div className="flex items-center bg-gray-50 dark:bg-black rounded-xl px-3 py-2 border border-gray-100 dark:border-gray-800 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
                        <Hash size={14} className="text-gray-400 mr-1" />
                        <input
                            type="text"
                            value={localHex.replace('#', '')}
                            onChange={(e) => handleHexChange({ target: { value: '#' + e.target.value } } as any)}
                            className="bg-transparent border-none p-0 text-sm font-bold text-gray-700 dark:text-gray-200 w-20 uppercase focus:ring-0"
                            maxLength={6}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const SpectrumView = ({ color, onChange }: { color: string, onChange: (c: string) => void }) => {
    const hsl = hexToHsl(color);
    const spectrumRef = useRef<HTMLDivElement>(null);

    const handleSpectrumChange = (e: React.MouseEvent | React.TouchEvent) => {
        if (!spectrumRef.current) return;
        const rect = spectrumRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

        const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

        const s = x * 100;
        const l = 100 - (y * 100);

        // Keep current hue
        onChange(hslToHex(hsl.h, s, l));
    };

    return (
        <div className="space-y-6 animate-fade-in pt-2">
            {/* Saturation / Lightness Box */}
            <div
                ref={spectrumRef}
                className="w-full h-40 rounded-2xl relative cursor-crosshair touch-none shadow-sm overflow-hidden"
                style={{
                    backgroundColor: `hsl(${hsl.h}, 100%, 50%)`,
                    backgroundImage: `
                        linear-gradient(to top, #000, transparent),
                        linear-gradient(to right, #FFF, transparent)
                    `
                }}
                onMouseDown={handleSpectrumChange}
                onTouchMove={handleSpectrumChange}
                // Quick hack for drag support would need more state, keeping simple click/drag for now
                onClick={handleSpectrumChange}
            >
                <div
                    className="absolute w-5 h-5 border-2 border-white rounded-full shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                        left: `${hsl.s}%`,
                        top: `${100 - hsl.l}%`
                    }}
                />
            </div>

            {/* Hue Slider */}
            <div className="relative h-6 w-full rounded-full" style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }}>
                <input
                    type="range" min="0" max="360"
                    value={hsl.h}
                    onChange={(e) => onChange(hslToHex(parseInt(e.target.value), hsl.s, hsl.l))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white border-2 border-gray-100 shadow-md rounded-full pointer-events-none"
                    style={{ left: `${(hsl.h / 360) * 100}%`, transform: `translate(-50%, -50%)` }}
                />
            </div>
        </div>
    )
}

const SlidersView = ({ color, onChange }: { color: string, onChange: (c: string) => void }) => {
    const rgb = hexToRgb(color);

    const updateRgb = (key: 'r' | 'g' | 'b', val: number) => {
        const newRgb = { ...rgb, [key]: val };
        onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
    }

    return (
        <div className="space-y-5 animate-fade-in pt-4">
            {/* Red */}
            <div className="flex items-center gap-4">
                <span className="text-xs font-black text-gray-400 w-4">R</span>
                <div className="flex-1 relative h-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <div className="absolute inset-y-0 left-0 bg-red-500 rounded-full" style={{ width: `${(rgb.r / 255) * 100}%` }}></div>
                    <input
                        type="range" min="0" max="255" value={rgb.r}
                        onChange={(e) => updateRgb('r', parseInt(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white shadow-md rounded-full pointer-events-none border border-gray-100" style={{ left: `${(rgb.r / 255) * 100}%`, transform: 'translate(-50%, -50%)' }}></div>
                </div>
                <input
                    type="number" value={rgb.r}
                    onChange={(e) => updateRgb('r', Math.min(255, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-12 bg-gray-50 dark:bg-gray-900 border-none rounded-lg text-center text-xs font-bold py-1"
                />
            </div>

            {/* Green */}
            <div className="flex items-center gap-4">
                <span className="text-xs font-black text-gray-400 w-4">G</span>
                <div className="flex-1 relative h-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <div className="absolute inset-y-0 left-0 bg-green-500 rounded-full" style={{ width: `${(rgb.g / 255) * 100}%` }}></div>
                    <input
                        type="range" min="0" max="255" value={rgb.g}
                        onChange={(e) => updateRgb('g', parseInt(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white shadow-md rounded-full pointer-events-none border border-gray-100" style={{ left: `${(rgb.g / 255) * 100}%`, transform: 'translate(-50%, -50%)' }}></div>
                </div>
                <input
                    type="number" value={rgb.g}
                    onChange={(e) => updateRgb('g', Math.min(255, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-12 bg-gray-50 dark:bg-gray-900 border-none rounded-lg text-center text-xs font-bold py-1"
                />
            </div>

            {/* Blue */}
            <div className="flex items-center gap-4">
                <span className="text-xs font-black text-gray-400 w-4">B</span>
                <div className="flex-1 relative h-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                    <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full" style={{ width: `${(rgb.b / 255) * 100}%` }}></div>
                    <input
                        type="range" min="0" max="255" value={rgb.b}
                        onChange={(e) => updateRgb('b', parseInt(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white shadow-md rounded-full pointer-events-none border border-gray-100" style={{ left: `${(rgb.b / 255) * 100}%`, transform: 'translate(-50%, -50%)' }}></div>
                </div>
                <input
                    type="number" value={rgb.b}
                    onChange={(e) => updateRgb('b', Math.min(255, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-12 bg-gray-50 dark:bg-gray-900 border-none rounded-lg text-center text-xs font-bold py-1"
                />
            </div>
        </div>
    )
}
