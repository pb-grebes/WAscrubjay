/* eslint-disable no-underscore-dangle */
import rbaStateData from '../../cron/rba-cron-config.js';

/**
 * Parses filter data to get a set of species to filter by.
 * @param {Object[]} filterData - Array of filter data.
 * @returns {Set} filteredSpecies - Set of species to filter on.
 */
export function parseFilter(filterData) {
  const filteredSpecies = new Set();
  filterData.forEach((species) => {
    filteredSpecies.add(species.species);
  });
  return filteredSpecies;
}

/**
 * Filters out observations that are in the specified filter.
 * @param {Array<import('../../typedefs.js').RecentNotableObservation>} observations - Array of observations
 * @param {Set} filter - Set of species to filter on.
 * @returns {Array<import('../../typedefs.js').RecentNotableObservation>} filteredObservations - Array of filtered observations
 */
export function filterObservations(observations, filter) {
  return observations
    .filter((observation) => !observation._id.comName.includes('hybrid'))
    .filter((observation) => {
      const commonName = observation._id.comName.replace(/ \(.*\)/, '');
      return !filter.has(commonName);
    });
}

/**
 *
 * @param {Array<import('../../typedefs.js').RecentNotableObservation>} newObservations - Array of the new observations
 * @param {string} region - Region code of the region to separate observations by. Ex: US-CA.
 * @returns {Map<string, Array<import('../../typedefs.js').RecentNotableObservation>>}
 */
export function separateObservationsByRegion(newObservations, region) {
  const separatedObservations = new Map();
  newObservations.forEach((observation) => {
    const key =
      rbaStateData[region].countyRegionMapping[observation.location.county];
    if (separatedObservations.has(key)) {
      separatedObservations.get(key).push(observation);
    } else {
      separatedObservations.set(key, [observation]);
    }
  });
  return separatedObservations;
}

/**
 * Groups observations by species and subId.
 * @param {Array<import('../../typedefs.js').eBirdObservation>} observations - Array of observations
 * @returns {Array<import('../../typedefs.js').eBirdObservation>} groupedObservations - Array of grouped observations
 */
export function groupObservationsBySpeciesAndSubId(observations) {
  const observationsGroupedBySubId = new Map();
  const observationsAdded = new Set();
  observations.forEach((observation) => {
    const key = `${observation.speciesCode}+${observation.subId}`;
    if (!observationsAdded.has(key)) {
      observationsGroupedBySubId.set(key, {
        ...observation,
        evidence: [observation.evidence],
      });
      observationsAdded.add(key);
    } else {
      const existingObservation = observationsGroupedBySubId.get(key);
      existingObservation.evidence.push(observation.evidence);
    }
  });
  return Array.from(observationsGroupedBySubId.values());
}
