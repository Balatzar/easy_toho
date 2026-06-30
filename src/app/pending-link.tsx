"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Suspense,
  createContext,
  useId,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";

export type PendingNavigationContextValue = {
  currentHref: string | null;
  pendingLinkId: string | null;
  setPendingLinkId: (linkId: string | null) => void;
};

type PendingLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  keyof LinkProps | "className"
> &
  Omit<LinkProps, "href"> & {
    children: ReactNode;
    className?: string;
    href: string;
  };

const PendingNavigationContext =
  createContext<PendingNavigationContextValue | null>(null);

export function PendingNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <PendingNavigationState currentHref={null}>
          {children}
        </PendingNavigationState>
      }
    >
      <PendingNavigationWithUrl>{children}</PendingNavigationWithUrl>
    </Suspense>
  );
}

function PendingNavigationWithUrl({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const currentHref = normalizeHref(`${pathname}${search ? `?${search}` : ""}`);

  return (
    <PendingNavigationState currentHref={currentHref}>
      {children}
    </PendingNavigationState>
  );
}

function PendingNavigationState({
  children,
  currentHref,
}: {
  children: ReactNode;
  currentHref: string | null;
}) {
  const [pendingLinkId, setPendingLinkId] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      currentHref,
      pendingLinkId,
      setPendingLinkId,
    }),
    [currentHref, pendingLinkId],
  );

  useEffect(() => {
    if (!pendingLinkId) return;

    const timeout = window.setTimeout(() => {
      setPendingLinkId(null);
    }, 15_000);

    return () => window.clearTimeout(timeout);
  }, [pendingLinkId]);

  return (
    <PendingNavigationContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        <PendingNavigationClearOnUrlChange currentHref={currentHref} />
      </Suspense>
    </PendingNavigationContext.Provider>
  );
}

export function PendingLink({
  children,
  className,
  href,
  onNavigate,
  ...props
}: PendingLinkProps) {
  const navigation = useContext(PendingNavigationContext);
  const linkId = useId();
  const normalizedHref = normalizeHref(href);
  const isCurrent = navigation?.currentHref === normalizedHref;
  const isPending = navigation?.pendingLinkId === linkId && !isCurrent;

  return (
    <Link
      {...props}
      href={href}
      className={["pending-link", className].filter(Boolean).join(" ")}
      data-pending={isPending ? "true" : undefined}
      onNavigate={(event) => {
        onNavigate?.(event);
        if (!isCurrent) {
          navigation?.setPendingLinkId(linkId);
        }
      }}
    >
      <span className="pending-link__content">{children}</span>
      <span className="pending-link__loading" aria-hidden="true">
        Loading...
      </span>
    </Link>
  );
}

export function usePendingNavigation(): PendingNavigationContextValue | null {
  return useContext(PendingNavigationContext);
}

function PendingNavigationClearOnUrlChange({
  currentHref,
}: {
  currentHref: string | null;
}) {
  const navigation = useContext(PendingNavigationContext);
  const setPendingLinkId = navigation?.setPendingLinkId;

  useEffect(() => {
    if (!currentHref) return;

    const timeout = window.setTimeout(() => {
      setPendingLinkId?.(null);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [currentHref, setPendingLinkId]);

  return null;
}

function normalizeHref(href: string): string {
  const url = new URL(href, "http://easy-toho.local");
  return `${url.pathname}${url.search}`;
}
