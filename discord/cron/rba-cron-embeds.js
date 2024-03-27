/* eslint-disable no-underscore-dangle */
/**
 * @fileoverview This file contains the functions that generate the embeds for the
 * rare bird alert functionality.
 */

import { EmbedBuilder } from 'discord.js';

/**
 * Generates a description for a RecentNotableObservation
 * @param {import('../typedefs').RecentNotableObservation} observation
 * @returns
 */
function generateDescription(observation) {
  const { comName, locId } = observation._id;
  const { name } = observation.location;
  const { numNewObs, previousConfirmed } = observation;
  const aOrAn = comName[0].match('^[aieouAIEOU].*') ? 'An' : 'A';
  let description = `${aOrAn} ${comName} was`;
  if (Math.max(...observation.howMany) > 1) {
    description = `${Math.max(...observation.howMany)} ${comName} were`;
  }
  if (observation.location.isPrivate) {
    description += ` reported at a personal location`;
  } else {
    description += ` reported at [${name}](https://ebird.org/hotspot/${locId})`;
  }
  description += `\n:alarm_clock: latest report at ${observation.mostRecentTime}`;
  description += `\n:eyes: - ${numNewObs} new report(s)`;
  if (previousConfirmed) {
    description += `\n:white_check_mark: - Confirmed at location in last week`;
  } else {
    description += `\n:question: - Not confirmed at location in last week`;
  }
  const photos = observation.evidence.filter((e) => e === 'P').length;
  const audio = observation.evidence.filter((e) => e === 'A').length;

  if (photos > 0 && audio > 0) {
    description += `\n:camera: - ${photos} photo(s), ${audio} recording(s)`;
  } else if (photos > 0) {
    description += `\n:camera: - ${photos} photo(s)`;
  } else if (audio > 0) {
    description += `\n:microphone2: - ${audio} recording(s)`;
  }
  return description;
}

/**
 * Generates an embed for a RecentNotableObservation.
 * @param {import('../typedefs').RecentNotableObservation} observation - A RecentNotableObservation object, as defined in typedefs.js.
 * @returns
 */
function generateEmbed(observation) {
  const { comName } = observation._id;
  const { county } = observation.location;
  const description = generateDescription(observation);
  const builder = new EmbedBuilder()
    .setColor(observation.previousConfirmed ? 0x32cd32 : 0xffff00)
    .setTitle(`${comName} - ${county}`)
    // .setAuthor({ name: 'eBird RBA' })
    .setURL(`https://ebird.org/checklist/${observation.newChecklists[0]}`)
    .setDescription(description);
  return builder;
}

/**
 * Generates an array of embeds for a list of new observations.
 * @param {Array.<import('../typedefs').RecentNotableObservation>} groupedObservations
 */
export function generateEmbeds(groupedObservations) {
  const observationsToSend = [];
  groupedObservations.forEach((observation) => {
    const embed = generateEmbed(observation);
    console.log('Successfully generated embed for', observation._id.comName);
    observationsToSend.push(embed);
  });
  return observationsToSend;
}

/**
 *
 * @param {Client.<boolean>} client
 * @param {Array.<EmbedBuilder>} observations
 * @param {Array.<string>} channels
 */
export async function sendEmbeds(client, embeds, channels) {
  channels.forEach((channelId) => {
    try {
      const channel = client.channels.cache.get(channelId);
      embeds.forEach((embed) => {
        setTimeout(() => {
          try {
            channel.send({ embeds: [embed] });
          } catch (err) {
            console.log('Likely missing permissions for ', channelId, err);
          }
        }, 500);
      });
    } catch (err) {
      console.log(err);
    }
  });
}
