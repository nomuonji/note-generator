import React, { useState } from 'react';
import { ThematicDirection } from '../types';
import { LightBulbIcon } from './icons';
import { ArrowPathIcon } from './icons';

interface DirectionSelectorProps {
  directions: ThematicDirection[];
  onSubmit: (selected: ThematicDirection[]) => void;
  isLoading: boolean;
}

export const DirectionSelector: React.FC<DirectionSelectorProps> = ({ directions, onSubmit, isLoading }) => {
  const [selectedTitles, setSelectedTitles] = useState<Set<string>>(new Set());

  const handleToggle = (title: string) => {
    const newSelection = new Set(selectedTitles);
    if (newSelection.has(title)) {
      newSelection.delete(title);
    } else {
      newSelection.add(title);
    }
    setSelectedTitles(newSelection);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const selectedDirections = directions.filter(d => selectedTitles.has(d.title));
    onSubmit(selectedDirections);
  };

  return (
    <div className="bg-slate-800/50 p-6 rounded-lg shadow-lg ring-1 ring-white/10">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-cyan-500/20">
          <LightBulbIcon className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Select Thematic Directions</h2>
          <p className="text-slate-400">Choose one or more content pillars to build your strategy around.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="my-6 flex flex-wrap gap-3">
          {directions.map((direction) => (
            <button
              type="button"
              key={direction.title}
              onClick={() => handleToggle(direction.title)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border ${
                selectedTitles.has(direction.title)
                  ? 'bg-cyan-500 border-cyan-400 text-white ring-2 ring-cyan-400/50'
                  : 'bg-slate-700 border-slate-600 hover:bg-slate-600 hover:border-slate-500 text-slate-200'
              }`}
            >
              {direction.title}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={isLoading || selectedTitles.size === 0}
            className="w-full inline-flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-200"
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                <span>Building Strategy...</span>
              </>
            ) : (
              `Generate Content Strategy (${selectedTitles.size})`
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
