import sirv from "sirv";
import polka from "polka";
import * as sapper from "@sapper/server";

const compression = require("compression");
const { PORT, NODE_ENV } = process.env;
const dev = NODE_ENV === "development";

polka() // You can also use Express
  .use(
    compression({
      threshold: 0,
    }),
    sirv("static", { dev }),
    sapper.middleware()
  )
  .listen(PORT);
