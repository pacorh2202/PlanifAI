
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Send, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react';
import { useCalendar } from '../contexts/CalendarContext';
import { useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../src/lib/supabase';

interface SuggestionsScreenProps {
    onBack: () => void;
}

interface Suggestion {
    id: string;
    message: string;
    created_at: string;
}

export const SuggestionsScreen: React.FC<SuggestionsScreenProps> = ({ onBack }) => {
    const { accentColor, t } = useCalendar();
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [showThankYou, setShowThankYou] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user) {
            fetchSuggestions();
        }
    }, [user]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [suggestions]);

    const fetchSuggestions = async () => {
        try {
            const { data, error } = await supabase
                .from('user_suggestions')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setSuggestions(data || []);
        } catch (error) {
            console.error('Error fetching suggestions:', error);
        } finally {
            setFetching(false);
        }
    };

    const handleSend = async () => {
        if (!message.trim() || !user || loading) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_suggestions')
                .insert({
                    user_id: user.id,
                    message: message.trim()
                })
                .select()
                .single();

            if (error) throw error;

            setSuggestions([...suggestions, data]);
            setMessage('');
            setShowThankYou(true);
            setTimeout(() => setShowThankYou(false), 3000);
        } catch (error) {
            console.error('Error sending suggestion:', error);
            alert('Error al enviar sugerencia. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-black transition-colors duration-500 relative overflow-hidden">
            {/* Premium Background Glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[140%] h-[40%] rounded-full blur-[120px] transition-all duration-[1500ms] opacity-[0.08] dark:opacity-[0.15]`} style={{ backgroundColor: accentColor }}></div>
            </div>

            <header className="px-6 pt-14 pb-6 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80 dark:bg-black/80 backdrop-blur-xl z-30">
                <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50 dark:bg-gray-900/50 backdrop-blur-xl border border-white/20 dark:border-gray-800 active:scale-90 transition-all">
                    <ChevronLeft className="text-gray-900 dark:text-white" size={20} />
                </button>
                <h1 className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">Sugerencias</h1>
                <div className="w-10"></div>
            </header>

            <main className="flex-1 flex flex-col overflow-hidden relative z-10">
                {/* Explanation Section */}
                <div className="px-8 py-8 text-center flex flex-col items-center">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 rounded-[2rem] blur-2xl opacity-20 animate-pulse" style={{ backgroundColor: accentColor }}></div>
                        <div className="relative w-16 h-16 bg-white dark:bg-gray-900 rounded-[1.5rem] flex items-center justify-center shadow-xl border border-white dark:border-gray-800" style={{ color: accentColor }}>
                            <MessageSquare size={28} />
                        </div>
                    </div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight uppercase tracking-[0.05em]">¡Ayúdanos a mejorar!</h2>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 font-bold leading-relaxed px-4 uppercase tracking-wider opacity-80">
                        Tu opinión es fundamental. Envíanos cualquier idea o función que te gustaría ver. Leemos todos vuestros mensajes.
                    </p>
                </div>

                {/* Chat Area */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto px-6 py-4 space-y-4 no-scrollbar"
                >
                    {fetching ? (
                        <div className="flex justify-center py-10 text-gray-400">
                            <Loader2 className="animate-spin" size={24} />
                        </div>
                    ) : suggestions.length === 0 ? (
                        <div className="text-center py-20 opacity-20 flex flex-col items-center gap-3">
                            <div className="w-16 h-px bg-gray-400"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Sin mensajes</span>
                            <div className="w-16 h-px bg-gray-400"></div>
                        </div>
                    ) : (
                        suggestions.map((sug) => (
                            <div key={sug.id} className="flex flex-col items-end animate-fade-in">
                                <div
                                    className="max-w-[85%] px-5 py-4 rounded-[2rem] rounded-tr-none text-white text-sm font-bold shadow-xl border border-white/10"
                                    style={{
                                        backgroundColor: accentColor,
                                        boxShadow: `0 10px 30px -5px ${accentColor}44`
                                    }}
                                >
                                    {sug.message}
                                </div>
                                <span className="text-[9px] font-black text-gray-400 dark:text-gray-600 mt-2 uppercase tracking-[0.2em] mr-2 opacity-60">
                                    {new Date(sug.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))
                    )}

                    {showThankYou && (
                        <div className="flex justify-center animate-bounce-in pt-4">
                            <div className="bg-white dark:bg-gray-900 border-2 border-green-500/20 text-green-500 px-6 py-4 rounded-[2rem] text-[10px] font-black shadow-2xl uppercase tracking-[0.25em] flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg">
                                    <CheckCircle2 size={14} strokeWidth={4} />
                                </div>
                                ¡Gracias por tu sugerencia!
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-8 bg-white/40 dark:bg-gray-900/40 backdrop-blur-3xl border-t border-white/60 dark:border-gray-800/60 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.1)]">
                    <div className="relative flex items-center gap-3 max-w-2xl mx-auto">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Escribe tu sugerencia aquí..."
                            className="flex-1 bg-white/80 dark:bg-gray-800/80 border-none shadow-inner rounded-[1.8rem] py-5 px-6 text-sm font-bold focus:ring-2 focus:ring-offset-2 transition-all placeholder:text-gray-400 dark:text-white"
                            style={{ '--tw-ring-color': accentColor } as any}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!message.trim() || loading}
                            className="w-16 h-16 rounded-[1.8rem] flex items-center justify-center text-white shadow-2xl active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 group"
                            style={{
                                backgroundColor: accentColor,
                                boxShadow: `0 15px 35px -5px ${accentColor}66`
                            }}
                        >
                            {loading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />}
                        </button>
                    </div>
                    <div className="h-6 sm:h-2"></div> {/* Bottom safe area padding */}
                </div>
            </main>
        </div>
    );
};
