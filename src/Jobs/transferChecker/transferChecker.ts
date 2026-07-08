import 'dotenv/config';
import config from '../../config/config';

import _ExpireManager from "./assets/ExpireManager";
import _DiskReporter from "./assets/DiskReporter";

const webhook: string = process.env.DISCORD_WEBHOOK || 'https://d.d';

const ExpireManager = new _ExpireManager();
const DiskReporter = new _DiskReporter(config.DBFile, webhook);

export default async () => {
    await Promise.all([
        ExpireManager.run(),
        DiskReporter.run() 
    ])
}