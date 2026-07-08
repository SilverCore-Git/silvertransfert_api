import transferBackup from "./transferBackup/transferBackup";
import transferChecker from "./transferChecker/transferChecker";

// all jobs func
export default async () => {

    console.log('Run jobs');
    
    try {
        console.log('[JOBS]: starting transferChecker...');
        await transferChecker();
        console.log('[JOBS]: transferChecker completed');
    } catch (err) {
        console.error('[JOBS]: transferChecker failed:', err);
    }

    try {
        console.log('[JOBS]: starting transferBackup...');
        await transferBackup.run();
        console.log('[JOBS]: transferBackup completed');
    } catch (err) {
        console.error('[JOBS]: transferBackup failed:', err);
    }

}