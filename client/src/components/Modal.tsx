import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto px-4 py-6 sm:px-0 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                onClick={onClose}
                aria-hidden="true"
            ></div>

            {/* Modal Container */}
            <div className={`relative bg-card-dark w-full ${maxWidth} rounded-xl overflow-hidden shadow-2xl border border-border-dark`}>
                {/* Header */}
                <div className="px-6 py-5 flex justify-between items-center border-b border-border-dark">
                    <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-text-subtle hover:text-white hover:bg-card-hover rounded-lg transition-all"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 pb-6 pt-4 text-slate-300">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
