import cron from "node-cron";
import run from "./run.js";

cron.schedule("0 1 * * *", async () => {
    await run();
}, {
    timezone: "Europe/Paris"
});