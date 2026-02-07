
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Camera, Eye, EyeOff, Loader2, CheckCircle2, LogOut } from 'lucide-react';
import { useCalendar } from '../contexts/CalendarContext';
import { useAuth } from '../src/contexts/AuthContext';

interface AccountConfigScreenProps {
  onBack: () => void;
}

export const AccountConfigScreen: React.FC<AccountConfigScreenProps> = ({ onBack }) => {
  const { accentColor, setProfileImage, profileImage, t } = useCalendar();
  const { user, profile, updateProfile, updateEmail, updatePassword, signOut } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    handle: '',
    email: '',
    password: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile || user) {
      setFormData({
        name: profile?.user_name || '',
        handle: profile?.handle || '',
        email: user?.email || '',
        password: '' // Always empty initially for security
      });
    }
  }, [profile, user]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Update Profile (Name & Handle)
      const profileUpdates: any = {};
      if (formData.name !== profile?.user_name) profileUpdates.user_name = formData.name;
      if (formData.handle !== profile?.handle) {
        const handleRegex = /^[a-z0-9_]{3,20}$/;
        if (!handleRegex.test(formData.handle.toLowerCase())) {
          throw new Error('El ID de usuario debe tener entre 3 y 20 caracteres (letras, números o guiones bajos)');
        }
        profileUpdates.handle = formData.handle.toLowerCase();
      }

      if (Object.keys(profileUpdates).length > 0) {
        await updateProfile(profileUpdates);
      }

      // 2. Update Email if changed
      if (formData.email !== user?.email) {
        const { error: emailError } = await updateEmail(formData.email);
        if (emailError) throw emailError;
        showToast('success', 'Email de confirmación enviado');
      }

      // 3. Update Password if provided
      if (formData.password) {
        if (formData.password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres');
        }
        const { error: passError } = await updatePassword(formData.password);
        if (passError) throw passError;
        setFormData(prev => ({ ...prev, password: '' }));
      }

      showToast('success', 'Perfil actualizado correctamente');
    } catch (error: any) {
      console.error(error);
      showToast('error', error.message || 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const initials = (formData.name || user?.email || 'U').charAt(0).toUpperCase();

  return (
    <div className="flex flex-col h-full bg-white dark:bg-black transition-colors duration-300">
      {/* Header */}
      <header className="px-6 pt-10 pb-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-20">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800 transition-colors">
          <ChevronLeft className="text-gray-900 dark:text-white" size={28} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Configuración</h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 pt-4 pb-20 space-y-8 no-scrollbar">
        {/* Profile Image Section */}
        <div className="flex flex-col items-center">
          <div className="relative group">
            <div
              className="w-32 h-32 rounded-full flex items-center justify-center text-4xl font-black text-white shadow-2xl overflow-hidden border-4 border-white dark:border-gray-800 transition-transform duration-500"
              style={{ backgroundColor: profileImage ? 'transparent' : accentColor }}
            >
              {profileImage ? (
                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-10 h-10 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-900 active:scale-90 transition-transform"
            >
              <Camera size={18} className="text-white dark:text-gray-900" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 animate-fade-in ${message.type === 'success'
            ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
            }`}>
            {message.type === 'success' && <CheckCircle2 size={18} />}
            <p className="text-xs font-bold uppercase tracking-widest">{message.text}</p>
          </div>
        )}

        {/* Fields */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4">Nombre</label>
            <div className="relative">
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Tu nombre"
                className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-gray-100 dark:focus:border-gray-700 rounded-3xl py-4 px-6 text-[15px] font-bold text-gray-900 dark:text-white transition-all focus:ring-0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4">Nombre de usuario</label>
            <div className="relative">
              <input
                type="text"
                value={formData.handle}
                onChange={e => setFormData({ ...formData, handle: e.target.value })}
                placeholder="nombre_usuario"
                className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-gray-100 dark:focus:border-gray-700 rounded-3xl py-4 px-6 text-[15px] font-bold text-gray-900 dark:text-white transition-all focus:ring-0"
                style={{ paddingLeft: formData.handle.length > 0 ? '2.8rem' : '1.5rem' }}
              />
              <span className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none font-bold">@</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4">Correo electrónico</label>
            <input
              type="email"
              value={formData.email}
              disabled={true}
              placeholder="correo@ejemplo.com"
              className="w-full bg-gray-100 dark:bg-gray-800/50 border-2 border-transparent rounded-3xl py-4 px-6 text-[15px] font-bold text-gray-500 dark:text-gray-500 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-4">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-gray-100 dark:focus:border-gray-700 rounded-3xl py-4 px-6 text-[15px] font-bold text-gray-900 dark:text-white transition-all focus:ring-0"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                type="button"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-center text-gray-400 font-medium px-4 leading-relaxed">
          Tu perfil ayuda a que otras personas te reconozcan. Tu nombre y nombre de usuario también se usan en PlanifAI.
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-4 pt-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-5 rounded-[2rem] text-white font-black text-sm uppercase tracking-[0.15em] shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: accentColor }}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Guardar perfil'}
          </button>

          <button
            onClick={onBack}
            className="w-full py-4 text-gray-500 dark:text-gray-400 font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
          >
            Cancelar
          </button>

          <button
            onClick={signOut}
            className="w-full bg-red-500/10 dark:bg-red-500/5 rounded-[2rem] p-5 flex items-center justify-center gap-3 border border-red-500/20 dark:border-red-500/10 active:scale-[0.98] transition-all group"
          >
            <LogOut size={18} className="text-red-500" />
            <span className="text-red-500 font-black text-xs uppercase tracking-[0.2em]">{t.logout || 'Cerrar sesión'}</span>
          </button>
        </div>
      </main>
    </div>
  );
};
