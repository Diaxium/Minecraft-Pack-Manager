import ansi from "ansi-escape-sequences";
import fs from "fs/promises";
import path from "path";

import { logger } from "../../utils/index.js";
import snapshotLimit from "./limitHandler.js";
import { gatherProfileMods, deleteDuplicates } from "../../handlers/index.js";

// Create a tagged logger instance for module-specific logging.
const taggedConsole = new logger.Tag("SNAPSHOTS", "📄", ansi.rgb(133, 240, 125));

/**
 * Computes a diff report between a previous snapshot and the new mod data.
 *
 * @async
 * @param {Object[]} previousSnapshot - The previous snapshot data.
 * @param {Object[]} newData - The new snapshot data.
 * @returns {Promise<string[]>} An array of strings representing the diff report.
 */
const computeSnapshotDiff = async (previousSnapshot, newData = {}) => {
  const lines = [];
  lines.push("# Snapshot Diff Report", "");

  // If no valid previous snapshot is found, assume this is the first snapshot.
  if (!Array.isArray(previousSnapshot) || previousSnapshot.length === 0) {
    return lines;
  }

  /**
   * Extracts the profile name from the profile data object.
   * @param {Object} profileData - The profile data.
   * @returns {string} The profile name.
   */
  const getProfileName = (profileData) => path.basename(profileData.paths.profile);

  /**
 * Normalizes a mod name by removing version info.
 * This function looks for the substring "beta" and, if found,
 * returns only the portion before it (trimmed and lowercased).
 *
 * @param {string} name - The original mod name.
 * @returns {string} The normalized mod name.
 */
  const normalizeModName = (name) => {
    const betaIndex = name.indexOf('beta');
    if (betaIndex !== -1) {
      // Get the base name before the version info.
      return name.substring(0, betaIndex).replace(/[-\s]+$/, '').toLowerCase();
    }
    return name.toLowerCase();
  };

  /**
   * Returns the mod key for identification.
   * Uses the normalized mod.details.name if available; otherwise, falls back to fileName.
   *
   * @param {Object} mod - The mod object.
   * @returns {string} The mod key.
   */
  const getModKey = (mod) => (
    mod.details && mod.details.name ? normalizeModName(mod.details.name) : mod.fileName
  );


  // Create maps for profiles.
  const oldProfiles = new Map();
  previousSnapshot.forEach((profile) => {
    oldProfiles.set(getProfileName(profile), profile);
  });

  const newProfiles = new Map();
  newData.forEach((profile) => {
    newProfiles.set(getProfileName(profile), profile);
  });

  // Handle added profiles.
  for (const [profileName, newProfile] of newProfiles.entries()) {
    if (!oldProfiles.has(profileName)) {
      lines.push(`Profile: ${profileName} (New Profile)`);
      lines.push(`  - Profile Path: ${newProfile.paths.profile}`);
      lines.push(`  - Mods Directory: ${newProfile.paths.mods}`, "");
      lines.push("  Discovered Mods:");

      if (!newProfile.mods || newProfile.mods.length === 0) {
        lines.push("    - No mods found.");
      } else {
        newProfile.mods.forEach((mod) => {
          lines.push(`    - ${mod.fileName} (Modified: ${mod.modified})`);

          if (mod.details && Object.keys(mod.details).length > 0) {
            if (mod.details.name) lines.push(`      - Name: ${mod.details.name}`);
            if (mod.details.version) lines.push(`      - Version: ${mod.details.version}`);
            if (mod.details.mcVersion) lines.push(`      - MC Version: ${mod.details.mcVersion}`);
            if (mod.details.mcLoader) lines.push(`      - MC Loader: ${mod.details.mcLoader}`);
          }

          lines.push("");
        });
      }

      lines.push("");
    }
  }

  // Handle removed profiles.
  for (const [profileName, oldProfile] of oldProfiles.entries()) {
    if (!newProfiles.has(profileName)) {
      lines.push(`Profile: ${profileName} (Removed Profile)`);
      lines.push(`  - Profile Path: ${oldProfile.paths.profile}`);
      lines.push(`  - Mods Directory: ${oldProfile.paths.mods}`, "");
      lines.push("  Discovered Mods:");

      if (!oldProfile.mods || oldProfile.mods.length === 0) {
        lines.push("    - No mods found.");
      } else {
        oldProfile.mods.forEach((mod) => {
          lines.push(`    - ${mod.fileName} (last modified: ${mod.modified})`);

          if (mod.details && Object.keys(mod.details).length > 0) {
            if (mod.details.name) lines.push(`      - Name: ${mod.details.name}`);
            if (mod.details.version) lines.push(`      - Version: ${mod.details.version}`);
            if (mod.details.mcVersion) lines.push(`      - MC Version: ${mod.details.mcVersion}`);
            if (mod.details.mcLoader) lines.push(`      - MC Loader: ${mod.details.mcLoader}`);
          }

          lines.push("");
        });
      }

      lines.push("");
    }
  }

  // Handle profiles that exist in both snapshots.
  for (const [profileName, newProfile] of newProfiles.entries()) {
    if (oldProfiles.has(profileName)) {
      const oldProfile = oldProfiles.get(profileName);

      // Build maps for mods using our mod key.
      const oldMods = new Map();
      oldProfile.mods.forEach(mod => oldMods.set(getModKey(mod), mod));

      const newMods = new Map();
      newProfile.mods.forEach(mod => newMods.set(getModKey(mod), mod));

      const addedMods = [];
      const removedMods = [];
      const updatedMods = [];

      // Check for added mods and updated mods.
      newMods.forEach((newMod, key) => {
        if (oldMods.has(key)) {
          const oldMod = oldMods.get(key);
          const changedFields = {};
          let isUpdated = false;

          if (newMod.fileName !== oldMod.fileName) {
            changedFields.fileName = oldMod.fileName;
            isUpdated = true;
          }

          if (newMod.modified !== oldMod.modified) {
            changedFields.modified = oldMod.modified;
            isUpdated = true;
          }

          const detailFields = ['name', 'version', 'mcVersion', 'mcLoader'];

          detailFields.forEach(field => {
            const newVal = (newMod.details && newMod.details[field]) || "";
            const oldVal = (oldMod.details && oldMod.details[field]) || "";

            if (newVal !== oldVal) {
              changedFields[field] = oldVal;
              isUpdated = true;
            }
          });

          if (isUpdated) {
            updatedMods.push({ key, newMod, oldMod, changedFields });
          }
        } else {
          addedMods.push(newMod);
        }
      });

      // Check for removed mods.
      oldMods.forEach((oldMod, key) => {
        if (!newMods.has(key)) {
          removedMods.push(oldMod);
        }
      });

      // Only output if there are changes.
      if (addedMods.length || removedMods.length || updatedMods.length) {
        lines.push(`Profile: ${profileName}`);
        lines.push("  Mod Changes:");

        if (addedMods.length) {
          lines.push("    - Added Mods:");

          addedMods.forEach(mod => {

            lines.push(`      - ${mod.fileName} (Modified: ${mod.modified})`);

            if (mod.details && Object.keys(mod.details).length > 0) {
              if (mod.details.name) lines.push(`        - Name: ${mod.details.name}`);
              if (mod.details.version) lines.push(`        - Version: ${mod.details.version}`);
              if (mod.details.mcVersion) lines.push(`        - MC Version: ${mod.details.mcVersion}`);
              if (mod.details.mcLoader) lines.push(`        - MC Loader: ${mod.details.mcLoader}`);
            }

            lines.push("");

          });
        }

        if (removedMods.length) {
          lines.push("    - Removed Mods:");

          removedMods.forEach(mod => {
            lines.push(`      - ${mod.fileName} (last modified: ${mod.modified})`);

            if (mod.details && Object.keys(mod.details).length > 0) {
              if (mod.details.name) lines.push(`        - Name: ${mod.details.name}`);
              if (mod.details.version) lines.push(`        - Version: ${mod.details.version}`);
              if (mod.details.mcVersion) lines.push(`        - MC Version: ${mod.details.mcVersion}`);
              if (mod.details.mcLoader) lines.push(`        - MC Loader: ${mod.details.mcLoader}`);
            }

            lines.push("");
          });
        }

        if (updatedMods.length) {
          lines.push("    - Updated Mods:");

          updatedMods.forEach(update => {
            const { newMod, oldMod, changedFields } = update;

            lines.push(`      - ${newMod.fileName} (Modified: ${newMod.modified})`);

            if (newMod.details && Object.keys(newMod.details).length > 0) {
              if (newMod.details.name) lines.push(`        - Name: ${newMod.details.name}`);
              if (newMod.details.version) lines.push(`        - Version: ${newMod.details.version}`);
              if (newMod.details.mcVersion) lines.push(`        - MC Version: ${newMod.details.mcVersion}`);
              if (newMod.details.mcLoader) lines.push(`        - MC Loader: ${newMod.details.mcLoader}`);
            }

            if (Object.keys(changedFields).length > 0) {
              lines.push("      - Changes:");

              for (const field in changedFields) {
                lines.push(`        - ${field.charAt(0).toUpperCase() + field.slice(1)}: (${changedFields[field]}) ++`);
              }
            }

            lines.push("");
          });
        }

        lines.push("");
      }
    }
  }

  return lines;
};

