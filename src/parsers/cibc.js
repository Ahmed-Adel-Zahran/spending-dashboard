import { cleanMerchantName } from '../utils/formatting';

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function inferYear(fullText) {
  const match = fullText.match(/20[1-3]\d/g);
  if (match) {
    const years = [...new Set(match.map(Number))];
    years.sort();
    return { startYear: years[0], endYear: years[years.length - 1] };
  }
  const y = new Date().getFullYear();
  return { startYear: y, endYear: y };
}

function parseAmount(str) {
  const cleaned = str.replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function parseCIBCChequing(fullText) {
  const transactions = [];
  const yearInfo = inferYear(fullText);
  const lines = fullText.split('\n');

  const pattern = /(\w{3}\.?\s+\d{1,2},?\s*\d{0,4})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})\s*/;

  for (const line of lines) {
    const match = line.match(pattern);
    if (!match) continue;

    let dateStr = match[1].trim();
    let date = null;

    const fullDateMatch = dateStr.match(/(\w{3})\.?\s+(\d{1,2}),?\s*(\d{4})/);
    if (fullDateMatch) {
      const monthIdx = MONTHS[fullDateMatch[1].toLowerCase().slice(0, 3)];
      if (monthIdx === undefined) continue;
      const day = parseInt(fullDateMatch[2]);
      const year = parseInt(fullDateMatch[3]);
      date = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else {
      const shortMatch = dateStr.match(/(\w{3})\.?\s+(\d{1,2})/);
      if (shortMatch) {
        const monthIdx = MONTHS[shortMatch[1].toLowerCase().slice(0, 3)];
        if (monthIdx === undefined) continue;
        const day = parseInt(shortMatch[2]);
        date = `${yearInfo.endYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    if (!date) continue;

    const description = match[2].trim();
    const amount = parseAmount(match[3]);
    if (amount === null) continue;

    if (description.match(/^(opening|closing)\s+balance/i)) continue;

    transactions.push({
      date,
      description,
      amount,
      type: amount < 0 ? 'debit' : 'credit',
      bank: 'CIBC',
      accountType: 'Chequing',
    });
  }

  return transactions;
}

export function parseCIBCCreditCard(fullText) {
  const transactions = [];
  const yearInfo = inferYear(fullText);
  const lines = fullText.split('\n');

  const pattern = /(\w{3}\.?\s+\d{1,2},?\s*\d{0,4})\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})\s/;

  for (const line of lines) {
    if (line.match(/points|pts|reward|bonus|balance.*points/i) &&
        !line.match(/\$[\d,]+\.\d{2}/)) {
      continue;
    }

    const match = line.match(pattern);
    if (!match) continue;

    let dateStr = match[1].trim();
    let date = null;

    const fullDateMatch = dateStr.match(/(\w{3})\.?\s+(\d{1,2}),?\s*(\d{4})/);
    if (fullDateMatch) {
      const monthIdx = MONTHS[fullDateMatch[1].toLowerCase().slice(0, 3)];
      if (monthIdx === undefined) continue;
      date = `${fullDateMatch[3]}-${String(monthIdx + 1).padStart(2, '0')}-${String(parseInt(fullDateMatch[2])).padStart(2, '0')}`;
    } else {
      const shortMatch = dateStr.match(/(\w{3})\.?\s+(\d{1,2})/);
      if (shortMatch) {
        const monthIdx = MONTHS[shortMatch[1].toLowerCase().slice(0, 3)];
        if (monthIdx === undefined) continue;
        date = `${yearInfo.endYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(parseInt(shortMatch[2])).padStart(2, '0')}`;
      }
    }

    if (!date) continue;

    let description = match[2].trim();
    description = description.replace(/\s+\d+(\.\d+)?\s*(pts|points)/gi, '').trim();

    const amounts = line.match(/-?\$?[\d,]+\.\d{2}/g);
    if (!amounts || amounts.length === 0) continue;

    const dollarAmounts = amounts.filter((a) => {
      const v = Math.abs(parseAmount(a));
      return v > 0.01;
    });

    if (dollarAmounts.length === 0) continue;

    const amount = parseAmount(dollarAmounts[0]);
    if (amount === null) continue;

    transactions.push({
      date,
      description: cleanMerchantName(description),
      amount,
      type: amount < 0 ? 'debit' : 'credit',
      bank: 'CIBC',
      accountType: 'Credit Card',
    });
  }

  return transactions;
}
