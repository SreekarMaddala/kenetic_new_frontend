export interface AttendanceLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export function captureLocation(): Promise<AttendanceLocation> {
  return new Promise((resolve, reject) => {
    if (!window.isSecureContext || !navigator.geolocation) {
      reject(new Error("Location requires a supported browser on HTTPS (or localhost)."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        }),
      (error) =>
        reject(
          new Error(
            error.code === 1
              ? "Location permission was denied. Allow location access in your browser and try again."
              : error.code === 3
                ? "Location request timed out. Please try again."
                : "Unable to find your location. Enable device location services and try again.",
          ),
        ),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  });
}

export function attendanceMapUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const { latitude, longitude } = value as AttendanceLocation;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
}
