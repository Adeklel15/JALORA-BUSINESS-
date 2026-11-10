/**
 * JALORA — WhatsApp Click to Chat Receipt Utility
 * Validates Indonesian & International phone numbers, formats clean receipt text,
 * and builds official Click-to-Chat URLs.
 * 
 * Target: https://wa.me/NOMOR_INTERNASIONAL?text=ISI_PESAN_TER-ENCODE
 * Created by Abdul Jalil
 */

import { Sale } from '../types';

export interface WhatsAppValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

/**
 * Normalizes phone input to international digits-only format:
 * - Converts Indonesian local numbers '08xxxxxxxxxx' -> '628xxxxxxxxxx'
 * - Handles numbers with leading '8xxxxxxxxxx' -> '628xxxxxxxxxx'
 * - Handles numbers with '+62...' -> '62...'
 * - Strips all spaces, dashes, parentheses, dots
 * - Validates length and Indonesian mobile prefix
 */
export function normalizeWhatsAppNumber(raw: string): WhatsAppValidationResult {
  if (!raw || !raw.trim()) {
    return {
      valid: false,
      normalized: '',
      error: 'Nomor WhatsApp pelanggan belum diisi. Silakan masukkan nomor HP aktif.',
    };
  }

  // Remove non-digit characters except leading plus
  let cleaned = raw.trim().replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Convert Indonesian local prefix 08... or 0... to 62...
  if (cleaned.startsWith('08')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }

  // Ensure digits only
  if (!/^\d+$/.test(cleaned)) {
    return {
      valid: false,
      normalized: '',
      error: 'Nomor WhatsApp hanya boleh berisi angka.',
    };
  }

  // Indonesian mobile numbers in 628xx format are typically 10-15 digits
  if (cleaned.length < 10 || cleaned.length > 15) {
    return {
      valid: false,
      normalized: '',
      error: 'Panjang nomor WhatsApp tidak valid (harus 10 - 15 digit). Contoh: 081234567890.',
    };
  }

  // Validate mobile prefix: Indonesian numbers must start with 628
  if (cleaned.startsWith('62') && !cleaned.startsWith('628')) {
    return {
      valid: false,
      normalized: '',
      error: 'Nomor tidak valid. Nomor WhatsApp Indonesia harus berupa nomor seluler berawalan 08... atau 628...',
    };
  }

  return {
    valid: true,
    normalized: cleaned,
  };
}

/**
 * Formats a clean, readable receipt text strictly adhering to official JALORA WhatsApp receipt specs.
 * Uses real saved transaction details without fabricating data.
 * Date and time are formatted in Asia/Jakarta (WIB) timezone.
 */
export function formatWhatsAppReceipt(sale: Sale, storeName: string, footerNotes?: string): string {
  const dateObj = new Date(sale.createdAt);

  // Formatting date in Asia/Jakarta timezone
  const dateStr = dateObj.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  // Formatting time in Asia/Jakarta timezone (WIB)
  const timeStr = dateObj.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }) + ' WIB';

  const formatRupiah = (val: number) => `Rp${Math.round(val).toLocaleString('id-ID')}`;

  const lines: string[] = [
    'STRUK BELANJA — JALORA',
    '',
    `Nama Toko: ${storeName}`,
    `No. Transaksi: ${sale.invoiceNumber}`,
    `Tanggal: ${dateStr}`,
    `Waktu: ${timeStr}`,
  ];

  if (sale.customerName) {
    lines.push(`Pelanggan: ${sale.customerName}`);
  }

  if (sale.cashierName) {
    lines.push(`Kasir: ${sale.cashierName}`);
  }

  lines.push('');
  lines.push('RINCIAN BELANJA');

  sale.items.forEach(item => {
    lines.push(`${item.productName} × ${item.quantity} — ${formatRupiah(item.subtotal)}`);
  });

  lines.push('');
  lines.push(`Subtotal: ${formatRupiah(sale.subtotal)}`);

  if (sale.discountAmount && sale.discountAmount > 0) {
    lines.push(`Diskon: -${formatRupiah(sale.discountAmount)}`);
  }

  if (sale.taxAmount && sale.taxAmount > 0) {
    lines.push(`Pajak / PPN: ${formatRupiah(sale.taxAmount)}`);
  }

  lines.push(`Total: ${formatRupiah(sale.totalAmount)}`);

  const paymentMethodLabel = 
    sale.paymentMethod === 'cash' ? 'Tunai (Cash)' :
    sale.paymentMethod === 'qris' ? 'QRIS' :
    sale.paymentMethod === 'transfer' ? 'Transfer Bank' :
    sale.paymentMethod === 'debit_card' ? 'Kartu Debit' :
    sale.paymentMethod === 'credit_card' ? 'Kartu Kredit' :
    sale.paymentMethod === 'ewallet' ? 'Dompet Digital / E-Wallet' :
    (sale.paymentMethod as string)?.toUpperCase() || 'Tunai';

  lines.push(`Metode Pembayaran: ${paymentMethodLabel}`);
  if (sale.paymentReference) {
    lines.push(`No. Referensi: ${sale.paymentReference}`);
  }

  if (sale.paymentMethod === 'cash' && typeof sale.amountTendered === 'number' && sale.amountTendered > 0) {
    lines.push(`Uang Diterima: ${formatRupiah(sale.amountTendered)}`);
    if (typeof sale.changeAmount === 'number') {
      lines.push(`Kembalian: ${formatRupiah(sale.changeAmount)}`);
    }
  }

  if (footerNotes && footerNotes.trim()) {
    lines.push('');
    lines.push(footerNotes.trim());
  }

  lines.push('');
  lines.push('Terima kasih telah berbelanja.');
  lines.push('Semoga hari Anda menyenangkan!');

  return lines.join('\n');
}

/**
 * Builds the official WhatsApp Click to Chat URL:
 * https://wa.me/NOMOR_INTERNASIONAL?text=ISI_PESAN_TER-ENCODE
 */
export function buildWhatsAppChatUrl(phone: string, text: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
