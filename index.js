const { Telegraf } = require("telegraf");
const env = require("./utils/env");
const commands = require("./commands");

const bot = new Telegraf(env.get("TELEGRAM_KEY"));

bot.start(({ reply }) =>
  reply(
    `This is the Clown tracker. Whenever you are feeling down or thinking that you are wasting your life, swing by and get a glimpse of the Clown's last moves on the Summoners Rift.\n\n`
  )
);

Object.entries(commands).forEach(([commandName, command]) => {
  bot.command(commandName.toLowerCase(), ({ reply }) => command().then(reply));
});

bot.launch();
