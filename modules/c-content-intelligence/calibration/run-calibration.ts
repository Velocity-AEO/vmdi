import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { runCalibration } from "./calibrator.js";
import { optimizeWeights } from "./weight-optimizer.js";

function pad(label: string, width: number = 32): string {
  return label.padEnd(width);
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

async function main(): Promise<void> {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  VMDI AI Detection Calibration Report");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");

  console.log("Running detection against 30 calibration samples...\n");
  const report = await runCalibration();

  // ── Summary ──
  console.log("── ACCURACY ──────────────────────────────────────────");
  console.log(`${pad("Total samples:")}${report.totalSamples}`);
  console.log(`${pad("Overall accuracy:")}${pct(report.accuracy)} (${report.correctHuman + report.correctAI}/${report.totalSamples})`);
  console.log(`${pad("Human accuracy:")}${pct(report.humanAccuracy)} (${report.correctHuman}/15)`);
  console.log(`${pad("AI accuracy:")}${pct(report.aiAccuracy)} (${report.correctAI}/15)`);
  console.log(`${pad("False positives:")}${report.falsePositives} (human flagged as AI)`);
  console.log(`${pad("False negatives:")}${report.falseNegatives} (AI passed as human)`);
  console.log(`${pad("Current threshold:")}${report.threshold}`);
  console.log(`${pad("Suggested threshold:")}${report.suggestedThreshold}`);
  console.log("");

  // ── Top 5 most effective signals ──
  console.log("── TOP 5 MOST EFFECTIVE SIGNALS ──────────────────────");
  const top5 = report.signalEffectiveness.slice(0, 5);
  for (const s of top5) {
    console.log(
      `  ${pad(s.signalType, 30)} effectiveness: ${pct(s.effectiveness)}  triggered: ${s.triggeredCount}  false positives: ${s.falsePositiveCount}`
    );
  }
  console.log("");

  // ── All signals ──
  console.log("── ALL SIGNAL STATS ──────────────────────────────────");
  for (const s of report.signalEffectiveness) {
    console.log(
      `  ${pad(s.signalType, 30)} eff: ${pct(s.effectiveness).padStart(6)}  triggers: ${String(s.triggeredCount).padStart(3)}  FP: ${String(s.falsePositiveCount).padStart(2)}`
    );
  }
  console.log("");

  // ── Misclassified samples ──
  const misclassified = report.details.filter((d) => !d.correct);
  if (misclassified.length > 0) {
    console.log("── MISCLASSIFIED SAMPLES ─────────────────────────────");
    for (const d of misclassified) {
      console.log(
        `  ${pad(d.id, 14)} expected: ${pad(d.expectedVerdict, 8)} got: ${pad(d.actualVerdict, 14)} score: ${d.score}  signals: [${d.signals.join(", ")}]`
      );
    }
    console.log("");
  }

  // ── Top 3 recommendations ──
  console.log("── RECOMMENDATIONS ───────────────────────────────────");
  const topRecs = report.recommendations.slice(0, 3);
  for (let i = 0; i < topRecs.length; i++) {
    console.log(`  ${i + 1}. ${topRecs[i]}`);
  }
  if (report.recommendations.length > 3) {
    console.log(`  ... and ${report.recommendations.length - 3} more (see full report)`);
  }
  console.log("");

  // ── Weight optimization ──
  const optimized = optimizeWeights(report);
  console.log("── OPTIMIZED WEIGHTS ─────────────────────────────────");
  for (const [signal, weight] of Object.entries(optimized)) {
    const changed = weight !== 0.15 && weight !== 0.10 && weight !== 0.05;
    const marker = changed ? " *" : "";
    console.log(`  ${pad(signal, 30)} ${weight.toFixed(3)}${marker}`);
  }
  console.log("  (* = adjusted from base weight)");
  console.log("");

  // ── Save report ──
  const reportsDir = resolve("calibration", "reports");
  mkdirSync(reportsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = resolve(reportsDir, `calibration-${timestamp}.json`);

  const fullReport = {
    ...report,
    optimizedWeights: optimized,
    generatedAt: new Date().toISOString(),
  };

  writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));
  console.log(`Full report saved to: ${reportPath}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main().catch((err) => {
  console.error("Calibration failed:", err);
  process.exit(1);
});
