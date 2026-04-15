import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
        <div className="p-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
          <p className="text-slate-600 dark:text-slate-400 text-[15px] leading-relaxed">{message}</p>
        </div>
        <div className="flex border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 text-[15px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            Hủy
          </button>
          <div className="w-[1px] bg-slate-100 dark:bg-slate-800"></div>
          <button 
            onClick={onConfirm}
            className="flex-1 py-4 text-[15px] font-bold text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}
