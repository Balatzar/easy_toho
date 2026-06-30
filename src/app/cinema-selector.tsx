"use client";

import "leaflet/dist/leaflet.css";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import type { Cinema } from "@/lib/cinemas";
import { plannerHref } from "@/lib/routes";
import { CinemaMapLink } from "./cinema-map-link";
import { PendingLink } from "./pending-link";

type SelectorView = "map" | "list";
type LeafletModule = typeof import("leaflet");
type RememberedMapView = {
  center: [number, number];
  zoom: number;
};

type CinemaSelectorProps = {
  cinemas: Cinema[];
  selectedCinemaSlug: string;
  selectedDate: string;
};

const PIN_DISPLAY_OFFSETS: Record<string, [number, number]> = {
  chanter: [22, -18],
  hibiya: [-22, -18],
  "marunouchi-piccadilly": [0, 20],
  shinjuku: [-24, -18],
  "shinjuku-piccadilly": [0, 20],
  "shinjuku-wald-9": [24, -18],
};

let rememberedMapView: RememberedMapView | null = null;

export function CinemaSelector({
  cinemas,
  selectedCinemaSlug,
  selectedDate,
}: CinemaSelectorProps) {
  const [preferredView, setPreferredView] = useState<SelectorView>("map");
  const [mapFailed, setMapFailed] = useState(false);
  const activeView = mapFailed ? "list" : preferredView;
  const handleMapError = useCallback(() => setMapFailed(true), []);

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-stone-950">Cinema</h2>
        <span className="text-xs text-stone-500">{cinemas.length} Tokyo</span>
      </div>

      <div
        className="mb-3 grid grid-cols-2 rounded-md border border-stone-200 bg-stone-100 p-1"
        role="tablist"
        aria-label="Cinema selector view"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "map"}
          className={tabClass(activeView === "map")}
          disabled={mapFailed}
          onClick={() => setPreferredView("map")}
        >
          Map
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "list"}
          className={tabClass(activeView === "list")}
          onClick={() => setPreferredView("list")}
        >
          List
        </button>
      </div>

      {mapFailed ? (
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950">
          Map unavailable. List shown.
        </p>
      ) : null}

      {activeView === "map" ? (
        <CinemaMap
          cinemas={cinemas}
          selectedCinemaSlug={selectedCinemaSlug}
          selectedDate={selectedDate}
          onMapError={handleMapError}
        />
      ) : (
        <CinemaList
          cinemas={cinemas}
          selectedCinemaSlug={selectedCinemaSlug}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}

function CinemaMap({
  cinemas,
  selectedCinemaSlug,
  selectedDate,
  onMapError,
}: CinemaSelectorProps & {
  onMapError: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, LeafletMarker>>(new Map());
  const selectedDateRef = useRef(selectedDate);
  const selectedCinemaSlugRef = useRef(selectedCinemaSlug);
  const router = useRouter();
  const routerRef = useRef(router);
  const cinemaSignature = cinemas
    .map(
      (cinema) =>
        `${cinema.slug}:${cinema.coordinates.lat}:${cinema.coordinates.lng}`,
    )
    .join("|");
  const cinemaSnapshotRef = useRef(cinemas);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    cinemaSnapshotRef.current = cinemas;
  }, [cinemas]);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  useEffect(() => {
    selectedCinemaSlugRef.current = selectedCinemaSlug;
  }, [selectedCinemaSlug]);

  useEffect(() => {
    let cancelled = false;
    const markers = markersRef.current;

    async function mountMap() {
      const container = containerRef.current;
      if (!container || mapRef.current) return;

      try {
        const L = await import("leaflet");
        if (cancelled || mapRef.current) return;

        leafletRef.current = L;

        const map = L.map(container, {
          attributionControl: true,
          scrollWheelZoom: false,
        });
        mapRef.current = map;
        map.on("moveend zoomend", () => rememberMapView(map));

        L.tileLayer(
          "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 20,
          },
        )
          .on("tileerror", onMapError)
          .addTo(map);

        const mapCinemas = cinemaSnapshotRef.current;
        const bounds = L.latLngBounds(
          mapCinemas.map((cinema) => [
            cinema.coordinates.lat,
            cinema.coordinates.lng,
          ]),
        );

        for (const cinema of mapCinemas) {
          const selected = cinema.slug === selectedCinemaSlugRef.current;
          const marker = L.marker(
            [cinema.coordinates.lat, cinema.coordinates.lng],
            {
              icon: pinIcon(L, cinema.slug, selected),
              keyboard: true,
              title: cinema.name,
            },
          )
            .bindTooltip(escapeHtml(cinema.name), {
              className: tooltipClass(selected),
              direction: "top",
              offset: [0, -8],
              opacity: 1,
              permanent: true,
            })
            .addTo(map);

          marker.on("click", () => {
            if (mapRef.current) rememberMapView(mapRef.current);

            routerRef.current.push(
              plannerHref(cinema.slug, selectedDateRef.current),
              { scroll: false },
            );
          });
          markers.set(cinema.slug, marker);
        }

        if (rememberedMapView) {
          map.setView(rememberedMapView.center, rememberedMapView.zoom, {
            animate: false,
          });
        } else {
          map.fitBounds(bounds.pad(0.08), {
            animate: false,
            maxZoom: 12,
            padding: [18, 18],
          });
        }
        map.setMaxBounds(bounds.pad(0.65));
      } catch {
        onMapError();
      }
    }

    void mountMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      markers.clear();
    };
  }, [cinemaSignature, onMapError]);

  useEffect(() => {
    const L = leafletRef.current;
    if (!L) return;

    for (const [cinemaSlug, marker] of markersRef.current) {
      const selected = cinemaSlug === selectedCinemaSlug;
      marker.setIcon(pinIcon(L, cinemaSlug, selected));

      const tooltipElement = marker.getTooltip()?.getElement();
      tooltipElement?.classList.toggle(
        "cinema-map-tooltip--selected",
        selected,
      );
    }
  }, [selectedCinemaSlug]);

  return (
    <div
      ref={containerRef}
      className="cinema-map h-[420px] overflow-hidden rounded-md border border-stone-200 bg-stone-100 sm:h-[480px] lg:h-[540px]"
      aria-label="Tokyo Cinema map"
    />
  );
}

