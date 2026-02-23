import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, Bell } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'notification';

export interface ToastProps {
    id: string;
    title?: string;
    message: string;
    type?: ToastType;
    duration?: number;
    onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
    id,
    title,
    message,
    type = 'info',
    duration = 4000,
    onDismiss
}) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => onDismiss(id), 300); // Wait for exit animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, id, onDismiss]);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(() => onDismiss(id), 300);
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle size={20} className="text-green-500" />;
            case 'error': return <AlertCircle size={20} className="text-red-500" />;
            case 'notification': return <Bell size={20} className="text-blue-500" />;
            default: return <Info size={20} className="text-gray-500" />;
        }
    };

    const getBgColor = () => {
        // Using a refined glassmorphism look matching the app design
        return 'bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-100 dark:border-gray-700 shadow-[0_8px_30px_rgb(0,0,0,0.12)]';
    };

    return (
        <div
            className={`
        pointer-events-auto w-full max-w-sm rounded-[1.5rem] p-4 flex gap-3 
        transform transition-all duration-300 ease-out
        ${getBgColor()}
        ${isExiting ? 'opacity-0 translate-y-[-10px] scale-95' : 'opacity-100 translate-y-0 scale-100'}
      `}
            role="alert"
        >
            <div className="shrink-0 mt-0.5">
                {getIcon()}
            </div>
            <div className="flex-1 min-w-0">
                {title && (
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-0.5 tracking-tight leading-snug">
                        {title}
                    </h4>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-snug">
                    {message}
                </p>
            </div>
            <button
                onClick={handleDismiss}
                className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors self-start"
            >
                <X size={16} />
            </button>
        </div>
    );
};
