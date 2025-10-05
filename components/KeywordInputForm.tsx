import React, { useState } from 'react';
import { ArrowPathIcon } from './icons';

interface KeywordInputFormProps {
  onSubmit: (concept: string) => void;
  isLoading: boolean;
}

export const KeywordInputForm: React.FC<KeywordInputFormProps> = ({ onSubmit, isLoading }) => {
  const [concept, setConcept] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (concept.trim()) {
      onSubmit(concept.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800/50 p-6 rounded-lg shadow-lg ring-1 ring-white/10">
      <div className="space-y-4">
        <div>
          <label htmlFor="concept" className="block text-sm font-medium text-slate-300 mb-2">
            Enter your blog concept
          </label>
          <textarea
            id="concept"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 h-24 resize-y"
            placeholder="e.g., 'A blog for beginners interested in sustainable living, offering practical tips with a friendly, encouraging tone.'"
            disabled={isLoading}
          />
        </div>
      </div>
      <div className="mt-6">
        <button
          type="submit"
          disabled={isLoading || !concept.trim()}
          className="w-full inline-flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-200"
        >
          {isLoading ? (
            <>
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            'Generate Thematic Directions'
          )}
        </button>
      </div>
    </form>
  );
};
