/**
 * Probe a listing URL and reject company-only pages, closed roles, and
 * dead links before we burn Gemini enrich budget on them.
 */

const EXPIRED_PATTERNS = [
  /no longer available/i,
  /position (has been |was )?filled/i,
  /this job has (been )?closed/i,
  /job (posting )?has expired/i,
  /this (role|position|listing) is (no longer|not) (open|available)/i,
  /hasn['’]t added any jobs yet/i,
  /currently no (open )?positions/i,
  /no (open )?jobs (found|available|at)/i,
  /this vacancy is closed/i,
  /application (period|window) (has )?closed/i,
  /sorry[,.]? this job is no longer/i,
  /page not found/i,
  /404[- ]?not[- ]?found/i,
  // Ashby / Greenhouse / Lever closed-role pages often return HTTP 200
  /\bjob not found\b/i,
  /the job you requested was not found/i,
  /\bposition not found\b/i,
  /\brole not found\b/i,
  /this job (posting )?is no longer (accepting applications|open)/i,
  /applications? (are |is )?closed/i,
  /no longer accepting applications/i,
  /opening is no longer available/i,
  /job posting was removed/i,
];

/** Company hubs that look like jobs but aren't a specific opening. */
const NON_JOB_PATH_PATTERNS = [
  // Wellfound / AngelList company jobs index (no job id)
  /wellfound\.com\/company\/[^/]+\/?(jobs)?\/?$/i,
  /angel\.co\/company\/[^/]+\/?(jobs)?\/?$/i,
  // LinkedIn company pages
  /linkedin\.com\/company\//i,
  // Generic careers landing pages with no role slug
  /\/careers\/?$/i,
  /\/jobs\/?$/i,
  /\/join-?us\/?$/i,
  /\/work-?with-?us\/?$/i,
];

const JOB_PATH_HINTS =
  /\/(?:jobs?|careers?|positions?|openings?|vacancies?)\/[^/?#]+/i;

export type JobUrlCheck = {
  ok: boolean;
  reason?: string;
  finalUrl?: string;
};

function looksLikeNonJobUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const href = parsed.href;
    const path = parsed.pathname.replace(/\/+$/, "") || "/";

    // Explicit job-detail paths are fine even on careers hosts.
    if (JOB_PATH_HINTS.test(path)) return false;

    for (const pattern of NON_JOB_PATH_PATTERNS) {
      if (pattern.test(href) || pattern.test(path)) return true;
    }

    // Wellfound company root without /jobs/<id>
    if (
      /(wellfound\.com|angel\.co)$/i.test(parsed.hostname.replace(/^www\./, "")) &&
      /^\/company\/[^/]+\/?$/i.test(path)
    ) {
      return true;
    }

    return false;
  } catch {
    return true;
  }
}

function bodyLooksExpired(html: string): boolean {
  const sample = html.slice(0, 80_000);
  return EXPIRED_PATTERNS.some((p) => p.test(sample));
}

export async function verifyJobUrl(sourceUrl: string): Promise<JobUrlCheck> {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  if (!/^https?:$/i.test(url.protocol)) {
    return { ok: false, reason: "invalid_protocol" };
  }

  if (looksLikeNonJobUrl(url.href)) {
    return { ok: false, reason: "company_page_not_job", finalUrl: url.href };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    // Prefer GET — many boards 405 HEAD and Adzuna interstitials need a body.
    const res = await fetch(url.href, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; YAWN-JobCheck/1.0; +https://yawn.app)",
      },
      // Always live — don't serve a cached "open" page for a closed role.
      cache: "no-store",
    });

    const finalUrl = res.url || url.href;

    if (res.status === 404 || res.status === 410 || res.status === 451) {
      return { ok: false, reason: `http_${res.status}`, finalUrl };
    }
    if (res.status >= 400) {
      // Soft-fail on auth walls / rate limits — don't drop every Greenhouse login.
      if (res.status === 401 || res.status === 403 || res.status === 429) {
        return { ok: true, reason: `soft_${res.status}`, finalUrl };
      }
      return { ok: false, reason: `http_${res.status}`, finalUrl };
    }

    if (looksLikeNonJobUrl(finalUrl)) {
      return { ok: false, reason: "redirected_to_company_page", finalUrl };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(contentType)) {
      // PDF / JSON apply endpoints — treat as alive.
      return { ok: true, finalUrl };
    }

    const html = await res.text();
    if (bodyLooksExpired(html)) {
      return { ok: false, reason: "expired_copy", finalUrl };
    }

    return { ok: true, finalUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch_failed";
    // Network flakes shouldn't wipe an otherwise good Adzuna batch.
    if (/aborted|timeout/i.test(message)) {
      return { ok: true, reason: "timeout_soft_pass" };
    }
    return { ok: true, reason: "network_soft_pass" };
  } finally {
    clearTimeout(timeout);
  }
}

/** Verify many URLs with a concurrency cap; preserve input order of survivors. */
export async function filterLiveJobUrls<T extends { sourceUrl: string; title?: string }>(
  items: T[],
  concurrency = 6
): Promise<{ live: T[]; dropped: number }> {
  const live: T[] = [];
  let dropped = 0;
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next++;
      const item = items[index];
      const check = await verifyJobUrl(item.sourceUrl);
      if (check.ok) {
        live[index] = item;
      } else {
        dropped += 1;
        console.info(
          `[verify-job] drop "${item.title ?? item.sourceUrl}" → ${check.reason}`
        );
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );

  return {
    live: live.filter((item): item is T => Boolean(item)),
    dropped,
  };
}
