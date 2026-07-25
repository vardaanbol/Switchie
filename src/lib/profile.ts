/**
 * Lightweight profile completeness check used by auth redirects / middleware.
 * A profile is complete when salary range, work mode, and ≥1 role are set,
 * and preferredLocations is non-empty when workMode is onsite or both.
 */
export function isProfileComplete(profile: {
  salaryExpectationMin?: number | null;
  salaryExpectationMax?: number | null;
  workMode?: string | null;
  preferredLocations?: string[] | null;
  rolesOfInterest?: string[] | null;
} | null | undefined): boolean {
  if (!profile) return false;

  const hasSalary =
    typeof profile.salaryExpectationMin === "number" &&
    typeof profile.salaryExpectationMax === "number" &&
    profile.salaryExpectationMax >= profile.salaryExpectationMin;

  const hasWorkMode =
    profile.workMode === "onsite" ||
    profile.workMode === "remote" ||
    profile.workMode === "both";

  const hasRoles =
    Array.isArray(profile.rolesOfInterest) &&
    profile.rolesOfInterest.length >= 1;

  const needsLocations =
    profile.workMode === "onsite" || profile.workMode === "both";
  const hasLocations =
    !needsLocations ||
    (Array.isArray(profile.preferredLocations) &&
      profile.preferredLocations.length >= 1);

  return hasSalary && hasWorkMode && hasRoles && hasLocations;
}
