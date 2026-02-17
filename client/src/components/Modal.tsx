import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-0 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-500"
                onClick={onClose}
                aria-hidden="true"
            ></div>

            {/* Modal Container */}
            <div className="relative glass-card w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.5)] transform transition-all duration-500 animate-in zoom-in-95 fade-in">
                {/* Decorative border glow */}
                <div className="absolute inset-0 border border-white/10 rounded-[2.5rem] pointer-events-none"></div>

                {/* Header */}
                <div className="relative px-8 pt-8 pb-4 flex justify-between items-center group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 blur-[50px] rounded-full -mr-16 -mt-16 group-hover:bg-indigo-600/20 transition-all duration-700"></div>
                    <h3 className="text-2xl font-black text-white tracking-tight flex items-center">
                        <span className="w-1.5 h-6 bg-indigo-500 rounded-full mr-3"></span>
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300 active:scale-90"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-8 pb-8 relative z-10">
                    <div className="text-slate-300">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};


export default Modal;
