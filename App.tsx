import React, { useState } from 'react';
import { KeywordInputForm } from './components/KeywordInputForm';
import { KeywordResults } from './components/KeywordResults';
import { DirectionSelector } from './components/DirectionSelector';
import { 
  generateThematicDirections, 
  generateContentStrategy, 
  generateArticleForGroup,
  expandContentStrategy,
  generateThumbnailForArticle,
} from './services/keywordService';
import { KeywordGroup, GeneratedArticle, ThematicDirection, AppStatus } from './types';
import { LoaderIcon } from './components/icons';

const drawTextOnImage = (imageUrl: string, title: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return reject(new Error('Could not get canvas context'));
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const aspectRatio = 16 / 9;
      canvas.width = 1280;
      canvas.height = canvas.width / aspectRatio;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height * 0.4);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0.7)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'white';
      const fontSize = 60;
      ctx.font = `bold ${fontSize}px 'Hiragino Sans', 'Meiryo', 'sans-serif'`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      const padding = 50;
      const maxWidth = canvas.width - (padding * 2);
      const lineHeight = fontSize * 1.4;

      const lines: string[] = [];
      let currentLine = '';

      for (const char of title) {
        const testLine = currentLine + char;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = char;
        } else {
          currentLine = testLine;
        }
      }
      lines.push(currentLine);

      let y = canvas.height - padding - (lines.length > 1 ? (lines.length -1) * lineHeight / 2 : 0 );
      
      if(lines.length > 1) {
          y -= (lines.length - 1) * lineHeight;
      }


      for(let i = 0; i < lines.length; i++){
          let lineY = y + (i * lineHeight);
          if (lines.length > 1) {
            lineY = canvas.height - padding - ((lines.length -1 - i) * lineHeight)
          }
          ctx.fillText(lines[i].trim(), padding, lineY);
      }
      
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = (err) => {
      reject(err);
    };
    img.src = imageUrl;
  });
};

function App() {
  const [blogConcept, setBlogConcept] = useState<string>('');
  const [thematicDirections, setThematicDirections] = useState<ThematicDirection[]>([]);
  const [selectedDirections, setSelectedDirections] = useState<ThematicDirection[]>([]);
  const [keywordGroups, setKeywordGroups] = useState<KeywordGroup[]>([]);
  const [generatedArticles, setGeneratedArticles] = useState<Record<number, GeneratedArticle | null>>({});
  const [generatingArticleId, setGeneratingArticleId] = useState<number | null>(null);
  const [generatingThumbnailId, setGeneratingThumbnailId] = useState<number | null>(null);
  
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [isExpanding, setIsExpanding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateDirections = async (concept: string) => {
    setStatus(AppStatus.LOADING_DIRECTIONS);
    setError(null);
    setBlogConcept(concept);
    setKeywordGroups([]);
    setGeneratedArticles({});
    try {
      const directions = await generateThematicDirections(concept);
      setThematicDirections(directions);
      setStatus(AppStatus.DIRECTIONS_PROPOSED);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate thematic directions: ${errorMessage}`);
      setStatus(AppStatus.ERROR);
      console.error(err);
    }
  };
  
  const handleGenerateStrategy = async (directions: ThematicDirection[]) => {
    setStatus(AppStatus.LOADING_STRATEGY);
    setError(null);
    setSelectedDirections(directions);
    try {
      const groups = await generateContentStrategy(blogConcept, directions);
      setKeywordGroups(groups);
      setStatus(AppStatus.STRATEGY_GENERATED);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate the content strategy: ${errorMessage}`);
      setStatus(AppStatus.ERROR);
      console.error(err);
    }
  };

  const handleExpandStrategy = async () => {
    setIsExpanding(true);
    setError(null);
    try {
      const newGroups = await expandContentStrategy(blogConcept, selectedDirections, keywordGroups);
      setKeywordGroups(prevGroups => [...prevGroups, ...newGroups]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to expand the strategy: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsExpanding(false);
    }
  };

  const handleGenerateArticle = async (group: KeywordGroup) => {
    setGeneratingArticleId(group.priority);
    setError(null);
    setGeneratedArticles(prev => ({ ...prev, [group.priority]: null })); 
    try {
      const generated = await generateArticleForGroup(blogConcept, group);
      setGeneratedArticles(prev => ({ ...prev, [group.priority]: generated }));
    } catch (err)
 {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate article for "${group.groupTitle}": ${errorMessage}`);
      console.error(err);
    } finally {
      setGeneratingArticleId(null);
    }
  };
  
  const handleGenerateThumbnail = async (group: KeywordGroup, article: GeneratedArticle) => {
    setGeneratingThumbnailId(group.priority);
    setError(null);
    try {
      const backgroundImageUrl = await generateThumbnailForArticle(article.title);
      const finalImageUrl = await drawTextOnImage(backgroundImageUrl, article.title);
      setGeneratedArticles(prev => ({
        ...prev,
        [group.priority]: { ...article, thumbnailUrl: finalImageUrl },
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate thumbnail for "${article.title}": ${errorMessage}`);
      console.error(err);
    } finally {
      setGeneratingThumbnailId(null);
    }
  };

  const renderContent = () => {
    switch (status) {
      case AppStatus.LOADING_DIRECTIONS:
        return (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <LoaderIcon className="w-12 h-12 animate-spin text-cyan-400 mb-4" />
            <p className="text-lg font-medium">
              Analyzing concept...
            </p>
            <p className="text-sm">This may take a moment.</p>
          </div>
        );
      case AppStatus.DIRECTIONS_PROPOSED:
      case AppStatus.LOADING_STRATEGY:
        return (
          <DirectionSelector
            directions={thematicDirections}
            onSubmit={handleGenerateStrategy}
            isLoading={status === AppStatus.LOADING_STRATEGY}
          />
        );
      case AppStatus.STRATEGY_GENERATED:
        return (
          <KeywordResults
            groups={keywordGroups}
            onGenerateArticle={handleGenerateArticle}
            generatingArticleId={generatingArticleId}
            generatedArticles={generatedArticles}
            onExpandStrategy={handleExpandStrategy}
            isExpanding={isExpanding}
            expandError={error}
            onGenerateThumbnail={handleGenerateThumbnail}
            generatingThumbnailId={generatingThumbnailId}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-900 text-white min-h-screen font-sans">
      <div className="container mx-auto p-4 md:p-8 max-w-4xl">
        <header className="text-center my-8">
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-500">
            SEO Content Strategy Generator
          </h1>
          <p className="text-slate-400 mt-2">
            Turn your blog concept into a complete, prioritized content plan with AI.
          </p>
        </header>

        <main>
          <KeywordInputForm
            onSubmit={handleGenerateDirections}
            isLoading={status === AppStatus.LOADING_DIRECTIONS}
          />
          
          {status === AppStatus.ERROR && error && (
            <div className="mt-4 bg-red-500/20 text-red-300 border border-red-500/30 p-4 rounded-md">
              <p>{error}</p>
            </div>
          )}

          <div className="mt-8">
            {renderContent()}
          </div>
        </main>
        
        <footer className="text-center mt-12 text-slate-500 text-sm">
          <p>Powered by Google Gemini</p>
        </footer>
      </div>
    </div>
  );
}

export default App;