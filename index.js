const { Telegraf } = require("telegraf");
const { readFileSync } = require("fs");
const { once } = require("lodash");
const env = require("./utils/env");
const commands = require("./commands");

const getCommandsHelp = once(() => {
  const lines = readFileSync("./commands/index.js", "utf8").split("\n");

  return lines.reduce(
    (commandsHelp, line, i) =>
      Object.keys(commands).some((command) => line.includes(`const ${command}`))
        ? `${commandsHelp}\n/${line
            .match(/const (\w+)/)[1]
            .toLowerCase()}: ${lines[i - 1].replace("// ", "")}`
        : commandsHelp,
    ""
  );
});

const bot = new Telegraf(env.get("TELEGRAM_KEY"));

bot.start(({ reply }) =>
  reply(
    `This is the Clown tracker. Whenever you are feeling down or thinking that you are wasting your life, swing by and get a glimpse of the Clown's latest moves on the Summoners Rift.\n\n` +
      getCommandsHelp()
  )
);

bot.help(({ reply }) => reply(getCommandsHelp()));

Object.entries(commands).forEach(([commandName, command]) => {
  bot.command(commandName.toLowerCase(), ({ reply }) => command().then(reply));
});

bot.launch();
