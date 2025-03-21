import ansi from "ansi-escape-sequences";
import { number } from "@inquirer/prompts";

import { logger } from "../../../utils/index.js";
import { snapshotLimit } from "../../../handlers/index.js";
import { DefaultSettings } from "../../../config/index.js";

/**
 * Creates a tagged logger instance for module-specific logging.
 * @type {logger.Tag}
 */
const taggedConsole = new logger.Tag("SNAPSHOTS", "📄", ansi.rgb(208, 254, 255));

/**
 * Prompts the user to input the maximum number of snapshots they wish to store.
 * 
 * @async
 * @function inputMaximumSnapshots
 * @param {number} Default - The default maximum snapshot limit.
 * @returns {Promise<number>} The user-specified maximum snapshot limit.
 */
const inputMaximumSnapshots = async (Default) => {
    return await number({
        message: "Please specify the limit for snapshots:",
        min: 0,
        default: Default
    });
};

/**
 * Initializes the snapshot storage limit by prompting the user for input (if settings are new)
 * and then enforces the snapshot limit by calling the snapshotLimit handler.
 * 
 * @async
 * @function initializeSnapshots
 * @param {Object} settings - An object providing get and update methods for application settings.
 * @param {Object} session - An object providing get and update methods for application session.
 * @returns {Promise<void>}
 */
const initializeSnapshots = async (settings, session) => {

    if (settings.isNew) {
        const defaultMaximum = DefaultSettings.Maximum_Snapshots;

        // Prompt the user to set the maximum number of snapshots.
        const maximumSnapshots = await inputMaximumSnapshots(defaultMaximum);

        taggedConsole.beginGrouping();
        taggedConsole.info(`Maximum Snapshots set to: ${maximumSnapshots}`);

        // Update the settings with the user-defined snapshot limit.
        settings.update("Maximum_Snapshots", maximumSnapshots);

        taggedConsole.endGrouping();
    }

    // Apply the snapshot limit handling.
    await snapshotLimit(session.get("Paths").Snapshots_Folder, settings);
};

export default initializeSnapshots;
