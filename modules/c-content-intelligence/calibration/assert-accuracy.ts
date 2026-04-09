import { readdirSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";

interface CalibrationReportJSON {
  accuracy: number;
  falsePositives: number;
  totalSamples: number;
  correctHuman: number;
  correctAI: number;
  humanAccuracy: number;
  aiAccuracy: number;
  generatedAt: string;
}

const ACCURACY_THRESHOLD = 0.85;
const FALSE_POSITIVE_RATE_THRESHOLD = 0.20;

function findLatestReport(): { path: string; data: CalibrationReportJSON } {
  const reportsDir = resolve("calibration", "reports");
  const files = readdirSync(reportsDir)
    .filter((f) => f.startsWith("calibration-") && f.endsWith(".json"))
    .sort()
    .reverse();

  if (files.length === 0) {
    console.error("ERROR: No calibration reports found in calibration/reports/");
    console.error("Run `npm run calibrate` first to generate a report.");
    process.exit(1);
  }

  const latestFile = files[0];
  const fullPath = join(reportsDir, latestFile);
  const raw = readFileSync(fullPath, "utf-8");
  const data = JSON.parse(raw) as CalibrationReportJSON;

  return { path: fullPath, data };
}

function main() {
  const { path, data } = findLatestReport();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Calibration Accuracy Gate");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Report:            ${path}`);
  console.log(`  Generated:         ${data.generatedAt ?? "unknown"}`);
  console.log(`  Total samples:     ${data.totalSamples}`);
  console.log(`  Accuracy:          ${(data.accuracy * 100).toFixed(1)}%`);
  console.log(`  Human accuracy:    ${(data.humanAccuracy * 100).toFixed(1)}%`);
  console.log(`  AI accuracy:       ${(data.aiAccuracy * 100).toFixed(1)}%`);
  console.log(`  False positives:   ${data.falsePositives}`);

  // The corpus has 15 human samples, so FP rate = falsePositives / 15
  const humanSamples = data.totalSamples / 2;
  const falsePositiveRate = data.falsePositives / humanSamples;
  console.log(`  FP rate:           ${(falsePositiveRate * 100).toFixed(1)}%`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const failures: string[] = [];

  if (data.accuracy < ACCURACY_THRESHOLD) {
    failures.push(
      `Accuracy ${(data.accuracy * 100).toFixed(1)}% is below threshold ${(ACCURACY_THRESHOLD * 100).toFixed(0)}%`
    );
  }

  if (falsePositiveRate > FALSE_POSITIVE_RATE_THRESHOLD) {
    failures.push(
      `False positive rate ${(falsePositiveRate * 100).toFixed(1)}% exceeds threshold ${(FALSE_POSITIVE_RATE_THRESHOLD * 100).toFixed(0)}%`
    );
  }

  if (failures.length > 0) {
    console.log("");
    console.log("  FAIL:");
    for (const f of failures) {
      console.log(`    - ${f}`);
    }
    console.log("");
    console.log("  The AI detector's accuracy has regressed.");
    console.log("  Review the calibration report and adjust signal weights.");
    process.exit(1);
  }

  console.log("");
  console.log(`  PASS: accuracy=${(data.accuracy * 100).toFixed(1)}% (>=${(ACCURACY_THRESHOLD * 100).toFixed(0)}%), FP rate=${(falsePositiveRate * 100).toFixed(1)}% (<=${(FALSE_POSITIVE_RATE_THRESHOLD * 100).toFixed(0)}%)`);
  process.exit(0);
}

main();
