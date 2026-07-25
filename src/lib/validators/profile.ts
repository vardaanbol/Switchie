import { z } from "zod";
import { WORK_MODES } from "@/models/User";

export const profileSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    salaryExpectationMin: z.number().int().min(0),
    salaryExpectationMax: z.number().int().min(0),
    workMode: z.enum(WORK_MODES),
    preferredLocations: z.array(z.string().min(1).max(80)).default([]),
    rolesOfInterest: z.array(z.string().min(1).max(80)).min(1),
    emailDigestEnabled: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.salaryExpectationMax < data.salaryExpectationMin) {
      ctx.addIssue({
        code: "custom",
        message: "Max salary must be ≥ min salary",
        path: ["salaryExpectationMax"],
      });
    }
    if (
      (data.workMode === "onsite" || data.workMode === "both") &&
      data.preferredLocations.length < 1
    ) {
      ctx.addIssue({
        code: "custom",
        message: "At least one location is required for onsite/both",
        path: ["preferredLocations"],
      });
    }
  });

export type ProfileInput = z.infer<typeof profileSchema>;
