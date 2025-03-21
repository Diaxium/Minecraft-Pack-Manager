# Minecraft Pack Manager

## Overview
Minecraft Pack Manager is a command-line utility designed to simplify the management of Minecraft mods, snapshots, and logs across different profiles. It facilitates creating backups (snapshots), copying mods between profiles, removing mods after gameplay, cleaning duplicate mods, and managing logs.

## Features

### Pre-Launch Operations
- **Snapshot Creation:** Prompted backup of the current mod setup before launching Minecraft.
- **Snapshot Viewing:** Option to open the most recent snapshot backup.
- **Mod Copying:** Copies mods from specified profiles to the primary Minecraft profile.

### Post-Exit Operations
- **Mod Removal:** Option to delete mods from the primary profile after exiting Minecraft.
- **Snapshot Viewing:** Review the latest snapshot backup.
- **Log Cleanup:** Removal of logs generated during gameplay to maintain disk space.

## Modules & Functionalities

### Handlers
- **Copy Handler (`copyHandler.js`):** Copies mods safely and logs the operations.
- **Delete Handler (`deleteHandler.js`):** Deletes mods from the primary profile's mods folder.
- **Duplicate Handler (`duplicateHandler.js`):** Identifies and removes duplicate mods.
- **Gather Handler (`gatherHandler.js`):** Collects mod data, detects duplicates, and processes mod files for snapshots.
- **Creation Handler (`creationHandler.js`):** Creates snapshots, computes differences, and maintains snapshot records.
- **Limit Handler (`limitHandler.js`):** Maintains the number of snapshots within a specified limit by deleting the oldest snapshots.
- **Open Handler (`openHandler.js`):** Opens the latest snapshot using the system's default text editor.
- **Cleanup Handler (`cleanupHandler.js`):** Cleans up logs from the primary profile.

### Main Script (`main.js`)
Initializes operations based on command-line hooks:
- `pre-launch`: Handles snapshot creation, snapshot viewing, and mod copying.
- `post-exit`: Handles mod removal, snapshot viewing, and log cleanup.

## Setup
To set up the Minecraft Pack Manager project locally, follow these steps:

### Prerequisites
- Git installed
- Node.js (v18+)

### Installation Steps

1. **Clone the repository:**
   ```sh
   git clone <repository-url>
   cd minecraft-pack-manager
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configuration:**
   Adjust your configuration settings within the `config` directory according to your Minecraft setup.

4. **Run the script:**
   ```sh
   node main.js [hook]
   ```

## Usage
Run the script via command-line interface:
```sh
node main.js [hook]
```
- Replace `[hook]` with either `pre-launch` or `post-exit`.

### Examples
- Pre-launch:
  ```sh
  node main.js pre-launch
  ```
- Post-exit:
  ```sh
  node main.js post-exit
  ```

## Logging
Minecraft Pack Manager employs tagged logging for clear and categorized terminal output, enhancing readability and debugging ease.

## Requirements
- Node.js (v18+)
- Minecraft Java Edition

## File Structure
- `config/` - Contains all storage, session, and enviorment details.
- `handlers/` - Contains all handler scripts.
- `helpers/` - Utility scripts for managing prompts and operations.
- `utils/` - Shared utilities including logger and parsing tools.

## Contribution
Feel free to contribute by improving functionalities or reporting issues through pull requests and issues.

---

© 2024 Minecraft Pack Manager

