export interface SocialArticle {
  title: string;
  summary: string;
  source: string;
  sourceId: string;
  url: string;
  image?: string;
}

/** One locale's digest, as read back from src/content/digest/{ja,en}/YYYY-MM-DD.md */
export interface SocialDigest {
  date: string;
  title: string;
  lead: string;
  articles: SocialArticle[];
}

export type PickReason = 'feedback' | 'rotation' | 'fallback';

export interface SocialPick {
  index: number;
  reason: PickReason;
}

/** The three texts that make up one X thread, plus the metadata Slack renders. */
export interface SocialDraft {
  digestDate: string;
  articleIndex: number;
  articleUrl: string;
  digestUrl: string;
  source: string;
  pickReason: PickReason;
  image?: string;
  /** The model-written part, checked separately from the fixed frame. */
  jaBody: string;
  enBody: string;
  jaText: string;
  enText: string;
  replyText: string;
}

export interface GateIssue {
  /** error = 投稿前に直す / warn = 目視で確認する */
  level: 'error' | 'warn';
  code: string;
  message: string;
}

export interface SocialLogEntry {
  draftedAt: string;
  digestDate: string;
  articleIndex: number;
  articleUrl: string;
  pickReason: PickReason;
  jaBody: string;
  enBody: string;
  jaText: string;
  enText: string;
  issues: GateIssue[];
}
