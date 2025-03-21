/**
 * Cache.js
 * Version: 1.1.0
 *
 * Description:
 * A constructor-based, clearable cache storage system that:
 * - Supports in-memory caching with expiration options.
 * - Allows storing, retrieving, updating, and deleting cache entries.
 * - Provides automatic expiration for stored values (if specified).
 * - Offers a chainable API for convenient usage.
 * - Enables full cache clearing.
 *
 * Features:
 * ✅ In-memory caching with optional expiration  
 * ✅ Set, get, update, and delete cache entries  
 * ✅ Auto-expires cache entries if specified  
 * ✅ Chainable API for ease of use  
 * ✅ Supports retrieving all stored cache values  
 *
 * Example Usage:
 *
 * ```javascript
 * import Cache from "./Cache.js";
 *
 * // Initialize Cache
 * const cache = new Cache();
 *
 * // Store an object under key "Paths"
 * cache.set("Paths", { Main: "initialValue", Secondary: "foo" });
 *
 * // Update the nested property "Main" using dot-notation
 * cache.update("Paths.Main", "updatedValue");
 * console.log(cache.get("Paths")); // Outputs: { Main: "updatedValue", Secondary: "foo" }
 *
 * // Standard update without dot-notation works as before
 * cache.update("Paths", { Main: "newRoot", Extra: "bar" });
 * console.log(cache.get("Paths")); // Outputs: { Main: "newRoot", Extra: "bar" }
 * ```
 */

class Cache {
    constructor() {
        this.storage = new Map();
    }

    set(key, value, ttl) {
        if (!key || typeof key !== "string") {
            throw new Error("Cache key must be a valid string.");
        }

        const expiresAt = ttl ? Date.now() + ttl : null;

        this.storage.set(key, { value, expiresAt });

        return this;
    }

    get(key) {
        if (!key || typeof key !== "string") {
            throw new Error("Cache key must be a valid string.");
        }

        if (!this.storage.has(key)) return null;

        const { value, expiresAt } = this.storage.get(key);

        if (expiresAt && Date.now() > expiresAt) {
            this.delete(key);

            return null;
        }

        return value;
    }

    getOrDefault(key, Default, ttl, overWrite = false) {
        if (!key || typeof key !== "string") {
            throw new Error("Cache key must be a valid string.");
        }
    
        const cacheEntry = this.storage.get(key);
    
        if (!cacheEntry) {
            // If key does not exist and overwriting is allowed, store the default value.
            if (overWrite) {
                this.set(key, Default, ttl);
            }
            return Default;
        }
    
        const { value, expiresAt } = cacheEntry;
    
        if (expiresAt && Date.now() > expiresAt) {
            this.delete(key);
    
            if (overWrite) {
                this.set(key, Default, ttl);
            }
            return Default;
        }
    
        return value != null ? value : Default;
    }    

    /**
     * Updates an existing cache entry.
     * Supports nested updates via dot-notation.
     *
     * For example:
     * - "Paths.Main" will update the "Main" property inside the object stored at key "Paths".
     *
     * @param {string} key - The key or dot-notation path to update.
     * @param {any} newValue - The new value to store.
     * @returns {Cache} - Returns instance for method chaining.
     */
    update(key, newValue) {
        // Check if the key includes a dot for nested update.
        if (key.includes(".")) {
            const keys = key.split(".");
            const rootKey = keys.shift(); // First part is the actual cache key

            if (!this.storage.has(rootKey)) {
                throw new Error(`Cache key "${rootKey}" does not exist.`);
            }

            const { value: rootValue, expiresAt } = this.storage.get(rootKey);

            if (typeof rootValue !== "object" || rootValue === null) {
                throw new Error(`Cache value at key "${rootKey}" is not an object and cannot be updated with a nested path.`);
            }

            // Traverse the nested object up to the property before the final key.
            let current = rootValue;
            for (let i = 0; i < keys.length - 1; i++) {
                const prop = keys[i];
                // If the nested property doesn't exist, create an empty object.
                if (!(prop in current)) {
                    current[prop] = {};
                }
                current = current[prop];
                if (typeof current !== "object" || current === null) {
                    throw new Error(`Property path "${keys.slice(0, i + 1).join('.')}" is not an object.`);
                }
            }
            // Update the final property.
            const finalKey = keys[keys.length - 1];
            current[finalKey] = newValue;
            // Save the updated object back in storage.
            this.storage.set(rootKey, { value: rootValue, expiresAt });
            return this;
        } else {
            // Standard update if no dot notation is present.
            if (!this.storage.has(key)) {
                throw new Error(`Cache key "${key}" does not exist.`);
            }

            const { value, expiresAt } = this.storage.get(key);

            // Merge existing and newValue if both are objects.
            if (typeof value === 'object' && value !== null && typeof newValue === 'object' && newValue !== null) {
                newValue = { ...value, ...newValue };
            }

            this.storage.set(key, { value: newValue, expiresAt });

            return this;
        }
    }

    delete(key) {
        this.storage.delete(key);
    }

    clear() {
        this.storage.clear();
    }

    getAll() {
        const entries = {};
        for (const [key, { value, expiresAt }] of this.storage.entries()) {
            if (!expiresAt || Date.now() <= expiresAt) {
                entries[key] = value;
            }
        }
        return entries;
    }
}

export default Cache;
