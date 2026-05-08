import { cleanMerchantName } from '../utils/formatting';

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function inferYear(fullText) {
  const periodMatch = fullText.match(
    /(?:statement\s+from|for)\s+(\w+)\s+\d{1,2},?\s*(\d{4})\s*(?:to|-|–)\s*(\w+)\s+\d{1,2},?\s*(\d{4})/i
  );
  if (periodMatch) {
    return { startYear: parseInt(periodMatch[2]), endYear: parseInt(periodMatch[4]) };
  }
  const yearMatch = fullText.match(/20[2-3]\d/g);
  if (yearMatch) {
    const years = [...new Set(yearMatch.map(Number))];
    years.sort();
    return { startYear: years[0], endYear: years[years.length - 1] };
  }
  const y = new Date().getFullYear();
  return { startYear: y, endYear: y };
}

function resolveYear(monthIdx, yearInfo) {
  if (yearInfo.startYear === yearInfo.endYear) return yearInfo.endYear;
  return monthIdx >= 10 ? yearInfo.startYear : yearInfo.endYear;
}

function parseAmount(str) {
  if (!str) return null;
  const cleaned = str.replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseRBCChequing(fullText) {
  const transactions = [];
  const lines = fullText.split('\n');
  const datePattern = /^\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4})/i;

  const entries = [];
  for (let i = 0; i < lines.length; i++) {
    const dm = lines[i].match(datePattern);
    if (!dm) continue;
    const date = parseFullDate(dm[1]);
    if (!date) continue;

    const rest = lines[i].slice(dm[0].length + dm.index).trim();

    const isWithdrawal = /\s-\s+\$/.test(rest) || /^-\s*\$/.test(rest);

    const amounts = [...rest.matchAll(/\$[\d,]+\.\d{2}/g)].map(m => parseAmount(m[0])).filter(a => a !== null);
    let amount = null;
    if (amounts.length >= 2) {
      amount = amounts[0];
    } else if (amounts.length === 1) {
      amount = amounts[0];
    }

    const textInLine = rest
      .replace(/-?\s*\$[\d,]+\.\d{2}/g, '')
      .replace(/^\s*-\s*$/, '')
      .trim();

    entries.push({ date, isWithdrawal, amount, textInLine, lineIdx: i, prefix: [], suffix: [] });
  }

  for (let ei = 0; ei < entries.length; ei++) {
    const cur = entries[ei];
    const prevStart = ei > 0 ? entries[ei - 1].lineIdx + 1 : 0;

    for (let g = cur.lineIdx - 1; g >= prevStart; g--) {
      const l = lines[g]?.trim();
      if (!l || isBoilerplate(l)) break;
      if (/\$[\d,]+\.\d{2}/.test(l)) break;
      if (isTxTypePrefix(l) || isETransferLine(l)) {
        cur.prefix.unshift(l);
      } else break;
    }

    const nextEntry = entries[ei + 1];
    const gapEnd = nextEntry ? nextEntry.lineIdx : lines.length;
    for (let g = cur.lineIdx + 1; g < gapEnd; g++) {
      const l = lines[g]?.trim();
      if (!l || isBoilerplate(l)) break;
      if (/\$[\d,]+\.\d{2}/.test(l)) break;
      if (isTxTypePrefix(l) || isETransferLine(l)) break;
      if (!isNoise(l)) cur.suffix.push(l);
    }
  }

  for (const e of entries) {
    if (e.amount === null) continue;

    const descParts = [...e.prefix];
    if (e.textInLine && !isNoise(e.textInLine)) descParts.push(e.textInLine);
    descParts.push(...e.suffix);

    const desc = cleanDescription(descParts.join(' '));
    if (!desc || isNoise(desc)) continue;

    if (e.isWithdrawal) {
      transactions.push({ date: e.date, description: desc, amount: -e.amount, type: 'debit', bank: 'RBC', accountType: 'Chequing' });
    } else {
      transactions.push({ date: e.date, description: desc, amount: e.amount, type: 'credit', bank: 'RBC', accountType: 'Chequing' });
    }
  }

  return transactions;
}

