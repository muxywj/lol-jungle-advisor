export function timeDecayWeight(playedAt: number): number {
  const ageDays = (Date.now() - playedAt) / 86_400_000;
  if (ageDays < 0.5)  return 1.00;
  if (ageDays < 2)    return 0.70;
  if (ageDays < 7)    return 0.45;
  if (ageDays < 30)   return 0.20;
  return 0.08;
}
