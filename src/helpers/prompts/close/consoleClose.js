import { select } from "@inquirer/prompts";
import ansi from "ansi-escape-sequences";

import { logger } from "../../../utils/index.js";

/**
 * Creates a tagged logger instance for module-specific logging.
 * @type {logger.Tag}
 */
const taggedConsole = new logger.Tag("CONSOLE", "📄", ansi.rgb(208, 254, 255));

/**
 * Asynchronously prompts the user to confirm exiting the application.
 * Continuously re-prompts if the user selects "No".
 * 
 * @async
 * @function closeConsole
 * @param {string} message - The prompt message displayed to the user.
 * @returns {Promise<void>} Resolves when the application either exits or continues.
 */
const closeConsole = async (message) => {
    try {
        const accepted = await select({
            message,
            choices: [
                { name: "Yes", value: true },
                { name: "No", value: false }
            ],
            loop: false
        });

        if (accepted) {
            taggedConsole.info("Exiting Minecraft-Pack-Manager...");

            // Clear the console and exit the process after a brief delay.
            setTimeout(() => taggedConsole.clear(), 1000);
            setTimeout(() => process.exit(0), 2000);
        } else {
            taggedConsole.info("Continuing Minecraft-Pack-Manager...");

            // Recursively call closeConsole to prompt the user again.
            await closeConsole(message);
        }
    } catch (error) {
        taggedConsole.error(`An error occurred: ${error.message}`);
    }
};

export default closeConsole;
