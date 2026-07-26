import User from "@/models/User";

function envInt(name: string, fallback: number) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

/** Absolute max users we ever store in Phase 1 (includes private buffer). */
export function getPhase1HardCap() {
  return envInt("PHASE1_HARD_CAP", 40);
}

/** Seats held back from public signup. */
export function getPhase1BufferSeats() {
  return envInt("PHASE1_BUFFER_SEATS", 5);
}

/** Public signup closes when used >= this. */
export function getPhase1PublicCap() {
  const hard = getPhase1HardCap();
  const buffer = getPhase1BufferSeats();
  return Math.max(0, hard - buffer);
}

export type BetaSeatStats = {
  used: number;
  hardCap: number;
  publicCap: number;
  bufferSeats: number;
  remainingPublic: number;
  isPublicFull: boolean;
};

export async function getBetaSeatStats(): Promise<BetaSeatStats> {
  const used = await User.countDocuments();
  const hardCap = getPhase1HardCap();
  const bufferSeats = getPhase1BufferSeats();
  const publicCap = getPhase1PublicCap();
  const remainingPublic = Math.max(0, publicCap - used);
  return {
    used,
    hardCap,
    publicCap,
    bufferSeats,
    remainingPublic,
    isPublicFull: used >= publicCap,
  };
}

/**
 * Existing yawners always pass. New accounts need a free public seat.
 * Returns null when allowed, or an error code when blocked.
 */
export async function assertCanCreateUser(
  googleId: string
): Promise<"ok_existing" | "ok_new" | "no_seats"> {
  const existing = await User.findOne({ googleId }).select("_id").lean();
  if (existing) return "ok_existing";

  const stats = await getBetaSeatStats();
  if (stats.isPublicFull) return "no_seats";
  return "ok_new";
}

export const NO_SEATS_MESSAGE =
  "No seats available for the first phase testing. Thanks for participating in the program.";
