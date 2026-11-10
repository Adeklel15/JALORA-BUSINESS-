/**
 * JALORA — CSV & Excel Export Utility
 * UTF-8 with BOM for 100% Microsoft Excel & Google Sheets compatibility
 * Created by Abdul Jalil
 */

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  // RFC 4180 escaping for cells: wrap in double quotes, escape existing double quotes
  const escapeCell = (cell: string | number | boolean | null | undefined): string => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell);
    return `"${str.replace(/"/g, '""')}"`;
  };

  // Prepend UTF-8 BOM (\uFEFF) so Excel on Windows & Mac recognizes UTF-8 correctly
  const csvContent =
    '\uFEFF' +
    [
      headers.map(escapeCell).join(';'),
      ...rows.map(row => row.map(escapeCell).join(';')),
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanFilename = filename.toLowerCase().endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('download', cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
