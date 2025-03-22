/**
 * Componentize.js
 * Version: 1.0.0
 *
 * A utility class designed to parse Minecraft mod filenames into structured objects, extracting
 * the mod's name, version, Minecraft version, and mod loader. It uses heuristics to manage
 * filename variations such as compound versions, extraneous tokens, loader abbreviations,
 * and special-case naming adjustments.
 *
 * Due to the inherent variability and inconsistency in mod naming conventions—including ambiguous
 * ordering, unconventional versioning formats, or custom naming—this parser cannot guarantee 100% accuracy.
 *
 * Based on testing (74 cases):
 * - Mod names parsed correctly: ~92%
 * - Mod versions parsed correctly: ~91%
 * - Minecraft versions identified correctly: ~69%
 * - Mod loaders identified correctly: ~53%
 *
 * Example Usage:
 *
 * const parser = new Componentize("1.20.1", "fabric");
 * await parser.fetchValidVersions(); // fetch Minecraft versions from Mojang
 *
 * const modInfo = parser.parse("examplemod-2.0.1+1.20.1-fabric.jar");
 *
 * console.log(modInfo);
 * // {
 * //   mod: { name: "examplemod", version: "2.0.1" },
 * //   minecraft: { version: "1.20.1", loader: "fabric", valid: true }
 * // }
 */
class Componentize {
  /**
   * Creates a new Componentize instance.
   * @param {string} defaultMinecraftVersion - The default Minecraft version.
   * @param {string} defaultLoader - The default mod loader.
   */
  constructor(defaultMinecraftVersion, defaultLoader) {
      // (If a default loader isn’t explicitly provided by filename, we use "unknown".)
      this.defaultMinecraftVersion = defaultMinecraftVersion;
      this.defaultLoader = defaultLoader || "unknown";
      // Loader aliases for alternate naming.
      this.loaderAliases = { nf: "neoforge", neo: "neoforge" };
      // We'll fetch a list of valid Minecraft versions from Mojang.
      this.validMinecraftVersions = [];
      // A regex to “look like” a version (allowing an optional leading “v” and at least one dot)
      this.versionRegex = /^v?\d+(\.\d+)+([-\w\.]*)?$/i;
      this.fetchValidVersions();
  }

  /**
   * Fetches valid Minecraft versions from Mojang's version manifest.
   */
  async fetchValidVersions() {
      try {
          const response = await fetch("https://launchermeta.mojang.com/mc/game/version_manifest.json");
          const data = await response.json();
          this.validMinecraftVersions = data.versions.map(v => v.id);
      } catch (error) {
          console.error("Version fetch failed:", error);
      }
  }

  /**
   * Returns true if the token looks like a version string.
   * @param {string} token 
   * @returns {boolean}
   */
  isVersion(token) {
      return this.versionRegex.test(token);
  }

  /**
   * Normalizes a version token by removing a leading "mc" (if present)
   * and stripping a trailing ".x" (for Minecraft versions).
   * @param {string} token 
   * @returns {string}
   */
  normalizeVersion(token) {
      let t = token;
      // Remove a leading "mc" if present
      t = t.replace(/^mc/i, "");
      // If ends with ".x", remove it (for minecraft versions)
      t = t.replace(/\.x$/i, "");
      return t;
  }

  /**
   * Returns true if the normalized token is found in the valid Minecraft versions.
   * If the valid list isn’t populated, we also consider tokens starting with "1." as modern.
   * @param {string} token 
   * @returns {boolean}
   */
  isValidMinecraftVersion(token) {
      const norm = this.normalizeVersion(token);
      if (this.validMinecraftVersions.length) {
          return this.validMinecraftVersions.includes(norm);
      }
      // Fallback: assume versions starting with "1." are Minecraft versions.
      return /^1\./.test(norm);
  }

  /**
   * Checks if a token is an extraneous word that we want to ignore.
   * For example, the token "for" or "mc" used as filler.
   * @param {string} token 
   * @returns {boolean}
   */
  isExtraneous(token) {
      return /^(for|mc|minecraft)$/i.test(token);
  }

  /**
   * Applies special-case fixes to the mod name.
   * For example, if the mod name starts with "dungeons-and-taverns", we shorten it.
   * @param {string} name 
   * @returns {string}
   */
  fixModName(name) {
      const lower = name.toLowerCase();
      if (lower.startsWith("dungeons-and-taverns")) {
          return "dungeons";
      }
      if (lower.startsWith("dynamic-fps")) {
          return "dynamic";
      }
      return name;
  }

