import ansi from "ansi-escape-sequences";
import fs from "fs/promises";
import path from "path";

import { logger } from "../../utils/index.js";

/**
 * Creates a tagged logger instance for module-specific logging.
 * @type {logger.Tag}
 */
const taggedConsole = new logger.Tag("MODS", "📄", ansi.rgb(255, 17, 17));

/**
 * Asynchronously deletes all mods from the primary profile's "mods" folder.
 * Logs the status of each deletion and handles errors gracefully.
 * 
 * @async
 * @function deleteMods
 * @param {Object} session - The session object containing profile and path information.
 * @returns {Promise<void>}
 */
const deleteMods = async (session) => {
    taggedConsole.beginGrouping();
    taggedConsole.info("Deleting Mods...");

    const { Primary_Profile } = session.get("Paths");
    const modsPath = path.join(Primary_Profile, "mods");

    try {
        // Check if the mods directory exists
        await fs.access(modsPath);
    } catch {
        taggedConsole.info("Mods folder does not exist. Mod cleanup completed.");
        taggedConsole.endGrouping();
        
        return;
    }

    let mods;
    try {
        // Read the contents of the mods directory
        mods = await fs.readdir(modsPath);
    } catch (error) {
        taggedConsole.error(`Failed to read mods directory: ${error.message}`);
        taggedConsole.endGrouping();

        return;
    }

    if (mods.length === 0) {
        taggedConsole.info("No mods to delete. Folder is already empty.");
        taggedConsole.endGrouping();

        return;
    }

    for (const file of mods) {
        const filePath = path.join(modsPath, file);

        try {
            await fs.unlink(filePath);
            taggedConsole.info(`Deleted mod: ${file}`);
        } catch (error) {
            taggedConsole.error(`Failed to delete mod: ${file} - ${error.message}`);
        }
    }

    taggedConsole.info("Mod cleanup completed.");
    taggedConsole.endGrouping();
}

export default deleteMods;
