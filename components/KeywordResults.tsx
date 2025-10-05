import React, { useState } from 'react';
import { KeywordGroup, GeneratedArticle } from '../types';
import { KeywordTable } from './KeywordTable';
import { ArticleDisplay } from './ArticleDisplay';
import { SparklesIcon, ArrowPathIcon, LoaderIcon, PhotoIcon, ArrowDownTrayIcon } from './icons';

interface KeywordResultsProps {
  groups: KeywordGroup[];
  onGenerateArticle: (group: KeywordGroup) => void;
  generatingArticleId: number | null;
  generatedArticles: Record<number, GeneratedArticle | null>;
  onExpandStrategy: () => void;
  isExpanding: boolean;
  expandError: string | null;
  onGenerateThumbnail: (group: KeywordGroup, article: GeneratedArticle) => void;
  generatingThumbnailId: number | null;
}

const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);

const KeywordGroupCard: React.FC<{
  group: KeywordGroup;
  onGenerateArticle: (group: KeywordGroup) => void;
  isGeneratingArticle: boolean;
  article: GeneratedArticle | null;
  onGenerateThumbnail: (group: KeywordGroup, article: GeneratedArticle) => void;
  isGeneratingThumbnail: boolean;
}> = ({ group, onGenerateArticle, isGeneratingArticle, article, onGenerateThumbnail, isGeneratingThumbnail }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleDownload = (imageUrl: string, title: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    const filename = `${title.replace(/[^a-z0-9\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/gi, '_').slice(0, 50)}.jpeg`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="bg-slate-800/50 rounded-lg ring-1 ring-white/10 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left"
      >
        <div className="flex items-center gap-4">
          <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-cyan-900 text-cyan-300 font-bold text-sm">
            {group.priority}
          </span>
          <div>
            <h3 className="font-bold text-lg text-white">{group.groupTitle}</h3>
            <p className="text-sm text-slate-400">{group.description}</p>
          </div>
        </div>
        <ChevronDownIcon className={`w-6 h-6 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="p-4 border-t border-slate-700/50">
          <div className="space-y-4">
            <KeywordTable keywords={group.keywords} />

            {isGeneratingThumbnail && (
              <div className="aspect-video bg-slate-900/50 rounded-md flex items-center justify-center">
                <div className="flex flex-col items-center text-slate-400">
                  <LoaderIcon className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
                  <p className="text-md font-medium">Generating thumbnail...</p>
                </div>
              </div>
            )}
            
            {article?.thumbnailUrl && !isGeneratingThumbnail && (
                <div className="my-4 aspect-video rounded-md overflow-hidden bg-slate-900">
                    <img src={article.thumbnailUrl} alt={`${article.title} thumbnail`} className="w-full h-full object-cover" />
                </div>
            )}

            <div className="flex justify-end gap-2 flex-wrap">
               {article && article.thumbnailUrl && !isGeneratingThumbnail && (
                <button
                  onClick={() => handleDownload(article!.thumbnailUrl!, article!.title)}
                  className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition duration-200"
                >
                  <ArrowDownTrayIcon className="w-5 h-5" />
                  <span>Download Thumbnail</span>
                </button>
               )}
               {article && (
                 <button
                   onClick={() => onGenerateThumbnail(group, article)}
                   disabled={isGeneratingThumbnail || isGeneratingArticle}
                   className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-200"
                 >
                   {article.thumbnailUrl ? <ArrowPathIcon className="w-5 h-5" /> : <PhotoIcon className="w-5 h-5" />}
                   <span>{article.thumbnailUrl ? 'サムネイル画像を再生成' : 'サムネイル画像を生成'}</span>
                 </button>
               )}
              <button
                onClick={() => onGenerateArticle(group)}
                disabled={isGeneratingArticle || isGeneratingThumbnail}
                className="inline-flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-200"
              >
                <SparklesIcon className="w-5 h-5" />
                <span>{article ? 'Regenerate Article' : 'Generate Article'}</span>
              </button>
            </div>
             {isGeneratingArticle && (
                <div className="flex flex-col items-center justify-center rounded-md bg-slate-900/50 p-6 text-slate-400">
                  <LoaderIcon className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
                  <p className="text-md font-medium">Writing your article...</p>
                </div>
              )}
              {article && !isGeneratingArticle && (
                <ArticleDisplay article={article} />
              )}
          </div>
        </div>
      )}
    </div>
  );
};


export const KeywordResults: React.FC<KeywordResultsProps> = ({
  groups,
  onGenerateArticle,
  generatingArticleId,
  generatedArticles,
  onExpandStrategy,
  isExpanding,
  expandError,
  onGenerateThumbnail,
  generatingThumbnailId,
}) => {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
       <h2 className="text-2xl font-bold text-white">Content Strategy</h2>
      <div className="space-y-4">
        {groups.sort((a,b) => a.priority - b.priority).map((group) => (
          <KeywordGroupCard
            key={group.priority}
            group={group}
            onGenerateArticle={onGenerateArticle}
            isGeneratingArticle={generatingArticleId === group.priority}
            article={generatedArticles[group.priority] ?? null}
            onGenerateThumbnail={onGenerateThumbnail}
            isGeneratingThumbnail={generatingThumbnailId === group.priority}
          />
        ))}
      </div>
      <div className="flex flex-col items-center">
         {expandError && <p className="text-red-400 mb-2">{expandError}</p>}
        <button
          onClick={onExpandStrategy}
          disabled={isExpanding}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-md transition duration-200"
        >
          {isExpanding ? (
            <>
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              <span>Expanding Strategy...</span>
            </>
          ) : (
            'Expand Strategy'
          )}
        </button>
      </div>
    </div>
  );
};