function isETransferLine(line) {
  return /^e-Transfer/i.test(line);
}

function isTxTypePrefix(line) {
  return /^(Misc Payment|Payroll Deposit|e-Transfer\s|Inter-FI|Investment|Insurance|Online Transfer|Online Banking)/i.test(line);
}

function isBoilerplate(line) {
  return /^(DATE|DESCRIPTION|WITHDRAWAL|DEPOSIT|BALANCE|Account\s|Opening|Closing|Your Overdraft|Transit|For\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)|Questions|Please|Report|Talk|TM\s|®|Royal\s|about:blank|If you opted|Please retain|Please check)/i.test(line);
}

export function parseRBCCreditCard(fullText) {
  const transactions = [];
  const yearInfo = inferYear(fullText);
  const lines = fullText.split('\n');

  for (const line of lines) {
    const dateMatch = line.match(
      /^\s*((?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{1,2})\s+(?:(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{1,2})\s+/i
    );
    if (!dateMatch) continue;

    const dm = dateMatch[1].match(/(\w{3})\s+(\d{1,2})/i);
    if (!dm) continue;

    const monthIdx = MONTHS[dm[1].toLowerCase()];
    if (monthIdx === undefined) continue;
    const day = parseInt(dm[2]);
    const year = resolveYear(monthIdx, yearInfo);
    const date = toDateStr(year, monthIdx, day);

    const rest = line.slice(dateMatch[0].length);

    const amounts = [...rest.matchAll(/-?\$[\d,]+\.\d{2}/g)].map(m => ({
      raw: m[0],
      value: parseAmount(m[0]),
      index: m.index,
    })).filter(a => a.value !== null);

    if (amounts.length === 0) continue;

    const txAmount = amounts[0];
    let description = rest.slice(0, txAmount.index).trim();
    description = description.replace(/\s+\d{15,}$/, '').trim();
    if (isNoise(description)) continue;
    if (/^foreign currency/i.test(description)) continue;
    if (/^\d{10,}$/.test(description)) continue;

    const amount = txAmount.value;

    transactions.push({
      date,
      description: cleanMerchantName(cleanDescription(description)),
      amount: -amount,
      type: amount > 0 ? 'debit' : 'credit',
      bank: 'RBC',
      accountType: fullText.toLowerCase().includes('mastercard') ? 'Mastercard' : 'Visa',
    });
  }

  return transactions;
}

export function parseRBCVisa(fullText) {
  return parseRBCCreditCard(fullText);
}

function parseFullDate(str) {
  const match = str.match(/(\w{3})\s+(\d{1,2}),?\s+(\d{4})/i);
  if (!match) return null;
  const monthIdx = MONTHS[match[1].toLowerCase()];
  if (monthIdx === undefined) return null;
  return toDateStr(parseInt(match[3]), monthIdx, parseInt(match[2]));
}

function cleanDescription(desc) {
  return desc
    .replace(/\s{2,}/g, ' ')
    .replace(/\b[0-9a-f]{16,}\b/gi, '')
    .replace(/\s+[A-Z0-9]{5,6}$/i, (m) => /[0-9]/.test(m) ? '' : m)
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+$/, '')
    .trim();
}

function isNoise(desc) {
  if (!desc || desc.length < 2) return true;
  if (/^(opening|closing)\s+balance/i.test(desc)) return true;
  if (/^(total|account\s+summary|your\s+overdraft)/i.test(desc)) return true;
  if (/^(date|description|withdrawal|deposit|balance|about:blank)/i.test(desc)) return true;
  if (/^(questions|please|report|talk)/i.test(desc)) return true;
  if (/^\d{10,}$/.test(desc)) return true;
  return false;
}
