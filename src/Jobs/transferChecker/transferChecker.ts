import config from '../../config/config';
import path from 'path';
import 'dotenv/config';

import _ExpireManager from "./assets/ExpireManager";
import _DiskReporter from "./assets/DiskReporter";

const webhook: string = process.env.DISCORD_WEBHOOK;
if (!webhook) {
    throw new Error('CRITICAL: DISCORD_WEBHOOK environment variable is not defined. Never use hardcoded default values for secrets.');
}

const ExpireManager = new _ExpireManager();
const DiskReporter = new _DiskReporter(config.DBFile, webhook);

export default () => {
    ExpireManager.run();
    DiskReporter.run();
}