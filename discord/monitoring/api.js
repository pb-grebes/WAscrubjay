import { EmbedBuilder } from 'discord.js';

const MONITOR_CHANNEL = '1223336124806856916';

function alertOnAPIFailure(client, error) {
  console.log('error', error);
  const channel = client?.channels?.cache?.get(MONITOR_CHANNEL);
  const builder = new EmbedBuilder()
    .setTitle(':fire: API Failure! :fire:')
    .setDescription(`There was an error with an external API: ${error}`);
  channel.send({ embeds: [builder] });
}

export default alertOnAPIFailure;
