

import React, { useState } from 'react';
// FIX: The error "File '.../types.ts' is not a module" is resolved by providing a valid module implementation in types.ts. The import path is correct.
// FIX: Replaced 'KeywordData' with the correctly exported 'Keyword' type from types.ts.
import { Keyword, CompetitionLevel } from '../types';
// FIX: The error "File '.../icons.tsx' is not a module" is resolved by providing a valid module implementation in icons.tsx. The import path is correct.
import { CopyIcon, CheckIcon } from './icons';

const competitionColorMap: Record<CompetitionLevel, string> = {
  [CompetitionLevel.LOW]: 'bg-green-500/20 text-green-300 border-green-500/30',
  [CompetitionLevel.MEDIUM]: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  [CompetitionLevel.HIGH]: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const KeywordTableRow: React.FC<{ row: Keyword }> = ({ row }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(row.keyword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <tr className="border-b border-slate-700 hover:bg-slate-800/50 transition-colors duration-200">
      <td className="p-4 font-medium text-slate-200">
        <div className="flex items-center gap-2">
          <span>{row.keyword}</span>
          <button
            onClick={handleCopy}
            className="text-slate-400 hover:text-cyan-400 transition-colors"
            title="Copy keyword"
          >
            {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
          </button>
        </div>
      </td>
      <td className="p-4 text-slate-300 text-right">
        {row.monthlySearches.toLocaleString()}
      </td>
      <td className="p-4 text-right">
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full border ${competitionColorMap[row.competition]}`}
        >
          {row.competition}
        </span>
      </td>
    </tr>
  );
};

interface KeywordTableProps {
  keywords: Keyword[];
}

export const KeywordTable: React.FC<KeywordTableProps> = ({ keywords }) => {
  return (
    <div className="overflow-x-auto bg-slate-800/50 rounded-lg shadow-lg ring-1 ring-white/10">
      <table className="w-full text-left">
        <thead className="bg-slate-900/70">
          <tr>
            <th className="p-4 font-semibold text-slate-300">Keyword</th>
            <th className="p-4 font-semibold text-slate-300 text-right">Monthly Searches</th>
            <th className="p-4 font-semibold text-slate-300 text-right">Competition</th>
          </tr>
        </thead>
        <tbody>
          {keywords.map((row, index) => (
            <KeywordTableRow key={index} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
};
