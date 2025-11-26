#!/usr/bin/env node

import {
  Client,
  GatewayIntentBits,
  Events,
  Collection,
  ActivityType,
} from 'discord.js';
import rbaStateData from './cron/rba-cron-config.js';
import initializeRBAJob from './cron/rba-cron.js';
import commands from './command-map.js';
import 'dotenv/config';
import connectToCluster from './database/connect.js';

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
console.log('Client created');

const dbClient = await connectToCluster(process.env.DB_URI);

client.commands = new Collection();

Object.keys(commands).forEach((commandName) => {
  const command = commands[commandName];
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] The command ${command} is missing a required "data" or "execute" property.`
    );
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'There was an error while executing this command!',
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: 'There was an error while executing this command!',
        ephemeral: true,
      });
    }
  }
});

const region = 'US-OR';
client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  initializeRBAJob(
    client,
    region,
    dbClient,
    rbaStateData[region].filteredSpecies,
    rbaStateData[region].channelIds,
    rbaStateData[region].regionChannelMapping
  ).then((CARBA) => (CARBA ? CARBA.start() : CARBA.destroy()));
  client.user.setActivity(`for birds`, {
    type: ActivityType.Watching,
  });
});

// Log in to Discord with your client's token
console.log('Attempting login...');
const token = process.env.DISCORD_TOKEN;
client.login(token);
