import path from "path";
import { fileURLToPath } from "url";
import os from "os";
import { Cache } from "../utils/index.js";

/**
 * @typedef {Object} Paths
 * @property {string} Profiles - The path where profiles are stored.
 * @property {string} __filename - The absolute path of the current module file.
 * @property {string} __dirname - The directory name of the current module file.
 * @property {string} Environment - The path to the environment file.
 */

/**
 * @type {Cache}
 * Manages session-specific data, including paths and categorized profiles.
 */
const Session = new Cache();

/**
 * Initializes and sets the base paths used by the application.
 * Sets the profile directory based on the operating system.
 */
Session.set("Paths", {
    Profiles: process.env.APPDATA
        ? path.join(process.env.APPDATA, "ModrinthApp", "profiles")
        : path.join(os.homedir(), ".modrinth", "profiles")
});

/**
 * Updates the session cache with dynamically resolved paths.
 */
const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const envPath = path.join(currentDir, "../../.env");

Session.update("Paths", { 
    __filename: currentFile,
    __dirname: currentDir,
    Environment: envPath 
});

/**
 * @type {string[]}
 * Categorized mod profiles for organizing various mod types.
 */
const Profiles = [
    "1. Library",             // Core dependencies and required libraries
    "2. Optimization",        // Performance enhancement and lag reduction mods
    "3. Integration",         // Compatibility and interaction handling mods
    "4. UI",                  // User Interface improvements
    "5. Terrain",             // Terrain generation mods (biomes, landscapes, etc.)
    "6. World",               // Structures, dungeons, towns, etc.
    "7. Dimension",           // Additional worlds or dimensions
    "8. Mobs",                // Additional creatures and wildlife
    "9. NPCs",                // Non-player characters and traders
    "10. Gameplay",           // Mods altering gameplay mechanics
    "11. Technology",         // Tech-based mods and machinery
    "12. Magic",              // Magic progression, spells, and rituals
    "13. Farming",            // Agriculture, crops, and food systems
    "14. Combat",             // Combat mechanics and battle system overhauls
    "15. Weapons",            // New weapons and combat gear
    "16. Tools",              // New tools, mining, and harvesting equipment
    "17. Storage",            // Inventory management and expanded storage solutions
    "18. Transportation",     // Vehicles, mounts, and transport methods
    "19. Adventure",          // Questing, exploration, and treasure hunting
    "20. Decoration",         // Cosmetic and decorative items
    "21. Graphics",           // Visual enhancements (shaders, lighting effects, etc.)
    "22. Quality-of-life"     // Improvements enhancing user experience
];

Session.set("Profiles", Profiles);

export default Session;