/**
 * Builds a full snapshot report from snapshot data.
 *
 * @param {Object[]} snapshot - The snapshot data.
 * @param {Object[]} duplicates - The total delete duplicates.
 * @returns {string[]} An array of strings representing the full snapshot report.
 */
const buildSnapshotContent = (snapshot, duplicates) => {
  const lines = [];
  lines.push(`# Full Snapshot Report | Added: 0, Removed: 0, Updated: 0, Deleted: ${duplicates.length}`, "");

  if (!Array.isArray(snapshot) || snapshot.length === 0) {
    lines.push("No snapshot data available.");

    return lines;
  }

  snapshot.forEach((profile) => {
    const profileName = path.basename(profile.paths.profile);

    lines.push(`Profile: ${profileName}`);
    lines.push(`  - Profile Path: ${profile.paths.profile}`);
    lines.push(`  - Mods Directory: ${profile.paths.mods}`, "");
    lines.push(`  Discovered Mods:`);

    if (!profile.mods || profile.mods.length === 0) {
      lines.push("    - No mods found.");
    } else {
      profile.mods.forEach((mod) => {
        lines.push(`    - ${mod.fileName} (Modified: ${mod.modified})`);

        if (mod.details && Object.keys(mod.details).length > 0) {
          if (mod.details.name) lines.push(`      - Name: ${mod.details.name}`);
          if (mod.details.version) lines.push(`      - Version: ${mod.details.version}`);
          if (mod.details.mcVersion) lines.push(`      - MC Version: ${mod.details.mcVersion}`);
          if (mod.details.mcLoader) lines.push(`      - MC Loader: ${mod.details.mcLoader}`);
        }

        lines.push("");
      });
    }

    lines.push("");
  });

  lines.push(`## Deleted Duplicates Report | Total Deleted: ${duplicates.length}`, "");

  if (!Array.isArray(duplicates) || duplicates.length === 0) {
    lines.push("No mods were deleted.");
  }

  for (const { profile, fileName: name, path, existing } of duplicates) {
    lines.push(`Profile: ${profile}`);
    lines.push(`  - Deleted Mod: ${name}`);
    lines.push(`  - Original Path: ${path}`);

    if (existing) {
      lines.push(`  - Existing Mod: ${existing.fileName}`);
      
      if (existing.details && Object.keys(existing.details).length > 0) {
        if (existing.details.filePath) lines.push(`    - Path: ${existing.details.filePath}`);
      }
    }

    lines.push("");
  }

  return lines;
};

