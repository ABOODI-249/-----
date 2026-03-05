require("dotenv").config();

let gg = process.env.MODS;
if (!gg) {
  gg = "213553240538"; // رقم مالك البوت (الجزائر)
}

global.owner = gg.split(",");
global.mongodb = process.env.MONGODB || "Put your alternative mongodb url here";
global.sessionId = process.env.SESSION_ID || "ok";
global.prefa = process.env.PREFIX || "-";
global.tenorApiKey = process.env.TENOR_API_KEY || "AIzaSyCyouca1_KKy4W_MG1xsPzuku5oa8W358c";

global.packname = process.env.PACKNAME || `DARK LEGEND 100`;
global.author = process.env.AUTHOR || "by: Dark Legend";

global.port = process.env.PORT || "10000";
global.openAiAPI = process.env.OPENAI_API || "Put your openai API key here";

global.owner = gg.split(",");

module.exports = {
  mongodb: global.mongodb,
};
