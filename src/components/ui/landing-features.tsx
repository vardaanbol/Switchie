import {
  CalendarDays,
  Mail,
  Search,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

const FEATURES = [
  {
    icon: Search,
    title: "Auto Job Hunt",
    body: "We scour Adzuna for roles that match your skills, salary and work-mode — while you nap.",
    accent: "bg-[#a8e6ff]",
    tilt: "-rotate-[0.8deg]",
  },
  {
    icon: Target,
    title: "Match Scoring",
    body: "Every listing is ranked 0–100 so the keepers float to the top of your feed.",
    accent: "bg-[#ffe566]",
    tilt: "rotate-[0.6deg]",
  },
  {
    icon: Sparkles,
    title: "Pros, Cons & Salary",
    body: "AI reads each role and hands you the honest highs, lows and pay estimate up front.",
    accent: "bg-[#ffb4a2]",
    tilt: "rotate-[0.5deg]",
  },
  {
    icon: Users,
    title: "Referral Cameos",
    body: "Surfaces real people at the company you could reach out to for a warm intro.",
    accent: "bg-[#c9b6ff]",
    tilt: "-rotate-[0.5deg]",
  },
  {
    icon: CalendarDays,
    title: "Yawn Calendar",
    body: "Flip through any day to revisit exactly what we suggested — saved forever.",
    accent: "bg-[#b5f2c9]",
    tilt: "-rotate-[0.7deg]",
  },
  {
    icon: Mail,
    title: "Morning Digest",
    body: "A tidy email of the day's top matches lands in your inbox every morning.",
    accent: "bg-[#ffd6f0]",
    tilt: "rotate-[0.7deg]",
  },
];

export function LandingFeatures() {
  return (
    <section className="comic-paper relative w-full overflow-hidden border-t-[3px] border-black bg-[#f7f7f2] py-20 text-black sm:py-24">
      <div className="comic-halftone pointer-events-none absolute inset-0 opacity-[0.3]" />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-5 sm:px-6">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-block -rotate-2 rounded-md border-[3px] border-black bg-[#ffe566] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] shadow-[3px_3px_0_#000]">
            What's inside
          </div>
          <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
            Your job hunt, on autopilot
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm font-medium leading-relaxed text-black/60">
            Y.A.W.N does the boring parts so you can spend your energy on the
            interviews that matter.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className={`rounded-lg border-[3px] border-black bg-[#fffef8] p-5 shadow-[6px_6px_0_#000] transition-transform hover:-translate-y-1 hover:shadow-[8px_8px_0_#000] ${feature.tilt}`}
              >
                <div
                  className={`mb-4 inline-flex size-12 items-center justify-center rounded-md border-[3px] border-black ${feature.accent} shadow-[3px_3px_0_#000]`}
                >
                  <Icon className="size-5" />
                </div>
                <h3 className="text-lg font-black tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm font-medium leading-relaxed text-black/65">
                  {feature.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        .comic-paper {
          background-color: #f7f7f2;
          background-image:
            linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px);
          background-size: 22px 22px;
        }
        .comic-halftone {
          background-image: radial-gradient(circle, rgba(0,0,0,0.09) 1px, transparent 1.2px);
          background-size: 10px 10px;
        }
      `}</style>
    </section>
  );
}
