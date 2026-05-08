import { useState, useCallback } from 'react';
import { useTransactionStore } from '../store/transactions';

export default function FileUploader() {
  const { processFiles, isProcessing, processingStatus, progress, errors } = useTransactionStore();
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === 'application/pdf'
    );
    if (files.length > 0) processFiles(files);
  }, [processFiles]);

  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) processFiles(files);
  }, [processFiles]);

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer
          ${isDragging
            ? 'border-accent bg-accent/10 scale-[1.02]'
            : 'border-navy-500 hover:border-navy-400 bg-navy-800/50'
          }`}
        onClick={() => document.getElementById('file-input').click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <div className="text-4xl mb-4">📄</div>
        <p className="text-lg font-medium text-slate-200">
          Drop bank statement PDFs here
        </p>
        <p className="text-sm text-slate-400 mt-2">
          RBC, CIBC, American Express — or click to browse
        </p>
      </div>

      {isProcessing && (
        <div className="bg-navy-800 rounded-lg p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-300">{processingStatus}</span>
            <span className="text-accent">{progress}%</span>
          </div>
          <div className="w-full bg-navy-700 rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((err, i) => (
            <div key={i} className="bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg px-4 py-2 text-sm">
              {err}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
