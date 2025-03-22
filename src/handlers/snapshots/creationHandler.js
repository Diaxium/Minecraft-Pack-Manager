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
 * @param {Object[]} duplicates - The total delete duplicates.
 * @returns {Promise<string>} A formatted diff report.
 */
const computeSnapshotDiff = async (previousSnapshot, newData = {}, duplicates) => {
  const report = [];
  const changes = { addedMods: 0, removedMods: 0, updatedMods: 0 };

  // Generate a formatted block using each line object's content and level.
  const generateBlock = (lines, tabs = 1) => lines.map(line => '\t'.repeat(tabs * line.level) + line.content).join('\n');

  // Helpers
  const getProfileName = (profileData) => path.basename(profileData.paths.profile);

  const normalizeModName = (name) => {
    const betaIndex = name.indexOf('beta');
    if (betaIndex !== -1) {
      // Return the portion before "beta", trimmed and lowercased.
      return name.substring(0, betaIndex).replace(/[-\s]+$/, '').toLowerCase();
    }
    return name.toLowerCase();
  };

  const getModKey = (mod) =>
    mod.details && mod.details.mod && mod.details.mod.name
      ? normalizeModName(mod.details.mod.name)
      : mod.fileName;

  /**
   * Renders a profile header.
   *
   * @param {string} profileName - The profile's name.
   * @param {Object} profile - The profile data.
   * @param {string} label - A label to show (e.g., "New Profile", "Removed Profile").
   */
  const renderProfileHeader = (profileName, profile, label = "") => {
    report.push({ content: `Profile: ${profileName} ${label ? '(' + label + ')' : ''}`, level: 0 });
    report.push({ content: `- Profile Path: ${profile.paths.profile}`, level: 1 });
    report.push({ content: `- Mods Directory: ${profile.paths.mods}`, level: 1 });
    report.push({ content: "", level: 0 });
  };

  /**
   * Renders mod details for a given mod file.
   *
   * @param {Object} file - The mod file data.
   * @param {number} baseLevel - The base indentation level.
   * @param {Object} opts - Options for rendering.
   * @param {string} opts.prefix - The prefix for the file line.
   * @param {string} opts.timestampLabel - The label for the modification timestamp.
   */
  const renderModDetails = (file, baseLevel, opts = {}) => {
    const prefix = opts.prefix || "- File:";
    const timestampLabel = opts.timestampLabel || "Modified";
    const modInfo = file.details && file.details.mod;
    const mcInfo = file.details && file.details.minecraft;

    report.push({ content: `${prefix} ${file.fileName} (${timestampLabel}: ${file.modified})`, level: baseLevel });

    if (modInfo && Object.keys(modInfo).length > 0) {
      if (modInfo.name) report.push({ content: `- Name: ${modInfo.name}`, level: baseLevel + 1 });
      if (modInfo.version) report.push({ content: `- Version: ${modInfo.version}`, level: baseLevel + 1 });
    }

    report.push({ content: "─────────────────────────────", level: baseLevel + 1 });

    if (mcInfo && Object.keys(mcInfo).length > 0) {
      if (mcInfo.version) report.push({ content: `- MC Version: ${mcInfo.version}`, level: baseLevel + 1 });
      if (mcInfo.loader) report.push({ content: `- MC Loader: ${mcInfo.loader}`, level: baseLevel + 1 });
    }

    report.push({ content: "", level: 0 });
  };

  /**
   * Renders a block showing mod changes for updated mods.
   *
   * @param {Object} changedFields - The diff of changed fields.
   * @param {number} baseLevel - The base indentation level.
   */
  const renderModChanges = (changedFields, baseLevel) => {
    if (Object.keys(changedFields).length > 0) {
      report.push({ content: "- Changes:", level: baseLevel });

      for (const key in changedFields) {
        if (typeof changedFields[key] === "object" && changedFields[key] !== null) {
          for (const field in changedFields[key]) {
            report.push({
              content: `🔖 ${field.charAt(0).toUpperCase() + field.slice(1)}: (${changedFields[key][field]}) ++`,
              level: baseLevel + 1
            });
          }
        } else {
          report.push({
            content: `🔖 ${key.charAt(0).toUpperCase() + key.slice(1)}: (${changedFields[key]}) ++`,
            level: baseLevel + 1
          });
        }
      }
    }
  };

  // Helper to render a deleted duplicate block.
  let renderDeletedDuplicates = (duplicates) => {
    if (!Array.isArray(duplicates) || duplicates.length === 0) {
      report.push({ content: "✋ No mods were deleted.", level: 0 });
      return;
    }

    const profileGroups = {};

    // Group duplicates by profile
    duplicates.forEach(duplicate => {
      const { profile } = duplicate;
      if (!profileGroups[profile]) {
        profileGroups[profile] = [];
      }
      profileGroups[profile].push(duplicate);
    });

    // Deleted duplicates section header.
    report.push({
      content: `## Deleted Duplicates Report | Total Deleted: ${duplicates.length}`,
      level: 0
    });
    report.push({ content: "", level: 0 });

    // Render grouped duplicates
    Object.entries(profileGroups).forEach(([profile, duplicates]) => {
      report.push({ content: `Profile: ${profile}`, level: 0 });

      duplicates.forEach(duplicate => {
        const { fileName: name, path: originalPath, existing } = duplicate;

        report.push({ content: `🗑️ Deleted Mod: ${name}`, level: 1 });
        report.push({ content: `- Original Path: ${originalPath}`, level: 2 });

        if (existing) {
          report.push({ content: `- Existing Mod: ${existing.fileName}`, level: 2 });

          if (existing.details?.filePath) {
            report.push({ content: `- Path: ${existing.details.filePath}`, level: 3 });
          }
        }

        report.push({ content: "", level: 0 });
      });
    });
  };

  // Report header
  report.push({ content: "# Snapshot Diff Report | Added: 0, Removed: 0, Updated: 0 | Deleted: 0", level: 0 });
  report.push({ content: "", level: 0 });

  // If no valid previous snapshot is found, assume this is the first snapshot.
  if (!Array.isArray(previousSnapshot) || previousSnapshot.length === 0) {
    return generateBlock(report);
  }

  // Create maps for profiles.
  const oldProfiles = new Map();
  previousSnapshot.forEach(profile => {
    oldProfiles.set(getProfileName(profile), profile);
  });

  const newProfiles = new Map();
  newData.forEach(profile => {
    newProfiles.set(getProfileName(profile), profile);
  });

  // Process added profiles.
  for (const [profileName, newProfile] of newProfiles.entries()) {
    if (!oldProfiles.has(profileName)) {
      renderProfileHeader(profileName, newProfile, "New Profile");

      report.push({ content: "Discovered Mods:", level: 1 });

      if (!newProfile.mods || newProfile.mods.length === 0) {
        report.push({ content: "✋ No mods found.", level: 2 });
      } else {
        newProfile.mods.forEach(file => {
          renderModDetails(file, 2, { prefix: "- File:", timestampLabel: "Modified" });
        });
      }

      report.push({ content: "", level: 0 });
    }
  }

  // Process removed profiles.
  for (const [profileName, oldProfile] of oldProfiles.entries()) {
    if (!newProfiles.has(profileName)) {
      renderProfileHeader(profileName, oldProfile, "Removed Profile");

      report.push({ content: "Discovered Mods:", level: 1 });

      if (!oldProfile.mods || oldProfile.mods.length === 0) {
        report.push({ content: "- No mods found.", level: 2 });
      } else {
        oldProfile.mods.forEach(file => {
          renderModDetails(file, 2, { prefix: "- File:", timestampLabel: "Last Modified" });
        });
      }

      report.push({ content: "", level: 0 });
    }
  }

  const detailTypes = ['mod', 'minecraft'];
  const detailFields = { mod: ['name', 'version'], minecraft: ['version', 'loader'] };

  // Process profiles present in both snapshots.
  for (const [profileName, newProfile] of newProfiles.entries()) {
    if (oldProfiles.has(profileName)) {
      const oldProfile = oldProfiles.get(profileName);

      // Build mod maps using the mod key.
      const oldMods = new Map();
      oldProfile.mods.forEach(mod => oldMods.set(getModKey(mod), mod));

      const newMods = new Map();
      newProfile.mods.forEach(mod => newMods.set(getModKey(mod), mod));

      const addedMods = [];
      const removedMods = [];
      const updatedMods = [];

      // Identify added and updated mods.
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

          detailTypes.forEach(type => {
            detailFields[type].forEach(field => {
              const newVal = (newMod.details && newMod.details[type] && newMod.details[type][field]) || "";
              const oldVal = (oldMod.details && oldMod.details[type] && oldMod.details[type][field]) || "";

              if (newVal !== oldVal) {
                if (!changedFields[type]) changedFields[type] = {};

                changedFields[type][field] = oldVal;
                isUpdated = true;
              }
            });
          });

          if (isUpdated) {
            updatedMods.push({ newMod, changedFields });
          }
        } else {
          addedMods.push(newMod);
        }
      });

      // Identify removed mods.
      oldMods.forEach((oldMod, key) => {
        if (!newMods.has(key)) {
          removedMods.push(oldMod);
        }
      });

      // Only output if any mod changes were found.
      if (addedMods.length || removedMods.length || updatedMods.length) {
        renderProfileHeader(profileName, newProfile);

        report.push({ content: "Mod Changes:", level: 1 });

        if (addedMods.length) {
          report.push({ content: "➕ Added Mods:", level: 2 });
          changes.addedMods++;

          addedMods.forEach(file => {
            renderModDetails(file, 3, { prefix: "- File:", timestampLabel: "Modified" });
          });
        }

        if (removedMods.length) {
          report.push({ content: "🗑️ Removed Mods:", level: 2 });
          changes.removedMods++;

          removedMods.forEach(file => {
            renderModDetails(file, 3, { prefix: "- File:", timestampLabel: "Last Modified" });
          });
        }

        if (updatedMods.length) {
          report.push({ content: "🔄 Updated Mods:", level: 2 });
          changes.updatedMods++;

          updatedMods.forEach(update => {
            const { newMod, changedFields } = update;

            renderModDetails(newMod, 3, { prefix: "- File:", timestampLabel: "Modified" });
            renderModChanges(changedFields, 3);
          });
        }

        report.push({ content: "", level: 0 });
      }
    }
  }

  // Update header details.
  report[0].content = `# Snapshot Diff Report | Added: ${changes.addedMods}, Removed: ${changes.removedMods}, Updated: ${changes.updatedMods} | Deleted: ${duplicates.length}`;

  // Deleted duplicates section.
  if (report.length > 2) {
    renderDeletedDuplicates(duplicates);
  }

  return report.length > 2 ? generateBlock(report) : false;
};

