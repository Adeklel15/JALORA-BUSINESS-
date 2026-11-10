/**
 * JALORA — Modal Kirim Struk WhatsApp (WhatsApp Click to Chat)
 * Sesuai Spesifikasi Bagian 3:
 * - Muncul hanya setelah transaksi berhasil disimpan secara atomik
 * - Menampilkan nomor transaksi, total, input nomor WA dengan normalisasi 08 -> 628
 * - Pratinjau isi pesan struk terformat rapi
 * - Membuka https://wa.me/NOMOR?text=PESAN
 * - Menjelaskan bahwa pengiriman diselesaikan oleh kasir di WhatsApp
 * - Tombol Lewati / Tutup tidak mempengaruhi transaksi yang sudah tersimpan
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  MessageSquare,
  Send,
  X,
  Phone,
  FileText,
  AlertTriangle,
  Info,
  Check,
  Receipt,
  ExternalLink
} from 'lucide-react';
import { Sale, Store } from '../../types';
import { normalizeWhatsAppNumber, formatWhatsAppReceipt, buildWhatsAppChatUrl } from '../../utils/whatsapp';

interface WhatsAppReceiptModalProps {
  isOpen: boolean;
  sale: Sale | null;
  store: Store;
  defaultPhone?: string;
  onClose: () => void;
  onProceedToPrint?: () => void;
}

export const WhatsAppReceiptModal: React.FC<WhatsAppReceiptModalProps> = ({
  isOpen,
  sale,
  store,
  defaultPhone = '',
  onClose,
  onProceedToPrint,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [hasOpenedWhatsApp, setHasOpenedWhatsApp] = useState(false);
  const [openedWaUrl, setOpenedWaUrl] = useState('');
  const [copiedReceipt, setCopiedReceipt] = useState(false);

  // Initialize phone number when modal opens
  useEffect(() => {
    if (isOpen && sale) {
      setPhoneNumber(defaultPhone || '');
      setErrorMessage('');
      setHasOpenedWhatsApp(false);
      setOpenedWaUrl('');
      setCopiedReceipt(false);
    }
  }, [isOpen, sale, defaultPhone]);

  if (!isOpen || !sale) return null;

  const receiptMessage = formatWhatsAppReceipt(sale, store.name, store.tagline);

  const handleCopyReceiptText = () => {
    navigator.clipboard?.writeText(receiptMessage);
    setCopiedReceipt(true);
    setTimeout(() => setCopiedReceipt(false), 2500);
  };

  const handleSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const validation = normalizeWhatsAppNumber(phoneNumber);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Nomor WhatsApp tidak valid.');
      return;
    }

    const waUrl = buildWhatsAppChatUrl(validation.normalized, receiptMessage);
    setOpenedWaUrl(waUrl);

    // Open WhatsApp Click to Chat
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setHasOpenedWhatsApp(true);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-[rgba(41,77,53,0.55)] backdrop-blur-xs transition-opacity duration-200 ease-out flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-[#DCE5D6] my-auto h-auto max-h-[92dvh] overflow-y-auto space-y-4 sm:space-y-5 animate-jalora-enter">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#DCE5D6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#294D35] text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5 text-[#D6BD7A]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#294D35]">
                Kirim Struk Belanja kepada Pelanggan
              </h3>
              <p className="text-xs text-stone-500">
                Metode resmi WhatsApp Click to Chat (Tanpa biaya API)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transaction Summary Card */}
        <div className="bg-[#F5F0E5]/60 rounded-xl p-4 border border-[#DCE5D6] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-[#4F7655] tracking-wider">
              Transaksi Tersimpan
            </span>
            <p className="font-mono text-xs font-bold text-[#294D35]">
              {sale.invoiceNumber}
            </p>
            <p className="text-[11px] text-stone-600">
              {sale.items.length} item · {sale.paymentMethod.toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-stone-500 uppercase font-semibold">Total Tagihan</span>
            <p className="font-bold text-lg text-[#294D35] tabular-nums">
              Rp {sale.totalAmount.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* Form: Phone Number Input */}
        <form onSubmit={handleSendWhatsApp} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#294D35] mb-1.5 flex items-center justify-between">
              <span>Nomor WhatsApp Pelanggan</span>
              <span className="text-[10px] font-normal text-stone-500">
                Otomatis diubah ke format internasional (62)
              </span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-2.5 flex items-center gap-1.5 text-stone-400">
                <Phone className="w-4 h-4 text-[#4F7655]" />
                <span className="text-xs font-bold text-[#294D35] pr-1.5 border-r border-[#DCE5D6]">+62</span>
              </div>
              <input
                type="tel"
                placeholder="Contoh: 081234567890 atau 81234567890"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                className={`w-full pl-20 pr-4 py-2.5 text-sm bg-stone-50 border rounded-xl focus:outline-none transition-all ${
                  errorMessage
                    ? 'border-red-400 focus:border-red-500 focus:bg-red-50/20'
                    : 'border-[#DCE5D6] focus:border-[#4F7655] focus:bg-white'
                }`}
                autoFocus
              />
            </div>
            {errorMessage && (
              <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </p>
            )}
          </div>

          {/* Receipt Text Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#294D35] flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-[#4F7655]" />
                Pratinjau Isi Pesan Struk:
              </span>
              <span className="text-[10px] text-stone-500">
                {receiptMessage.split('\n').length} baris teks
              </span>
            </div>
            <div className="bg-stone-900 text-stone-100 p-3.5 rounded-xl font-mono text-[11px] leading-relaxed max-h-44 overflow-y-auto border border-stone-800 whitespace-pre-wrap select-all">
              {receiptMessage}
            </div>
          </div>

          {/* WhatsApp Opened Instruction Notice */}
          {hasOpenedWhatsApp && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2 animate-in fade-in">
              <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
              <div className="space-y-1.5 leading-relaxed flex-1">
                <p className="font-bold">WhatsApp Sedang Dibuka di Tab Baru</p>
                <p className="text-[11px] text-amber-800">
                  Periksa pesan di WhatsApp dan tekan tombol <strong>Kirim</strong> untuk menyelesaikan pengiriman kepada pelanggan. Aplikasi ini menggunakan Click to Chat resmi tanpa bot.
                </p>
                {openedWaUrl && (
                  <p className="text-[11px] pt-1 border-t border-amber-200">
                    Tab WhatsApp tidak terbuka otomatis?{' '}
                    <a
                      href={openedWaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#294D35] underline inline-flex items-center gap-1 hover:text-[#4F7655]"
                    >
                      Buka Tautan WhatsApp Langsung <ExternalLink className="w-3 h-3 inline" />
                    </a>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <button
              type="submit"
              className="w-full sm:flex-1 bg-[#294D35] hover:bg-[#1e3827] text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4 text-[#D6BD7A]" />
              <span>Kirim Struk ke WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleCopyReceiptText}
              className="w-full sm:w-auto bg-[#F5F0E5] hover:bg-[#eae2d0] text-[#263328] py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#D6BD7A]"
              title="Salin teks struk belanja ke clipboard"
            >
              {copiedReceipt ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Tersalin!</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-[#294D35]" />
                  <span>Salin Struk</span>
                </>
              )}
            </button>

            {onProceedToPrint && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onProceedToPrint();
                }}
                className="w-full sm:w-auto bg-[#4F7655] hover:bg-[#5e8265] text-white py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>Cetak Thermal</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto bg-stone-100 hover:bg-stone-200 text-stone-700 py-2.5 px-4 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-stone-200"
            >
              Lewati / Tutup
            </button>
          </div>
        </form>

        {/* Footer Integrity Assurance */}
        <p className="text-[10px] text-center text-stone-400 leading-tight">
          Transaksi telah tersimpan permanen di basis data. Menutup jendela ini tidak akan mengubah atau membatalkan transaksi.
        </p>
      </div>
    </div>,
    document.body
  );
};
