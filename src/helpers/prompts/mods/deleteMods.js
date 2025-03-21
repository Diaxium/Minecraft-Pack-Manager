import { select } from "@inquirer/prompts";
import { deleteMods } from "../../../handlers/index.js";

/**
 * Prompts the user to confirm whether they want to proceed with deleting mods.
 * If confirmed, triggers the deleteMods function.
 * 
 * @async
 * @function deleteModsCheck
 * @param {string} message - The prompt message to display to the user.
 * @param {Object} session - The session object containing profile and path information.
 * @returns {Promise<void>}
 */
const deleteModsCheck = async (message, session) => {

    const approved = await select({
        message,
        choices: [
            { name: "Yes", value: true },
            { name: "No", value: false }
        ],
        loop: false
    });

    if (approved) {
        await deleteMods(session);
    }
};

export default deleteModsCheck;
