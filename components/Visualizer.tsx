
import React, { useState, useEffect, useRef } from 'react';

interface VisualizerProps {
  active: boolean;
  volume: number; // 0 to 1
  isTalking: boolean;
  isThinking: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ active, volume, isTalking, isThinking }) => {
  const [internalState, setInternalState] = useState<'thinking' | 'listening' | 'talking'>('thinking');
  const lastUserVoiceRef = useRef<number>(0);

  // CONFIGURACIÓN DE PACIENCIA HUMANA
  const threshold = 0.008; // Más sensible para mejor feedback visual
  const silenceGracePeriod = 1200; // 1.2 segundos para ser más reactivo

  useEffect(() => {
    if (!active) return;

    const now = Date.now();

    // Prioridad 1: Si la IA está hablando, el estado es 'talking' (AZUL)
    if (isTalking) {
      setInternalState('talking');
      return;
    }

    // Prioridad 2: Si la IA dice explícitamente que está pensando (naranja/amarillo o el verde actual)
    if (isThinking) {
      setInternalState('thinking');
      return;
    }

    // Prioridad 3: Si detectamos voz del usuario, actualizamos y mantenemos 'listening' (ROSA)
    if (volume > threshold) {
      lastUserVoiceRef.current = now;
      setInternalState('listening');
    } else {
      // Si hay silencio, esperamos el búfer de gracia antes de pasar a 'thinking' (VERDE)
      const timeSinceLastVoice = now - lastUserVoiceRef.current;
      if (timeSinceLastVoice >= silenceGracePeriod) {
        setInternalState('thinking');
      }
    }
  }, [volume, isTalking, isThinking, active]);

  if (!active) {
    return (
      <div className="relative flex items-center justify-center h-64 w-64 opacity-20 grayscale transition-opacity duration-1000">
        <div className="w-full h-full rounded-full bg-gradient-to-br from-gray-200 to-gray-300 blur-3xl"></div>
      </div>
    );
  }

  // Animaciones y Escalas según estado
  const auroraOpacity = active ? (internalState !== 'thinking' ? 0.95 : 0.8) : 0;
  const auroraScale = active ? (internalState !== 'thinking' ? 1.2 : 1.0) : 0.8;

  // PALETA DE COLORES REFORZADA
  // Verde Pensando: Ahora es un verde neón muy fuerte y vibrante
  let gradientClasses = 'bg-gradient-to-tr from-[#00FF87] via-[#01D16B] to-[#74FF00]';
  let blob1Color = 'bg-[#00FF87]';
  let blob2Color = 'bg-[#00FF41]';
  let ringColor = 'border-[#00FF87]/30';

  if (internalState === 'talking') {
    // IA Hablando: Azul/Cian elegante
    gradientClasses = 'bg-gradient-to-tr from-[#00F2FE] via-[#4FACFE] to-[#0076FF]';
    blob1Color = 'bg-[#4FACFE]';
    blob2Color = 'bg-[#00F2FE]';
    ringColor = 'border-cyan-300/40';
  } else if (internalState === 'listening') {
    // Usuario Hablando: Rosa/Púrpura vibrante
    gradientClasses = 'bg-gradient-to-tr from-[#FF0080] via-[#7928CA] to-[#FF0080]';
    blob1Color = 'bg-[#FF0080]';
    blob2Color = 'bg-[#7928CA]';
    ringColor = 'border-rose-400/40';
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-visible">
      <div
        className="relative flex items-center justify-center w-[85%] h-[85%] max-w-[420px] aspect-square transition-all duration-[800ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{ opacity: auroraOpacity, transform: `scale(${auroraScale})` }}
      >
        {/* Layer 1: Base Glow con sombra reactiva */}
        <div className={`absolute inset-0 rounded-full blur-[80px] mix-blend-screen animate-pulse transition-all duration-1000 ${gradientClasses} ${internalState === 'thinking' ? 'shadow-[0_0_100px_rgba(0,255,135,0.6)]' : ''}`}
          style={{ animationDuration: '3.5s' }}
        ></div>

        {/* Layer 2: Floating Blob 1 */}
        <div className={`absolute -top-16 -left-16 w-[120%] h-[120%] rounded-full blur-[110px] mix-blend-overlay animate-blob transition-colors duration-1000 ${blob1Color}`}
        ></div>

        {/* Layer 3: Floating Blob 2 */}
        <div className={`absolute -bottom-16 -right-16 w-[120%] h-[120%] rounded-full blur-[110px] mix-blend-overlay animate-blob animation-delay-2000 transition-colors duration-1000 ${blob2Color}`}
        ></div>

        {/* Layer 4: Center Fluid Core */}
        <div className={`absolute inset-10 rounded-full blur-[50px] mix-blend-plus-lighter animate-pulse
            ${internalState !== 'thinking' ? 'bg-white/50' : 'bg-white/10'}`}
          style={{ animationDuration: '1.8s' }}
        ></div>

        {/* Responsive Outer Ring con escala volumétrica */}
        <div className={`absolute inset-0 rounded-full border-[18px] blur-sm transition-all duration-500 scale-110 ${ringColor}`}
          style={{
            transform: `scale(${1.1 + (internalState === 'listening' ? volume * 1.0 : 0)})`,
            opacity: active ? 0.6 : 0
          }}
        ></div>
      </div>
    </div>
  );
};
