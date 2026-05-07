const DURATION_RE = /^(\d+)(ms|s|m|h|d)$/

const unitMap: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
}

export function parseDurationToMs(duration: string): number {
  const match = duration.trim().match(DURATION_RE)
  if (!match) {
    throw new Error(`Unsupported duration: ${duration}`)
  }

  return Number(match[1]) * unitMap[match[2]]
}

export function msToSeconds(ms: number): number {
  return Math.max(1, Math.floor(ms / 1000))
}
