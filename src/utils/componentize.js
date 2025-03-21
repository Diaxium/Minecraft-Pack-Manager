/**
 * Componentize.js
 * Version: 1.0.0
 *
 * Description:
 * A constructor-based mod file parser that extracts information from mod file names.
 * - Parses the mod name, version, Minecraft version, and loader type.
 * - Supports heuristic-based detection for version numbers.
 * - Returns parsed data as a structured object.
 *
 * Example Usage:
 *
 * import Componentize from './Componentize.js';
 * const parser = new Componentize('1.21.1', 'neoforge');
 * const result = parser.parse('SomeMod-1.21.1-fabric-1.0.0.jar');
 * console.log(result);
 */

class Componentize {
    constructor(minecraftVersion = '1.21.1', modLoader = 'neoforge') {
      this.knownLoaders = ['neoforge', 'forge', 'fabric'];
      this.versionRegex = /^(v?\d+(\.\d+)+[a-zA-Z0-9.-]*)$/;
      this.defaultLoader = modLoader;
      this.defaultMcVersion = minecraftVersion;
    }
  
    /**
     * Parses a mod file name into its components.
     * @param {string} fileName - The mod file name.
     * @returns {object} The parsed components.
     *   - name: The mod name.
     *   - version: The mod version.
     *   - mcVersion: The Minecraft version.
     *   - mcLoader: The Minecraft loader.
     */
    parse(fileName) {
      // Remove extension (e.g., ".jar")
      let baseName = fileName.replace(/\.[^/.]+$/, "");
      // Replace underscores with dashes for uniform splitting.
      baseName = baseName.replace(/_/g, "-");
  
      // Split on dash.
      let tokens = baseName.split("-").map(part =>
        part.trim().replace(/\s*\(.*?\)/, "").trim()
      );
  
      // Prepare arrays and defaults.
      let modNameParts = [];
      let numericCandidates = [];
      let loader = this.defaultLoader; // default loader from constructor
  
      // Helper to process a token that may include plus signs.
      const processToken = (token) => {
        if (token.includes("+")) {
          // Try to extract version-like parts.
          let matches = token.match(/(v?\d+(\.\d+)+[a-zA-Z0-9.-]*)/g);
          // Remove version parts and plus signs.
          let stripped = token.replace(/(v?\d+(\.\d+)+[a-zA-Z0-9.-]*)/g, "")
                              .replace(/\+/g, "").trim();

          if (matches && stripped === "") {
            // The token is entirely version info – add each candidate.
            matches.forEach(v => numericCandidates.push(v));

            return; // do not add to the mod name.
          } else {
            // Otherwise, keep the whole token as part of the mod name.
            modNameParts.push(token);

            return;
          }
        } else {
          // If the token exactly matches a known loader, set loader.
          if (this.knownLoaders.includes(token.toLowerCase())) {
            loader = token;

            return;
          }
          // If the token looks like a version, add it.
          if (this.versionRegex.test(token)) {
            numericCandidates.push(token);

            return;
          }

          // Otherwise, add it as part of the mod name.
          modNameParts.push(token);
        }
      };
  
      // Process tokens.
      // Always treat the first token as part of the mod name.
      if (tokens.length > 0) {
        modNameParts.push(tokens[0]);
      }

      for (let i = 1; i < tokens.length; i++) {
        let token = tokens[i];

        // Skip tokens that are exactly "MC" (case-insensitive).
        if (token.toLowerCase() === "mc") continue;

        processToken(token);
      }
  
      // Prepare default version values.
      let mcVersion = this.defaultMcVersion;  // default MC version if none found
      let modVersion = "undefined";
  
      // Helper to extract the second number from a version string.
      function getSecondNumber(v) {
        let clean = v.replace(/^v/, "");
        let parts = clean.split(".");

        return parts.length > 1 ? parseInt(parts[1]) || 0 : 0;
      }
  
      // Heuristic: if exactly one candidate is found.
      if (numericCandidates.length === 1) {
        let candidate = numericCandidates[0];

        if (candidate.startsWith("1.")) {
          // If its second number is 20 or higher, assume it's the Minecraft version.
          if (getSecondNumber(candidate) >= 20) {
            mcVersion = candidate;
          } else {
            modVersion = candidate;
          }
        } else {
          modVersion = candidate;
        }
      } else if (numericCandidates.length >= 2) {
        // Separate candidates that start with "1." (possible MC versions)
        let mcCandidates = numericCandidates.filter(x => x.startsWith("1."));
        let nonMcCandidates = numericCandidates.filter(x => !x.startsWith("1."));

        if (mcCandidates.length > 0) {
          // Choose the candidate with the highest “minor” version as the MC version.
          mcCandidates.sort((a, b) => getSecondNumber(b) - getSecondNumber(a));
          mcVersion = mcCandidates[0];
          
          if (nonMcCandidates.length > 0) {
            modVersion = nonMcCandidates[0];
          } else if (mcCandidates.length >= 2) {
            // If all candidates are “1.x”, take the one with the lower minor as mod version.
            modVersion = mcCandidates[mcCandidates.length - 1];
          }
        } else {
          modVersion = numericCandidates[0];
        }
      }
  
      // Normalize mcVersion: if it’s in the form "1.xx" (only two parts), append ".1"
      if (/^1\.\d+$/.test(mcVersion)) {
        mcVersion = mcVersion + ".1";
      }
  
      let modName = modNameParts.join("-");
  
      return { name: modName, version: modVersion, mcVersion, mcLoader: loader };
    }
  }
  
  export default Componentize;
  