import ansi from "ansi-escape-sequences";
import fs from "fs/promises";
import path from "path";

import { logger, Componentize } from "../../utils/index.js";

/**
 * Creates a tagged logger instance for module-specific logging.
 * @type {logger.Tag}
 */
const taggedConsole = new logger.Tag("MODS", "📄", ansi.rgb(221, 125, 240));

/**
 * Creates a componentizer instance for file parsing details.
 * @type {Componentize}
 */
const parser = new Componentize('1.21.1', 'neoforge');

/**
 * Gathers mod information from the specified profiles.
 * 
 * @async
 * @function gatherProfileMods
 * @param {string} profilesPath - The base path containing profile folders.
 * @param {string[]} profiles - An array of profile names to process.
 * @param {Object} session - The session object for storing and retrieving data.
 * @returns {Promise<{data: Object[], duplicates: Object[]}>} An object containing profile data and duplicate mod entries.
 */
const gatherProfileMods = async (profilesPath, profiles, session) => {
    const Cached = session.get("Profile_data");

    if (Cached) 
        return Cached;

    const data = [];
    const allMods = new Map();
    const duplicates = [];

    taggedConsole.beginGrouping();

    for (const profile of profiles) {

        const profilePath = path.join(profilesPath, profile);
        const modsPath = path.join(profilePath, "mods");

        taggedConsole.info(`Processing profile '${profile}'`);

        try {
            await fs.access(profilePath);
        } catch {
            taggedConsole.warn(`No mods folder found for profile '${profile}' at: ${profilePath}`);
            continue;
        }

        let mods;
        try {
            mods = (await fs.readdir(modsPath)).filter(file => file.endsWith('.jar'));
        } catch {
            taggedConsole.warn(`No mods found within '${profile}' at: ${modsPath}`);
            continue;
        }

        const profileData = {
            paths: { profile: profilePath, mods: modsPath },
            mods: []
        };

        for (const file of mods) {

            const filePath = path.join(modsPath, file);

            if (allMods.has(file)) {
                duplicates.push({
                    profile,
                    fileName: file,
                    path: filePath,
                    existing: allMods.get(file)
                });
                continue;
            }

            allMods.set(file, { profile, filePath });

            let details = {};
            try {
                details = parser.parse(file);
            } catch (error) {
                taggedConsole.warn(`Failed to parse details for mod '${file}': ${error.message}`);
            }

            try {
                const stats = await fs.stat(filePath);
                const modified = stats.mtime.toISOString();

                profileData.mods.push({
                    fileName: file,
                    filePath,
                    details,
                    modified
                });

            } catch (error) {
                taggedConsole.error(`Failed to get stats for mod '${file}': ${error.message}`);
            }
        }

        data.push(profileData);

        taggedConsole.info(`Mods Processed: ${mods.length}, Duplicate Mods Found: ${duplicates.length}`);
    }

    taggedConsole.info(`Total Mods Processed: ${allMods.size}, Total Duplicates Detected: ${duplicates.length}`);
    taggedConsole.endGrouping();

    session.set("Profile_data", { data, duplicates });

    return { data, duplicates };
};

export default gatherProfileMods;
