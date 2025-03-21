/**
 * Logger.js
 * Version: 2.2.0
 *
 * Description:
 * A structured logging module that enhances debugging and monitoring by providing:
 * - Standard logging with different log levels.
 * - Tag-based logging for contextual messages.
 * - Grouped logging (with an internal queue) to batch multiple messages together.
 * - Queued regular logs so they never interleave with grouped log blocks.
 * - ANSI-colored output for better readability.
 *
 * Example Usage:
 *
 * import { logger } from "./Logger.js";
 *
 * // Standard Logging
 * logger.info("Application started.");
 *
 * // Tagged Logging with Grouping:
 * const authLogger = new logger.Tag("AUTH", "🔑", ansi.rgb(255, 165, 0));
 * authLogger.beginGrouping();
 * authLogger.info("User login started.");
 * authLogger.warn("Password input took too long.");
 * authLogger.endGrouping();
 */

import ansi from "ansi-escape-sequences";

// Global state for managing log grouping.
let globalLogQueue = [];
let globalGroupingQueue = [];

/**
 * Outputs a log message. If any grouping is active or pending, the message is queued;
 * otherwise, it is immediately printed to the console.
 * @param {string} message - The log message to output.
 */
function outputLog(message) {
    if (globalGroupingQueue.length > 0) {
        globalLogQueue.push(message);
    } else {
        console.log(message);
    }
}

/**
 * Flushes all queued regular log messages if no grouping is active.
 */
function flushGlobalQueue() {
    if (globalGroupingQueue.length === 0 && globalLogQueue.length > 0) {
        globalLogQueue.forEach(msg => console.log(msg));
        globalLogQueue = [];
    }
}

// Log message types and formatting.
const MESSAGE_TYPES = {
    info: {
        icon: "ℹ️",
        label: "[INFO]",
        color: text => ansi.rgb(0, 213, 255) + text + ansi.style.reset,
    },
    warning: {
        icon: "⚠️",
        label: "[WARNING]",
        color: text => ansi.rgb(255, 140, 0) + text + ansi.style.reset,
    },
    error: {
        icon: "⛔",
        label: "[ERROR]",
        color: text => ansi.rgb(255, 0, 47) + text + ansi.style.reset,
    },
    debug: {
        icon: "🚧",
        label: "[DEBUG]",
        color: text => ansi.rgb(255, 242, 0) + text + ansi.style.reset,
    },
};

/**
 * Formats a log message.
 * @param {string} type - The log level (info, warning, error, debug).
 * @param {string|null} tag - Optional tag for contextual logging.
 * @param {string} message - The main log message.
 * @param {string} logIcon - Icon to display.
 * @param {Function} [tagColor] - Function to colorize the tag. Defaults to gray.
 * @returns {string} The formatted log message.
 */
const formatMessage = (type, tag, message, logIcon, tagColor = text =>
    ansi.rgb(180, 180, 180) + text + ansi.style.reset) => {
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    const { icon, label, color } = MESSAGE_TYPES[type] || MESSAGE_TYPES.info;
    const formattedTag = tag ? tagColor(`[${tag}]`) : color(label);

    return `[${timestamp}]${formattedTag} ${(logIcon || icon)}: ${message} ${ansi.style.reset}`;
};

/**
 * Logs a standard message using the specified type.
 * @param {string} type - The log level.
 * @param {string} message - The message to log.
 * @param {string} [icon=""] - Optional icon to override the default.
 */
const logStandardMessage = (type, message, icon = "") => {
    outputLog(formatMessage(type, null, message, icon));
};

/**
 * Wraps a given text at a specified maximum width.
 * @param {string} text - The text to wrap.
 * @param {number} maxWidth - Maximum width for each line.
 * @returns {string[]} Array of wrapped text lines.
 */
function wrapText(text, maxWidth) {
    const words = text.split(" ");
    let currentLine = "";
    const lines = [];
    words.forEach(word => {
        if ((currentLine + word).length > maxWidth) {
            lines.push(currentLine.trim());
            currentLine = "";
        }
        currentLine += word + " ";
    });
    if (currentLine.trim()) {
        lines.push(currentLine.trim());
    }
    return lines;
}

/**
 * Clears the console
 */
function clearConsole() {
    console.clear();
}

/**
 * Class representing a contextual log tag.
 */
class Tag {
    /**
     * Creates a new Tag instance.
     * @param {string} tag - The tag name.
     * @param {string} [icon="🏷️"] - The icon for the tag.
     * @param {string} [tagColorValue=ansi.rgb(180, 180, 180)] - ANSI color value for the tag.
     */
    constructor(tag, icon = "🏷️", tagColorValue = ansi.rgb(180, 180, 180)) {
        this.tag = tag;
        this.icon = icon;
        this.tagColor = text => tagColorValue + text + ansi.style.reset;
        
        this.logs = [];
        this.grouping = false; // Indicates beginGrouping was called.
        this.active = false;   // Indicates that this grouping is currently allowed to output.
        this.finished = false; // Indicates that endGrouping has been called.
    }

