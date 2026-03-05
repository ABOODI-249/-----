require("./Configurations");
const {
  default: darklegendConnect,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadContentFromMessage,
  makeInMemoryStore,
  jidDecode,
} = require("baileysjs");
const fs = require("fs");
const figlet = require("figlet");
const { join } = require("path");
const got = require("got");
const pino = require("pino");
const path = require("path");
const FileType = require("file-type");
const { Boom } = require("@hapi/boom");
const { serialize, WAConnection } = require("./System/whatsapp.js");
const { smsg, getBuffer, getSizeMedia } = require("./System/Function2");
const express = require("express");
const app = express();
const PORT = global.port;
const welcomeLeft = require("./System/Welcome.js");
const { readcommands, commands } = require("./System/ReadCommands.js");
commands.prefix = global.prefa;
const mongoose = require("mongoose");
const Auth = require("./System/MongoAuth/MongoAuth");
const qrcode = require("qrcode");
const {
  getPluginURLs,
} = require("./System/MongoDB/MongoDb_Core.js");

const chalk = require("chalk");
const store = makeInMemoryStore({
  logger: pino().child({
    level: "silent",
    stream: "store",
  }),
});

// DarkLegend Server configuration
let QR_GENERATE = "invalid";
let status;

const startDarkLegend = async () => {
  try {
    await mongoose.connect(mongodb).then(() => {
      console.log(
        chalk.greenBright("Establishing secure connection with MongoDB...\n")
      );
    });
  } catch (err) {
    console.log(
      chalk.redBright(
        "Error connecting to MongoDB ! Please check MongoDB URL or try again after some minutes !\n"
      )
    );
    console.log(err);
  }

  const { getAuthFromDatabase } = new Auth(sessionId);
  const { saveState, state, clearState } = await getAuthFromDatabase();

  console.log(
    figlet.textSync("DARKLEGEND", {
      font: "Standard",
      horizontalLayout: "default",
      vertivalLayout: "default",
      width: 70,
      whitespaceBreak: true,
    })
  );

  console.log(`\n`);

  await installPlugin();

  const { version } = await fetchLatestBaileysVersion();

  const DarkLegend = darklegendConnect({
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,
    browser: ["DarkLegend", "Safari", "1.0.0"],
    auth: state,
    version,
  });

  store.bind(DarkLegend.ev);

  DarkLegend.public = true;

  async function installPlugin() {
    console.log(chalk.yellow("Checking for Plugins...\n"));
    let plugins = [];
    try {
      plugins = await getPluginURLs();
    } catch (err) {
      console.log(
        chalk.redBright(
          "Error connecting to MongoDB ! Please re-check MongoDB URL or try again after some minutes !\n"
        )
      );
      console.log(err);
    }

    if (!plugins.length || plugins.length == 0) {
      console.log(
        chalk.redBright("No Extra Plugins Installed ! Starting DarkLegend...\n")
      );
    } else {
      console.log(
        chalk.greenBright(plugins.length + " Plugins found ! Installing...\n")
      );
      for (let i = 0; i < plugins.length; i++) {
        pluginUrl = plugins[i];
        var { body, statusCode } = await got(pluginUrl);
        if (statusCode == 200) {
          try {
            var folderName = "Plugins";
            var fileName = path.basename(pluginUrl);

            var filePath = path.join(folderName, fileName);
            fs.writeFileSync(filePath, body);
          } catch (error) {
            console.log("Error:", error);
          }
        }
      }
      console.log(
        chalk.greenBright(
          "All Plugins Installed Successfully ! Starting DarkLegend...\n"
        )
      );
    }
  }

  await readcommands();

  DarkLegend.ev.on("creds.update", saveState);
  DarkLegend.serializeM = (m) => smsg(DarkLegend, m, store);

  DarkLegend.ev.on("connection.update", async (update) => {
    const { lastDisconnect, connection, qr } = update;

    if (connection) {
      console.info(`[ DARKLEGEND ] Server Status => ${connection}`);
    }

    if (connection === "close") {
      let reason = new Boom(lastDisconnect?.error)?.output.statusCode;

      if (reason === DisconnectReason.badSession) {
        console.log(`[ DARKLEGEND ] Bad Session File, Please Delete Session and Scan Again.\n`);
        process.exit();
      } else if (reason === DisconnectReason.connectionClosed) {
        console.log("[ DARKLEGEND ] Connection closed, reconnecting....\n");
        startDarkLegend();
      } else if (reason === DisconnectReason.connectionLost) {
        console.log("[ DARKLEGEND ] Connection Lost from Server, reconnecting...\n");
        startDarkLegend();
      } else if (reason === DisconnectReason.connectionReplaced) {
        console.log("[ DARKLEGEND ] Connection Replaced, Another New Session Opened!\n");
        process.exit();
      } else if (reason === DisconnectReason.loggedOut) {
        clearState();
        console.log(`[ DARKLEGEND ] Device Logged Out, Please Delete Session and Scan Again.\n`);
        process.exit();
      } else if (reason === DisconnectReason.restartRequired) {
        console.log("[ DARKLEGEND ] Server Restarting...\n");
        startDarkLegend();
      } else if (reason === DisconnectReason.timedOut) {
        console.log("[ DARKLEGEND ] Connection Timed Out, Trying to Reconnect...\n");
        startDarkLegend();
      }
    }

    if (qr) {
      QR_GENERATE = qr;
    }
  });

  DarkLegend.ev.on("group-participants.update", async (m) => {
    welcomeLeft(DarkLegend, m);
  });

  DarkLegend.ev.on("messages.upsert", async (chatUpdate) => {
    m = serialize(DarkLegend, chatUpdate.messages[0]);

    if (!m.message) return;
    if (m.key && m.key.remoteJid == "status@broadcast") return;
    if (m.key.id.startsWith("BAE5") && m.key.id.length == 16) return;

    require("./Core.js")(DarkLegend, m, commands, chatUpdate);
  });
};

startDarkLegend();

app.use("/", express.static(join(__dirname, "Frontend")));

app.get("/qr", async (req, res) => {
  const { session } = req.query;

  if (!session)
    return res.send("Please Provide the session ID !");

  if (sessionId !== session)
    return res.send("Invalid session ID !");

  res.setHeader("content-type", "image/png");
  res.send(await qrcode.toBuffer(QR_GENERATE));
});

app.listen(PORT);
