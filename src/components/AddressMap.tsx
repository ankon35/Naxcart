import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface AddressMapProps {
  address: string;
  onAddressSelect?: (address: string) => void;
  onLocationFound?: (isDhaka: boolean) => void;
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

function LocationMarker({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

const DEFAULT_CENTER: [number, number] = [23.8103, 90.4125]; // Dhaka

export default function AddressMap({ address, onAddressSelect, onLocationFound }: AddressMapProps) {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const isMapClick = useRef(false);

  useEffect(() => {
    // If the update came from a map click, we don't want to re-geocode
    // because we already have the exact coordinates (the click position).
    if (isMapClick.current) {
      isMapClick.current = false;
      return;
    }

    if (!address || address.length < 5) {
      setPosition(null);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        // Using Photon API as it's more lenient with CORS and rate limits than Nominatim
        const response = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1`
        );
        const data = await response.json();
        if (data && data.features && data.features.length > 0) {
          const [lon, lat] = data.features[0].geometry.coordinates;
          setPosition([lat, lon]);

          if (onLocationFound) {
            const props = data.features[0].properties;
            // Stricter check for Dhaka City Corporation area
            // Photon usually returns 'city' as 'Dhaka' for the main city area
            const isDhakaCity = 
              props.city?.toLowerCase() === 'dhaka' || 
              props.name?.toLowerCase().includes('dhaka south city corporation') ||
              props.name?.toLowerCase().includes('dhaka north city corporation');
            
            onLocationFound(!!isDhakaCity);
          }
        }
      } catch (error) {
        console.error("Error geocoding address:", error);
        // Fallback to Nominatim if Photon fails
        try {
           const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`
          );
          const data = await response.json();
          if (data && data.length > 0) {
            setPosition([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
            
            if (onLocationFound && data[0].address) {
                const addr = data[0].address;
                // Nominatim is more detailed. 'city' is usually 'Dhaka' for the corporation area.
                // 'state' is 'Dhaka Division' which we want to exclude if city is NOT Dhaka.
                const isDhakaCity = 
                    addr.city?.toLowerCase() === 'dhaka' || 
                    addr.city_district?.toLowerCase() === 'dhaka';
                onLocationFound(!!isDhakaCity);
            }
          }
        } catch (e) {
           console.error("Fallback geocoding failed:", e);
        }
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [address]);

  const handleMapClick = async (lat: number, lng: number) => {
    setLoading(true);
    setPosition([lat, lng]);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      if (data && data.display_name && onAddressSelect) {
        isMapClick.current = true;
        onAddressSelect(data.display_name);

        if (onLocationFound && data.address) {
            const addr = data.address;
            const isDhakaCity = 
                addr.city?.toLowerCase() === 'dhaka' || 
                addr.city_district?.toLowerCase() === 'dhaka';
            onLocationFound(!!isDhakaCity);
        }
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const center = position || DEFAULT_CENTER;

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border border-white/10 relative z-0">
      <MapContainer center={center} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {position && (
          <Marker position={position}>
            <Popup>
              {address}
            </Popup>
          </Marker>
        )}
        <MapUpdater center={center} />
        <LocationMarker onSelect={handleMapClick} />
      </MapContainer>
      {loading && (
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md z-[1000]">
          Locating...
        </div>
      )}
    </div>
  );
}
