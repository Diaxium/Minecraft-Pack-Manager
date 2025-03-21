import { select } from "@inquirer/prompts";
import { snapshotOpen } from "../../../handlers/index.js";

/**
 * Prompts the user to confirm whether they want to proceed with opening the latest snapshot.
 * If confirmed, triggers the snapshotOpen function.
 * 
 * @async
 * @function openSnapshotCheck
 * @param {string} message - The prompt message to display to the user.
 * @param {Object} settings - The settings object containing configuration information.
 * @param {Object} session - The session object containing profile and path information.
 * @returns {Promise<void>}
 */
const openSnapshotCheck = async (message, settings, session) => {

    const approved = await select({
        message,
        choices: [
            { name: "Yes", value: true },
            { name: "No", value: false }
        ],
        loop: false
    });

    if (approved) {
        const { Snapshots_Folder } = session.get("Paths");
        await snapshotOpen(Snapshots_Folder, settings, session);
    }
};

export default openSnapshotCheck;
