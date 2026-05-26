export interface SourceConfig {
  id: string;
  name: string;
  url: string;
  weight: number;
  category: 'automotive' | 'product';
}

export interface SourcesFile {
  sources: SourceConfig[];
  scoring: {
    boost_keywords: string[];
    penalty_keywords: string[];
    low_priority_keywords: string[];
  };
}

export interface RawArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  publishedAt: Date;
  sourceId: string;
  sourceName: string;
  category: 'automotive' | 'product';
  image?: string;
}

export interface ScoredArticle extends RawArticle {
  score: number;
}

export interface DigestArticle {
  title: string;
  summary: string;
  source: string;
  sourceId: string;
  url: string;
  image?: string;
  reason?: string;
}

export interface FeedbackEntry {
  date: string;
  url: string;
  sourceId: string;
  verdict: 'good' | 'bad';
}
