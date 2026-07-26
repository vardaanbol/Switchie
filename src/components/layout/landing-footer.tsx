import Link from "next/link";
import { SawbladeMark } from "@/components/brand/sawblade-mark";

export function LandingFooter() {
  return (
    <footer className="relative z-10 border-t-[3px] border-black bg-[#fffef8] text-black">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 sm:py-5">
        <div className="flex items-center gap-2 text-sm font-black tracking-tight">
          <SawbladeMark className="size-4 text-black" />
          <span>Y.A.W.N</span>
          <span className="font-medium text-black/40">·</span>
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-black/45">
            Built while napping
          </span>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-2 text-sm font-bold">
          <Link
            href="/creator"
            className="inline-flex h-10 items-center rounded-md border-[2.5px] border-black bg-[#ffe566] px-3 shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5"
          >
            Creator
          </Link>
        </nav>
      </div>
    </footer>
  );
}
