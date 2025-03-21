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
 * Continuously deletes the oldest snapshot files until the number of snapshots is below the maximum.
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

    // Exit early if the snapshot count is already below the allowed limit.
    if (snapshots.length < Maximum_Snapshots) return;

    try {
        // Retrieve file paths and creation times for each snapshot.
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

        // Filter out any entries that failed to retrieve stats.
        let validFiles = filesWithStats.filter(Boolean);

        // Sort files by creation date (oldest first).
        validFiles.sort((a, b) => a.createdAt - b.createdAt);

        
        // Calculate how many files need to be deleted so that the remaining snapshots
        // equal the allowed maximum.
        const filesToDelete = validFiles.length - Maximum_Snapshots;

        taggedConsole.beginGrouping();
        
        for (let i = 0; i < filesToDelete; i++) {
            const oldestFile = validFiles[i].file;
            await fs.unlink(oldestFile);
            taggedConsole.info(`Deleted oldest snapshot: ${oldestFile}`);
        }
    } catch (error) {
        taggedConsole.beginGrouping();
        taggedConsole.error(`Failed during snapshot limit enforcement: ${error.message}`);
    }

    taggedConsole.endGrouping();
};

export default snapshotLimit;
