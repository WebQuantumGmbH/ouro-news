import {
  mysqlTable,
  varchar,
  text,
  longtext,
  json,
  float,
  int,
  boolean,
  timestamp,
  mysqlEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// ─── Sources ─────────────────────────────────────────────
export const sources = mysqlTable('sources', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: mysqlEnum('type', ['rss', 'api', 'scraper', 'social']).notNull(),
  url: text('url').notNull(),
  config: json('config').$type<Record<string, unknown>>(),
  language: varchar('language', { length: 5 }).notNull().default('en'),
  country: varchar('country', { length: 5 }).notNull().default('US'),
  updateIntervalMinutes: int('update_interval_minutes').notNull().default(60),
  isActive: boolean('is_active').notNull().default(true),
  lastFetchedAt: timestamp('last_fetched_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Articles ────────────────────────────────────────────
export const articles = mysqlTable(
  'articles',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    sourceId: varchar('source_id', { length: 36 }).notNull(),
    externalId: varchar('external_id', { length: 512 }).notNull(),
    title: varchar('title', { length: 1024 }).notNull(),
    content: longtext('content').notNull(),
    summary: text('summary'),
    url: text('url').notNull(),
    slug: varchar('slug', { length: 512 }).notNull(),
    imageUrl: text('image_url'),
    language: varchar('language', { length: 5 }).notNull().default('en'),
    publishedAt: timestamp('published_at'),
    fetchedAt: timestamp('fetched_at').notNull().defaultNow(),
    processedAt: timestamp('processed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('articles_source_external_idx').on(table.sourceId, table.externalId),
    index('articles_published_idx').on(table.publishedAt),
    index('articles_slug_idx').on(table.slug),
  ],
);

// ─── Article Analysis ────────────────────────────────────
export const articleAnalysis = mysqlTable(
  'article_analysis',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    articleId: varchar('article_id', { length: 36 }).notNull(),

    // Sentiment: -1 (sehr negativ) bis +1 (sehr positiv)
    sentimentScore: float('sentiment_score').notNull(),
    sentimentLabel: mysqlEnum('sentiment_label', [
      'very_negative', 'negative', 'neutral', 'positive', 'very_positive',
    ]).notNull(),

    // Politische Ausrichtung: -1 (links) bis +1 (rechts)
    politicalLeaning: float('political_leaning').notNull(),
    politicalLabel: mysqlEnum('political_label', [
      'far_left', 'left', 'center_left', 'center', 'center_right', 'right', 'far_right',
    ]).notNull(),

    // Wahrheitsgehalt: 0 (falsch) bis 1 (verifiziert)
    factualityScore: float('factuality_score').notNull(),
    factualityLabel: mysqlEnum('factuality_label', [
      'false', 'likely_false', 'uncertain', 'likely_true', 'verified',
    ]).notNull(),

    // Emotionaler Ton: {anger, fear, joy, sadness, surprise, disgust} jeweils 0..1
    emotionalTone: json('emotional_tone').$type<Record<string, number>>().notNull(),

    // Erkannte Entitäten: {persons: [], places: [], organizations: [], dates: []}
    keyEntities: json('key_entities').$type<{
      persons: string[];
      places: string[];
      organizations: string[];
    }>().notNull(),

    // Länder-Relevanz: {DE: 0.8, US: 0.5, ...}
    countryRelevance: json('country_relevance').$type<Record<string, number>>().notNull(),

    // Erkannte Themen als String-Array
    topics: json('topics').$type<string[]>().notNull(),

    modelVersion: varchar('model_version', { length: 64 }).notNull(),
    analyzedAt: timestamp('analyzed_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('analysis_article_idx').on(table.articleId),
    index('analysis_sentiment_idx').on(table.sentimentScore),
    index('analysis_political_idx').on(table.politicalLeaning),
  ],
);

// ─── Article Comparisons ─────────────────────────────────
export const articleComparisons = mysqlTable(
  'article_comparisons',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    topic: varchar('topic', { length: 512 }).notNull(),
    countries: json('countries').$type<string[]>().notNull(),
    comparisonText: longtext('comparison_text').notNull(),
    keyDifferences: json('key_differences').$type<{
      country: string;
      perspective: string;
      sentiment: string;
    }[]>().notNull(),
    articleIds: json('article_ids').$type<string[]>().notNull(),
    generatedAt: timestamp('generated_at').notNull().defaultNow(),
  },
  (table) => [
    index('comparisons_topic_idx').on(table.topic),
  ],
);

// ─── WDF/IDF Scores ──────────────────────────────────────
export const wdfIdfScores = mysqlTable(
  'wdf_idf_scores',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    articleId: varchar('article_id', { length: 36 }).notNull(),
    term: varchar('term', { length: 255 }).notNull(),
    wdfScore: float('wdf_score').notNull(),
    idfScore: float('idf_score').notNull(),
    wdfIdfScore: float('wdf_idf_score').notNull(),
  },
  (table) => [
    index('wdf_idf_term_score_idx').on(table.term, table.wdfIdfScore),
    index('wdf_idf_article_idx').on(table.articleId),
  ],
);

// ─── Topics ──────────────────────────────────────────────
export const topics = mysqlTable(
  'topics',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    description: text('description'),
    keywords: json('keywords').$type<string[]>().notNull(),
    articleCount: int('article_count').notNull().default(0),
    trendDirection: mysqlEnum('trend_direction', ['rising', 'stable', 'falling']).notNull().default('stable'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('topics_slug_idx').on(table.slug),
  ],
);

// ─── Article ↔ Topic (M:N) ──────────────────────────────
export const articleTopics = mysqlTable(
  'article_topics',
  {
    articleId: varchar('article_id', { length: 36 }).notNull(),
    topicId: varchar('topic_id', { length: 36 }).notNull(),
    relevanceScore: float('relevance_score').notNull().default(0),
  },
  (table) => [
    index('at_article_idx').on(table.articleId),
    index('at_topic_idx').on(table.topicId),
  ],
);

// ─── Users ───────────────────────────────────────────────
export const users = mysqlTable(
  'users',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    googleId: varchar('google_id', { length: 255 }),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    avatarUrl: text('avatar_url'),
    role: mysqlEnum('role', ['admin', 'editor', 'user']).notNull().default('user'),
    preferences: json('preferences').$type<{
      language?: string;
      topics?: string[];
      countries?: string[];
    }>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_email_idx').on(table.email),
    uniqueIndex('users_google_id_idx').on(table.googleId),
  ],
);

