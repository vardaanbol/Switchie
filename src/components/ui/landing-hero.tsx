"use client";

import { CrowdCanvas } from "@/components/ui/crowd-canvas";

export function LandingHero({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-white text-black">
      {/* Outer comic page frame — peeps stay untouched inside */}
      <div className="pointer-events-none absolute inset-3 z-30 border-[3px] border-black sm:inset-4" />
      <div className="pointer-events-none absolute inset-[14px] z-30 border border-black/20 sm:inset-[18px]" />

      {/* Floating splash-page title panel above the crowd */}
      <div className="absolute left-1/2 top-10 z-20 w-[min(90vw,36rem)] -translate-x-1/2 sm:top-20">
        <div className="relative rounded-lg border-[3px] border-black bg-[#fffef8] px-5 py-6 text-center shadow-[6px_6px_0_#000] sm:px-10 sm:py-9 sm:shadow-[8px_8px_0_#000]">
          {/* Issue sticker */}
          <div className="absolute -right-2 -top-2 rotate-12 sm:-right-4 sm:-top-4">
            <div className="rounded-md border-[3px] border-black bg-[#ffe566] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0_#000]">
              Issue #001
            </div>
          </div>

          {/* Halftone only inside the panel, not over peeps */}
          <div className="landing-panel-dots pointer-events-none absolute inset-0 rounded-[5px] opacity-40" />

          <div className="relative z-10 flex flex-col items-center gap-3 sm:gap-4">
            <h1 className="text-5xl font-black leading-none tracking-tight sm:text-7xl lg:text-8xl">
              Y.A.W.N
            </h1>
            <p className="max-w-[28ch] border-y-[3px] border-black py-2 text-[10px] font-black uppercase leading-relaxed tracking-[0.18em] text-black sm:max-w-none sm:text-xs">
              Yearning Applications While Napping
            </p>
            <div className="mt-1 flex w-full justify-center sm:mt-2">
              {children}
            </div>
          </div>

          {/* Speech-tail pointing down into the crowd */}
          <div
            aria-hidden="true"
            className="absolute bottom-[-18px] left-1/2 h-0 w-0 -translate-x-1/2 border-l-[14px] border-r-[14px] border-t-[18px] border-l-transparent border-r-transparent border-t-black"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-[-14px] left-1/2 h-0 w-0 -translate-x-1/2 border-l-[11px] border-r-[11px] border-t-[14px] border-l-transparent border-r-transparent border-t-[#fffef8]"
          />
        </div>
      </div>

      {/* Crowd — exact same canvas, white stage preserved */}
      <div className="absolute bottom-0 h-full w-full">
        <CrowdCanvas src="/images/peeps/all-peeps.png" rows={15} cols={7} />
      </div>

      {/* Scroll cue toward the features section */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2 sm:bottom-8">
        <div className="animate-bounce rounded-md border-[3px] border-black bg-[#ffe566] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] shadow-[3px_3px_0_#000]">
          Scroll for features ↓
        </div>
      </div>
    </div>
  );
}
