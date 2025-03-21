import ansi from "ansi-escape-sequences";
import fs from "fs/promises";
import path from "path";

import { logger } from "../../utils/index.js";

/**
 * Creates a tagged logger instance for module-specific logging.
 * @type {logger.Tag}
 */
const taggedConsole = new logger.Tag("SNAPSHOTS", "📄", ansi.rgb(240, 230, 125));

/**
 * Ensures the number of snapshots in the folder does not exceed the allowed limit.
 * Deletes the oldest snapshot file if the limit is exceeded.
 * 
 * @async
 * @function snapshotLimit
 * @param {string} Snapshots_Folder - The path to the folder containing snapshots.
 * @param {Object} settings - The settings instance containing configuration details.
 * @returns {Promise<void>}
 */
const snapshotLimit = async (Snapshots_Folder, settings) => {
    const Maximum_Snapshots = settings.get("Maximum_Snapshots");
    let snapshots;

    try {
        // Read directory contents and filter for snapshot files.
        snapshots = (await fs.readdir(Snapshots_Folder)).filter(file => file.endsWith('.txt'));
    } catch (error) {
        taggedConsole.beginGrouping();
        taggedConsole.error(`Failed to read directory: ${error.message}`);
        taggedConsole.endGrouping();

        return;
    }

    // If the number of snapshots is within the limit, exit early.
    if (snapshots.length < Maximum_Snapshots) return;

    try {
        // Collect file paths and their creation times.
        const filesWithStats = await Promise.all(
            snapshots.map(async (file) => {
                const filePath = path.join(Snapshots_Folder, file);
                
                try {
                    const stats = await fs.stat(filePath);
                    
                    return { file: filePath, createdAt: stats.birthtime };
                } catch (error) {
                    taggedConsole.warn(`Failed to retrieve stats for ${file}: ${error.message}`);
                    
                    return null;
                }
            })
        );

        // Filter out failed stat retrievals
        const validFiles = filesWithStats.filter(Boolean);

        // Sort files by creation date (oldest first).
        validFiles.sort((a, b) => a.createdAt - b.createdAt);

        // Remove the oldest file if it exists.
        if (validFiles.length > 0) {
            const oldestFile = validFiles[0].file;
            
            await fs.unlink(oldestFile);

            taggedConsole.beginGrouping();
            taggedConsole.info(`Deleted oldest snapshot: ${oldestFile}`);
        }
    } catch (error) {
        taggedConsole.beginGrouping();
        taggedConsole.error(`Failed to delete oldest file: ${error.message}`);
    }

    taggedConsole.endGrouping();
};

export default snapshotLimit;
