
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
        <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-black transition-colors duration-300">
            <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80 dark:bg-black/80 backdrop-blur-md z-20">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800 transition-colors">
                    <ChevronLeft className="text-gray-900 dark:text-white" size={28} />
                </button>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight text-center flex-1 pr-6">Sugerencias</h1>
            </header>

            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Explanation Section */}
                <div className="px-8 py-6 text-center">
                    <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100 dark:border-gray-800" style={{ color: accentColor }}>
                        <MessageSquare size={28} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 tracking-tight">¡Ayúdanos a mejorar!</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed px-4">
                        Tu opinión es fundamental. Envíanos cualquier idea, crítica o función que te gustaría ver en PlanifAI. Leemos todos vuestros mensajes.
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
                        <div className="text-center py-10 opacity-30 flex flex-col items-center gap-2">
                            <div className="w-12 h-px bg-gray-400"></div>
                            <span className="text-[10px] font-black uppercase tracking-widest">Sin mensajes</span>
                            <div className="w-12 h-px bg-gray-400"></div>
                        </div>
                    ) : (
                        suggestions.map((sug) => (
                            <div key={sug.id} className="flex flex-col items-end animate-fade-in">
                                <div
                                    className="max-w-[85%] px-5 py-4 rounded-[1.8rem] rounded-tr-none text-white text-sm font-medium shadow-lg"
                                    style={{ backgroundColor: accentColor }}
                                >
                                    {sug.message}
                                </div>
                                <span className="text-[9px] font-bold text-gray-400 mt-1.5 uppercase tracking-widest mr-2">
                                    {new Date(sug.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))
                    )}

                    {showThankYou && (
                        <div className="flex justify-center animate-bounce-in">
                            <div className="bg-green-500 text-white px-6 py-3 rounded-2xl text-xs font-black shadow-lg uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle2 size={16} />
                                ¡Gracias por tu sugerencia!
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-6 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 shadow-2xl">
                    <div className="relative flex items-center gap-3">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Escribe tu sugerencia aquí..."
                            className="flex-1 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl py-4 px-5 text-sm font-medium focus:ring-0 placeholder:text-gray-400 dark:text-white"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!message.trim() || loading}
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                            style={{ backgroundColor: accentColor }}
                        >
                            {loading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
                        </button>
                    </div>
                    <div className="h-4 sm:h-0"></div> {/* Bottom safe area padding */}
                </div>
            </main>
        </div>
    );
};
