import { cleanMerchantName } from '../utils/formatting';

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseAmount(str) {
  const cleaned = str.replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseAmexDate(str) {
  const match = str.match(/(\d{1,2})\s+(\w{3,9})\.?\s+(\d{4})/);
  if (!match) return null;
  const day = parseInt(match[1]);
  const monthStr = match[2].toLowerCase().slice(0, 3);
  const monthIdx = MONTHS[monthStr];
  if (monthIdx === undefined) return null;
  const year = parseInt(match[3]);
  if (day < 1 || day > 31) return null;
  return `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseAmex(fullText, pages) {
  if (pages && pages.length > 0) {
    const positional = parseAmexPositional(pages, fullText);
    if (positional.length > 0) return positional;
  }

  const lines = fullText.split('\n');

  const dates = [];
  const descriptions = [];
  const amounts = [];

  for (const line of lines) {
    const inlineTx = line.match(/(\d{1,2}\s+\w{3,9}\.?\s+\d{4})\s+(.+?)\s+\$([\d,]+\.\d{2})\s*$/);
    if (inlineTx) {
      const date = parseAmexDate(inlineTx[1]);
      const desc = inlineTx[2].trim();
      const amount = parseAmount(inlineTx[3]);
      if (date && amount !== null && !isNoise(desc)) {
        dates.push(date);
        descriptions.push(desc);
        amounts.push(amount);
      }
      continue;
    }
  }

  if (dates.length > 0) {
    return buildTransactions(dates, descriptions, amounts, fullText);
  }

  return parseAmexColumnar(lines, fullText);
}

function parseAmexPositional(pages, fullText) {
  const allTx = [];

  for (const page of pages) {
    const dateItems = [];
    const descItems = [];
    const amountItems = [];
    let dateHeaderX = -1;

    for (const line of page.lines) {
      for (const item of line) {
        const text = item.text.trim();
        if (text === 'Date') {
          dateHeaderX = item.x;
        }
      }
    }

    for (const line of page.lines) {
      for (const item of line) {
        const text = item.text.trim();
        if (!text) continue;

        if (text === 'Date' || text === 'Description' || text === 'Amount') continue;

        const dateMatch = text.match(/^(\d{1,2}\s+\w{3,9}\.?\s+\d{4})$/);
        if (dateMatch) {
          const parsed = parseAmexDate(dateMatch[1]);
          if (parsed) {
            dateItems.push({ x: item.x, date: parsed });
            continue;
          }
        }
      }
    }

    if (dateItems.length === 0) continue;

    const txXPositions = dateItems.map(d => d.x);
    const minTxX = Math.min(...txXPositions);

    for (const line of page.lines) {
      for (const item of line) {
        const text = item.text.trim();
        if (!text) continue;
        if (item.x < minTxX - 5) continue;

        if (/^\$[\d,]+\.\d{2}$/.test(text)) {
          const val = parseAmount(text);
          if (val !== null) {
            amountItems.push({ x: item.x, amount: val });
          }
        }
      }
    }

    for (const line of page.lines) {
      const lineText = line.map(i => i.text).join(' ');
      if (!/Description/i.test(lineText)) continue;

      for (const item of line) {
        const text = item.text.trim();
        if (!text || text === 'Description') continue;
        if (item.x < minTxX - 5) continue;
        if (/^(Foreign Spend|Commission|Exchange Rate)/i.test(text)) continue;
        descItems.push({ x: item.x, desc: text });
      }
    }

    for (const dateItem of dateItems) {
      const x = dateItem.x;
      const tolerance = 5;

      const desc = descItems.find(d => Math.abs(d.x - x) <= tolerance);
      const amt = amountItems.find(a => Math.abs(a.x - x) <= tolerance);

      if (desc && amt) {
        let description = cleanMerchantName(desc.desc);

        if (!isNoise(description)) {
          allTx.push({
            date: dateItem.date,
            description,
            amount: -amt.amount,
            type: 'debit',
            bank: 'American Express',
            accountType: detectAmexType(fullText),
          });
        }
      }
    }
  }

  return allTx;
}

function parseAmexColumnar(lines, fullText) {
  const allDates = [];
  const allDescs = [];
  const allAmounts = [];

  for (const line of lines) {
    const dateBlock = line.match(/\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{4})\b/gi);
    if (dateBlock && dateBlock.length >= 3) {
      for (const d of dateBlock) {
        const parsed = parseAmexDate(d);
        if (parsed) allDates.push(parsed);
      }
      continue;
    }

    const amtBlock = line.match(/\$[\d,]+\.\d{2}/g);
    if (amtBlock && amtBlock.length >= 3 && !/\d{1,2}\s+\w{3}/i.test(line)) {
      const filtered = amtBlock.filter(a => {
        const v = parseAmount(a);
        return v !== null && v > 0;
      });
      for (const a of filtered) allAmounts.push(parseAmount(a));
      continue;
    }
  }

  for (const line of lines) {
    if (/Description/i.test(line)) {
      const after = line.replace(/.*?Description\s*/i, '');
      const parts = after.split(/\s{2,}/).map(s => s.trim()).filter(s => s.length > 2 && !isNoise(s));
      for (const p of parts) allDescs.push(p);
    }
  }

  const skipAmounts = countSummaryAmounts(fullText);
  const txAmounts = allAmounts.slice(skipAmounts);

  const count = Math.min(allDates.length, allDescs.length, txAmounts.length);
  const dates = allDates.slice(0, count);
  const descs = allDescs.slice(0, count);
  const amts = txAmounts.slice(0, count);

  return buildTransactions(dates, descs, amts, fullText);
}

function countSummaryAmounts(fullText) {
  const match = fullText.match(/summary.*?Date/is);
  if (!match) return 0;
  const amts = match[0].match(/\$[\d,]+\.\d{2}/g);
  return amts ? amts.length : 0;
}

function buildTransactions(dates, descriptions, amounts, fullText) {
  const transactions = [];
  const accountType = detectAmexType(fullText);

  for (let i = 0; i < dates.length; i++) {
    const desc = cleanMerchantName(descriptions[i].replace(/\s{2,}/g, ' ').trim());
    if (isNoise(desc)) continue;

    transactions.push({
      date: dates[i],
      description: desc,
      amount: -amounts[i],
      type: 'debit',
      bank: 'American Express',
      accountType,
    });
  }

  return transactions;
}

function isNoise(desc) {
  if (!desc || desc.length < 2) return true;
  return /^(total|subtotal|balance|amount\s+due|previous|last\s+billed|summary|page|foreign\s+spend|commission|exchange\s+rate|this is not)/i.test(desc);
}

function detectAmexType(fullText) {
  const lower = fullText.toLowerCase();
  if (lower.includes('cobalt')) return 'Cobalt';
  if (lower.includes('simplycash')) return 'SimplyCash';
  if (lower.includes('platinum')) return 'Platinum';
  if (lower.includes('gold')) return 'Gold';
  return 'Credit Card';
}
