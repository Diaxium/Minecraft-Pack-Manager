import { select } from "@inquirer/prompts";
import { createSnapshot } from "../../../handlers/index.js";

/**
 * Prompts the user to confirm whether they want to proceed with creating a snapshot.
 * If confirmed, triggers the createSnapshot function.
 * 
 * @async
 * @function createSnapshotCheck
 * @param {string} message - The prompt message to display to the user.
 * @param {Object} settings - The settings object containing configuration information.
 * @param {Object} session - The session object containing profile and path information.
 * @returns {Promise<void>}
 */
const createSnapshotCheck = async (message, settings, session) => {

    const approved = await select({
        message,
        choices: [
            { name: "Yes", value: true },
            { name: "No", value: false }
        ],
        loop: false
    });

    if (approved) {
        await createSnapshot(settings, session);
    }
};

export default createSnapshotCheck;
