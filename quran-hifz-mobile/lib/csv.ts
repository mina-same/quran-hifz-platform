import { Share } from 'react-native';

function escapeCsvCell(value: string | number): string {
  const str = String(value ?? '');
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Same CSV shape as the web's lib/csv.ts, including the UTF-8 BOM so Excel
 *  opens the Arabic columns correctly. */
export function buildCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  return '﻿' + lines.join('\n');
}

/**
 * Phone equivalent of the web's download: there is no filesystem download on a
 * phone, so the CSV goes through the OS share sheet — Mail, Files, Drive, etc.
 * (A true .csv attachment would need expo-file-system + expo-sharing, which are
 * native modules this app does not yet bundle.)
 */
export async function shareCsv(title: string, headers: string[], rows: (string | number)[][]) {
  const csv = buildCsv(headers, rows);
  await Share.share({ title, message: csv }, { subject: title, dialogTitle: title });
}
