// Shared game rule for a visible part coming loose. These thresholds are chosen for play;
// they are independent of material, spacecraft and which component received the impact.
export function isBreakupImpact(hit: { speed: number; energy: number }): boolean {
  return hit.speed >= 10 && hit.energy >= 250;
}
