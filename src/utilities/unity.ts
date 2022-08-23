export function moveTowards(current: number, target: number, maxDelta: number) {
  if (Math.abs(current - target) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}
