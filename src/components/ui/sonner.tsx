"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react"

/** Comic-styled toasts — cream card, fat black border, hard offset shadow. */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      icons={{
        success: (
          <span className="inline-flex size-7 items-center justify-center rounded-md border-[2.5px] border-black bg-[#b5f2c9] shadow-[2px_2px_0_#000]">
            <CircleCheckIcon className="size-4" />
          </span>
        ),
        info: (
          <span className="inline-flex size-7 items-center justify-center rounded-md border-[2.5px] border-black bg-[#a8e6ff] shadow-[2px_2px_0_#000]">
            <InfoIcon className="size-4" />
          </span>
        ),
        warning: (
          <span className="inline-flex size-7 items-center justify-center rounded-md border-[2.5px] border-black bg-[#ffe566] shadow-[2px_2px_0_#000]">
            <TriangleAlertIcon className="size-4" />
          </span>
        ),
        error: (
          <span className="inline-flex size-7 items-center justify-center rounded-md border-[2.5px] border-black bg-[#ff6b6b] shadow-[2px_2px_0_#000]">
            <OctagonXIcon className="size-4 text-white" />
          </span>
        ),
        loading: (
          <span className="inline-flex size-7 items-center justify-center rounded-md border-[2.5px] border-black bg-white shadow-[2px_2px_0_#000]">
            <Loader2Icon className="size-4 animate-spin" />
          </span>
        ),
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-[var(--width)] items-center gap-3 rounded-lg border-[3px] border-black bg-[#fffef8] px-4 py-3.5 font-sans text-black shadow-[5px_5px_0_#000]",
          icon: "shrink-0",
          content: "min-w-0 flex-1",
          title: "text-sm font-black leading-snug tracking-tight",
          description: "mt-0.5 text-xs font-medium text-black/60",
          actionButton:
            "shrink-0 rounded-md border-[2.5px] border-black bg-[#ffe566] px-2.5 py-1 text-xs font-black shadow-[2px_2px_0_#000]",
          cancelButton:
            "shrink-0 rounded-md border-[2.5px] border-black bg-white px-2.5 py-1 text-xs font-bold shadow-[2px_2px_0_#000]",
          closeButton:
            "rounded-md border-2 border-black bg-white text-black shadow-[1px_1px_0_#000]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
