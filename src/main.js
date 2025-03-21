import { logger } from "./utils/index.js";
import { GetSettings, Session } from "./config/index.js";
import { 
    initializePaths, 
    initializeSnapshots, 
    closeConsole, 
    createSnapshotCheck, 
    openSnapshotCheck, 
    copyModsCheck, 
    deleteModsCheck, 
    cleanupLogsCheck 
} from "./helpers/prompts/index.js";

/**
 * Initializes the Minecraft Pack Manager based on the provided hook argument.
 * Handles pre-launch and post-exit scenarios, including snapshot handling, mod copying,
 * mod deletion, and log cleanup.
 * 
 * @async
 * @function init
 * @returns {Promise<void>}
 */
const init = async () => {

    const hook = process.argv[2];
    const Settings = GetSettings();

    // Initialize paths and snapshots.
    await initializePaths(Settings, Session);
    await initializeSnapshots(Settings, Session);

    switch (hook) {

        case "pre-launch":
            await createSnapshotCheck(
                "Would you like to create a snapshot backup of your current mod setup before launching Minecraft?", 
                Settings, 
                Session
            );

            await openSnapshotCheck(
                "Do you want to open the latest snapshot backup?", 
                Settings, 
                Session
            );

            await copyModsCheck(
                "Should the mods be copied to your primary Minecraft profile?", 
                Session
            );

            // Clear session data and prepare for exit.
            Session.clear();
            await closeConsole("Ready to launch Minecraft? Proceed when ready.");
            break;

        case "post-exit":
            await deleteModsCheck(
                "Would you like to remove the mods from your primary profile now that Minecraft has exited?", 
                Session
            );

            await openSnapshotCheck(
                "Do you want to open the latest snapshot backup?", 
                Settings, 
                Session
            );

            await cleanupLogsCheck(
                "Do you want to delete the logs generated during this session to free up space?"
            );

            // Clear session data and prepare for exit.
            Session.clear();
            await closeConsole("Do you want to close Minecraft-Pack-Manager now?");
            break;

        default:
            logger.error("Invalid argument. Use 'pre-launch' or 'post-exit'.");

            // Clear session data and prepare for exit.
            Session.clear();
            await closeConsole("Do you want to close Minecraft-Pack-Manager now?");
            break;
    }
}

// Execute the script
await init();