/**
 * Retrieves the previous snapshot data from disk.
 *
 * @async
 * @param {string} snapshotsFolder - The folder where snapshots are stored.
 * @param {Object[]} newData - The new snapshot data used for fallback.
 * @returns {Promise<Object[]|Object>} The previous snapshot data or an empty object if not found or on error.
 */
const getPreviousSnapshot = async (snapshotsFolder, newData = {}) => {
  const latestSnapshotFile = path.join(snapshotsFolder, "latest_snapshot.json");

  try {
    const data = await fs.readFile(latestSnapshotFile, "utf8");

    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      taggedConsole.info(`No previous snapshot found. Creating a new one.`);
    } else {
      taggedConsole.warn(`Error reading or parsing latest_snapshot.json: ${error.message}. Overwriting file.`);
    }

    // Save the new data if the file doesn't exist or is corrupted
    await saveLatestSnapshot(snapshotsFolder, newData);

    return {};
  }
};

/**
 * Saves the latest snapshot JSON data to disk.
 *
 * @async
 * @param {string} snapshotsFolder - The folder where snapshots are stored.
 * @param {Object[]} newData - The snapshot data to be saved.
 * @returns {Promise<void>}
 */
const saveLatestSnapshot = async (snapshotsFolder, newData = {}) => {
  const latestSnapshotFile = path.join(snapshotsFolder, "latest_snapshot.json");

  try {
    await fs.writeFile(latestSnapshotFile, JSON.stringify(newData, null, 2));

    taggedConsole.info(`Latest snapshot saved successfully.`);
  } catch (error) {
    taggedConsole.error(`Failed to save latest snapshot: ${error.message}`);
  }
};

