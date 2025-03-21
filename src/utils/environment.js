/**
 * Environment.js
 * Version: 2.1.0
 *
 * Description:
 * A constructor-based, type-safe environment manager that:
 * - Ensures the existence of a `.env` file (creates one if missing).
 * - Allows setting default values for environment variables.
 * - Supports schema validation automatically.
 * - Provides methods to get, update, and delete environment variables.
 * - Automatically updates the `.env` file when modifications are made.
 * - No need to import `zod` externally; it infers types internally.
 * 
 * Features:
 * ✅ Auto-creates `.env` if missing  
 * ✅ Type-safe environment variable retrieval  
 * ✅ Automatically infers types (string, number, boolean)  
 * ✅ Persists changes to the `.env` file  
 * ✅ Chainable API for convenience  
 *
 * Example Usage:
 *
 * ```javascript
 * import Environment from "./Environment.js";
 *
 * // Initialize Environment
 * const Settings = new Environment();
 *
 * // Define default environment variables
 * const Env = Settings.getOrDefault({
 *     PORT: 3000,
 *     NODE_ENV: "development",
 * }).build();
 *
 * console.log(`Server running on port: ${Env.PORT}`);
 * console.log(`Environment: ${Env.NODE_ENV}`);
 *
 * // Updating environment variables
 * Settings.update("PORT", "4000");
 * console.log(Settings.get("PORT")); // Outputs: "4000"
 *
 * // Deleting an environment variable
 * Settings.delete("PORT");
 * console.log(Settings.get("PORT")); // Outputs: null
 * ```
 */

import ansi from "ansi-escape-sequences";
import dotenv from "dotenv";
import { z } from "zod";
import path from "path";
import fs from "fs";

import { logger } from "./logger.js";


class Environment {
    /**
     * Creates an instance of the Environment class.
     * @param {string} [envFilePath=".env"] - The path to the environment file.
     */
    constructor(envFilePath = ".env") {
        this.envFilePath = path.resolve(process.cwd(), envFilePath);
        this.schema = z.object({});
        this.overrides = {};
        this.console = new logger.Tag("ENVIRONMENT", "⚙️", ansi.rgb(13, 182, 255));

        this.isNew = false;

        this.console.beginGrouping();
        this.ensureEnvFile();
        this.loadEnvFile();
    }

    /**
     * Ensures the `.env` file exists; if missing, creates one.
     */
    ensureEnvFile() {
        if (!fs.existsSync(this.envFilePath)) {
            this.isNew = true;

            fs.writeFileSync(this.envFilePath, "", "utf-8");
            this.console.warn(`No .env file found. Created a new one at ${this.envFilePath}`);
        }
    }

    /**
     * Loads environment variables from the `.env` file.
     */
    loadEnvFile() {
        dotenv.config({ path: this.envFilePath });
        this.console.info(`Loaded environment variables from ${this.envFilePath}`);
    }

    /**
     * Registers default values for environment variables and updates `.env` if needed.
     * @param {string|Object} keyOrDefaults - A single key or an object of key-value pairs.
     * @param {any} [defaultValue] - Default value (if keyOrDefaults is a string).
     * @returns {Environment} - Returns instance for method chaining.
     */
    getOrDefault(keyOrDefaults, defaultValue) {
        let newEntries = {};
        let schemaFields = {};

        if (typeof keyOrDefaults === "string") {
            if (!(keyOrDefaults in process.env)) {
                process.env[keyOrDefaults] = defaultValue;
                newEntries[keyOrDefaults] = defaultValue;
            }
            schemaFields[keyOrDefaults] = this._inferType(defaultValue);
        } else if (typeof keyOrDefaults === "object") {
            for (const [key, value] of Object.entries(keyOrDefaults)) {
                if (!(key in process.env)) {
                    process.env[key] = value;
                    newEntries[key] = value;
                }
                schemaFields[key] = this._inferType(value);
            }
        } else {
            throw new TypeError("Invalid argument type for getOrDefault()");
        }

        // Merge schema
        this.schema = this.schema.merge(z.object(schemaFields));

        // If new entries were added, update `.env`
        if (Object.keys(newEntries).length > 0) {
            this._modifyEnvFile(newEntries, "update");
        }

        return this;
    }

