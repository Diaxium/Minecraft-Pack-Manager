import ansi from "ansi-escape-sequences";
import fs from "fs/promises";
import path from "path";

import { logger } from "../../utils/index.js";
import gatherProfileMods from "./gatherHandler.js";

/**
 * Creates a tagged logger instance for module-specific logging.
 * @type {logger.Tag}
 */
const taggedConsole = new logger.Tag("MODS", "📄", ansi.rgb(240, 125, 165));

/**
 * Asynchronously copies mods from the source profile directories to the primary profile's "mods" folder.
 * Logs the status of each operation, including successful copies and encountered errors.
 * 
 * @async
 * @function copyMods
 * @param {Object} session - The session object containing profile and path information.
 * @returns {Promise<void>}
 */
const copyMods = async (session) => {
    taggedConsole.beginGrouping();
    taggedConsole.info("Copying Mods...");

    const Profiles = session.get("Profiles");
    const { Primary_Profile, Profiles: Profiles_Path } = session.get("Paths");

    try {
        const { data } = await gatherProfileMods(Profiles_Path, Profiles, session);

        for (const Profile of data) {
            for (const File of Profile.mods) {
                const newDestination = path.join(Primary_Profile, "mods", File.fileName);

                try {
                    // Ensure the parent directory exists before copying
                    await fs.mkdir(path.dirname(newDestination), { recursive: true });
                } catch (error) {
                    taggedConsole.error(`Failed creation of mods folder: ${error.message}`);

                    continue; // Skip to the next file if folder creation fails
                }
                
                 // Check if the file already exists
                 try {
                    await fs.access(newDestination);
                    taggedConsole.info(`File already exists: ${File.fileName} -> ${path.dirname(newDestination)}`);
                    
                    continue;
                } catch { }

                // File does not exist, proceed with copying

                try {
                    // Copy the file from its original path to the new destination
                    await fs.copyFile(File.filePath, newDestination);

                    // Log the successful copy operation
                    taggedConsole.info(`Copied: ${File.fileName} -> ${newDestination}`);
                } catch (error) {
                    taggedConsole.error(`Failed to copy ${File.fileName}: ${error.message}`);
                }
            }
        }
        
        taggedConsole.info("Mod copying process completed.");
    } catch (error) {
        taggedConsole.error(`Failed to gather profile mods: ${error.message}`);
    }

    taggedConsole.endGrouping();
}

export default copyMods;
