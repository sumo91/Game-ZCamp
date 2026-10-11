# Issue #4 independent merge delivery review

Date: 2026-10-10. Role: ZCamp development, independent merger. This record preserves the independent review axes and merge verification; it does not change the original reports or historical audits.

The root checkout `D:/AI/Codex/WebGames/ZCamp` was clean on `codex/threejs-integration` at `d292a3fa3b493bf6e166063336c44721ca19d002`. The source checkout `C:/Users/Admin/.codex/worktrees/threejs-issue-4/ZCamp` was clean on `codex/threejs-issue-4` at `58b5b33062c346a8ff5d7697509969eefeba32e4`, containing that integration base. The source was merged with `--no-ff` into merge commit `7c5cec44baf6f80f8408638fb4331240c60390d7`, whose parents are the integration base and the source HEAD.

The formal implementation, asset/source audits and independent browser evidence remain in [THREEJS_ISSUE_4_EVIDENCE.md](../../THREEJS_ISSUE_4_EVIDENCE.md), [root-final-review.md](./root-final-review.md), [root-editable-source-audit.json](./root-editable-source-audit.json), [root-final12-validation.jsonl](./root-final12-validation.jsonl) and [asset-manifest.json](./asset-manifest.json). The existing twelve final Khronos validator results are 0 errors / 0 warnings; the merger did not rerun browser, service, Blender or format QA.

## Standards

Fixed base: `d292a3fa3b493bf6e166063336c44721ca19d002`. Initial fixed HEAD: `3f16e2b90bab2c813de749b0b57eca0e0daf16d1`. Final fixed HEAD: `58b5b33062c346a8ff5d7697509969eefeba32e4`. Full reviewed range: `git diff d292a3fa3b493bf6e166063336c44721ca19d002...58b5b33062c346a8ff5d7697509969eefeba32e4`; correction range: `3f16e2b90bab2c813de749b0b57eca0e0daf16d1..58b5b33062c346a8ff5d7697509969eefeba32e4`.

[The initial Standards report](./standards-initial.md) retains one low-priority documented structural breach (scene-owned walker/model association) and one non-blocking possible Duplicated Code heuristic. [The final Standards report](./standards-final.md) records both resolved and 0 remaining findings; its most serious remaining issue is none. The catalog association/loading validation and shared mechanical mesh pipeline corrections are preserved in the source commit. These Standards classifications are not reranked using the Spec axis.

## Spec

Fixed base: `d292a3fa3b493bf6e166063336c44721ca19d002`. Initial fixed HEAD: `3f16e2b90bab2c813de749b0b57eca0e0daf16d1`. Final fixed HEAD: `58b5b33062c346a8ff5d7697509969eefeba32e4`. The final review covers the same full base-to-HEAD range, retaining the original implementation and reviewing its correction increment.

[The initial Spec report](./spec-initial.md) retains one P2 partially met content/model catalog requirement, with 0 scope expansion and 0 other implementation errors. [The final Spec report](./spec-final.md) records the P2 resolved: 0 missing/partial requirements, 0 scope expansion and 0 implementation errors. Its most serious remaining issue is none. The Spec result remains separate from the Standards result.

## Preserved report and artifact names

All eleven files were copied from their originals in `C:/Users/Admin/AppData/Local/Temp/zcamp-threejs-implementation`. The two archived Standards reports only normalize six Markdown double-space line breaks to explicit `<br>`; all review wording, base/HEAD values, finding counts and conclusions remain unchanged, and the external originals remain untouched. The other nine copied files are byte-identical to their originals. The original correction report's pending-review wording describes its own fixed delivery time, while the later final reports above record the completed reviews.

| Original external filename | Saved repository filename |
| --- | --- |
| `issue4-standards-final.md` | [standards-initial.md](./standards-initial.md) |
| `issue4-spec-final.md` | [spec-initial.md](./spec-initial.md) |
| `issue4-standards-rereview.md` | [standards-final.md](./standards-final.md) |
| `issue4-spec-rereview.md` | [spec-final.md](./spec-final.md) |
| `issue4-review-fixes.md` | [review-corrections.md](./review-corrections.md) |
| `issue4-review-walker.json` / `.jpg` | [review-walker.json](./review-walker.json) / [review-walker.jpg](./review-walker.jpg) |
| `issue4-review-mixed-enemies.json` / `.jpg` | [review-mixed-enemies.json](./review-mixed-enemies.json) / [review-mixed-enemies.jpg](./review-mixed-enemies.jpg) |
| `issue4-review-surface-probe.py` | [review-surface-probe.py](./review-surface-probe.py) |
| `issue4-review-assets-before.json` | [review-assets-before.json](./review-assets-before.json) |

The mixed-enemy smoke records live walkers and **death-retained `runner-55`** using the development placeholder without a mixer. It is not evidence of an active runner pose. The copied correction report records its owned service/tab cleanup; service metadata was not copied and the merger started no browser or service.

## Merge verification and remaining gates

At merge commit `7c5cec44baf6f80f8408638fb4331240c60390d7`, `npm run check` passed TypeScript and 15 files / 125 tests; `npm run build` passed with the existing large-bundle notice. `git diff --check d292a3fa3b493bf6e166063336c44721ca19d002...HEAD` passed, the fixed source HEAD was confirmed as an ancestor, and the root checkout was clean before adding these delivery files.

The merger checked that production sources, public GLB files and the manifest have no Git difference from initial reviewed HEAD `3f16e2b90bab2c813de749b0b57eca0e0daf16d1`. All 12 `.blend` and 12 public GLB SHA-256 values match the existing manifest; all 12 newly built GLB copies match public. No production asset or historical audit was changed.

#5 and #13 remain incomplete: project-owner acceptance and physical-device evidence are still required, along with their specified performance and lifecycle acceptance. Desktop viewport evidence does not fulfill these gates. This merge does not claim owner acceptance, a physical-device rerun, full specification completion or final master delivery. Push, remote CI and tracker closure remain with the root task.
