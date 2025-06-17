
import LatLon from "geodesy/latlon-ellipsoidal-vincenty";
import { convertNauticalMilesToMeters } from "./distanceConversions";

/**
 * Calculate new latitude and longitude given an initial point and a bearing and range
 * @param {number} lat - Latitude of the initial point
 * @param {number} lon - Longitude of the initial point
 * @param {number} bearing - Bearing (in degrees)
 * @param {number} range - Range (in unit default to nm)
 * @return {array} An array [latitude, longitude] of the new point
 */
export const calculateVincentyLatLon = (
  lat: number,
  lon: number,
  bearing: number,
  range: number,
  unit = "nm"
) => {
  let distanceInMeters;

  if (unit === "nm") {
    distanceInMeters = convertNauticalMilesToMeters(range);
  } else {
    distanceInMeters = range;
  }

  const initialPoint = new LatLon(lat, lon);
  const destination = initialPoint.destinationPoint(distanceInMeters, bearing);
  return [destination.lon, destination.lat];
};
