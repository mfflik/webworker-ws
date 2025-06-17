export const NAUTICAL_MILES_CONSTANT = 1852;

/**
 * Convert distance from meters to nautical miles.
 *
 * @param {number} distanceMeters - Distance in meters.
 * @returns {number} Distance in nautical miles.
 */
export const convertMetersToNauticalMiles = (distanceMeters: number) => {
   return distanceMeters / NAUTICAL_MILES_CONSTANT;
};

/**
 * Convert distance from nautical miles to meters.
 *
 * @param {number} distanceNauticalMiles - Distance in nautical miles.
 * @returns {number} Distance in meters.
 */
export const convertNauticalMilesToMeters = (distanceNauticalMiles: number) => {
  return distanceNauticalMiles * NAUTICAL_MILES_CONSTANT;
};
