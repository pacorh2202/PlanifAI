import React, { useState, useEffect } from 'react';
import { ChevronLeft, Send, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react';
import { useCalendar } from '../contexts/CalendarContext';
import { useAuth } from '../src/contexts/AuthContext';
import { supabase } from '../src/lib/supabase';

interface SuggestionsScreenProps {
    onBack: () => void;
}

export const SuggestionsScreen: React.FC<SuggestionsScreenProps> = ({ onBack }) => {
    const { accentColor } = useCalendar();
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Reset state when component mounts (or remounts)
    useEffect(() => {
        setIsSubmitted(false);
        setMessage('');
    }, []);

    const handleSend = async () => {
        if (!message.trim() || !user || loading) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('user_suggestions')
                .insert({
                    user_id: user.id,
                    message: message.trim(),
                    status: 'pending' // As per implementation plan
                });

            if (error) throw error;

            setIsSubmitted(true);
            setMessage('');
        } catch (error) {
            console.error('Error sending suggestion:', error);
            alert('Error al enviar sugerencia. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (isSubmitted) {
        return (
            <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-black transition-colors duration-300">
                <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80 dark:bg-black/80 backdrop-blur-md z-20">
                    <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800 transition-colors">
                        <ChevronLeft className="text-gray-900 dark:text-white" size={28} />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight text-center flex-1 pr-6">Sugerencias</h1>
                </header>

                <main className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                    <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6 text-green-500">
                        <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">¡Gracias por tu ayuda!</h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-xs">
                        Valoramos mucho tu input y trataremos de mejorar lo máximo posible.
                    </p>

                    <button
                        onClick={onBack}
                        className="mt-12 px-8 py-3 rounded-2xl font-bold text-white shadow-lg active:scale-95 transition-transform"
                        style={{ backgroundColor: accentColor }}
                    >
                        Volver al menú
                    </button>
                </main>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-black transition-colors duration-300">
            <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80 dark:bg-black/80 backdrop-blur-md z-20">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800 transition-colors">
                    <ChevronLeft className="text-gray-900 dark:text-white" size={28} />
                </button>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight text-center flex-1 pr-6">Sugerencias</h1>
            </header>

            <main className="flex-1 flex flex-col px-6 pb-6 overflow-hidden">
                {/* Header Section */}
                <div className="py-6 text-center">
                    <div className="w-16 h-16 bg-white dark:bg-gray-900 rounded-[1.5rem] flex items-center justify-center mx-auto mb-4 shadow-sm border border-gray-100 dark:border-gray-800" style={{ color: accentColor }}>
                        <MessageSquare size={28} />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 tracking-tight">¡Ayúdanos a mejorar!</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed px-4">
                        ¿Tienes alguna idea o has encontrado un error? Escribe tu sugerencia abajo y la revisaremos personalmente.
                    </p>
                </div>

                {/* Feedback Form */}
                <div className="flex-1 flex flex-col gap-4">
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Escribe tu sugerencia aquí..."
                        className="w-full flex-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-6 text-base font-medium focus:ring-2 focus:ring-offset-2 focus:outline-none resize-none placeholder:text-gray-400 dark:text-white shadow-sm transition-all"
                        style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                    />

                    <button
                        onClick={handleSend}
                        disabled={!message.trim() || loading}
                        className="w-full py-4 rounded-[1.5rem] flex items-center justify-center text-white font-bold text-lg shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 mb-6"
                        style={{ backgroundColor: accentColor }}
                    >
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 size={24} className="animate-spin" />
                                <span>Enviando...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Send size={24} />
                                <span>Enviar Sugerencia</span>
                            </div>
                        )}
                    </button>
                </div>
            </main>
        </div>
    );
};
