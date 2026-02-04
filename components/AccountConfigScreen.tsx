
import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Mail, Lock, LogOut, Check, Pencil, KeyRound, Eye, EyeOff } from 'lucide-react';
import { useCalendar } from '../contexts/CalendarContext';
import { useAuth } from '../src/contexts/AuthContext';

interface AccountConfigScreenProps {
  onBack: () => void;
}

export const AccountConfigScreen: React.FC<AccountConfigScreenProps> = ({ onBack }) => {
  const { accentColor, setUserName, profileImage, setProfileImage, t } = useCalendar();
  const { user, profile, updateProfile, updateEmail, updatePassword, signOut } = useAuth();

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [tempHandle, setTempHandle] = useState('');
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [tempEmail, setTempEmail] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Initialize temp values when user/profile loads
  useEffect(() => {
    if (profile?.user_name) {
      setTempName(profile.user_name);
    }
    if (profile?.handle) {
      setTempHandle(profile.handle);
    }
    if (user?.email) {
      setTempEmail(user.email);
    }
  }, [profile, user]);

  const handleSaveName = async () => {
    if (!tempName.trim()) return;

    setLoading(true);
    try {
      await updateProfile({ user_name: tempName });
      setIsEditingName(false);
      showMessage('success', 'Nombre actualizado correctamente');
    } catch (error) {
      showMessage('error', 'Error al actualizar el nombre');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHandle = async () => {
    if (!tempHandle.trim() || tempHandle === profile?.handle) {
      setIsEditingHandle(false);
      return;
    }

    // Basic format validation
    const handleRegex = /^[a-z0-9_]{3,20}$/;
    if (!handleRegex.test(tempHandle.toLowerCase())) {
      showMessage('error', 'El ID debe tener entre 3 y 20 caracteres (letras, números o guiones bajos)');
      return;
    }

    setLoading(true);
    try {
      const formattedHandle = tempHandle.toLowerCase();
      await updateProfile({ handle: formattedHandle });
      setIsEditingHandle(false);
      showMessage('success', 'ID de usuario actualizado correctamente');
    } catch (error: any) {
      if (error.message?.includes('unique constraint')) {
        showMessage('error', 'Ese nombre de usuario ya está en uso');
      } else {
        showMessage('error', 'Error al actualizar el handle');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!tempEmail.trim() || tempEmail === user?.email) {
      setIsEditingEmail(false);
      return;
    }

    setLoading(true);
    try {
      const { error } = await updateEmail(tempEmail);
      if (error) {
        showMessage('error', error.message || 'Error al actualizar el email');
      } else {
        showMessage('success', 'Email de confirmación enviado. Revisa tu bandeja de entrada.');
        setIsEditingEmail(false);
      }
    } catch (error) {
      showMessage('error', 'Error al actualizar el email');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePassword = async () => {
    if (!passwords.new || passwords.new !== passwords.confirm) {
      showMessage('error', 'Las contraseñas no coinciden');
      return;
    }

    if (passwords.new.length < 6) {
      showMessage('error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const { error } = await updatePassword(passwords.new);
      if (error) {
        showMessage('error', error.message || 'Error al actualizar la contraseña');
      } else {
        showMessage('success', 'Contraseña actualizada correctamente');
        setIsChangingPassword(false);
        setPasswords({ current: '', new: '', confirm: '' });
      }
    } catch (error) {
      showMessage('error', 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut();
      // User will be redirected automatically by AuthContext
    } catch (error) {
      showMessage('error', 'Error al cerrar sesión');
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

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const displayName = profile?.user_name || user?.email?.split('@')[0] || 'Usuario';
  const displayEmail = user?.email || 'No email';

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] dark:bg-black overflow-y-auto no-scrollbar pb-10 transition-colors duration-300">
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#F8FAFC]/80 dark:bg-black/80 backdrop-blur-md z-20">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800 transition-colors">
          <ChevronLeft className="text-gray-900 dark:text-white" size={28} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{t.account_title}</h1>
        <div className="w-10"></div>
      </header>

      {/* Success/Error Message */}
      {message && (
        <div className={`mx-6 mb-4 p-4 rounded-2xl ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'} text-sm font-bold text-center animate-fade-in`}>
          {message.text}
        </div>
      )}

      <main className="px-6 space-y-8 pt-2">
        <section>
          <h2 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.2em] mb-4 ml-4">{t.account_profile}</h2>
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 shadow-sm border border-gray-100 dark:border-gray-800 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div
                    className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl font-black shadow-inner overflow-hidden transition-all duration-500"
                    style={{ backgroundColor: profileImage ? 'transparent' : `${accentColor}20`, color: accentColor }}
                  >
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-md border border-gray-100 dark:border-gray-700 active:scale-90 transition-transform"
                  >
                    <Pencil size={12} className="text-gray-400 dark:text-gray-500" />
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                </div>

                <div className="flex flex-col flex-1">
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Nombre</span>
                  {isEditingName ? (
                    <input
                      autoFocus value={tempName} onChange={(e) => setTempName(e.target.value)}
                      onBlur={handleSaveName} onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                      disabled={loading}
                      className="text-xl font-black text-gray-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full caret-indigo-500"
                    />
                  ) : (
                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">{displayName}</h3>
                  )}
                </div>
              </div>

              <button
                onClick={() => isEditingName ? handleSaveName() : setIsEditingName(true)}
                disabled={loading}
                className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 active:scale-90 transition-transform shrink-0 disabled:opacity-50"
              >
                {isEditingName ? <Check size={20} className="text-green-500" strokeWidth={3} /> : <Pencil size={20} />}
              </button>
            </div>

            {/* Handle Field */}
            <div className="mt-6 pt-6 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                  <span className="font-black text-lg">@</span>
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">ID de Usuario (para amigos)</span>
                  {isEditingHandle ? (
                    <div className="flex items-center">
                      <span className="text-xl font-black text-gray-400 dark:text-gray-600">@</span>
                      <input
                        autoFocus value={tempHandle} onChange={(e) => setTempHandle(e.target.value)}
                        onBlur={handleSaveHandle} onKeyDown={(e) => e.key === 'Enter' && handleSaveHandle()}
                        disabled={loading}
                        className="text-xl font-black text-gray-900 dark:text-white bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-full caret-indigo-500"
                      />
                    </div>
                  ) : (
                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tighter">@{profile?.handle || 'id_desconocido'}</h3>
                  )}
                </div>
              </div>

              <button
                onClick={() => isEditingHandle ? handleSaveHandle() : setIsEditingHandle(true)}
                disabled={loading}
                className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 active:scale-90 transition-transform shrink-0 disabled:opacity-50"
              >
                {isEditingHandle ? <Check size={20} className="text-green-500" strokeWidth={3} /> : <Pencil size={20} />}
              </button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-[10px] font-black text-[#94A3B8] uppercase tracking-[0.2em] mb-4 ml-4">{t.account_creds}</h2>
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 transition-all duration-300">

            {/* Email Section */}
            {!isEditingEmail ? (
              <div className="p-7 flex items-center justify-between border-b border-gray-50 dark:border-gray-800">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                    <Mail size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{t.account_email}</span>
                    <span className="text-sm font-bold text-gray-400 dark:text-gray-500">{displayEmail}</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditingEmail(true)}
                  className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl active:scale-95 transition-all"
                >
                  Editar
                </button>
              </div>
            ) : (
              <div className="p-7 border-b border-gray-50 dark:border-gray-800 space-y-4 bg-gray-50/30 dark:bg-gray-900/30">
                <div className="flex items-center gap-2">
                  <Mail size={18} style={{ color: accentColor }} />
                  <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">Actualizar Email</span>
                </div>
                <input
                  type="email"
                  autoFocus
                  value={tempEmail}
                  onChange={(e) => setTempEmail(e.target.value)}
                  disabled={loading}
                  className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl py-4 px-5 text-sm font-bold focus:ring-0 placeholder:text-gray-300 dark:text-white shadow-sm disabled:opacity-50"
                  placeholder="nuevo@email.com"
                />
                <div className="flex gap-4">
                  <button
                    onClick={handleSaveEmail}
                    disabled={loading || !tempEmail.trim()}
                    className="flex-1 py-4 rounded-[1.4rem] text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
                    style={{ backgroundColor: accentColor }}
                  >
                    {loading ? 'Guardando...' : t.apply_changes}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingEmail(false);
                      setTempEmail(user?.email || '');
                    }}
                    disabled={loading}
                    className="px-6 py-4 rounded-[1.4rem] bg-gray-100 dark:bg-gray-800 text-gray-400 font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
                  >
                    {t.account_cancel}
                  </button>
                </div>
              </div>
            )}

            {/* Password Section */}
            {!isChangingPassword ? (
              <div className="p-7 flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                    <Lock size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{t.account_pass}</span>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">••••••••••••</span>
                  </div>
                </div>
                <button onClick={() => setIsChangingPassword(true)} className="text-[10px] font-black text-indigo-500 uppercase tracking-widest px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl active:scale-95 transition-all">
                  {t.account_change}
                </button>
              </div>
            ) : (
              <div className="p-7 space-y-6 animate-slide-up bg-gray-50/30 dark:bg-gray-900/30">
                <div className="flex justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound size={18} style={{ color: accentColor }} />
                    <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-widest">{t.account_update_pass}</span>
                  </div>
                  <button onClick={() => setShowPass(!showPass)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Nueva Contraseña</label>
                    <input
                      type={showPass ? "text" : "password"}
                      value={passwords.new}
                      onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                      disabled={loading}
                      className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl py-4 px-5 text-sm font-bold focus:ring-0 placeholder:text-gray-300 dark:text-white shadow-sm disabled:opacity-50"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.account_confirm_pass}</label>
                    <input
                      type={showPass ? "text" : "password"}
                      value={passwords.confirm}
                      onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                      disabled={loading}
                      className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl py-4 px-5 text-sm font-bold focus:ring-0 placeholder:text-gray-300 dark:text-white shadow-sm disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={handleSavePassword}
                    className="flex-1 py-4 rounded-[1.4rem] text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
                    style={{ backgroundColor: accentColor }}
                    disabled={loading || !passwords.new || passwords.new !== passwords.confirm}
                  >
                    {loading ? 'Guardando...' : t.apply_changes}
                  </button>
                  <button
                    onClick={() => {
                      setIsChangingPassword(false);
                      setPasswords({ current: '', new: '', confirm: '' });
                    }}
                    disabled={loading}
                    className="px-6 py-4 rounded-[1.4rem] bg-gray-100 dark:bg-gray-800 text-gray-400 font-black text-[10px] uppercase tracking-widest disabled:opacity-50"
                  >
                    {t.account_cancel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="pt-4">
          <button
            onClick={handleLogout}
            disabled={loading}
            className="w-full bg-rose-50 dark:bg-rose-900/10 p-7 rounded-[2.8rem] flex items-center justify-center gap-3 border border-rose-100 dark:border-rose-900/20 active:scale-[0.98] transition-all group disabled:opacity-50"
          >
            <LogOut size={22} className="text-rose-500 group-hover:translate-x-1 transition-transform" />
            <span className="text-[11px] font-black text-rose-500 uppercase tracking-[0.25em]">{loading ? 'Cerrando...' : t.logout}</span>
          </button>
        </section>
      </main>
    </div>
  );
};
