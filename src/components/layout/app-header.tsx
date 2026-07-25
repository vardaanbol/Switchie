import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { SawbladeMark } from "@/components/brand/sawblade-mark";

/** Shared comic header — brand left, action slot right. */
export function AppHeader({
  actions,
  maxWidth = "max-w-5xl",
}: {
  actions?: ReactNode;
  maxWidth?: "max-w-5xl" | "max-w-2xl";
}) {
  return (
    <header className="relative z-20 border-b-[3px] border-black bg-[#fffef8]/90 backdrop-blur-sm">
      <div
        className={`mx-auto flex w-full ${maxWidth} items-center justify-between gap-2 px-3 py-3 sm:px-6 sm:py-3.5`}
      >
        <Link
          href="/"
          className="flex min-w-0 shrink items-center gap-2 text-sm font-black tracking-tight"
        >
          <SawbladeMark className="size-5 shrink-0 text-black" />
          <span>Y.A.W.N</span>
        </Link>
        {actions ? (
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

/** Consistent 44px comic header control (icon + optional sm+ label). */
export function HeaderAction({
  children,
  className = "",
  ...props
}: ComponentProps<"button"> & { className?: string }) {
  return (
    <button
      type="button"
      {...props}
      className={[
        "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-md border-[2.5px] border-black bg-white px-2.5 text-sm font-bold shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5 disabled:opacity-50 sm:h-9 sm:min-w-0 sm:px-3",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function HeaderLink({
  href,
  children,
  className = "",
  ...props
}: ComponentProps<typeof Link> & { className?: string }) {
  return (
    <Link
      href={href}
      {...props}
      className={[
        "inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-md border-[2.5px] border-black bg-white px-2.5 text-sm font-bold shadow-[2px_2px_0_#000] transition-transform hover:-translate-y-0.5 sm:h-9 sm:min-w-0 sm:px-3",
        className,
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
