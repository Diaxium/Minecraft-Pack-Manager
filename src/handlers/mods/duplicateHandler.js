import ansi from "ansi-escape-sequences";
import fs from "fs/promises";

import { logger } from "../../utils/index.js";

/**
 * Creates a tagged logger instance for module-specific logging.
 * @type {logger.Tag}
 */
const taggedConsole = new logger.Tag("DUPLICATES", "📄", ansi.rgb(240, 169, 125));

/**
 * Asynchronously deletes duplicate files based on the provided list of duplicates.
 * Logs each deletion attempt and handles errors gracefully.
 * 
 * @async
 * @function deleteDuplicates
 * @param {Array<{profile: string, path: string}>} duplicates - Array of duplicate file objects to be deleted.
 * @returns {Promise<void>}
 */
const deleteDuplicates = async (duplicates = []) => {
    taggedConsole.beginGrouping();
    taggedConsole.info("Deleting duplicate mods...");

    if (!Array.isArray(duplicates)) {
        taggedConsole.error("Invalid input: 'duplicates' should be an array.");
        taggedConsole.endGrouping();

        return;
    }

    for (const { profile, path: filePath } of duplicates) {

        if (profile !== "1. Library") {  // Skip deletion if the profile is '1. Library'
            try {
                await fs.unlink(filePath);
                taggedConsole.info(`Deleted duplicate: ${filePath}`);
                
            } catch (error) {
                taggedConsole.error(`Failed to delete duplicate: ${filePath} - ${error.message || error}`);
            }
        }
    }

    taggedConsole.info("Duplicate mod cleanup completed.");
    taggedConsole.endGrouping();
};

export default deleteDuplicates;
