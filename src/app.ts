if (process.env.NODE_ENV != "production") {
  const dotenv = require(`dotenv`);
  dotenv.config({
    path: `${__dirname}/config.env`
  });
}
import { Client, Message } from "discord.js";
import { Ementa } from "./com.brenosalles.ementa/Ementa";
import { parseEmenta } from "./com.brenosalles.ementa/EmentaParser";
import {
  downloadFile,
  startConversionJob,
  checkConversionJob,
  getAllFiles,
  deleteFile,
  downloadEmentaPdf
} from "./com.brenosalles.ementa/EmentaDownloader";

const sleep = (n: number) => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
};

const sendEmentasToChannel = (ementas: Array<Ementa>, message: Message) => {
  if (ementas.length == 0) {
    message.channel.send(`No menus available!`);
    return;
  }
  for (const ementa of ementas) {
    message.channel.send(ementa.toString());
  }
};

let ementas: Array<Ementa> = [];
const client: Client = new Client();

client.once("ready", async () => {
  const allFiles: Array<any> = (await getAllFiles())["data"];

  // Finds newest .xlsx file
  const newestFile: any = allFiles.reduce(
    (previous: any, current: any): any => {
      if (current["format"] != "xlsx") {
        // Wrong format
        return previous;
      }
      const previousDate: Date = new Date(previous["created_at"]);
      const currentDate: Date = new Date(current["created_at"]);
      return previousDate.getTime() > currentDate.getTime()
        ? previous
        : current;
    }
  );

  // Downloads new file
  await downloadFile(newestFile["id"], `${__dirname}/${newestFile["name"]}`);

  ementas = parseEmenta(`${__dirname}/ESTGV.xlsx`);
});

client.on("message", message => {
  if (message.author.bot) {
    return;
  }
  if (message.content.startsWith("!") === false) {
    return;
  }
  const args: Array<string> = message.content.slice("!".length).split(/ +/);
  const commandName: string = (<string>args.shift()).toLowerCase();

  switch (commandName) {
    case "help":
      message.reply(
        "the possible commands are:\n`!today` - sends today's menu.\n`!tomorrow` - sends tomorrow's menu.\n`!day dd-mm` - get a specific day menu."
      );
      break;
    case "today":
      const today: Date = new Date();
      const todayEmentas: Array<Ementa> = ementas.filter(ementa => {
        if (ementa.getDate().getUTCDate() != today.getUTCDate()) {
          return;
        }
        if (ementa.getDate().getUTCMonth() != today.getUTCMonth()) {
          return;
        }
        return ementa;
      });
      sendEmentasToChannel(todayEmentas, message);
      break;
    case "tomorrow":
      const tomorrow: Date = new Date(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate() + 1
      );
      const tomorrowEmentas: Array<Ementa> = ementas.filter(ementa => {
        if (ementa.getDate().getUTCDate() != tomorrow.getUTCDate()) {
          return;
        }
        if (ementa.getDate().getUTCMonth() != tomorrow.getUTCMonth()) {
          return;
        }
        return ementa;
      });
      sendEmentasToChannel(tomorrowEmentas, message);
      break;
    case "day":
      if (args.length == 0) {
        message.reply("wrong command. Please type `!help` to understand it.");
        break;
      }
      const day: string = args[0].split("-")[0];
      const month: string = args[0].split("-")[1];
      const date: Date = new Date(
        new Date().getUTCFullYear(),
        +month - 1,
        +day
      );
      const specificEmentas: Array<Ementa> = ementas.filter(ementa => {
        if (ementa.getDate().getUTCDate() != date.getUTCDate()) {
          return;
        }
        if (ementa.getDate().getUTCMonth() != date.getUTCMonth()) {
          return;
        }
        return ementa;
      });
      sendEmentasToChannel(specificEmentas, message);
      break;
  }
});

client.login(process.env.DISCORD_TOKEN);
