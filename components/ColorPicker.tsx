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
    // Standard extended palette
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E',
    '#FECACA', '#FED7AA', '#FDE68A', '#FEF08A', '#D9F99D', '#BBF7D0', '#A7F3D0', '#99F6E4', '#A5F3FC', '#BAE6FD', '#BFDBFE', '#C7D2FE', '#DDD6FE', '#E9D5FF', '#F5D0FE', '#FBCFE8', '#FDE4CF',
    '#7F1D1D', '#7C2D12', '#78350F', '#713F12', '#365314', '#14532D', '#064E3B', '#134E4A', '#164E63', '#0C4A6E', '#1E3A8A', '#312E81', '#4C1D95', '#581C87', '#701A75', '#831843', '#881337',
    '#FFFFFF', '#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#475569', '#334155', '#1E293B', '#0F172A', '#020617', '#000000',
    // More grays and specific colors to fill the grid
    '#71717A', '#52525B', '#3F3F46', '#27272A', '#18181B', '#FAFAFA', '#F4F4F5', '#E4E4E7', '#D4D4D8', '#A1A1AA'
];

interface ColorPickerProps {
    color: string;
    onChange: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
    const { t } = useCalendar();
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
        // Force Light Mode styles: bg-white, text-gray-900. No dark: classes.
        <div className="bg-white rounded-[2rem] p-1 shadow-sm border border-gray-100">
            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-[1.8rem] p-1.5 mb-6">
                <button
                    onClick={() => setTab('grid')}
                    className={`flex-1 py-2.5 rounded-[1.4rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${tab === 'grid' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                >
                    <Grip size={14} />
                    <span>{t.picker_grid || 'Grid'}</span>
                </button>
                <button
                    onClick={() => setTab('spectrum')}
                    className={`flex-1 py-2.5 rounded-[1.4rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${tab === 'spectrum' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                >
                    <Palette size={14} />
                    <span>{t.picker_spectrum || 'Spectrum'}</span>
                </button>
                <button
                    onClick={() => setTab('sliders')}
                    className={`flex-1 py-2.5 rounded-[1.4rem] text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${tab === 'sliders' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                >
                    <Sliders size={14} />
                    <span>{t.picker_sliders || 'Sliders'}</span>
                </button>
            </div>

            <div className="px-4 pb-4 min-h-[220px]">
                {/* --- GRID TAB (Squares) --- */}
                {tab === 'grid' && (
                    <div className="grid grid-cols-10 gap-1.5 animate-fade-in max-h-[240px] overflow-y-auto custom-scrollbar p-1">
                        {PRESET_COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => onChange(c)}
                                className={`aspect-square rounded-[4px] shadow-sm transition-transform active:scale-95 border ${color === c ? 'ring-2 ring-offset-2 ring-blue-500 scale-110 z-10' : 'border-black/5 hover:scale-105'}`}
                                style={{ backgroundColor: c }}
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

            {/* Hex Input Footer (iOS Style) */}
            <div className="mt-2 pt-4 border-t border-gray-100 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3 w-full">
                    {/* Preview Box */}
                    <div className="w-12 h-12 rounded-lg shadow-inner border border-gray-200" style={{ backgroundColor: color }}></div>

                    {/* Hex Input */}
                    <div className="flex flex-1 items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                        <span className="text-gray-400 font-bold mr-2 text-xs">{t.picker_hex || 'HEX'}</span>
                        <Hash size={14} className="text-gray-400 mr-1" />
                        <input
                            type="text"
                            value={localHex.replace('#', '')}
                            onChange={(e) => handleHexChange({ target: { value: '#' + e.target.value } } as any)}
                            className="bg-transparent border-none p-0 text-sm font-bold text-gray-900 w-full uppercase focus:ring-0"
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
                className="w-full h-40 rounded-xl relative cursor-crosshair touch-none shadow-sm overflow-hidden border border-gray-200"
                style={{
                    backgroundColor: `hsl(${hsl.h}, 100%, 50%)`,
                    backgroundImage: `
                        linear-gradient(to top, #000, transparent),
                        linear-gradient(to right, #FFF, transparent)
                    `
                }}
                onMouseDown={handleSpectrumChange}
                onTouchMove={handleSpectrumChange}
                onClick={handleSpectrumChange}
            >
                <div
                    className="absolute w-6 h-6 border-2 border-white rounded-full shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{
                        left: `${hsl.s}%`,
                        top: `${100 - hsl.l}%`,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                />
            </div>

            {/* Hue Slider */}
            <div className="relative h-8 w-full rounded-full border border-gray-200" style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }}>
                <input
                    type="range" min="0" max="360"
                    value={hsl.h}
                    onChange={(e) => onChange(hslToHex(parseInt(e.target.value), hsl.s, hsl.l))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                    className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-white border-2 border-gray-200 shadow-md rounded-full pointer-events-none"
                    style={{ left: `${(hsl.h / 360) * 100}%`, transform: `translate(-50%, -50%)` }}
                />
            </div>
        </div>
    )
}

const SlidersView = ({ color, onChange }: { color: string, onChange: (c: string) => void }) => {
    const { t } = useCalendar();
    const rgb = hexToRgb(color);

    const updateRgb = (key: 'r' | 'g' | 'b', val: number) => {
        const newRgb = { ...rgb, [key]: val };
        onChange(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
    }

    return (
        <div className="space-y-6 animate-fade-in pt-4">
            {/* Red */}
            <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-500 w-12">{t.picker_red || 'Red'}</span>
                <div className="flex-1 relative h-6 bg-gray-100 rounded-full border border-gray-200">
                    <div className="absolute inset-y-0 left-0 bg-red-500 rounded-full opacity-50" style={{ width: `${(rgb.r / 255) * 100}%` }}></div>
                    <input
                        type="range" min="0" max="255" value={rgb.r}
                        onChange={(e) => updateRgb('r', parseInt(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="absolute top-1/2 -translate-y-1/2 w-7 h-7 bg-white shadow-sm rounded-full pointer-events-none border border-gray-200" style={{ left: `${(rgb.r / 255) * 100}%`, transform: 'translate(-50%, -50%)' }}></div>
                </div>
                <input
                    type="number" value={rgb.r}
                    onChange={(e) => updateRgb('r', Math.min(255, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-14 bg-gray-50 border border-gray-200 rounded-lg text-center text-sm font-bold py-1.5 text-gray-900"
                />
            </div>

            {/* Green */}
            <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-500 w-12">{t.picker_green || 'Green'}</span>
                <div className="flex-1 relative h-6 bg-gray-100 rounded-full border border-gray-200">
                    <div className="absolute inset-y-0 left-0 bg-green-500 rounded-full opacity-50" style={{ width: `${(rgb.g / 255) * 100}%` }}></div>
                    <input
                        type="range" min="0" max="255" value={rgb.g}
                        onChange={(e) => updateRgb('g', parseInt(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="absolute top-1/2 -translate-y-1/2 w-7 h-7 bg-white shadow-sm rounded-full pointer-events-none border border-gray-200" style={{ left: `${(rgb.g / 255) * 100}%`, transform: 'translate(-50%, -50%)' }}></div>
                </div>
                <input
                    type="number" value={rgb.g}
                    onChange={(e) => updateRgb('g', Math.min(255, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-14 bg-gray-50 border border-gray-200 rounded-lg text-center text-sm font-bold py-1.5 text-gray-900"
                />
            </div>

            {/* Blue */}
            <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-500 w-12">{t.picker_blue || 'Blue'}</span>
                <div className="flex-1 relative h-6 bg-gray-100 rounded-full border border-gray-200">
                    <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full opacity-50" style={{ width: `${(rgb.b / 255) * 100}%` }}></div>
                    <input
                        type="range" min="0" max="255" value={rgb.b}
                        onChange={(e) => updateRgb('b', parseInt(e.target.value))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="absolute top-1/2 -translate-y-1/2 w-7 h-7 bg-white shadow-sm rounded-full pointer-events-none border border-gray-200" style={{ left: `${(rgb.b / 255) * 100}%`, transform: 'translate(-50%, -50%)' }}></div>
                </div>
                <input
                    type="number" value={rgb.b}
                    onChange={(e) => updateRgb('b', Math.min(255, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-14 bg-gray-50 border border-gray-200 rounded-lg text-center text-sm font-bold py-1.5 text-gray-900"
                />
            </div>
        </div>
    )
}
