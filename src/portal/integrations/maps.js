/**
 * Optional maps integration point. The booking wizard works with plain address fields and does not need this.
 * To add a map picker later, implement this interface and render your picker in features/booking/steps/PickupStep.jsx:
 *
 *   mapsProvider = {
 *     // Show a picker; resolve with the chosen place or null if dismissed.
 *     pickLocation(initial?): Promise<{ address, city, postalCode, lat, lng } | null>
 *   }
 */
export const mapsProvider = null;