    /**
     * Logs a message with the specified type.
     * @param {string} type - The log level.
     * @param {string} message - The message to log.
     * @param {string} icon - An optional icon to represent the log.
     */
    log(type, message, icon) {
        const formatted = formatMessage(type, this.tag, message, icon || this.icon, this.tagColor);
        if (this.grouping) {
            this.logs.push({ type, message: formatted });
        } else {
            outputLog(formatted);
        }
    }

    info(message, icon) { this.log("info", message, icon); }
    warn(message, icon) { this.log("warning", message, icon); }
    error(message, icon) { this.log("error", message, icon); }
    debug(message, icon) { this.log("debug", message, icon); }

    clear() { clearConsole() };

    /**
     * Begins a grouped logging session.
     * The instance is enqueued so that only the earliest grouping is active.
     */
    beginGrouping() {
        if (this.grouping) {
            // Already in a grouping.
            return;
        }
        
        flushGlobalQueue();
        this.logs = [];
        this.grouping = true;
        this.finished = false;
        this.active = false;
        globalGroupingQueue.push(this);
        
        // If this is the first grouping in the queue, activate it immediately.
        if (globalGroupingQueue[0] === this) {
            this.active = true;
            console.log(formatMessage("info", this.tag, "Batch Start", this.icon, this.tagColor));
            console.log(this.generateSeparator());
        }
    }

    /**
     * Flushes the stored logs of this grouping.
     */
    flushLogs() {
        const indent = "    │   ";
        const maxWidth = process.stdout.columns || 80;
    
        this.logs.forEach(log => {
            if (log.type === "separator") {
                console.log(log.message);
            } else {
                const { type, message } = log;
                const { icon, color } = MESSAGE_TYPES[type] || MESSAGE_TYPES.info;
    
                // Remove timestamp and tag for grouped formatting.
                const parts = message.split(": ");
                const prefix = `    ├── ${color(icon + " ")}`;
                const logText = parts.slice(1).join(": ");
                const wrappedLines = wrapText(logText, maxWidth - prefix.length);
    
                wrappedLines.forEach((line, index) => {
                    console.log(index === 0 ? prefix + color(line) : indent + color(line));
                });
            }
        });
    
        this.logs = [];
    }

    /**
     * Ends the grouped logging session.
     * If this instance is active, its queued logs are flushed immediately.
     * Otherwise, it marks itself as finished so that it will flush when its turn comes.
     */
    endGrouping() {
        if (!this.grouping) {
            // Not in a grouping.
            return;
        }
        
        this.finished = true;
        
        if (this.active) {
            // Flush logs and close the group immediately.
            this.flushLogs();
            console.log(this.generateSeparator());
            console.log(formatMessage("info", this.tag, "Batch End", this.icon, this.tagColor));
            this.grouping = false;
            // Remove from the head of the queue.
            globalGroupingQueue.shift();
            processNextGrouping();
        }
        // If not active, it will be processed when its turn comes.
    }

    /**
     * Generates a horizontal separator based on the terminal width.
     * @returns {string} The separator line.
     */
    generateSeparator() {
        const maxWidth = process.stdout.columns || 80;
        return "    ├" + "─".repeat(maxWidth - 6);
    }
}

/**
 * Checks the global grouping queue and activates any grouping that is next in line.
 * If the next grouping has already been finished, it immediately flushes its logs.
 */
function processNextGrouping() {
    if (globalGroupingQueue.length > 0) {
        const next = globalGroupingQueue[0];
        if (!next.active) {
            next.active = true;
            console.log(formatMessage("info", next.tag, "Batch Start", next.icon, next.tagColor));
            console.log(next.generateSeparator());
        }
        if (next.finished) {
            // If the next grouping had already ended while waiting, flush it immediately.
            next.flushLogs();
            console.log(next.generateSeparator());
            console.log(formatMessage("info", next.tag, "Batch End", next.icon, next.tagColor));
            next.grouping = false;
            globalGroupingQueue.shift();
            // Recursively process further groupings.
            processNextGrouping();
        }
    } else {
        flushGlobalQueue();
    }
}

export const logger = {
    info: (message, icon = "") => logStandardMessage("info", message, icon),
    warn: (message, icon = "") => logStandardMessage("warning", message, icon),
    error: (message, icon = "") => logStandardMessage("error", message, icon),
    debug: (message, icon = "") => logStandardMessage("debug", message, icon),
    
    clear: () => clearConsole(),
    Tag,
};
