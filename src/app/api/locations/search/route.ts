import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";

type PhotonFeature = {
  properties?: {
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    type?: string;
    osm_value?: string;
  };
};

type PhotonResponse = {
  features?: PhotonFeature[];
};

export async function GET(req: Request) {
  const result = await requireUser();
  if ("error" in result) return result.error;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ locations: [] });
  }

  // India bbox: west,south,east,north
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "8");
  url.searchParams.set("lang", "en");
  url.searchParams.set("bbox", "68.1,6.5,97.4,35.7");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Y.A.W.N JobFinder/1.0 (local-dev location autocomplete)",
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Location search failed", locations: [] },
        { status: 502 }
      );
    }

    const data = (await res.json()) as PhotonResponse;
    const seen = new Set<string>();
    const locations: string[] = [];

    for (const feature of data.features ?? []) {
      const p = feature.properties ?? {};
      if (p.countrycode && p.countrycode.toLowerCase() !== "in") continue;

      const name = p.name || p.city;
      if (!name) continue;

      const label = [name, p.state].filter(Boolean).join(", ");
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      locations.push(label);
      if (locations.length >= 8) break;
    }

    return NextResponse.json({ locations });
  } catch {
    return NextResponse.json(
      { error: "Location search unavailable", locations: [] },
      { status: 502 }
    );
  }
}
