/**
 * JALORA — Enterprise PDF Report Generation Utility
 * Generates beautiful, print-ready, branded PDF reports using JALORA Forest Green & Champagne Gold theme.
 * Created by Abdul Jalil
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Store, Branch, Sale, StockMovement, Product } from '../types/index.ts';
import { formatIndonesianDateTime, formatIndonesianDateOnly } from './dateFormatter.ts';

// Format Indonesian Rupiah
const formatRp = (num: number): string => {
  return 'Rp ' + Math.round(num).toLocaleString('id-ID');
};

export interface FinancialReportData {
  store: Store;
  branch: Branch;
  reportTitle: string;
  periodText: string;
  summary: {
    totalRevenue: number;
    totalHPP: number;
    grossProfit: number;
    totalExpense: number;
    netProfit: number;
    totalAssets: number;
    totalLiabilitiesAndEquity: number;
    kasBalance: number;
    bankBalance: number;
    piutangBalance: number;
    persediaanBalance: number;
    utangBalance: number;
    modalBalance: number;
  };
  details: {
    section: string;
    description: string;
    amount: number;
    isSubtotal?: boolean;
    isTotal?: boolean;
  }[];
}

/**
 * Generate and download Official Financial Report PDF (Laporan Laba Rugi / Neraca / Bulanan)
 */
export function downloadFinancialReportPdf(data: FinancialReportData): void {
  try {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryGreen: [number, number, number] = [41, 77, 53]; // #294D35
    const champagneGold: [number, number, number] = [214, 189, 122]; // #D6BD7A
    const darkText: [number, number, number] = [38, 51, 40]; // #263328
    const grayText: [number, number, number] = [102, 115, 102]; // #667366

    // --- 1. HEADER BRANDING ---
    // Top banner
    doc.setFillColor(...primaryGreen);
    doc.rect(0, 0, 210, 24, 'F');

    // Accent line
    doc.setFillColor(...champagneGold);
    doc.rect(0, 24, 210, 1.5, 'F');

    // Brand Name
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('JALORA', 14, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Business Management Platform · Satu Sistem, Kendali Seluruh Bisnis', 14, 18);

    doc.setFontSize(9);
    doc.text('DOKUMEN RESMI', 196, 12, { align: 'right' });
    doc.setFontSize(8);
    doc.text(`Dicetak: ${formatIndonesianDateTime(new Date())}`, 196, 18, { align: 'right' });

    // --- 2. REPORT TITLE & STORE INFO ---
    let y = 33;
    doc.setTextColor(...darkText);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(data.reportTitle.toUpperCase(), 14, y);

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...grayText);
    doc.text(`Toko: ${data.store.name}  |  Cabang: ${data.branch.name} (${data.branch.code})  |  Periode: ${data.periodText}`, 14, y);

    // --- 3. EXECUTIVE KPI CARDS ---
    y += 8;
    const cardWidth = 58;
    const cardHeight = 18;

    // Card 1: Pendapatan / Total Aset
    doc.setFillColor(245, 247, 242);
    doc.roundedRect(14, y, cardWidth, cardHeight, 2, 2, 'F');
    doc.setDrawColor(220, 229, 214);
    doc.roundedRect(14, y, cardWidth, cardHeight, 2, 2, 'S');
    doc.setFontSize(8);
    doc.setTextColor(...grayText);
    doc.text('TOTAL PENDAPATAN', 18, y + 6);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryGreen);
    doc.text(formatRp(data.summary.totalRevenue), 18, y + 13);

    // Card 2: Laba Kotor
    doc.setFillColor(245, 247, 242);
    doc.roundedRect(76, y, cardWidth, cardHeight, 2, 2, 'F');
    doc.setDrawColor(220, 229, 214);
    doc.roundedRect(76, y, cardWidth, cardHeight, 2, 2, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...grayText);
    doc.text('LABA KOTOR (GROSS)', 80, y + 6);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryGreen);
    doc.text(formatRp(data.summary.grossProfit), 80, y + 13);

    // Card 3: Laba Bersih
    const isProfit = data.summary.netProfit >= 0;
    doc.setFillColor(231, 239, 225); // Soft green surface
    doc.roundedRect(138, y, cardWidth, cardHeight, 2, 2, 'F');
    doc.setDrawColor(79, 118, 85);
    doc.roundedRect(138, y, cardWidth, cardHeight, 2, 2, 'S');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...grayText);
    doc.text('LABA BERSIH (NET)', 142, y + 6);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(isProfit ? primaryGreen[0] : 180, isProfit ? primaryGreen[1] : 30, isProfit ? primaryGreen[2] : 30);
    doc.text(formatRp(data.summary.netProfit), 142, y + 13);

    // --- 4. DETAILS TABLE ---
    y += 24;

    const tableRows = data.details.map(item => [
      item.section,
      item.description,
      item.amount < 0 ? `(${formatRp(Math.abs(item.amount))})` : formatRp(item.amount),
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Pos Laporan', 'Uraian Akun & Keterangan', 'Jumlah (Rp)']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: primaryGreen,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'left',
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 95 },
        2: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 2.8,
        textColor: darkText,
        lineColor: [220, 229, 214],
        lineWidth: 0.2,
      },
      alternateRowStyles: {
        fillColor: [250, 252, 248],
      },
      didParseCell: (hookData) => {
        // Highlight total rows
        const row = data.details[hookData.row.index];
        if (row && row.isTotal) {
          hookData.cell.styles.fillColor = [231, 239, 225];
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.textColor = primaryGreen;
        } else if (row && row.isSubtotal) {
          hookData.cell.styles.fontStyle = 'bold';
        }
      },
    });

    // --- 5. FOOTER & SIGNATURE AREA ---
    const finalY = (doc as any).lastAutoTable?.finalY || 200;
    const signY = Math.min(finalY + 14, 250);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...grayText);
    doc.text(`Dicetak melalui JALORA Business Management Platform · ${data.store.name}`, 14, signY + 25);
    doc.text('Halaman 1 dari 1 · Dokumen komputer sah tanpa tanda tangan basah', 196, signY + 25, { align: 'right' });

    // File name
    const cleanDate = new Date().toISOString().split('T')[0];
    const safeTitle = data.reportTitle.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `JALORA_${safeTitle}_${data.branch.code}_${cleanDate}.pdf`;

    doc.save(filename);
  } catch (err) {
    console.error('Gagal membuat file PDF laporan keuangan:', err);
    throw new Error('Gagal menghasilkan file PDF. Pastikan browser mendukung pengunduhan file.');
  }
}

