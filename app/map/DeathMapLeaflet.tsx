'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';

const { BaseLayer } = LayersControl;
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Biography } from '@/lib/types';
import type { Event } from '@/lib/event-types';

const DEFAULT_CENTER: [number, number] = [36.633696, 4.603020];
const DEFAULT_ZOOM = 10;

// Fix default icon in Leaflet with react-leaflet (next/build)
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Red marker for selected biography (DivIcon, styled in CSS)
const iconSelected = L.divIcon({
  className: 'marker-selected-red',
  html: '',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

function FlyToSearch({ searchCenter }: { searchCenter: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (searchCenter) map.flyTo([searchCenter.lat, searchCenter.lng], map.getZoom());
  }, [map, searchCenter?.lat, searchCenter?.lng]);
  return null;
}

export interface DeathMapLeafletProps {
  bios: Biography[];
  events?: Event[];
  mode?: 'bios' | 'events';
  searchCenter?: { lat: number; lng: number } | null;
  selectedBioId?: string | null;
  selectedEventId?: string | null;
}

export function DeathMapLeaflet({
  bios,
  events = [],
  mode = 'bios',
  searchCenter = null,
  selectedBioId = null,
  selectedEventId = null,
}: DeathMapLeafletProps) {
  const bioList = bios.filter(
    (b) => b.deathLat != null && b.deathLng != null && !Number.isNaN(Number(b.deathLat)) && !Number.isNaN(Number(b.deathLng))
  );
  const eventList = events.filter(
    (e) => e.eventLat != null && e.eventLng != null && !Number.isNaN(Number(e.eventLat)) && !Number.isNaN(Number(e.eventLng))
  );

  return (
    <MapContainer
      className="map-carte-layers-below-button"
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom
    >
      <LayersControl position="topright">
        <BaseLayer name="Carte" checked>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </BaseLayer>
        <BaseLayer name="Satellite">
          <TileLayer
            attribution="Esri, Maxar, Earthstar Geographics"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </BaseLayer>
      </LayersControl>
      <FlyToSearch searchCenter={searchCenter} />
      {mode === 'bios' && bioList.map((bio) => (
        <Marker
          key={bio.id}
          position={[Number(bio.deathLat), Number(bio.deathLng)]}
          icon={selectedBioId === bio.id ? iconSelected : icon}
        >
          <Popup>
            <strong>{bio.name}</strong>
            {bio.deathDate && <><br /><span className="meta">{bio.deathDate}</span></>}
            {bio.deathPlace && <><br /><span className="meta">{bio.deathPlace}</span></>}
            <br />
            <Link href={`/bio/${bio.id}`}>Voir la biographie</Link>
          </Popup>
        </Marker>
      ))}
      {mode === 'events' && eventList.map((ev) => (
        <Marker
          key={ev.id}
          position={[Number(ev.eventLat), Number(ev.eventLng)]}
          icon={selectedEventId === ev.id ? iconSelected : icon}
        >
          <Popup>
            <strong>{ev.title || 'Événement'}</strong>
            {ev.date && <><br /><span className="meta">{ev.date}</span></>}
            {ev.place && <><br /><span className="meta">{ev.place}</span></>}
            <br />
            <Link href="/events">Voir les événements</Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
