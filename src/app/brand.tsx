import type { ReactNode } from "react";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      focusable="false"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" rx="10" fill="#b91c1c" />
      <circle cx="46" cy="18" r="8" fill="#7f1d1d" />
      <path
        d="M13 42C22 28 33 20 52 14"
        fill="none"
        stroke="#f6f6f3"
        strokeLinecap="round"
        strokeWidth="6"
      />
      <path
        d="M14 42C23 29 34 21 51 15"
        fill="none"
        stroke="#fecaca"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <circle
        cx="21"
        cy="32.5"
        r="4.5"
        fill="#1c1917"
        stroke="#f6f6f3"
        strokeWidth="2"
      />
      <circle
        cx="34"
        cy="23.5"
        r="4.5"
        fill="#1c1917"
        stroke="#f6f6f3"
        strokeWidth="2"
      />
      <path d="M25 36L39 44L25 52Z" fill="#f6f6f3" />
    </svg>
  );
}

export function BrandHeader({ title }: { title: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <BrandMark className="h-10 w-10 shrink-0 shadow-sm sm:h-11 sm:w-11" />
      <div className="min-w-0">
        <p className="text-2xl font-semibold leading-none text-stone-950 sm:text-3xl">
          Tokyo Movie Times
        </p>
        <h1 className="mt-1 text-sm font-medium leading-snug text-stone-600 sm:text-base">
          {title}
        </h1>
      </div>
    </div>
  );
}
