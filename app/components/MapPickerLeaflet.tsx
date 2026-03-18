'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, LayersControl } from 'react-leaflet';

const { BaseLayer } = LayersControl;
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DEFAULT_CENTER: [number, number] = [36.633696, 4.603020];
const DEFAULT_ZOOM = 13;

const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function MapClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function CenterUpdater({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom);
  }, [map, lat, lng, zoom]);
  return null;
}

export interface MapPickerLeafletProps {
  lat?: number | null;
  lng?: number | null;
  onSelect: (lat: number, lng: number) => void;
  height?: string;
}

export function MapPickerLeaflet({ lat, lng, onSelect, height = '360px' }: MapPickerLeafletProps) {
  const hasPosition = lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng);
  const center: [number, number] = hasPosition ? [lat, lng] : DEFAULT_CENTER;
  const zoom = DEFAULT_ZOOM;

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height, width: '100%' }}
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
      <MapClickHandler onSelect={onSelect} />
      {hasPosition && (
        <>
          <CenterUpdater lat={lat} lng={lng} zoom={zoom} />
          <Marker position={[lat, lng]} icon={icon} />
        </>
      )}
    </MapContainer>
  );
}
