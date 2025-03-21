import fs from "fs/promises";
import path from "path";
import ansi from "ansi-escape-sequences";
import { input, select } from "@inquirer/prompts";

import { logger } from "../../../utils/index.js";
import { DefaultSettings } from "../../../config/index.js";

/**
 * Creates a tagged logger instance for module-specific logging.
 * @type {logger.Tag}
 */
const taggedConsole = new logger.Tag("MODRINTH", "📗", ansi.rgb(27, 217, 106));

/**
 * Prompts the user to input a valid path where Modrinth profiles are stored.
 * Continues prompting until a valid directory path is provided.
 * 
 * @async
 * @function getModrinthProfilesPath
 * @returns {Promise<string>} The validated path to the Modrinth profiles.
 */
const getModrinthProfilesPath = async () => {
    taggedConsole.beginGrouping();

    while (true) {
        const dirPath = await input({
            message: "Please select the location where your Modrinth profiles are stored:"
        });

        try {
            await fs.access(dirPath); // Check if the provided path exists.
            taggedConsole.info(`Modrinth Profiles set to: ${dirPath}`);
            
            return dirPath;
        } catch {
            taggedConsole.error("The provided path does not exist. Please enter a valid path.");
        }
    }
};

/**
 * Displays a selection prompt for the user to choose their primary profile.
 * 
 * @async
 * @function selectPrimaryProfile
 * @param {string} profileDir - The directory path containing profile files.
 * @param {string} Default - The default profile name if available.
 * @returns {Promise<string>} The name of the selected primary profile.
 */
const selectPrimaryProfile = async (profileDir, Default) => {
    try {
        const choices = await fs.readdir(profileDir);

        if (choices.length === 0) {
            throw new Error("No profiles found in the selected directory.");
        }

        return await select({
            message: "Please select your primary profile:",
            choices,
            loop: false,
            Default
        });
    } catch (error) {
        taggedConsole.error(`Error reading profile directory: ${error.message}`);
        taggedConsole.endGrouping();

        process.exit(1);
    }
};

/**
 * Initializes the paths used in the application by determining the location
 * of the Modrinth profiles and setting the primary profile path in the session.
 * 
 * @async
 * @function initializePaths
 * @param {Object} settings - Settings object with get and update methods.
 * @param {Object} session - Session object with get and set methods.
 * @returns {Promise<void>}
 */
const initializePaths = async (settings, session) => {
    // Attempt to retrieve a previously stored profile path.
    const storedPath = session.get("Paths")?.Profiles;
    let modrinthProfilesPath = null;

    if (storedPath) {
        try {
            await fs.access(storedPath);

            modrinthProfilesPath = storedPath;
        } catch {
            taggedConsole.warn(`Stored path is not accessible: ${storedPath}`);
        }
    }

    if (!modrinthProfilesPath) {
        modrinthProfilesPath = await getModrinthProfilesPath();
    }

    session.update("Paths.Profiles", modrinthProfilesPath);

    // Check if the primary profile from settings exists.
    let primaryProfile = settings.get("Profile_Name");
    let primaryProfilePath = path.join(modrinthProfilesPath, primaryProfile);

    try {
        await fs.access(primaryProfilePath);
    } catch {
        taggedConsole.beginGrouping();

        primaryProfile = await selectPrimaryProfile(modrinthProfilesPath, DefaultSettings.Profile_Name);
        primaryProfilePath = path.join(modrinthProfilesPath, primaryProfile);

        settings.update("Profile_Name", primaryProfile);

        taggedConsole.info(`Primary Profile set to: ${primaryProfilePath}`);
    }

    const SnapshotsPath = path.join(primaryProfilePath, "snapshots");

    try {
        await fs.access(SnapshotsPath);
    } catch {
        // If Snapshots folder doesn't exist, create it.
        taggedConsole.beginGrouping();

        await fs.mkdir(SnapshotsPath);
        taggedConsole.info(`Snapshots folder created at: ${SnapshotsPath}`);
    }

    session.update("Paths.Snapshots_Folder", SnapshotsPath);
    session.update("Paths.Primary_Profile", primaryProfilePath);

    taggedConsole.endGrouping();
};

export default initializePaths;
