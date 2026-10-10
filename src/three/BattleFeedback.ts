import type { GameEvent, GamePhase } from "../core/types";
import { AMBIENT_NOTICE_MIN_INTERVAL_SECONDS, ThrottleGate, routeBattleNotice, shouldShowDamageNumber } from "../ui/battleFeedback";
import type { FeedbackNotice } from "../ui/battleFeedback";

export interface DamageNumber {
  id: number;
  enemyId: string;
  position: number;
  damage: number;
  ageSeconds: number;
}
export interface BattleNotice extends FeedbackNotice {
  id: number;
  remainingSeconds: number;
  target?: { enemyId: string; position?: number };
}

/** Presentation lifetime follows completed simulation time, including pause and background. */
export class BattleFeedback {
  private readonly gate = new ThrottleGate();
  private readonly numbers = new Map<string, DamageNumber>();
  private readonly notices = new Map<string, BattleNotice>();
  private elapsedSeconds = 0;
  private nextId = 0;

  public advance(events: readonly GameEvent[], deltaSeconds: number, phase: GamePhase): void {
    if (phase === "VICTORY" || phase === "DEFEAT") { this.reset(); return; }
    this.elapsedSeconds += deltaSeconds;
    for (const [key, number] of this.numbers) {
      number.ageSeconds += deltaSeconds;
      if (number.ageSeconds >= .8) this.numbers.delete(key);
    }
    for (const [key, notice] of this.notices) {
      notice.remainingSeconds -= deltaSeconds;
      if (notice.remainingSeconds <= 0) this.notices.delete(key);
    }
    for (const event of events) {
      if (event.type === "enemy_hit" && shouldShowDamageNumber(event.damage)) {
        this.numbers.delete(event.enemyId);
        this.numbers.set(event.enemyId, { id: this.nextId++, enemyId: event.enemyId, position: event.position, damage: event.damage, ageSeconds: 0 });
        // Keep the latest real heavy hit per enemy, with a bounded readable overlay in crowds.
        if (this.numbers.size > 24) this.numbers.delete(this.numbers.keys().next().value!);
      }
      const notice = routeBattleNotice(event);
      if (!notice) continue;
      const key = notice.channel === "ambient" ? notice.throttleKey! : `${notice.channel}:${event.type}:${"enemyId" in event ? event.enemyId : ""}`;
      if (notice.channel === "ambient" && !this.gate.allow(key, this.elapsedSeconds, AMBIENT_NOTICE_MIN_INTERVAL_SECONDS)) continue;
      const target = event.type === "enemy_burned" ? { enemyId: event.enemyId, position: event.position }
        : event.type === "tower_special" ? { enemyId: event.targetId, position: event.targetPosition } : undefined;
      this.notices.set(key, { ...notice, id: this.nextId++, remainingSeconds: notice.durationSeconds, target });
    }
  }
  public view(): { numbers: DamageNumber[]; notices: BattleNotice[] } {
    return { numbers: [...this.numbers.values()].map((number) => ({ ...number })), notices: [...this.notices.values()].map((notice) => ({ ...notice, target: notice.target ? { ...notice.target } : undefined })) };
  }
  public reset(): void {
    this.numbers.clear(); this.notices.clear(); this.gate.reset(); this.elapsedSeconds = 0; this.nextId = 0;
  }
}
