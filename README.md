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

### Configuration Files (`config/` folder)
- **Session (`session.js`):** Manages session-specific data, categorized mod profiles, and dynamically resolved paths.
- **Settings (`settings.js`):** Handles default application settings, environment configurations, and ensures proper initialization.

### Main Script (`main.js`)
Initializes operations based on command-line hooks:
- `pre-launch`: Handles snapshot creation, snapshot viewing, and mod copying.
- `post-exit`: Handles mod removal, snapshot viewing, and log cleanup.

## Setup
To set up the Minecraft Pack Manager project locally, follow these steps:

### Prerequisites
- Git installed
- Node.js (v18+)
- Modrinth launcher installed and configured

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

3. **Initial Configuration:**
   Run the following command to initialize the required configuration variables for future launches:
   ```sh
   node main.js
   ```

4. **Profile Setup:**
   - First, create a primary profile in your Modrinth launcher. This profile will serve as your runtime environment, where mods, configurations, resource packs, and more will be used during modpack creation.
   - Next, create additional profiles in Modrinth, labeling them exactly as shown below. These profiles categorize your mods for organized management. You can customize your selection according to your needs, but the profile labeled **"1. Library"** is mandatory:

   | Profile Name | Purpose |
   |--------------|---------|
   | "1. Library" | Core dependencies and required libraries |
   | "2. Optimization" | Performance enhancement and lag reduction mods |
   | "3. Integration" | Compatibility and interaction handling mods |
   | "4. UI" | User Interface improvements |
   | "5. Terrain" | Terrain generation mods (biomes, landscapes, etc.) |
   | "6. World" | Structures, dungeons, towns, etc. |
   | "7. Dimension" | Additional worlds or dimensions |
   | "8. Mobs" | Additional creatures and wildlife |
   | "9. NPCs" | Non-player characters and traders |
   | "10. Gameplay" | Mods altering gameplay mechanics |
   | "11. Technology" | Tech-based mods and machinery |
   | "12. Magic" | Magic progression, spells, and rituals |
   | "13. Farming" | Agriculture, crops, and food systems |
   | "14. Combat" | Combat mechanics and battle system overhauls |
   | "15. Weapons" | New weapons and combat gear |
   | "16. Tools" | New tools, mining, and harvesting equipment |
   | "17. Storage" | Inventory management and expanded storage solutions |
   | "18. Transportation" | Vehicles, mounts, and transport methods |
   | "19. Adventure" | Questing, exploration, and treasure hunting |
   | "20. Decoration" | Cosmetic and decorative items |
   | "21. Graphics" | Visual enhancements (shaders, lighting effects, etc.) |
   | "22. Quality-of-life" | Improvements enhancing user experience |

5. **Configure Launch Hooks:**
   - In your primary profile settings within the Modrinth launcher, navigate to `Launch hooks`.
   - Enable `Custom launch hooks`.
   - Enter the following in the `Pre-launch` input box:
     ```sh
     node <path-to-Pack-Manager>/main.js pre-launch
     ```
   - Similarly, for the `Post-exit` input box, enter:
     ```sh
     node <path-to-Pack-Manager>/main.js post-exit
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
- `handlers/` - Contains all handler scripts.
- `helpers/` - Utility scripts for managing prompts and operations.
- `utils/` - Shared utilities including logger and parsing tools.
- `config/` - Contains session and settings configurations.

## Contribution
Feel free to contribute by improving functionalities or reporting issues through pull requests and issues.

## License
This project is licensed under the MIT License.

---

© 2024 Minecraft Pack Manager