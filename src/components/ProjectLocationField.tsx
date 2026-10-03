import * as React from "react";
import { toast } from "sonner";
import { captureLocation } from "../lib/location";

export function ProjectLocationField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [mapLocation, setMapLocation] = React.useState(value);
  const [locating, setLocating] = React.useState(false);
  React.useEffect(() => {
    const timer = window.setTimeout(() => setMapLocation(value.trim()), 600);
    return () => window.clearTimeout(timer);
  }, [value]);

  async function useCurrentLocation() {
    setLocating(true);
    try {
      const { latitude, longitude } = await captureLocation();
      onChange(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to find your location.");
    } finally {
      setLocating(false);
    }
  }

  return (
    <div className="space-y-2 md:col-span-2">
      <label htmlFor="project-location" className="font-semibold text-muted-foreground">
        Location (City, State or Coordinates) *
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="project-location"
          type="text"
          placeholder="e.g. Bangalore, KA"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          className="min-w-0 flex-1 p-2.5 bg-background border border-border rounded-lg text-sm text-foreground focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="px-3 py-2 border border-border rounded-lg disabled:opacity-50"
        >
          {locating ? "Locating..." : "Use current location"}
        </button>
      </div>
      <p className="text-muted-foreground">
        Enter the project site to update the map, or use your device location while on site.
      </p>
      {mapLocation && (
        <div className="space-y-2">
          <iframe
            title="Project location map"
            loading="lazy"
            referrerPolicy="no-referrer"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(mapLocation)}&output=embed`}
            className="w-full h-48 rounded-lg border border-border"
          />
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapLocation)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Open location in Google Maps
          </a>
        </div>
      )}
    </div>
  );
}
