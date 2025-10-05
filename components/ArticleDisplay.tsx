import React, { useState } from 'react';
import type { GeneratedArticle } from '../types';
import { CopyIcon, CheckIcon } from './icons';

interface ArticleDisplayProps {
  article: GeneratedArticle;
}

// A simple markdown to React element parser
const renderMarkdown = (markdown: string): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  if (!markdown) return elements;

  const lines = markdown.split('\n');
  let listItems: string[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeLang = '';

  const flushList = (key: string | number) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="list-disc pl-6 space-y-2 my-4">
          {listItems.map((item, index) => <li key={index} dangerouslySetInnerHTML={{ __html: item }}></li>)}
        </ul>
      );
      listItems = [];
    }
  };
  
  const processLine = (line: string) => {
    line = line
      .replace(/`([^`]+)`/g, '<code class="bg-slate-700 text-red-300 rounded px-1 py-0.5 text-sm">$1</code>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');
    return line;
  }

  lines.forEach((line, index) => {
    const trimmedLine = line.trimEnd();

    if (trimmedLine.startsWith('```')) {
        flushList(index);
        if (inCodeBlock) {
            elements.push(<pre key={`code-${index}`} className="bg-slate-900 p-4 rounded-md overflow-x-auto"><code className={`language-${codeLang}`}>{codeBlockContent.join('\n')}</code></pre>);
            inCodeBlock = false;
            codeBlockContent = [];
            codeLang = '';
        } else {
            inCodeBlock = true;
            codeLang = trimmedLine.substring(3).trim();
        }
        return;
    }

    if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
    }
    
    if (trimmedLine.startsWith('* ')) {
      listItems.push(processLine(trimmedLine.substring(2)));
    } else {
      flushList(index);
      if (trimmedLine.startsWith('### ')) {
        elements.push(<h3 key={index}>{trimmedLine.substring(4)}</h3>);
      } else if (trimmedLine.startsWith('## ')) {
        elements.push(<h2 key={index}>{trimmedLine.substring(3)}</h2>);
      } else if (trimmedLine.startsWith('# ')) {
        elements.push(<h1 key={index}>{trimmedLine.substring(2)}</h1>);
      } else if (trimmedLine) {
        elements.push(<p key={index} dangerouslySetInnerHTML={{ __html: processLine(trimmedLine) }}></p>);
      }
    }
  });

  flushList('end');
  return elements;
};

export const ArticleDisplay: React.FC<ArticleDisplayProps> = ({ article }) => {
  const [titleCopied, setTitleCopied] = useState(false);
  const [contentCopied, setContentCopied] = useState(false);

  const handleCopyTitle = () => {
    navigator.clipboard.writeText(article.title);
    setTitleCopied(true);
    setTimeout(() => setTitleCopied(false), 2500);
  };
  
  const handleCopyContent = () => {
    navigator.clipboard.writeText(article.content);
    setContentCopied(true);
    setTimeout(() => setContentCopied(false), 2500);
  };

  return (
    <div className="mt-4 border-t border-slate-700/50 pt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">Generated Article</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyTitle}
            className="inline-flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-3 rounded-md transition duration-200 text-xs"
          >
            {titleCopied ? (
              <>
                <CheckIcon className="w-4 h-4" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <CopyIcon className="w-4 h-4" />
                <span>Copy Title</span>
              </>
            )}
          </button>
          <button
            onClick={handleCopyContent}
            className="inline-flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-3 rounded-md transition duration-200 text-xs"
          >
            {contentCopied ? (
              <>
                <CheckIcon className="w-4 h-4" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <CopyIcon className="w-4 h-4" />
                <span>Copy Content</span>
              </>
            )}
          </button>
        </div>
      </div>
      <article className="prose prose-invert prose-p:text-slate-300 prose-headings:text-white prose-a:text-cyan-400 prose-strong:text-white prose-li:text-slate-300 max-w-none bg-slate-900/50 p-4 rounded-md">
        <h1>{article.title}</h1>
        {renderMarkdown(article.content)}
      </article>
    </div>
  );
};