/**
 * Saves a snapshot commit (diff or full snapshot) to disk.
 *
 * @async
 * @param {string} snapshotsFolder - The folder where snapshots are stored.
 * @param {string} snapshotFileName - The file name for the snapshot commit.
 * @param {string} content - The content of the snapshot commit.
 * @returns {Promise<void>}
 */
const saveSnapshotCommit = async (snapshotsFolder, snapshotFileName, content) => {
  const snapshotCommitFile = path.join(snapshotsFolder, snapshotFileName);

  try {
    await fs.writeFile(snapshotCommitFile, content);

    taggedConsole.info(`Snapshot commit saved successfully.`);
  } catch (error) {
    taggedConsole.error(`Failed to save snapshot commit: ${error.message}`);
  }
};

/**
 * Creates a snapshot by gathering mod data, computing diffs against the previous snapshot,
 * and saving the results. Also handles deletion of duplicate mods.
 *
 * @async
 * @param {Object} settings - Settings for snapshot creation (unused in current implementation).
 * @param {Object} session - The session object used to retrieve profile and path information.
 * @returns {Promise<void>}
 */
const createSnapshot = async (settings, session) => {
  taggedConsole.beginGrouping();
  taggedConsole.info("Creating Snapshot...");

  const Profiles = session.get("Profiles");
  const { Snapshots_Folder, Profiles: Profiles_Path } = session.get("Paths");

  // Generate the snapshot data.
  const { data, duplicates } = await gatherProfileMods(Profiles_Path, Profiles, session);
  const previousSnapshot = await getPreviousSnapshot(Snapshots_Folder, data);
  const differences = await computeSnapshotDiff(previousSnapshot, data);

  if (duplicates.length > 0) {
    await deleteDuplicates(duplicates);
  }

  let outputLines;
  let snapshotFileName;

  if (differences.length > 2) {
    // If there are changes, save the diff snapshot.
    outputLines = differences.join("\n");
    snapshotFileName = `diff_snapshot_${new Date().toISOString().replace(/T/, "_").replace(/:/g, "-").split(".")[0]}.txt`;

    taggedConsole.info(`Changes detected, saving diff snapshot...`);
  } else {
    // If no changes, save the full snapshot.
    outputLines = buildSnapshotContent(data, duplicates).join("\n");
    snapshotFileName = `full_snapshot_${new Date().toISOString().replace(/T/, "_").replace(/:/g, "-").split(".")[0]}.txt`;

    taggedConsole.info(`No changes detected, saving full snapshot...`);
  }

  // Save the latest snapshot JSON.
  await saveLatestSnapshot(Snapshots_Folder, data);
  // Save the snapshot commit TXT.
  await saveSnapshotCommit(Snapshots_Folder, snapshotFileName, outputLines);

  // Delete old snapshots.
  await snapshotLimit(Snapshots_Folder, settings);

  taggedConsole.endGrouping();
};

export default createSnapshot;
