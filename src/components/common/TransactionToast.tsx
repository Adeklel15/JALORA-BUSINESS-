/**
 * JALORA — Transaction Toast Notification
 * Sleek floating notification for transaction results
 * Supports success & error states with official JALORA colors.
 * 
 * Created by Abdul Jalil
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Receipt } from 'lucide-react';

interface ToastData {
  id: string;
  type: 'success' | 'error';
  title: string;
  invoiceNumber?: string;
  totalAmount?: number;
  paymentMethod?: string;
  customerName?: string;
  message?: string;
}

export const TransactionToast: React.FC = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const detail = customEvent.detail;
      if (!detail) return;

      const newToast: ToastData = {
        id: `toast_${Date.now()}_${Math.random()}`,
        type: detail.type || 'success',
        title: detail.title || (detail.type === 'error' ? 'Transaksi Gagal' : 'Transaksi Berhasil!'),
        invoiceNumber: detail.invoiceNumber,
        totalAmount: detail.totalAmount,
        paymentMethod: detail.paymentMethod,
        customerName: detail.customerName,
        message: detail.message,
      };

      setToasts(prev => [...prev.slice(-2), newToast]); // Keep max 3 toasts

      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== newToast.id));
      }, 4500);
    };

    window.addEventListener('jalora-transaction-toast', handleToastEvent);
    return () => window.removeEventListener('jalora-transaction-toast', handleToastEvent);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0">
      {toasts.map(toast => {
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl p-4 shadow-xl border backdrop-blur-md transition-all transform animate-in slide-in-from-top-3 fade-in duration-200 ${
              isSuccess
                ? 'bg-white/95 border-[#4F7655]/50 text-[#294D35] ring-1 ring-[#4F7655]/20'
                : 'bg-red-50/95 border-red-300 text-red-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isSuccess
                    ? 'bg-[#294D35] text-white shadow-xs'
                    : 'bg-red-600 text-white shadow-xs'
                }`}
              >
                {isSuccess ? (
                  <CheckCircle2 className="w-5 h-5 text-[#D6BD7A]" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-white" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm leading-tight text-[#294D35]">
                    {toast.title}
                  </h4>
                  <button
                    onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                    className="p-1 -mr-1 -mt-1 text-stone-400 hover:text-stone-700 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {isSuccess && toast.invoiceNumber && (
                  <div className="mt-1 space-y-0.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-[#4F7655] font-semibold">
                        {toast.invoiceNumber}
                      </span>
                      {toast.totalAmount !== undefined && (
                        <span className="font-bold text-[#294D35] tabular-nums text-xs">
                          Rp {toast.totalAmount.toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>
                    {toast.paymentMethod && (
                      <p className="text-[11px] text-stone-500">
                        Metode: <strong className="text-stone-700 capitalize">{toast.paymentMethod}</strong>
                        {toast.customerName ? ` • ${toast.customerName}` : ''}
                      </p>
                    )}
                  </div>
                )}

                {!isSuccess && toast.message && (
                  <p className="mt-1 text-xs text-red-700 leading-snug">
                    {toast.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