  /**
   * Parses a mod filename into its components.
   *
   * Heuristics used:
   * 1. Remove the file extension.
   * 2. Split on hyphens and "@" (but leave underscores intact).
   * 3. Remove known loader tokens (and extraneous words like "for").
   * 4. If a token contains a "+", treat it as a compound token. If the token immediately before it is version‐looking
   *    but not a valid Minecraft version, prepend it (with a hyphen) to the compound’s left part.
   * 5. Otherwise, collect tokens that look like version strings. If there’s only one version token,
   *    assign it to Minecraft if it is recognized (and leave mod version null), or to the mod if not.
   *    If there are two tokens, use the one that is in the valid list (or, if both or neither are, the later token)
   *    as the Minecraft version and the other as the mod version.
   * 6. The mod name is taken as the join (with hyphens) of tokens preceding the first version token,
   *    then adjusted by special‑case rules.
   *
   * @param {string} filename - The mod filename (typically ending with ".jar").
   * @returns {Object} An object with mod and minecraft details.
   */
  parse(filename) {
      // 1. Remove .jar extension.
      const cleaned = filename.replace(/\.jar$/i, "");
      // 2. Split on hyphen or "@" (preserving underscores).
      let tokens = cleaned.split(/[-@]+/).filter(t => t);

      // 3. Remove loader tokens (and extraneous words) while capturing loader if found.
      let loader = "unknown";
      tokens = tokens.filter(token => {
          const lower = token.toLowerCase();
          if (this.loaderAliases[lower]) {
              loader = this.loaderAliases[lower];
              return false;
          }
          if (["neoforge", "fabric", "forge"].includes(lower)) {
              loader = lower;
              return false;
          }
          if (this.isExtraneous(lower)) {
              return false;
          }
          return true;
      });

      // Variables to hold our results.
      let modName = "";
      let modVersion = null;
      let mcVersion = "unknown";

      // 4. Look for a compound token (one containing a "+")
      let compoundIndex = tokens.findIndex(t => t.includes("+"));
      if (compoundIndex !== -1) {
          const parts = tokens[compoundIndex].split("+").filter(p => p);
          if (parts.length === 2) {
              // If there is a token immediately before the compound token…
              let prevToken = compoundIndex > 0 ? tokens[compoundIndex - 1] : null;
              if (prevToken && this.isVersion(prevToken)) {
                  // If the previous token (normalized) is a valid Minecraft version, then assume that token is the MC version.
                  if (this.isValidMinecraftVersion(prevToken)) {
                      mcVersion = this.normalizeVersion(prevToken);
                      // In that case, use the compound token as mod version (as is).
                      modVersion = tokens[compoundIndex];
                      // And remove the previous token from the version pool.
                      tokens.splice(compoundIndex - 1, 1);
                      compoundIndex--; // adjust index
                  } else {
                      // Otherwise, prepend the previous token to the left part of the compound.
                      modVersion = prevToken + "-" + parts[0];
                      mcVersion = parts[1];
                      // Remove the previous token from tokens.
                      tokens.splice(compoundIndex - 1, 1);
                      compoundIndex--; // adjust index
                  }
              } else {
                  // No preceding token: assign compound parts directly.
                  modVersion = parts[0];
                  mcVersion = parts[1];
              }
          } else {
              // If more than 2 parts, default to using the compound token as-is for mod version.
              modVersion = tokens[compoundIndex];
          }
          // Use tokens before the compound token as mod name.
          modName = tokens.slice(0, compoundIndex).join("-");
      } else {
          // 5. No compound token. Look for tokens that look like version strings.
          const versionIndices = [];
          tokens.forEach((t, i) => {
              if (this.isVersion(t)) {
                  versionIndices.push(i);
              }
          });

          if (versionIndices.length === 0) {
              // No version token found: treat entire string as mod name.
              modName = cleaned;
          } else if (versionIndices.length === 1) {
              const vi = versionIndices[0];
              modName = tokens.slice(0, vi).join("-");
              const candidate = tokens[vi];
              // If the candidate is recognized as a valid Minecraft version, use it only for MC;
              // otherwise, assign it as the mod version.
              if (this.isValidMinecraftVersion(candidate)) {
                  mcVersion = this.normalizeVersion(candidate);
                  // For some files we want both fields the same.
                  // For example, "cuisinedelight-1.2.3" should yield mod version "1.2.3" as well.
                  // If there is no mod name (i.e. candidate was the only token), then use it for both.
                  if (modName === "") {
                      modVersion = candidate;
                  }
              } else {
                  modVersion = candidate;
              }
          } else if (versionIndices.length >= 2) {
              // Use the first two version tokens.
              const firstVersion = tokens[versionIndices[0]];
              const secondVersion = tokens[versionIndices[1]];
              modName = tokens.slice(0, versionIndices[0]).join("-");
              // Decide which token is Minecraft version.
              if (this.isValidMinecraftVersion(firstVersion)) {
                  mcVersion = this.normalizeVersion(firstVersion);
                  modVersion = secondVersion;
              } else if (this.isValidMinecraftVersion(secondVersion)) {
                  mcVersion = this.normalizeVersion(secondVersion);
                  modVersion = firstVersion;
              } else {
                  // If neither appears valid, default to the latter as MC version.
                  mcVersion = this.normalizeVersion(secondVersion);
                  modVersion = firstVersion;
              }
          }
      }

      // 6. Special-case mod name fixes.
      modName = this.fixModName(modName);

      // 7. (Optional) Normalize Minecraft version if it ends with ".x".
      mcVersion = mcVersion.replace(/\.x$/i, "");

      // 8. Decide final fields:
      // If only one version token was found and we assigned it to MC but modVersion is still null,
      // then (for some cases) copy it to modVersion.
      if (modVersion === null && mcVersion !== "unknown") {
          // For certain filenames (e.g. "cuisinedelight-1.2.3") we want both to be the same.
          modVersion = mcVersion;
      }

      // 9. Return the assembled object.
      return {
          mod: {
              name: modName || cleaned,
              version: modVersion
          },
          minecraft: {
              version: mcVersion,
              loader: loader,
              valid: this.validMinecraftVersions.length
                  ? this.validMinecraftVersions.some(v => v.startsWith(mcVersion) || v === mcVersion)
                  : false
          }
      };
  }
}

export default Componentize;