/**
 * Builds a full snapshot report from snapshot data.
 *
 * @param {Object[]} snapshot - The snapshot data.
 * @param {Object[]} duplicates - The total delete duplicates.
 * @returns {string} A formatted snapshot report.
 */
const buildSnapshotContent = (snapshot, duplicates) => {
  const report = [];

  // Generate a formatted block using each line object's content and level.
  const generateBlock = (lines, tabs = 2) => lines.map(line => '\t'.repeat(tabs * line.level) + line.content).join('\n');

  // Helper to render a profile and its discovered mods.
  const renderProfile = (profile) => {
    const profileName = path.basename(profile.paths.profile);

    report.push({ content: `Profile: ${profileName}`, level: 0 });
    report.push({ content: `- Profile Path: ${profile.paths.profile}`, level: 1 });
    report.push({ content: `- Mods Directory: ${profile.paths.mods}`, level: 1 });
    report.push({ content: "", level: 0 });
    report.push({ content: "Discovered Mods:", level: 1 });

    if (!profile.mods || profile.mods.length === 0) {
      report.push({ content: "- No mods found.", level: 2 });
    } else {
      profile.mods.forEach(file => renderModDetails(file));
    }

    report.push({ content: "", level: 0 });
  };

  // Helper to render mod details for a given mod file.
  const renderModDetails = (file) => {
    const modInfo = file.details && file.details.mod;
    const mcInfo = file.details && file.details.minecraft;

    report.push({ content: `- ${file.fileName} (Modified: ${file.modified})`, level: 2 });

    if (modInfo && Object.keys(modInfo).length > 0) {
      if (modInfo.name) report.push({ content: `- Name: ${modInfo.name}`, level: 3 });
      if (modInfo.version) report.push({ content: `- Version: ${modInfo.version}`, level: 3 });
    }

    report.push({ content: "─────────────────────────────", level: 3 });

    if (mcInfo && Object.keys(mcInfo).length > 0) {
      if (mcInfo.version) report.push({ content: `- MC Version: ${mcInfo.version}`, level: 3 });
      if (mcInfo.loader) report.push({ content: `- MC Loader: ${mcInfo.loader}`, level: 3 });
    }

    report.push({ content: "", level: 0 });
  };

  // Helper to render a deleted duplicate block.
  const renderDeletedDuplicates = (duplicates) => {
    if (!Array.isArray(duplicates) || duplicates.length === 0) {
      report.push({ content: "✋ No mods were deleted.", level: 0 });
      return;
    }

    const profileGroups = {};

    // Group duplicates by profile
    duplicates.forEach(duplicate => {
      const { profile } = duplicate;
      if (!profileGroups[profile]) {
        profileGroups[profile] = [];
      }
      profileGroups[profile].push(duplicate);
    });

    // Deleted duplicates section header.
    report.push({
      content: `## Deleted Duplicates Report | Total Deleted: ${duplicates.length}`,
      level: 0
    });
    report.push({ content: "", level: 0 });

    // Render grouped duplicates
    Object.entries(profileGroups).forEach(([profile, duplicates]) => {
      report.push({ content: `Profile: ${profile}`, level: 0 });

      duplicates.forEach(duplicate => {
        const { fileName: name, path: originalPath, existing } = duplicate;

        report.push({ content: `🗑️ Deleted Mod: ${name}`, level: 1 });
        report.push({ content: `- Original Path: ${originalPath}`, level: 2 });

        if (existing) {
          report.push({ content: `- Existing Mod: ${existing.fileName}`, level: 2 });

          if (existing.details?.filePath) {
            report.push({ content: `- Path: ${existing.details.filePath}`, level: 3 });
          }
        }

        report.push({ content: "", level: 0 });
      });
    });
  };

  // Report header.
  report.push({
    content: `# Full Snapshot Report | Added: 0, Removed: 0, Updated: 0, Deleted: ${duplicates.length}`,
    level: 0
  });
  report.push({ content: "", level: 0 });

  // No snapshot data available.
  if (!Array.isArray(snapshot) || snapshot.length === 0) {
    report.push({ content: "✋ No snapshot data available.", level: 0 });
    return generateBlock(report);
  }

  // Process each profile.
  snapshot.forEach(profile => renderProfile(profile));

  // Deleted duplicates section.
  report.push({
    content: `## Deleted Duplicates Report | Total Deleted: ${duplicates.length}`,
    level: 0
  });
  report.push({ content: "", level: 0 });

  if (!Array.isArray(duplicates) || duplicates.length === 0) {
    report.push({ content: "✋ No mods were deleted.", level: 0 });
  } else {
    renderDeletedDuplicates(duplicates);
  }

  return generateBlock(report);
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
  const differences = await computeSnapshotDiff(previousSnapshot, data, duplicates);

  if (duplicates.length > 0) {
    await deleteDuplicates(duplicates);
  }

  let outputLines;
  let snapshotFileName;

  if (differences) {
    // If there are changes, save the diff snapshot.
    outputLines = differences;
    snapshotFileName = `diff_snapshot_${new Date().toISOString().replace(/T/, "_").replace(/:/g, "-").split(".")[0]}.txt`;

    taggedConsole.info(`Changes detected, saving diff snapshot...`);
  } else {
    // If no changes, save the full snapshot.
    outputLines = buildSnapshotContent(data, duplicates);
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
