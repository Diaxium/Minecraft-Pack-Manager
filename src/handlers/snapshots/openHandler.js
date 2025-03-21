import ansi from "ansi-escape-sequences";
import { exec } from 'node:child_process';
import { platform } from 'node:process';
import fs from "fs/promises";
import path from "path";

import { logger } from "../../utils/index.js";

/**
 * Creates a tagged logger instance for module-specific logging.
 * @type {logger.Tag}
 */
const taggedConsole = new logger.Tag("SNAPSHOTS", "📄", ansi.rgb(125, 188, 240));

/**
 * Opens the most recently created snapshot file within the specified folder.
 * Uses the system's default text editor to open the file.
 * 
 * @async
 * @function snapshotOpen
 * @param {string} Snapshots_Folder - The path to the folder containing snapshot files.
 * @param {Object} settings - The settings instance containing configuration details.
 * @returns {Promise<void>}
 */
const snapshotOpen = async (Snapshots_Folder, settings) => {
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

    if (snapshots.length === 0) {
        taggedConsole.beginGrouping();
        taggedConsole.info("No snapshot files found to open.");
        taggedConsole.endGrouping();

        return;
    }

    try {
        // Get full file paths and their creation dates.
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

        // Filter out files that failed to retrieve stats
        const validFiles = filesWithStats.filter(Boolean);

        // Sort files by creation date (newest first)
        validFiles.sort((a, b) => b.createdAt - a.createdAt);

        if (validFiles.length === 0) {
            taggedConsole.beginGrouping();
            taggedConsole.info("No valid snapshot files found to open.");
            taggedConsole.endGrouping();

            return;
        }

        // Open the newest file
        const newestFile = validFiles[0].file;

        taggedConsole.beginGrouping();
        taggedConsole.info(`Opening the newest snapshot: ${newestFile}`);

        switch (platform) {
            case 'win32':
                exec(`start ${newestFile}`);

                break;
            case 'darwin':
                exec(`open ${newestFile}`);

                break;
            case 'linux':
                exec(`xdg-open ${newestFile}`);

                break;
            default:
                taggedConsole.error("Unsupported platform. Cannot open snapshot.");
        }
    } catch (error) {
        taggedConsole.error(`Failed to open the newest file: ${error.message}`);
    }

    taggedConsole.endGrouping();
};

export default snapshotOpen;
