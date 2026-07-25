import { generateJson } from "@/lib/agent/gemini";

export async function extractResumeSkills(resumeText: string): Promise<string[]> {
  const result = await generateJson<{ skills: string[] }>({
    label: "extractResumeSkills",
    prompt: `Extract professional skills from this resume text for an Indian job seeker.
Return JSON: { "skills": string[] } with 8-25 concise skill names (technologies, domains, tools).
Resume:
---
${resumeText.slice(0, 20000)}
---`,
  });

  return (result.skills ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);
}
