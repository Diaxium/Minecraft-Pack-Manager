import Session from "./session.js";
import { Environment } from "../utils/index.js";

/**
 * @typedef {Object} DefaultSettings
 * @property {string} Profile_Name - The name of the user profile (default: "undefined").
 * @property {number} Maximum_Snapshots - The maximum number of snapshots allowed (default: 5).
 */

/**
 * Default application settings.
 * These settings are used if no user-defined values are found.
 * @type {Readonly<DefaultSettings>}
 */
const DefaultSettings = Object.freeze({
    Profile_Name: "undefined",
    Maximum_Snapshots: 5
});

/**
 * Retrieves or initializes the singleton Environment-based settings manager.
 * Ensures settings are initialized only once to avoid redundant processing.
 * 
 * @type {() => Environment}
 */
const GetSettings = (() => {
    let instance = null;

    return () => {
        if (!instance) {
            const environmentPath = Session.get("Paths").Environment;
            instance = new Environment(environmentPath);
            
            // Initialize with default settings if not found.
            instance.getOrDefault(DefaultSettings).build();
        }
        
        return instance;
    };
})();

export { DefaultSettings };
export default GetSettings;
