import React, { useState, useEffect, useCallback } from 'react';

export function useToast() {
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 2000);
  }, []);

  const ToastComponent = () => (
    <div
      className={`fixed top-6 right-6 z-[9999] px-6 py-4 rounded-xl shadow-lg transform transition-all duration-300 flex items-center gap-3 ${
        toast.show ? 'translate-x-0 opacity-100' : 'translate-x-12 opacity-0 pointer-events-none'
      } ${
        toast.type === 'error' 
          ? 'bg-rose-50 border border-rose-100 text-rose-600' 
          : 'bg-emerald-50 border border-emerald-100 text-emerald-600'
      }`}
    >
      {toast.type === 'error' ? (
        <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
      )}
      <span className="text-sm font-black tracking-wide uppercase">{toast.message}</span>
    </div>
  );

  return { showToast, ToastComponent };
}
