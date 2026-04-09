export {
  HUMAN_SAMPLES,
  AI_SAMPLES,
  type CorpusSample,
} from "./sample-corpus.js";
export {
  runCalibration,
  type CalibrationReport,
  type SignalStats,
  type SampleDetail,
} from "./calibrator.js";
export {
  optimizeWeights,
  type WeightMap,
} from "./weight-optimizer.js";