function rememberMapView(map: LeafletMap): void {
  const center = map.getCenter();

  rememberedMapView = {
    center: [center.lat, center.lng],
    zoom: map.getZoom(),
  };
}

function pinIcon(
  L: LeafletModule,
  cinemaSlug: string,
  selected: boolean,
) {
  const [offsetX, offsetY] = PIN_DISPLAY_OFFSETS[cinemaSlug] ?? [0, 0];

  return L.divIcon({
    className: selected
      ? "cinema-map-dot cinema-map-dot--selected"
      : "cinema-map-dot",
    iconAnchor: [8 - offsetX, 8 - offsetY],
    iconSize: [16, 16],
    tooltipAnchor: [offsetX, offsetY],
  });
}

function tooltipClass(selected: boolean): string {
  return selected
    ? "cinema-map-tooltip cinema-map-tooltip--selected"
    : "cinema-map-tooltip";
}

function CinemaList({
  cinemas,
  selectedCinemaSlug,
  selectedDate,
}: CinemaSelectorProps) {
  return (
    <nav className="grid gap-1.5" aria-label="Tokyo Cinemas">
      {cinemas.map((cinema) => {
        const selected = cinema.slug === selectedCinemaSlug;

        return (
          <div
            key={cinema.slug}
            className={[
              "flex items-start gap-1.5 rounded-md border transition-colors",
              selected
                ? "border-red-700 bg-red-50 text-red-950"
                : "border-transparent text-stone-700 hover:border-stone-200 hover:bg-stone-50",
            ].join(" ")}
          >
            <PendingLink
              href={`${plannerHref(cinema.slug, selectedDate)}#movies`}
              className="block min-w-0 rounded-l-md py-2 pl-3 text-left"
            >
              <span className="block text-sm font-semibold">{cinema.name}</span>
              <span className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-stone-500">{cinema.area}</span>
                <ImaxBadge imax={cinema.imax} compact />
              </span>
            </PendingLink>
            <CinemaMapLink cinema={cinema} className="mt-1.5 mr-2 h-5 w-5" />
          </div>
        );
      })}
    </nav>
  );
}

function ImaxBadge({
  imax,
  compact = false,
}: {
  imax: Cinema["imax"];
  compact?: boolean;
}) {
  if (!imax) return null;

  const label = imax === "imaxLaser" ? "IMAX Laser" : "IMAX";

  return (
    <span
      className={[
        "rounded border font-semibold",
        compact ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs",
        "border-sky-700 bg-sky-50 text-sky-950",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function tabClass(selected: boolean): string {
  return [
    "rounded px-3 py-1.5 text-sm font-semibold transition-colors",
    selected
      ? "bg-white text-stone-950 shadow-sm"
      : "text-stone-600 hover:text-stone-950 disabled:text-stone-400",
  ].join(" ");
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "\"":
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}
