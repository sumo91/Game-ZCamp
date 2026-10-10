import { starterHeroContent, type HeroContentCatalog, type HeroId } from "../core/hero";

const names: Record<HeroId, string> = { camp_warden: "堡垒守望者", vanguard_gunner: "连弩卫士", lumber_baron: "采伐领主" };
/** Labels only: stable ids, stats, unlock graph and wave definitions remain authoritative. */
export const fantasyHeroContent: HeroContentCatalog = {
  ...starterHeroContent,
  heroes: starterHeroContent.heroes.map((hero) => ({ ...hero, displayName: names[hero.id], detailLines: [hero.attackBuildingId === "machine_gun" ? "连弩速射 · 自动驻守主城" : "弩箭攻击 · 自动驻守主城", hero.detailLines[1], hero.detailLines[2]] })),
};
