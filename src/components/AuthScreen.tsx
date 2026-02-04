import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

interface AuthScreenProps {
    onSuccess?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
    const { signIn, signUp, signInWithGoogle } = useAuth();
    const [mode, setMode] = useState<'signin' | 'signup'>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [userName, setUserName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (mode === 'signin') {
                const { error } = await signIn(email, password);
                if (error) {
                    setError(error.message);
                } else {
                    onSuccess?.();
                }
            } else {
                if (!userName.trim()) {
                    setError('Por favor ingresa tu nombre');
                    setLoading(false);
                    return;
                }
                const { error } = await signUp(email, password, userName);
                if (error) {
                    setError(error.message);
                } else {
                    onSuccess?.();
                }
            }
        } catch (err) {
            setError('Ha ocurrido un error. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError(null);
        setLoading(true);

        try {
            const { error } = await signInWithGoogle();
            if (error) {
                setError(error.message || 'Error al iniciar sesión con Google');
                setLoading(false);
            }
            // Note: OAuth will redirect user, so we don't set loading to false here
            // The redirect will happen automatically
        } catch (err) {
            setError('Error al conectar con Google');
            setLoading(false);
        }
    };

    return (
        <div className="h-[100dvh] w-full flex items-center justify-center bg-white dark:bg-gray-950 p-6">
            <div className="w-full max-w-md">
                {/* Header with Logo */}
                <div className="text-center mb-10">
                    {/* Logo Circle */}
                    <div className="w-24 h-24 rounded-full bg-black mx-auto mb-6 flex items-center justify-center shadow-xl">
                        <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Sound wave icon in gradient purple/pink */}
                            <defs>
                                <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#C084FC" />
                                    <stop offset="100%" stopColor="#EC4899" />
                                </linearGradient>
                            </defs>
                            <rect x="10" y="15" width="4" height="20" rx="2" fill="url(#waveGradient)" />
                            <rect x="18" y="8" width="4" height="34" rx="2" fill="url(#waveGradient)" />
                            <rect x="26" y="5" width="4" height="40" rx="2" fill="url(#waveGradient)" />
                            <rect x="34" y="12" width="4" height="26" rx="2" fill="url(#waveGradient)" />
                        </svg>
                    </div>

                    {/* Title */}
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                        PlanAI
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-base">
                        Tu asistente inteligente personal.
                    </p>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30 rounded-2xl flex items-start gap-3 animate-fade-in">
                        <AlertCircle size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'signup' && (
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="Nombre"
                                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors"
                                required
                                disabled={loading}
                            />
                        </div>
                    )}

                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Correo electrónico"
                            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Contraseña"
                            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors"
                            required
                            disabled={loading}
                            minLength={6}
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-2xl bg-black dark:bg-white text-white dark:text-black font-bold text-base shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                <span>Cargando...</span>
                            </>
                        ) : (
                            <>
                                <span>{mode === 'signin' ? 'Iniciar Sesión' : 'Crear Cuenta'}</span>
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-4 my-8">
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">O continúa con</span>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
                </div>

                {/* Google Sign In Button */}
                <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full py-4 rounded-2xl bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-bold text-base transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19.8 10.2273C19.8 9.51819 19.7364 8.83637 19.6182 8.18182H10V12.05H15.4818C15.2273 13.3 14.5227 14.3591 13.4818 15.0682V17.5773H16.7727C18.7091 15.8364 19.8 13.2727 19.8 10.2273Z" fill="#4285F4" />
                        <path d="M10 20C12.7 20 14.9636 19.1045 16.7727 17.5773L13.4818 15.0682C12.6136 15.6682 11.4818 16.0227 10 16.0227C7.39545 16.0227 5.19091 14.2636 4.40455 11.9H0.995455V14.4909C2.79545 18.0682 6.10455 20 10 20Z" fill="#34A853" />
                        <path d="M4.40455 11.9C4.18636 11.3 4.06364 10.6591 4.06364 10C4.06364 9.34091 4.18636 8.7 4.40455 8.1V5.50909H0.995455C0.363636 6.77273 0 8.14545 0 10C0 11.8545 0.363636 13.2273 0.995455 14.4909L4.40455 11.9Z" fill="#FBBC04" />
                        <path d="M10 3.97727C11.6091 3.97727 13.0409 4.51818 14.1864 5.61818L17.0864 2.71818C15.0227 0.863636 12.2318 0 10 0C6.10455 0 2.79545 1.93182 0.995455 5.50909L4.40455 8.1C5.19091 5.73636 7.39545 3.97727 10 3.97727Z" fill="#EA4335" />
                    </svg>
                    <span>Continuar con Google</span>
                </button>

                {/* Toggle Mode */}
                <div className="mt-8 text-center">
                    <button
                        onClick={() => {
                            setMode(mode === 'signin' ? 'signup' : 'signin');
                            setError(null);
                        }}
                        disabled={loading}
                        className="text-sm text-gray-600 dark:text-gray-400 disabled:opacity-50"
                    >
                        {mode === 'signin' ? (
                            <>
                                ¿No tienes cuenta? <span className="font-bold text-gray-900 dark:text-white">Regístrate</span>
                            </>
                        ) : (
                            <>
                                ¿Ya tienes cuenta? <span className="font-bold text-gray-900 dark:text-white">Inicia sesión</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