export interface SalesReportPdfData {
  store: Store;
  branch: Branch;
  sales: Sale[];
  periodText?: string;
}

/**
 * Generate and download POS Sales Transactions History PDF
 */
export function downloadSalesReportPdf(data: SalesReportPdfData): void {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const primaryGreen: [number, number, number] = [41, 77, 53];
    const champagneGold: [number, number, number] = [214, 189, 122];
    const darkText: [number, number, number] = [38, 51, 40];
    const grayText: [number, number, number] = [102, 115, 102];

    // Header banner
    doc.setFillColor(...primaryGreen);
    doc.rect(0, 0, 297, 22, 'F');
    doc.setFillColor(...champagneGold);
    doc.rect(0, 22, 297, 1.5, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('JALORA · LAPORAN TRANSAKSI PENJUALAN KASIR (POS)', 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Toko: ${data.store.name}  |  Cabang: ${data.branch.name} (${data.branch.code})  |  Dicetak: ${formatIndonesianDateTime(new Date())}`, 14, 17);

    // Summary calculations
    const totalTransactions = data.sales.length;
    const totalOmset = data.sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalItems = data.sales.reduce((sum, s) => sum + s.items.reduce((acc, it) => acc + it.quantity, 0), 0);

    // Mini KPI bar
    doc.setFillColor(245, 247, 242);
    doc.roundedRect(14, 28, 269, 12, 1.5, 1.5, 'F');
    doc.setDrawColor(220, 229, 214);
    doc.roundedRect(14, 28, 269, 12, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...darkText);
    doc.text(`Total Transaksi: ${totalTransactions}`, 20, 35.5);
    doc.text(`Total Produk Terjual: ${totalItems.toLocaleString('id-ID')} unit`, 90, 35.5);
    doc.setTextColor(...primaryGreen);
    doc.text(`Total Omset Penjualan: ${formatRp(totalOmset)}`, 180, 35.5);

    // Transactions Table
    const tableRows = data.sales.slice(0, 200).map((sale, idx) => {
      const itemsCount = sale.items.reduce((sum, it) => sum + it.quantity, 0);
      const itemsDetail = sale.items.map(it => `${it.productName} (${it.quantity})`).join(', ');
      return [
        (idx + 1).toString(),
        sale.invoiceNumber,
        formatIndonesianDateTime(sale.createdAt),
        sale.cashierName || '-',
        sale.customerName || 'Umum',
        sale.paymentMethod.toUpperCase(),
        itemsCount.toString(),
        formatRp(sale.totalAmount),
        itemsDetail.length > 35 ? itemsDetail.substring(0, 32) + '...' : itemsDetail,
      ];
    });

    autoTable(doc, {
      startY: 44,
      head: [['No', 'No. Faktur', 'Waktu Transaksi', 'Kasir', 'Pelanggan', 'Metode', 'Item', 'Total (Rp)', 'Rincian Barang']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: primaryGreen,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 32, fontStyle: 'bold' },
        2: { cellWidth: 32 },
        3: { cellWidth: 26 },
        4: { cellWidth: 26 },
        5: { cellWidth: 22, halign: 'center' },
        6: { cellWidth: 14, halign: 'center' },
        7: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
        8: { cellWidth: 77 },
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: darkText,
        lineColor: [220, 229, 214],
        lineWidth: 0.15,
      },
      alternateRowStyles: {
        fillColor: [250, 252, 248],
      },
    });

    const cleanDate = new Date().toISOString().split('T')[0];
    const filename = `JALORA_Riwayat_Penjualan_${data.branch.code}_${cleanDate}.pdf`;
    doc.save(filename);
  } catch (err) {
    console.error('Gagal membuat file PDF penjualan:', err);
    throw new Error('Gagal menghasilkan file PDF penjualan.');
  }
}
