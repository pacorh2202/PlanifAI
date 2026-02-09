
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
    const [loading, setLoading] = useState(false);
    const [showThankYou, setShowThankYou] = useState(false);


    const handleSend = async () => {
        if (!message.trim() || !user || loading) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_suggestions' as any)
                .insert({
                    user_id: user.id,
                    message: message.trim()
                })
                .select()
                .single();

            if (error) throw error;

            if (error) throw error;

            setMessage('');
            setShowThankYou(true);
            setTimeout(() => setShowThankYou(false), 3000);// Hide after 3s
        } catch (error) {

            console.error('Error sending suggestion:', error);
            alert('Error al enviar sugerencia. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="flex flex-col h-full bg-[#F8FAFC]  transition-colors duration-500 relative overflow-hidden">
            {/* Premium Background Glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[140%] h-[40%] rounded-full blur-[120px] transition-all duration-[1500ms] opacity-[0.08] [0.15]`} style={{ backgroundColor: accentColor }}></div>
            </div>

            <header className="px-6 pt-14 pb-6 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80/80 backdrop-blur-xl z-30">
                <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/50/50 backdrop-blur-xl border border-white/20  active:scale-90 transition-all">
                    <ChevronLeft className="text-gray-900 " size={20}/>
                </button>
                <h1 className="text-sm font-black text-gray-400  uppercase tracking-[0.2em]">Sugerencias</h1>
                <div className="w-10"></div>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center p-6 pb-20 z-10">
                {!showThankYou ? (
                    <div className="w-full max-w-lg space-y-6 animate-fade-in">
                        <div className="space-y-2 text-center mb-8">
                            <div className="w-20 h-20 bg-white  rounded-[2rem] flex items-center justify-center shadow-xl border border-white  mx-auto mb-6 text-gray-900  transform rotate-3 hover:rotate-6 transition-transform duration-300">
                                <MessageSquare size={32} style={{ color: accentColor }}/>
                            </div>
                            <h2 className="text-2xl font-black text-gray-900  tracking-tight uppercase">Tu opinión importa</h2>
                            <p className="text-sm font-medium text-gray-400  leading-relaxed max-w-xs mx-auto">
                                ¿Tienes alguna idea, problema o sugerencia? Cuéntanoslo todo. Leemos cada mensaje.
                            </p>
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-100   rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Escribe tu sugerencia aquí..."
                                rows={6}
                                className="w-full bg-white  border-2 border-transparent focus:border-gray-200 :border-gray-700 rounded-[2rem] p-6 text-sm font-bold text-gray-900  shadow-xl placeholder:text-gray-300 :text-gray-600 resize-none outline-none transition-all relative z-10"
                           />
                        </div>

                        <button
                            onClick={handleSend}
                            disabled={!message.trim() || loading}
                            className="w-full py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] text-white shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
                            style={{
                                backgroundColor: accentColor,
                                boxShadow: `0 20px 40px -10px ${accentColor}55`
                            }}
                        >
                            {loading ? <Loader2 size={18} className="animate-spin"/> : (
                                <>
                                    Enviar Sugerencia
                                    <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"/>
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center animate-bounce-in max-w-xs mx-auto">
                        <div className="w-24 h-24 rounded-full bg-green-500 text-white flex items-center justify-center shadow-2xl mb-8 border-4 border-green-100/30">
                            <CheckCircle2 size={40} strokeWidth={3}/>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900  mb-2 tracking-tight">¡Enviado!</h3>
                        <p className="text-gray-400 font-medium text-sm leading-relaxed mb-8">
                            Muchísimas gracias por tu tiempo. Tu feedback nos ayuda a construir un mejor PlanifAI.
                        </p>
                        <button
                            onClick={() => setShowThankYou(false)}
                            className="px-8 py-3 rounded-xl bg-gray-100  text-gray-900  text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
                        >
                            Enviar otra
                        </button>
                    </div>
                )}
            </div>
            {/* Background elements */}
            <div className="absolute top-1/3 -right-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute bottom-1/3 -left-20 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none"></div>
        </div>
    );
};
