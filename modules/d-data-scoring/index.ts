export {
  recordPerformanceEvent,
  type PerformanceEvent,
  type PerformanceEventType,
  type PerformanceEventMetadata,
} from "./performance-tracker.js";

export {
  scoreContent,
  type ContentScore,
  type ContentScoreComponents,
  type Grade,
} from "./content-scorer.js";

export {
  getLearningInsights,
  type LearningInsights,
  type KeywordPerformance,
  type ArticlePerformance,
  type ContentGap,
  type TrendPoint,
  type Recommendation,
} from "./learning-center.js";

export {
  generateWeeklyDigest,
  type DigestReport,
  type DigestArticle,
} from "./digest-generator.js";
