import { useState, useRef, useMemo } from 'react';
import { useTransactionStore } from './store/transactions';
import FileUploader from './components/FileUploader';
import Dashboard from './components/Dashboard';

export default function App() {
  const { transactions, clearAll, exportCSV, isProcessing, processFiles } = useTransactionStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const addFileRef = useRef(null);

  const hasData = transactions.length > 0;

  const handleAddFiles = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) processFiles(files);
    e.target.value = '';
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setActiveTab('transactions');
  };

  const filteredByDate = useMemo(() => {
    let result = transactions;
    if (dateFrom) result = result.filter((t) => t.date >= dateFrom);
    if (dateTo) result = result.filter((t) => t.date <= dateTo);
    return result;
  }, [transactions, dateFrom, dateTo]);

  const inputClass = 'bg-navy-700 border border-navy-500 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-accent';

  return (
    <div className="min-h-screen bg-navy-900 font-mono">
      <input
        ref={addFileRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={handleAddFiles}
      />
      <header className="border-b border-navy-700 bg-navy-800/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💳</span>
            <h1 className="text-lg font-bold text-accent tracking-tight">
              Spending Dashboard
            </h1>
          </div>

          {hasData && (
            <div className="flex items-center gap-2">
              <div className="flex bg-navy-700 rounded-lg p-0.5 mr-4">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-4 py-1.5 text-sm rounded-md transition-all ${
                    activeTab === 'overview'
                      ? 'bg-accent text-navy-900 font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className={`px-4 py-1.5 text-sm rounded-md transition-all ${
                    activeTab === 'transactions'
                      ? 'bg-accent text-navy-900 font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Transactions
                </button>
              </div>

              <button
                onClick={() => addFileRef.current?.click()}
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs bg-navy-700 text-slate-300 rounded-lg hover:bg-navy-600 transition-colors disabled:opacity-50"
              >
                + Add PDFs
              </button>
              <button
                onClick={exportCSV}
                className="px-3 py-1.5 text-xs bg-navy-700 text-slate-300 rounded-lg hover:bg-navy-600 transition-colors"
              >
                Export CSV
              </button>
              <button
                onClick={clearAll}
                className="px-3 py-1.5 text-xs bg-red-900/30 text-red-400 rounded-lg hover:bg-red-900/50 transition-colors"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {hasData && (
          <div className="max-w-7xl mx-auto px-6 pb-3 flex items-center gap-3">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Period</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={inputClass}
              placeholder="From"
            />
            <span className="text-slate-500 text-xs">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={inputClass}
              placeholder="To"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-xs text-slate-400 hover:text-accent transition-colors"
              >
                Clear
              </button>
            )}
            <span className="text-xs text-slate-500 ml-2">
              {filteredByDate.length} transaction{filteredByDate.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!hasData && !isProcessing ? (
          <div className="max-w-2xl mx-auto mt-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-200 mb-3">
                Track Your Spending
              </h2>
              <p className="text-slate-400">
                Upload your RBC, CIBC, or American Express bank statements to get started.
                Transactions are parsed locally and categorized with AI.
              </p>
            </div>
            <FileUploader />
            <div className="mt-8 grid grid-cols-3 gap-4 text-center">
              <div className="bg-navy-800 rounded-lg p-4">
                <div className="text-rbc font-bold text-sm">RBC</div>
                <div className="text-xs text-slate-500 mt-1">Chequing & Visa</div>
              </div>
              <div className="bg-navy-800 rounded-lg p-4">
                <div className="text-cibc font-bold text-sm">CIBC</div>
                <div className="text-xs text-slate-500 mt-1">Chequing & Credit</div>
              </div>
              <div className="bg-navy-800 rounded-lg p-4">
                <div className="text-amex font-bold text-sm">AMEX</div>
                <div className="text-xs text-slate-500 mt-1">Charge & Credit</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {isProcessing && <FileUploader />}
            <Dashboard
              activeTab={activeTab}
              transactions={filteredByDate}
              onCategoryClick={handleCategoryClick}
              selectedCategory={selectedCategory}
              onClearCategory={() => setSelectedCategory('')}
            />
          </div>
        )}
      </main>
    </div>
  );
}
