"use client";

import { useEffect, useRef } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { Company } from "@/types";

declare global {
  interface Window {
    google?: any;
  }
}

const DEFAULT_CENTER = { lat: 46.8, lng: 8.2 };

interface GoogleMapProps {
  companies: (Company & { coords: { lat: number; lng: number } | null })[];
  onBoundsChange: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void;
  onCompanyClick: (slug?: string, id?: number) => void;
  isMobile: boolean;
  mapsReady: boolean;
}

export default function GoogleMap({
  companies,
  onBoundsChange,
  onCompanyClick,
  isMobile,
  mapsReady,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const mapInitializedRef = useRef(false);
  const idleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userInteractingRef = useRef(false);

  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

  const companiesWithCoords = companies.filter(
    (c): c is Company & { coords: { lat: number; lng: number } } =>
      c.coords !== null &&
      Number.isFinite(c.coords?.lat) &&
      Number.isFinite(c.coords?.lng)
  );

  useEffect(() => {
    if (
      !mapsReady ||
      !mapRef.current ||
      !window.google?.maps ||
      companiesWithCoords.length === 0
    )
      return;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: DEFAULT_CENTER,
        zoom: 7,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true,
      });
    }

    const map = mapInstanceRef.current;

    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
      clustererRef.current = null;
    }
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const createMarkerIcon = () => {
      const svgIcon = `
        <svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 0C8.48 0 4 4.48 4 10c0 5.4 8.5 16 10 16s10-10.6 10-16c0-5.52-4.48-10-10-10z" fill="#dc2626" stroke="#ffffff" stroke-width="2"/>
          <circle cx="14" cy="10" r="3.5" fill="#ffffff"/>
        </svg>
      `;
      return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgIcon)}`,
        scaledSize: new window.google.maps.Size(28, 36),
        anchor: new window.google.maps.Point(14, 36),
        labelOrigin: new window.google.maps.Point(14, -8),
      };
    };

    companiesWithCoords.forEach((company) => {
      const shortName =
        company.name.length > 20
          ? company.name.slice(0, 18) + "..."
          : company.name;
      const marker = new window.google.maps.Marker({
        position: { lat: company.coords.lat, lng: company.coords.lng },
        map: null,
        title: company.name,
        icon: createMarkerIcon(),
        label: {
          text: shortName,
          color: "#1e293b",
          fontSize: "11px",
          fontWeight: "600",
          fontFamily: "Arial, sans-serif",
          className: "marker-label",
        },
      });

      marker.addListener("click", () => {
        onCompanyClick(company.slug, company.id);
      });

      markersRef.current.push(marker);
    });

    if (markersRef.current.length > 0) {
      const renderClusterWithClick = ({
        count,
        position,
      }: {
        count: number;
        position: any;
      }) => {
        const color =
          count > 10 ? "#dc2626" : count > 5 ? "#f97316" : "#3b82f6";
        const size = count > 10 ? 56 : count > 5 ? 50 : 44;

        const clusterMarker = new window.google.maps.Marker({
          position,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
                <circle cx="${size / 2}" cy="${size / 2}" r="${
              size / 2 - 3
            }" fill="${color}" stroke="#ffffff" stroke-width="3"/>
                <text x="${size / 2}" y="${
              size / 2
            }" font-family="Arial, sans-serif" font-size="${
              count > 10 ? 16 : 14
            }" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${count}</text>
              </svg>
            `)}`,
            scaledSize: new window.google.maps.Size(size, size),
            anchor: new window.google.maps.Point(size / 2, size / 2),
          },
          zIndex:
            Number(window.google.maps.Marker.MAX_ZINDEX) + count,
        });

        clusterMarker.addListener("click", () => {
          const clusterMarkers = markersRef.current.filter((m) => {
            const mPos = m.getPosition();
            const cPos = clusterMarker.getPosition();
            if (!mPos || !cPos) return false;
            const latDiff = Math.abs(mPos.lat() - cPos.lat());
            const lngDiff = Math.abs(mPos.lng() - cPos.lng());
            return latDiff < 0.1 && lngDiff < 0.1;
          });

          if (clusterMarkers.length === 1) {
            const marker = clusterMarkers[0];
            const company = companiesWithCoords.find((c) => {
              const mPos = marker.getPosition();
              return (
                mPos &&
                Math.abs(mPos.lat() - c.coords.lat) < 0.01 &&
                Math.abs(mPos.lng() - c.coords.lng) < 0.01
              );
            });
            if (company) {
              onCompanyClick(company.slug, company.id);
            }
          } else {
            const bounds = new window.google.maps.LatLngBounds();
            clusterMarkers.forEach((marker: any) => {
              const pos = marker.getPosition();
              if (pos) bounds.extend(pos);
            });
            map.fitBounds(bounds, {
              top: 50,
              right: 50,
              bottom: 50,
              left: 50,
            });
            setTimeout(() => {
              const currentZoom = map.getZoom() || 7;
              if (currentZoom > 13) {
                map.setZoom(13);
              }
            }, 100);
          }
        });

        return clusterMarker;
      };

      clustererRef.current = new MarkerClusterer({
        map: map,
        markers: markersRef.current,
        renderer: {
          render: renderClusterWithClick,
        },
        algorithmOptions: {
          maxZoom: 13,
        },
      });

      map.addListener("zoom_changed", () => {
        const currentZoom = map.getZoom() || 7;
        if (currentZoom > 13) {
          map.setZoom(13);
        }
      });

      map.addListener("dragstart", () => {
        userInteractingRef.current = true;
      });

      map.addListener("zoom_changed", () => {
        if (mapInitializedRef.current) {
          userInteractingRef.current = true;
        }
      });

      map.addListener("idle", () => {
        if (!userInteractingRef.current) return;

        if (idleTimeoutRef.current) {
          clearTimeout(idleTimeoutRef.current);
        }
        idleTimeoutRef.current = setTimeout(() => {
          const bounds = map.getBounds();
          if (!bounds) return;
          const json = bounds.toJSON();
          const next = {
            north: json.north,
            south: json.south,
            east: json.east,
            west: json.west,
          };
          const spansOk =
            next.north - next.south < 30 && next.east - next.west < 30;
          const inRegion =
            next.north <= 55 &&
            next.south >= 40 &&
            next.east <= 15 &&
            next.west >= 0;
          if (
            Number.isFinite(next.north) &&
            Number.isFinite(next.south) &&
            Number.isFinite(next.east) &&
            Number.isFinite(next.west) &&
            spansOk &&
            inRegion
          ) {
            onBoundsChange(next);
          }
          userInteractingRef.current = false;
        }, 300);
      });

      if (!mapInitializedRef.current) {
        const bounds = new window.google.maps.LatLngBounds();
        markersRef.current.forEach((marker) => {
          const pos = marker.getPosition();
          if (pos) bounds.extend(pos);
        });
        if (!bounds.isEmpty()) {
          const padding = { top: 50, right: 50, bottom: 50, left: 50 };
          map.fitBounds(bounds, padding);
        } else {
          map.setCenter(DEFAULT_CENTER);
          map.setZoom(7);
        }
        mapInitializedRef.current = true;
      }
    } else {
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(7);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady, companiesWithCoords.length]);

  useEffect(() => {
    return () => {
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
      }
    };
  }, []);

  if (!googleMapsKey) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-3 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Mapa wymaga klucza API
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapRef}
      className="h-full w-full"
      aria-label="Mapa firm na Google Maps"
    />
  );
}
