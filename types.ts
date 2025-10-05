export enum CompetitionLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING_DIRECTIONS = 'LOADING_DIRECTIONS',
  DIRECTIONS_PROPOSED = 'DIRECTIONS_PROPOSED',
  LOADING_STRATEGY = 'LOADING_STRATEGY',
  STRATEGY_GENERATED = 'STRATEGY_GENERATED',
  ERROR = 'ERROR',
}

export interface Keyword {
  keyword: string;
  monthlySearches: number;
  competition: CompetitionLevel;
}

export interface KeywordGroup {
  priority: number;
  groupTitle: string;
  description: string;
  keywords: Keyword[];
}

export interface GeneratedArticle {
  title: string;
  content: string;
  thumbnailUrl?: string;
}

export interface ThematicDirection {
  title: string;
}