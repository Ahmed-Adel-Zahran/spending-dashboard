import { create } from 'zustand';
import { extractTextFromPdf } from '../parsers/pdfExtractor';
import { detectBank } from '../parsers/bankDetector';
import { parseRBCChequing, parseRBCVisa, parseRBCCreditCard } from '../parsers/rbc';
import { parseCIBCChequing, parseCIBCCreditCard } from '../parsers/cibc';
import { parseAmex } from '../parsers/amex';
import { categorizeTransactions, setMerchantCategory } from '../services/categorizer';
import { generateTransactionId } from '../utils/formatting';

const STORAGE_KEY = 'spending_dashboard_transactions';

function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const txs = JSON.parse(data);
    let needsSave = false;
    const seen = new Set();
    for (let i = 0; i < txs.length; i++) {
      if (!txs[i].id || seen.has(txs[i].id)) {
        txs[i].id = `${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}`;
        needsSave = true;
      }
      seen.add(txs[i].id);
    }
    if (needsSave) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(txs));
    }
    return txs;
  } catch {
    return [];
  }
}

function saveToStorage(transactions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function deduplicateTransactions(existing, incoming) {
  const existingKeys = new Set(
    existing.map((t) => `${t.date}|${t.amount}|${t.description}`)
  );

  const newTx = incoming.filter(
    (t) => !existingKeys.has(`${t.date}|${t.amount}|${t.description}`)
  );

  return [...existing, ...newTx];
}

export const useTransactionStore = create((set, get) => ({
  transactions: loadFromStorage(),
  isProcessing: false,
  processingStatus: '',
  progress: 0,
  errors: [],

  processFiles: async (files) => {
    set({ isProcessing: true, processingStatus: 'Reading PDFs...', progress: 0, errors: [] });
    const errors = [];
    let allParsed = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      set({
        processingStatus: `Parsing ${file.name} (${i + 1}/${files.length})...`,
        progress: Math.round(((i) / files.length) * 40),
      });

      try {
        const extraction = await extractTextFromPdf(file);
        const { fullText, pages } = extraction;
        const { bank, accountType } = detectBank(fullText);

        let parsed = [];
        if (bank === 'RBC' && (accountType === 'Visa' || accountType === 'Mastercard')) {
          parsed = parseRBCCreditCard(fullText);
        } else if (bank === 'RBC') {
          parsed = parseRBCChequing(fullText, pages);
        } else if (bank === 'CIBC' && accountType === 'Credit Card') {
          parsed = parseCIBCCreditCard(fullText);
        } else if (bank === 'CIBC') {
          parsed = parseCIBCChequing(fullText);
        } else if (bank === 'American Express') {
          parsed = parseAmex(fullText, pages);
        } else {
          errors.push(`Could not detect bank for ${file.name}`);
          continue;
        }

        if (parsed.length === 0) {
          errors.push(`No transactions found in ${file.name} (detected: ${bank} ${accountType})`);
        }

        allParsed = allParsed.concat(parsed);
      } catch (err) {
        errors.push(`Error parsing ${file.name}: ${err.message}`);
      }
    }

    if (allParsed.length === 0) {
      set({
        isProcessing: false,
        processingStatus: '',
        progress: 0,
        errors: errors.length > 0 ? errors : ['No transactions found in any file.'],
      });
      return;
    }

    set({ processingStatus: 'Categorizing transactions...', progress: 50 });

    const categorized = await categorizeTransactions(allParsed, (p) => {
      set({ progress: 50 + Math.round(p * 0.45) });
    });

    const withIds = categorized.map((tx) => ({
      ...tx,
      id: generateTransactionId(tx),
    }));

    const existing = get().transactions;
    const merged = deduplicateTransactions(existing, withIds);

    merged.sort((a, b) => b.date.localeCompare(a.date));

    saveToStorage(merged);
    set({
      transactions: merged,
      isProcessing: false,
      processingStatus: '',
      progress: 100,
      errors,
    });
  },

  updateCategory: (transactionId, newCategory, applyToAll) => {
    const { transactions } = get();
    const tx = transactions.find((t) => t.id === transactionId);
    if (!tx) return;

    if (applyToAll) {
      setMerchantCategory(tx.description, newCategory);
    }

    const updated = transactions.map((t) => {
      if (applyToAll && t.description === tx.description) {
        return { ...t, category: newCategory };
      }
      if (t.id === transactionId) {
        return { ...t, category: newCategory };
      }
      return t;
    });

    saveToStorage(updated);
    set({ transactions: updated });
  },

  clearAll: () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('spending_dashboard_category_cache');
    set({ transactions: [], errors: [] });
  },

  exportCSV: () => {
    const { transactions } = get();
    const header = 'Date,Description,Amount,Category,Bank,Account Type,Type\n';
    const rows = transactions.map((t) =>
      `${t.date},"${t.description.replace(/"/g, '""')}",${t.amount},${t.category || ''},${t.bank},${t.accountType},${t.type}`
    ).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
}));
