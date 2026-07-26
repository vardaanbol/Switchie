import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { SawbladeMark } from "@/components/brand/sawblade-mark";
import { AppHeader, HeaderLink } from "@/components/layout/app-header";
import { LandingFooter } from "@/components/layout/landing-footer";

export const metadata: Metadata = {
  title: "Creator · Y.A.W.N",
  description:
    "Meet Vardaan Bhatia — Product Development Engineer and the person behind Y.A.W.N.",
};

function LinkedInMark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.73V1.73C24 .77 23.21 0 22.23 0z" />
    </svg>
  );
}

const CHAPTERS = [
  {
    label: "Now",
    title: "Product Development Engineer",
    place: "Loyalty Juggernaut · Hyderabad",
    body: "Keeping large-scale loyalty platforms fast and boring (in the good way) — hunting down backend bottlenecks, hardening releases as the core team's go-to fixer, and trimming cloud spend without anyone noticing anything but the bill.",
    accent: "bg-[#a8e6ff]",
  },
  {
    label: "Public build",
    title: "NewsU",
    place: "newsu.live · 700+ users",
    body: "Personalized, fact-checked news agent — tracker that digests a topic every morning, chat search, and Chrome extension. Built with LangChain agents, LLMs, Next.js, and Clerk. Grew past 700+ users cutting through noisy feeds.",
    accent: "bg-[#ffb4a2]",
    href: "https://www.newsu.live",
  },
  {
    label: "Obsessed with",
    title: "Agentic systems & backends",
    place: "System design · AI products",
    body: "Turning messy real-world workflows into tools that quietly do the work — which is exactly why Y.A.W.N exists.",
    accent: "bg-[#ffe566]",
  },
];

export default function CreatorPage() {
  return (
    <div className="comic-paper relative min-h-dvh overflow-x-hidden text-black">
      <div className="comic-halftone pointer-events-none absolute inset-0 opacity-[0.28]" />
      <SawbladeMark className="pointer-events-none absolute -right-10 top-28 size-40 text-black/[0.05]" />

      <AppHeader
        maxWidth="max-w-3xl"
        actions={
          <HeaderLink href="/" aria-label="Back to home">
            Home
          </HeaderLink>
        }
      />

      <main className="relative z-10 mx-auto w-full max-w-3xl px-3 pb-16 pt-8 sm:px-5 sm:pt-12">
        <div className="mb-6 inline-block -rotate-2 rounded-md border-[3px] border-black bg-[#ffe566] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] shadow-[3px_3px_0_#000]">
          Creator issue
        </div>

        <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
          Vardaan Bhatia
        </h1>
        <p className="mt-3 max-w-xl text-base font-medium leading-relaxed text-black/65 sm:text-lg">
          Software engineer in Hyderabad. I build agentic products and backends —
          and I built{" "}
          <span className="font-black text-black">Y.A.W.N</span> so job hunting
          could happen while you nap.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border-[2.5px] border-black bg-white px-2.5 py-1.5 text-xs font-bold shadow-[2px_2px_0_#000]">
            <MapPin className="size-3.5" />
            Hyderabad, India
          </span>
          <a
            href="https://www.linkedin.com/in/vardaan-bhatia12/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-md border-[2.5px] border-black bg-[#0a66c2] px-3 text-sm font-black text-white shadow-[3px_3px_0_#000] transition-transform hover:-translate-y-0.5"
          >
            <LinkedInMark className="size-4" />
            LinkedIn
            <ArrowUpRight className="size-3.5 opacity-80" />
          </a>
        </div>

        <section className="mt-12">
          <h2 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-black/45">
            Why Y.A.W.N
          </h2>
          <div className="rounded-lg border-[3px] border-black bg-[#fffef8] p-5 shadow-[6px_6px_0_#000] sm:p-7">
            <p className="text-[15px] font-medium leading-relaxed text-black/75 sm:text-base">
              Job search is loud, repetitive, and easy to drown in. I wanted
              something that hunts, scores, and digests roles for you — so energy
              goes to interviews, not tab chaos. Y.A.W.N is that experiment:
              comic-panel energy, agentic guts, and a morning email that shows up
              while you&apos;re still half asleep.
            </p>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-black/45">
            Chapters
          </h2>
          <ol className="space-y-4">
            {CHAPTERS.map((chapter) => (
              <li
                key={chapter.label}
                className="rounded-lg border-[3px] border-black bg-[#fffef8] p-4 shadow-[4px_4px_0_#000] sm:p-5"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-sm border-[2.5px] border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${chapter.accent}`}
                  >
                    {chapter.label}
                  </span>
                  <span className="text-xs font-bold text-black/45">
                    {chapter.place}
                  </span>
                </div>
                <h3 className="text-lg font-black tracking-tight">
                  {"href" in chapter && chapter.href ? (
                    <a
                      href={chapter.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 underline decoration-2 underline-offset-4 hover:text-black/70"
                    >
                      {chapter.title}
                      <ArrowUpRight className="size-4" />
                    </a>
                  ) : (
                    chapter.title
                  )}
                </h3>
                <p className="mt-1.5 text-sm font-medium leading-relaxed text-black/65">
                  {chapter.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12 rounded-lg border-[3px] border-black bg-[#b5f2c9] p-5 shadow-[5px_5px_0_#000] sm:p-6">
          <p className="text-sm font-black uppercase tracking-[0.16em]">
            Say hi
          </p>
          <p className="mt-2 text-sm font-medium leading-relaxed text-black/70">
            Feedback, bugs, or just want to talk agentic systems — find me on
            LinkedIn. Always down to ship weird useful things.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="https://www.linkedin.com/in/vardaan-bhatia12/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-md border-[2.5px] border-black bg-white px-4 text-sm font-black shadow-[3px_3px_0_#000] transition-transform hover:-translate-y-0.5"
            >
              Message on LinkedIn
              <ArrowUpRight className="size-3.5" />
            </a>
            <Link
              href="/"
              className="inline-flex h-11 items-center rounded-md border-[2.5px] border-black bg-[#ffe566] px-4 text-sm font-black shadow-[3px_3px_0_#000] transition-transform hover:-translate-y-0.5"
            >
              Back to Y.A.W.N
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
