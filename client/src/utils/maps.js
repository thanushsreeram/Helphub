/**
 * Constructs a Google Maps URL for navigation / location viewing
 * given an address or coordinates string.
 *
 * Uses the universal Google Maps Search / Dir API format:
 * https://www.google.com/maps/search/?api=1&query=...
 */
export const getGoogleMapsUrl = (location) => {
  if (!location || !location.trim()) {
    return "";
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.trim())}`;
};

/**
 * Safely opens Google Maps in a new tab with security attributes (noopener, noreferrer)
 */
export const openGoogleMaps = (location, e) => {
  if (e && typeof e.stopPropagation === "function") {
    e.stopPropagation();
  }
  const url = getGoogleMapsUrl(location);
  if (url) {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};
