const Discord = require('discord.js');
const client = new Discord.Client();
const fetch = require('node-fetch');
const querystring = require('querystring');
const { prefix, token} = require("./config.json");
const trim = (str, max) => str.length > max ? `${str.slice(0, max -3 )}...` : str;
const fs = require('fs');

client.commands = new Discord.Collection();
client.cooldowns = new Discord.Collection();

const commandFolders = fs.readdirSync('./commands');

const commandFiles = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));

for (const folder of commandFolders) {
    const commandFiles = fs.readdirSync(`./commands/${folder}`).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const command = require(`./commands/${folder}/${file}`);
        client.commands.set(command.name, command);
    }
}

client.on('ready', () => 
{
    console.log(`${client.user.tag} is online`);
    client.user.setActivity('Battlefield 2', { type: 'PLAYING' })
  .then(presence => console.log(`Activity set to ${presence.activities[0].name}`))
  .catch(console.error);
});

client.on('message', message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName)
        || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) return;

    if (command.guildOnly && message.channel.type === 'dm') {
        return message.reply('I can\'t execute that command inside DMs!');
    }

    if (command.permissions) {
        const authorPerms = message.channel.permissionsFor(message.author);
        if (!authorPerms || !authorPerms.has(command.permissions)) {
            return message.reply('You can not do this!');
        }
    }

    if (command.args && !args.length) {
        let reply = `You didn't provide any arguments, ${message.author}!`;

        if (command.usage) {
            reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
        }

        return message.channel.send(reply);
    }

    const { cooldowns } = client;

    if (!cooldowns.has(command.name)) {
        cooldowns.set(command.name, new Discord.Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(message.author.id)) {
        const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

        if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
        }
    }

    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply('there was an error trying to execute that command!');
    }
});

client.on('message', async message => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'cat') {
      const { file } = await fetch('https://aws.random.cat/meow').then(response => response.json());

      message.channel.send(file);
  } else if (command === 'urban') {
      if (!args.length) {
          return message.channel.send('You need to supply a search term!');
      }

      const query = querystring.stringify({ term: args.join(' ') });

      const { list } = await fetch(`https://api.urbandictionary.com/v0/define?${query}`).then(response => response.json());

      if (!list.length) {
          return message.channel.send(`No results found for **${args.join(' ')}**.`);
      }

      const [answer] = list;

      const embed = new Discord.MessageEmbed()
          .setColor('#EFFF00')
          .setTitle(answer.word)
          .setURL(answer.permalink)
          .addField('Definition', trim(answer.definition, 1024))
          .addField('Example', trim(answer.example, 1024))
          .addField('Rating', `${answer.thumbs_up} thumbs up. ${answer.thumbs_down} thumbs down.`);

      message.channel.send(embed);
  }
});

client.on('message', message => {
    if (message.channel.type != 'text' || message.author.bot)
      return;
  
    let command = message.content.split(' ')[0].slice(1);
    let args = message.content.replace('.' + command, '').trim();
    let isBotOwner = message.author.id == '620627263074992158';
  
    switch (command) {
      case 'restart': {
        if (!isBotOwner)
          return;
  
        message.channel.send('Restarting...').then(m => {
          client.destroy().then(() => {
            client.login(token);
          });
        });
        break;
      }
  
  
      case 'shutdown': {
        if (!isBotOwner)
          return;
  
        message.channel.send('Shutting down...').then(m => {
          client.destroy();
        });
        break;
      }
    }
  });

client.login(token);