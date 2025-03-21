import { select } from "@inquirer/prompts";
import { copyMods } from "../../../handlers/index.js";

/**
 * Prompts the user to confirm whether they want to proceed with copying mods.
 * If confirmed, triggers the copyMods function.
 * 
 * @async
 * @function copyModsCheck
 * @param {string} message - The prompt message to display to the user.
 * @param {Object} session - The session object containing profile and path information.
 * @returns {Promise<void>}
 */
const copyModsCheck = async (message, session) => {

    const approved = await select({
        message,
        choices: [
            { name: "Yes", value: true },
            { name: "No", value: false }
        ],
        loop: false
    });

    if (approved) {
        await copyMods(session);
    }
};

export default copyModsCheck;
