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
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const recordsByCode = new Map();
const recordsByName = new Map();

// Get path to data/WBR.csv relative to index.js
const baseDir = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(baseDir, 'data', 'WBR.csv');

// Read and parse WBR
for (const line of fs.readFileSync(csvPath, 'utf8').split('\n').slice(1)) {
  if (!line.trim()) continue;

  const [species, code, count] = line.split(',');

  const record = {
    species: species.trim(),
    bandingCode: code.trim().toUpperCase(),
    count: Number(count),
  };

  recordsByCode.set(record.bandingCode, record);
  recordsByName.set(record.species.toUpperCase(), record);
}

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
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

// Command !records to the WBR document for review list bird counts
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();
  if (!content.toLowerCase().startsWith('!records')) return;

  const query = content.slice('!records'.length).trim();
  if (!query) {
    await message.reply(
      'Usage: `!records {Common Name}` or `!records {Four-letter Banding Code}`'
    );
    return;
  }

  const key = query.toUpperCase();

  let record =
    recordsByCode.get(key) ||
    recordsByName.get(key);

  if (!record) {
    await message.reply(
      `Could not find "${query}". Species/code may be incorrect, have no accepted records, or be non-review.`
    );
    return;
  }

  await message.reply(
    `**${record.species}** has **${record.count}** accepted records in Washington.`
  );
});

const region = 'US-WA';
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
