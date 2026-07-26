import type { SharedYawnStatus } from "@/models/SharedYawn";
import type { WorkMode } from "@/models/User";

export type SharedReferralContact = {
  name: string;
  title: string;
  company: string;
  profileUrl: string;
  confidence?: number;
};

/** A share as rendered in the Shared Yawns tab — mirrors the sender's card. */
export type SharedYawnCard = {
  _id: string;
  title: string;
  company: string;
  description: string;
  sourceUrl: string;
  location?: string;
  workMode?: WorkMode;
  salaryEstimateMin?: number;
  salaryEstimateMax?: number;
  salaryIsEstimate?: boolean;
  pros: string[];
  cons: string[];
  referralContacts: SharedReferralContact[];
  requiredExperienceYears?: number | null;
  matchScore: number;
  comment?: string;
  sharedByName: string;
  sharedByEmail?: string;
  status: SharedYawnStatus;
  sharedAt: string;
};

export function mapSharedYawn(doc: {
  _id: { toString(): string };
  title: string;
  company: string;
  description?: string | null;
  sourceUrl: string;
  location?: string | null;
  workMode?: WorkMode | null;
  salaryEstimateMin?: number | null;
  salaryEstimateMax?: number | null;
  salaryIsEstimate?: boolean | null;
  pros?: string[] | null;
  cons?: string[] | null;
  referralContacts?: ReadonlyArray<{
    name: string;
    title: string;
    company: string;
    profileUrl: string;
    confidence?: number | null;
  }> | null;
  requiredExperienceYears?: number | null;
  matchScore?: number | null;
  comment?: string | null;
  fromUserName?: string | null;
  fromUserEmail?: string | null;
  status: SharedYawnStatus;
  createdAt?: Date | string | null;
}): SharedYawnCard {
  return {
    _id: doc._id.toString(),
    title: doc.title,
    company: doc.company,
    description: doc.description ?? "",
    sourceUrl: doc.sourceUrl,
    location: doc.location ?? undefined,
    workMode: doc.workMode ?? undefined,
    salaryEstimateMin: doc.salaryEstimateMin ?? undefined,
    salaryEstimateMax: doc.salaryEstimateMax ?? undefined,
    salaryIsEstimate: doc.salaryIsEstimate ?? true,
    pros: doc.pros ?? [],
    cons: doc.cons ?? [],
    referralContacts: (doc.referralContacts ?? []).map((c) => ({
      name: c.name,
      title: c.title,
      company: c.company,
      profileUrl: c.profileUrl,
      confidence: c.confidence ?? undefined,
    })),
    requiredExperienceYears:
      typeof doc.requiredExperienceYears === "number"
        ? doc.requiredExperienceYears
        : null,
    matchScore: doc.matchScore ?? 0,
    comment: doc.comment ?? undefined,
    sharedByName: doc.fromUserName?.trim() || "A Yawner",
    sharedByEmail: doc.fromUserEmail ?? undefined,
    status: doc.status,
    sharedAt: (doc.createdAt
      ? new Date(doc.createdAt)
      : new Date()
    ).toISOString(),
  };
}
