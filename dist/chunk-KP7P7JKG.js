// src/commands/compare.ts
var lowerIsBetter = /* @__PURE__ */ new Set(["durationP95Ms", "queueP95Ms", "flakyJobRate"]);
var DEFAULT_TOLERANCE_PERCENT = 5;
function compareResults(baseline, current, tolerancePercent = DEFAULT_TOLERANCE_PERCENT) {
  if (baseline.repository !== current.repository) {
    throw new Error("Baseline and current reports must target the same repository");
  }
  if (tolerancePercent < 0) throw new RangeError("Comparison tolerance cannot be negative");
  const deltas = Object.keys(current.metrics).map((metric) => {
    const before = baseline.metrics[metric].value;
    const after = current.metrics[metric].value;
    const changePercent = before === 0 ? after === 0 ? 0 : 100 : (after - before) / before * 100;
    const detrimentalChange = lowerIsBetter.has(metric) ? changePercent : -changePercent;
    return {
      metric,
      baseline: before,
      current: after,
      changePercent,
      regressed: detrimentalChange > tolerancePercent
    };
  });
  return {
    repository: current.repository,
    tolerancePercent,
    deltas,
    passed: !deltas.some((delta) => delta.regressed)
  };
}
function renderComparisonMarkdown(result) {
  return [
    `## ${result.passed ? "\u2705" : "\u274C"} Release health comparison`,
    "",
    `Tolerance: ${result.tolerancePercent.toFixed(1)}%`,
    "",
    "| Metric | Baseline | Current | Change | Status |",
    "| --- | ---: | ---: | ---: | --- |",
    ...result.deltas.map((delta) => [
      `| ${delta.metric}`,
      delta.baseline.toFixed(2),
      delta.current.toFixed(2),
      `${delta.changePercent >= 0 ? "+" : ""}${delta.changePercent.toFixed(1)}%`,
      `${delta.regressed ? "regressed" : "within budget"} |`
    ].join(" | "))
  ].join("\n");
}

export {
  DEFAULT_TOLERANCE_PERCENT,
  compareResults,
  renderComparisonMarkdown
};
