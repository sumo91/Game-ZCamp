"""Independently recalculate statistics from exported browser measurements.

This audits recorded evidence; it does not call application internals or simulate
browser behaviour. Usage: python verify-public-pressure-result.py result.json
"""
import json
import math
import sys
from pathlib import Path

reports = []
for filename in sys.argv[1:]:
    path = Path(filename)
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    timing = data["timing"]
    frames = timing["rawFrameIntervalsMs"]
    assert all(isinstance(value, (float, int)) and math.isfinite(value) and value > 0 for value in frames), path
    ordered = sorted(frames)
    n = len(ordered)
    median = (ordered[(n - 1) // 2] + ordered[n // 2]) / 2 if n else None
    p95 = ordered[math.ceil(n * .95) - 1] if n else None
    maximum = ordered[-1] if n else None
    for key, expected in [("medianMs", median), ("p95Ms", p95), ("maxMs", maximum)]:
        actual = timing[key]
        assert actual is None if expected is None else abs(actual - expected) < 1e-7, (path, key, actual, expected)
    assert timing["sampleCount"] == n, path
    assert abs(sum(frames) / 1000 - timing["actualSampleDurationSeconds"]) < 1e-6, path
    assert data["measuredRendering"]["samples"] == n, path
    if data["outcome"] == "completed":
        assert timing["actualSampleDurationSeconds"] >= timing["durationSecondsRequested"], path
    count = data["configuration"]["count"]
    for scene in [data["sceneAtStart"], data["sceneAtEnd"]]:
        assert scene["activeUnits"] == scene["independentMixers"] == scene["centersInView"] == count, path
        assert sum(scene["semantics"].values()) == count, path
        composition = scene["composition"]
        assert composition["main_city"] == 1, path
        assert sum(composition.get(key, 0) for key in ["main_city", "arrow_low", "arrow_medium", "arrow_high", "lumber_low", "lumber_medium", "lumber_high"]) == 15, path
        assert composition["wall"] == 6 and composition["plot"] == 15, path
    assert data["scope"]["coreBattleRunning"] is False, path
    assert data["scope"]["ownerAccepted"] is False and data["scope"]["physicalDeviceAccepted"] is False, path
    reports.append({
        "file": path.name, "outcome": data["outcome"], "reason": data["interruptionReason"],
        "count": count, "quality": data["configuration"]["quality"],
        "seconds": timing["actualSampleDurationSeconds"], "samples": n,
        "medianMs": median, "p95Ms": p95, "maxMs": maximum,
        "calls": [data["measuredRendering"]["callsMin"], data["measuredRendering"]["callsMax"]],
        "triangles": [data["measuredRendering"]["trianglesMin"], data["measuredRendering"]["trianglesMax"]],
        "responses": len(data["responseChecks"]),
        "rawStatisticsVerified": True,
    })
print(json.dumps(reports, ensure_ascii=False, indent=2))