    /**
     * Infers the Zod type from a given default value.
     * Also converts numeric environment variables from strings to numbers.
     * @param {any} value - The default value.
     * @returns {z.ZodType} - The inferred Zod schema type.
     */
    _inferType(value) {
        if (typeof value === "number") {
            return z.preprocess((val) => {
                if (typeof val === "string" && !isNaN(val)) return Number(val);
                return val;
            }, z.number().default(value));
        }
        if (typeof value === "boolean") {
            return z.preprocess((val) => {
                if (val === "true") return true;
                if (val === "false") return false;
                return val;
            }, z.boolean().default(value));
        }
        return z.string().default(value);
    }


    /**
     * Validates and builds the environment object.
     * @returns {Object} - The validated environment object.
     */
    build() {
        if (!this.schema) {
            throw new Error("No schema defined. Use .getOrDefault() before calling .build().");
        }

        const envVars = { ...process.env, ...this.overrides };
        const parsed = this.schema.safeParse(envVars);

        if (!parsed.success) {
            this.console.error("Invalid environment variables detected!");
            this.console.log("Validation Errors:", JSON.stringify(parsed.error.format(), null, 2));
            this.console.log("Current Environment Variables:", process.env);
            this.console.log("Expected Schema:", this.schema);
            this.console.endGrouping();

            process.exit(1);
        }

        this.console.endGrouping();
        return (this.env = parsed.data);
    }

    /**
     * Updates an environment variable in-memory and in `.env` file.
     * @param {string} key - The key name.
     * @param {string} value - The new value.
     */
    update(key, value) {
        process.env[key] = value;
        this._modifyEnvFile({ [key]: value }, "update");
    }

    /**
     * Deletes an environment variable in-memory and from `.env`.
     * @param {string} key - The key name.
     */
    delete(key) {
        if (!(key in process.env)) {
            this.console.warn(`Cannot delete ${key}: Key does not exist.`);
            return;
        }

        delete process.env[key];
        this._modifyEnvFile({ [key]: undefined }, "delete");
    }

    /**
     * Retrieves an environment variable and returns it with the proper type.
     * @param {string} key - The key to retrieve.
     * @returns {any} - The parsed and type-safe value of the environment variable.
     */
    get(key) {
        if (!this.schema.shape[key]) {
            this.console.warn(`The key "${key}" is not defined in the schema. Returning as a string.`);
            return process.env[key] ?? null;
        }

        const value = process.env[key];
        const parsed = this.schema.shape[key].safeParse(value);

        if (parsed.success) {
            return parsed.data;
        } else {
            this.console.warn(`Failed to parse the value for key "${key}". Returning raw value as a string.`);
            return value ?? null;
        }
    }


    /**
    * Retrieves all environment variables with their properly parsed types.
    * @returns {Object} - The full environment object with type-safe values.
    */
    getAll() {
        const allEnvVars = { ...process.env };
        const parsedEnv = {};

        for (const key of Object.keys(allEnvVars)) {
            if (this.schema.shape[key]) {
                const parsed = this.schema.shape[key].safeParse(allEnvVars[key]);
                parsedEnv[key] = parsed.success ? parsed.data : allEnvVars[key];
            } else {
                this.console.warn(`The key "${key}" is not defined in the schema. Returning as a string.`);
                parsedEnv[key] = allEnvVars[key];
            }
        }

        return parsedEnv;
    }


    /**
     * Modifies the `.env` file with updated or deleted entries.
     * @param {Object} changes - Key-value pairs to modify.
     * @param {string} action - "update" or "delete".
     */
    _modifyEnvFile(changes, action) {
        const envVars = this._loadEnvFileContent();
        Object.entries(changes).forEach(([key, value]) => {
            if (value === undefined) delete envVars[key];
            else envVars[key] = value;
        });

        this._writeEnvFile(envVars);
        this.console.info(`${action === "update" ? "Updated" : "Deleted"} ${Object.keys(changes).join(", ")} in .env`);
    }

    /**
     * Loads the `.env` file as an object.
     * @returns {Object} - Parsed key-value pairs.
     */
    _loadEnvFileContent() {
        if (!fs.existsSync(this.envFilePath)) return {};
        return Object.fromEntries(
            fs.readFileSync(this.envFilePath, "utf-8")
                .split("\n")
                .filter(Boolean)
                .map(line => line.split("=").map(part => part.trim()))
        );
    }

    /**
     * Writes updated environment variables to `.env` file.
     * @param {Object} envVars - The environment variables to write.
     */
    _writeEnvFile(envVars) {
        const content = Object.entries(envVars)
            .map(([key, value]) => `${key}=${value}`)
            .join("\n");

        fs.writeFileSync(this.envFilePath, content, "utf-8");
    }
}

export default Environment;