// ─── Sessions ────────────────────────────────────────────
export const sessions = mysqlTable(
  'sessions',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (table) => [
    index('sessions_user_idx').on(table.userId),
  ],
);

// ─── User Bookmarks ─────────────────────────────────────
export const userBookmarks = mysqlTable(
  'user_bookmarks',
  {
    userId: varchar('user_id', { length: 36 }).notNull(),
    articleId: varchar('article_id', { length: 36 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('bookmarks_user_article_idx').on(table.userId, table.articleId),
  ],
);

// ─── Relations ───────────────────────────────────────────
export const sourcesRelations = relations(sources, ({ many }) => ({
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  source: one(sources, { fields: [articles.sourceId], references: [sources.id] }),
  analysis: one(articleAnalysis, { fields: [articles.id], references: [articleAnalysis.articleId] }),
  topics: many(articleTopics),
}));

export const articleAnalysisRelations = relations(articleAnalysis, ({ one }) => ({
  article: one(articles, { fields: [articleAnalysis.articleId], references: [articles.id] }),
}));

export const topicsRelations = relations(topics, ({ many }) => ({
  articles: many(articleTopics),
}));

export const articleTopicsRelations = relations(articleTopics, ({ one }) => ({
  article: one(articles, { fields: [articleTopics.articleId], references: [articles.id] }),
  topic: one(topics, { fields: [articleTopics.topicId], references: [topics.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  bookmarks: many(userBookmarks),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const userBookmarksRelations = relations(userBookmarks, ({ one }) => ({
  user: one(users, { fields: [userBookmarks.userId], references: [users.id] }),
  article: one(articles, { fields: [userBookmarks.articleId], references: [articles.id] }),
}));
