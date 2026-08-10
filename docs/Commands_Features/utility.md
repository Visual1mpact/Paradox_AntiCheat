<img src="Media\paradox-header.png" alt="Paradox AntiCheat Logo"> </img>

?> This documentation could change with any version. Be sure to check it periodically.

---

## broadcast
### At A Glance
The `broadcast` command allows Administrators to send server-wide announcements using prominent on-screen UI elements. This ensures that important messages are seen by every player, even if they aren't looking at the chat.

?> Required Clearance Level To Execute: `3`

### **How It Works**
- Broadcasts use the Minecraft title system to display messages in three distinct areas:
    - **Title**: Large text in the center of the screen.
    - **Subtitle**: Smaller text displayed directly beneath the main title.
    - **Action Bar**: Text displayed just above the player's hotbar.
- The command supports flags to target specific UI elements. You must provide at least one field for the broadcast to be valid.
- Subtitles are displayed alongside titles. If only a subtitle is provided, a blank title is used to maintain visibility.

> Usage: ":broadcast [ -t | --title <text> ] [ -s | --subtitle <text> ] [ -a | --actionbar <text> ]"
> Example: :broadcast -t "Event Starting!" -s "Meet at Spawn"
> Example: :broadcast -a "Maintenance in 5 minutes"

### **GUI Integration**
- Found under the **Utility** category in the administrative GUI.
- **Global Broadcaster**: Selecting this action opens a configuration form where you can input text for the Title, Subtitle, and Action Bar simultaneously.

### **Notes**
- Supports standard Minecraft color codes (e.g., `§a`, `§e`).
- Broadcasts include built-in timing for fade-in, stay duration, and fade-out to ensure readability.
- Sending a new title broadcast will overwrite any currently active title/subtitle on the player's screen.
- Input sanitization automatically removes restricted symbols like `@` to prevent execution injections.

---

## channels
### At A Glance
The `channels` command allows players to manage private chat channels. Players can create, join, invite, leave, and transfer ownership of channels in a controlled environment.

?> Required Clearance Level To Execute: `1`

### **How It Works**
- Each chat channel has an owner and members, with dynamically updated membership data.
- Players can **create** new channels if they are not already in one.
- Players can **join** existing channels by name.
- Owners can **invite** other players; invitations expire after 30 seconds.
- Players can **leave** channels at any time. Ownership is automatically transferred if the owner leaves.
- Channel **ownership** can be transferred to another member.
- All changes notify relevant players to ensure smooth communication.


> Usage: ":channel <create | join | invite | leave | transfer | help>"
> Example: :channel create --room myTeam
> Example: :channel join --room myTeam
> Example: :channel invite --room myTeam --target Visual1mpact
> Example: :channel leave
> Example: :channel transfer --room myTeam --target Visual1mpact
> Example: :channel help


### **Actions**
1. **Create Channel** – Create a new chat channel; cannot create if already in another channel.
2. **Join Channel** – Join an existing channel by name.
3. **Invite to Channel** – Invite a player to your channel; invitation expires after 30 seconds.
4. **Leave Channel** – Leave your current channel. If you are the owner, ownership is transferred to the next member, or the channel is deleted if empty.
5. **Transfer Ownership** – Transfer channel ownership to another member.
6. **Help** – Displays usage instructions for the command.

### **Notes**
- Channel names are **case-sensitive**.
- Players can only be in **one channel at a time**.
- Invitations are automatically canceled if the invited player does not respond in time.
- Dynamic updates ensure all members are informed of joins, leaves, and ownership changes.

---

## chunkborders
### At A Glance
The `chunkborders` command toggles real-time, on-screen chunk boundary overlays, allowing players to visualize 16 x 16 world grid columns and sub-chunk vertical sections directly in world space.

?> Required Clearance Level To Execute: `1`

### **How It Works**
- **Real-Time Debug Rendering:** Draws vertical grid lines, 16-block section rings, and corner pillars around the player's active chunk coordinates using native debug lines.
- **Dynamic Chunk Movement Tracking:** Monitors player location and automatically recalculates and shifts debug boundary lines when entering a new chunk.
- **Generator-Based Threading:** Spreads rendering operations across tick yields to maintain server performance and prevent spike latency.
- **Toggle Mechanism:** Executing the command toggles overlay visibility on and off. Disabling clears all rendered shapes and frees memory resources.

> Usage: ":chunkborders"
> Example: :chunkborders

### **GUI Integration**
- Found under the **Utility** category in the main GUI.
- **Toggle Chunk Borders**: Selecting this option opens the UI overlay controls to toggle border visibility on or off without needing manual chat invocation.

### **Notes**
- **Platform Availability:** Utilizes native debug drawing capabilities. If executed on unsupported platforms (such as Minecraft Realms), the command gracefully catches the exception and displays an operational warning.
- **Building & Technical Utility:** Extremely helpful for aligning perimeter bases, configuring redstone mechanics across chunk boundaries, and mapping slime farm spawn limits.

---

## debugdb
### At A Glance
The `debugdb` command allows admins to inspect all initialized database entries in detail. It provides a GUI view of the databases, including:

- List of database names
- Individual entry pointers
- Entry sizes in bytes
- Chunk counts for chunked entries
- Total size of each database

?> Required Clearance Level To Execute: `4`

### How It Works
1. **Security Check**  
   - The command first verifies that the executor has sufficient clearance.
   - Users with insufficient clearance are blocked with a warning message.

2. **Database Retrieval**  
   - All initialized database instances are retrieved.
   - If no databases exist, a message is sent stating `"No databases have been initialized."`.

3. **Debug GUI Form**  
   - A message form GUI is displayed showing each database’s:
     - Name
     - Entry pointers
     - Entry size
     - Chunk count (if applicable)
     - Total size of the database
   - The output is truncated if it exceeds Minecraft’s ~32k character limit to prevent errors.

4. **Interactive Display**  
   - The GUI is shown with two close buttons.
   - If the user is busy, the GUI is automatically retried.

### Usage

> :debugdb


### Examples

> :debugdb


### Notes
- This command is mainly for debugging and inspection purposes.
- Ensure you close your chat window before executing, as the GUI will appear on screen.
- Large databases may result in truncated output in the form for readability and performance.
- Useful for checking database sizes, pointer structure, and detecting chunked entries.

---

## doublejump
### At A Glance
The `doublejump` command toggles a utility that allows players to perform an additional jump while in mid-air. This feature is designed for high performance and includes safety checks to prevent fall damage associated with its use.

?> Required Clearance Level To Execute: `4`

### **How It Works**
- **Activation:** Players can trigger a double jump by double-tapping the jump button while in mid-air.
- **Vertical Boost:** Upon activation, the player receives a vertical impulse, propelling them upwards.
- **Charge System:** Players are granted a specific number of air jumps (defaulting to 1 extra jump).
- **Ground Reset:** Jump charges are automatically replenished when the player touches the ground.
- **Fall Damage Protection:** To ensure a smooth experience, the utility automatically cancels fall damage if it was caused by a double jump.
- **Persistence:** The enabled state is saved and will persist across server restarts.

> Usage: ":doublejump"  
> Example: :doublejump  

### **Notes**
- **Performance:** Uses a generator-based ground check system to minimize impact on server ticks.
- **Staff Control:** Only administrators with Level 4 security clearance can enable or disable this feature globally.
- **GUI Integration:** The toggle is available in the Paradox GUI menu for easy access.

---

## environment
### At A Glance
The `environment` command allows administrators to control the world's time and weather conditions. This provides a streamlined way to manage environmental states without needing to remember specific Minecraft tick values or native syntax.

?> Required Clearance Level To Execute: `4`

### **How It Works**
- **Time Manipulation**: Instantly shift the sun or moon to specific presets like Sunrise, Noon, or Midnight.
- **Weather Control**: Change the atmospheric state to Clear, Rain, or Thunder.
- **Dimension Specific**: Weather changes take effect in the dimension where the command is executed.

> Usage: ":environment <time | weather> <value>"  
> Example: :environment time day  
> Example: :environment weather thunder  

### **GUI Integration**
- Located under the **Utility** category.
- **Set Time**: Opens a selection for preset times (Sunrise, Day, Noon, Sunset, Night, Midnight).
- **Set Weather**: Provides options to switch between Clear, Rain, and Thunder states.

### **Presets**
- **Time**: 
  - `sunrise` (0), `day` (1000), `noon` (6000), `sunset` (12000), `night` (13000), `midnight` (18000)
- **Weather**: 
  - `clear`, `rain`, `thunder`

---

## gamerule
### At A Glance
The `gamerule` command provides administrators with the ability to modify the world's internal rules directly. It supports all rules exposed by the Minecraft Scripting API, covering both boolean toggles and numeric settings.

?> Required Clearance Level To Execute: `4`

> Usage: "{prefix}gamerule <ruleName> <value>"  
> Example: :gamerule pvp false  
> Example: :gamerule randomTickSpeed 3  
> Example: :gamerule doDaylightCycle true  

### **Behavior & Notes**
- **Rule Types**:
    - **Boolean**: Toggles mechanics like `pvp`, `keepInventory`, or `doMobSpawning`.
    - **Number**: Adjusts limits such as `randomTickSpeed` or `spawnRadius`.
- **Value Parsing**: Accepts standard truthy/falsy inputs (`true`/`false`, `on`/`off`, `1`/`0`) for boolean rules and standard numbers for numeric ones.
- **Validation**: The command automatically detects the correct type for the specified rule and validates your input before applying changes.

### **GUI Integration**
- **Categorized Selection**: The GUI features a sorted dropdown containing all available rules, ensuring correct casing and spelling.
- **Action Form**: Found under the **Utility** category.

---

## history
### At A Glance
The `history` command provides a chronological journey of the Paradox AntiCheat project, detailing its evolution from early experimental systems to a modern security framework.

?> Required Clearance Level To Execute: `1`

### **How It Works**
- Displays a multi-page GUI form containing major milestones and development eras.
- Covers the project's foundation (2022), the Script API expansion (2023), the architectural rewrite (2024-2025), and modern performance engineering (2026+).
- Provides insights into the philosophy and technical breakthroughs of the system.

> Usage: ":history"  
> Example: :history  

### **Notes**
- Available to all players to provide transparency regarding the project's growth.
- The interface is read-only and provides a "Back" button to return to the main utility menu.

---

## home
### At A Glance
The `home` command allows players to manage personal locations. Players can save, delete, rename, list, and teleport to homes within the game. Level 4 administrators can also adjust or reset home limits globally or for specific target players.

?> Required Clearance Level To Execute: `1` (User Actions) | `4` (Limit Management)

### **How It Works**
- Players can **set** a home at their current coordinates.
- **Delete** removes an existing home.
- **Rename** changes the name of an existing home.
- **Teleport** moves the player to a saved home.
- **List** shows all saved homes, including their coordinates and dimension.
- Homes are **encrypted** per player for security.
- Default limit is **5 homes per player** unless overridden by a server administrator.
- **Admin Management (Clearance 4):**
  - **Global Limit:** Set or reset the default home capacity for every player across the server (`-g` / `--global`).
  - **Player Override:** Set or reset a custom home capacity for an individual target player (`-t` / `--target`).

?> Note: Players cannot use `:home` while imprisoned.  

> Usage: ":home <set | delete | rename | teleport | list | help> [homeName]"  
> Usage (Admin): ":home [ -g | --global | -t | --target <player> ] [ -l | --limit <amount> ] [ --reset-limit ]"  
> Example: :home set MyHome  
> Example: :home delete MyHome  
> Example: :home rename MyHome --to NewHome  
> Example: :home teleport MyHome  
> Example: :home list  
> Example: :home -g -l 10  
> Example: :home -g --reset-limit  
> Example: :home -t PlayerName -l 8  
> Example: :home -t PlayerName --reset-limit  
> Example: :home help  

### **Notes**
- Home names are **case-sensitive**.
- Limit Hierarchy: **Per-Player Override** → **Global Dynamic Limit** → **Default (5)**.
- Player limit overrides persist in `homesDB` even when the target player is offline.
- Teleportation checks the dimension; if invalid, the teleport fails.
- If a player reaches their maximum allocated home limit, they must delete an existing home or have an administrator increase their capacity before adding a new one.
- All saved locations are secured via per-player encryption to prevent tampering.

---

## info
### At A Glance
The `info` command displays a GUI-based overview of the **Paradox AntiCheat** project, including version, authors, license, links, and project philosophy.

?> Required Clearance Level To Execute: `1`

### **How It Works**
- Shows a **MessageFormData GUI** with all relevant information for the server.
- Information includes:
  - **Version** – Current Paradox AC version dynamically sourced from project versioning.
  - **License** – GPL-3.0.
  - **Authors** – Author (Visual1mpact) and Co-Author (Pete9xi).
  - **Links** – Official GitHub, Discord, and Wiki repositories.
  - **Project Philosophy** – Brief description explaining how Paradox utilizes sophisticated algorithms and advanced detection techniques to maintain fair play across Realms and BDS environments.
- The GUI **automatically retries** if the player is busy (`UserBusy`).
- Form features navigation buttons to **Close** or go **Back** to the main administrative GUI.
- Players are prompted to **close their chat window** before the form is displayed.

> Usage: ":info" 
> Example: :info

### **GUI Integration**
- Found under the **Utility** category.
- **View Paradox Info**: Action item that opens the interactive information form.

### **Notes**
- Available to all players regardless of security clearance level.
- Displays structured section headers with custom formatting for readability.

---

## invclone
### At A Glance
The `invclone` command allows admins to clone a player's entire inventory or ender chest into chests placed in the world for inspection, or to remove previously cloned chests.

- **Clone a player's inventory or ender chest:** Creates chests near the executor, filling them with the target player's items. Each item has a lore tag indicating its source.
- **Remove cloned chests:** Deletes previously cloned chests within a nearby area.

?> Required Clearance Level To Execute: `4`

### How It Works
1. **Inventory Cloning**
   - When executed with a target player name, the command retrieves the player's inventory by default. By adding the `--enderchest` or `-ec` flag, administrators can clone the player's ender chest instead.
   - Chests are placed sequentially near the command executor’s location.
   - Items are distributed across the chests, and each item gets a lore tag: `Source: <PlayerName>'s Inventory` or `Source: <PlayerName>'s Ender Chest`.
   - The number of chests depends on how many items are in the inventory.

2. **Removing Cloned Chests**
   - Executing the command with `remove` (or no arguments) searches a radius around the executor.
   - Any chest containing items tagged with `Source:` is replaced with air, effectively deleting the cloned inventory.
   - Provides feedback on how many chests were removed.

### Usage

> :invclone <player> [--enderchest | -ec] - Clone the specified player's inventory or ender chest into chests  
> :invclone remove      - Remove all nearby cloned inventory chests  


### Examples

> :invclone Pete9xi  
> :invclone Pete9xi --enderchest  
> :invclone remove  


### Notes
- Only valid players with an accessible inventory can be cloned.
- The cloned chests are placed next to the executor’s current position.
- Items inside cloned chests have lore indicating their original owner.
- Removing cloned chests only affects those created by this command.
- The search radius for removal is approximately 20 blocks horizontally and 5 blocks vertically.

---

## inventoryeditor
### At A Glance
The `inventoryeditor` command allows administrators to inspect and dynamically modify an online player's inventory using an interactive Data-Driven UI (DDUI) form.

?> Required Clearance Level To Execute: `3`

### **How It Works**
- Administrators select a target online player from a dynamically updated player dropdown.
- Provides multi-mode inventory editing capabilities without needing external commands or chest blocks:
  - **View Inventory**: Displays a full list view breakdown of all items and quantities across slots.
  - **Edit Item Name and Lore**: Applies custom item display name tags and multi-line lore text.
  - **Edit Item Enchantments**: Adds, updates, or removes item enchantments and custom levels.
  - **Repair Item**: Resets item durability damage back to full strength.
  - **Transfer Item to Another Player**: Moves selected items directly into open slots of another player's inventory.
  - **Edit Stack Amount**: Adjusts quantity for stacked items (clamped to maximum valid stack limits).
  - **Swap Slots**: Moves or swaps item positions within the target player's inventory slots.
- Real-time reactivity updates item attributes (durability, current enchantments, lore, names) as you specify slot numbers.

> Usage: ":inventoryeditor"
> Example: :inventoryeditor

### **GUI Integration**
- Found under the **Utility** category in the administrative GUI.
- Executing the command opens the DDUI controls directly. Players must close their chat window for the interface to display properly.

### **Notes**
- Selecting slots updates the detailed view showing item ID, stack quantity, current durability (`Current/Max`), active enchantments, custom names, and existing lore lines.
- Safe execution handling automatically re-opens the UI if interrupted by client UI busy states (`DataDrivenScreenClosedReason.UserBusy`).
- Ensure appropriate clearance before altering player inventories and use responsibly.

---

## invsee
### At A Glance
The `invsee` command allows players with sufficient clearance to view another player's inventory or ender chest in detail, including items, quantities, and enchantments.

?> Required Clearance Level To Execute: `3`

### **How It Works**
- When executed with a player name, it retrieves the target player's inventory by default.
- **Ender Chest Support:** By adding the `--enderchest` or `-ec` flag, administrators can inspect the contents of a player's ender chest.
- Displays **all inventory slots**, indicating empty ones.
- Shows **item type, amount, and enchantments**, including level and max level.
- If the player is invalid or not found, an error message is returned.
- Designed for monitoring or moderation purposes.


> Usage: ":invsee <player> [--enderchest | -ec]"  
> Example: :invsee PlayerName  
> Example: :invsee PlayerName --enderchest  
> Example: :invsee help  

### **Notes**
- Player names are **case-sensitive**.
- Inventory components are retrieved securely; missing or invalid components will trigger an error.
- Intended for **moderation** or **administrative oversight**.

---

## ping
### At A Glance
The `ping` command provides a real-time monitor of network latency for all online players. It helps both players and staff identify connection issues and distinguish between server-side lag and individual network instability.

?> Required Clearance Level To Execute: `1`

### **How It Works**
- **Latency Monitoring**: Uses the native player API to retrieve precise ping values in milliseconds (ms).
- **Color-Coded Feedback**: Latency is categorized and color-coded for quick visual assessment:
    - §a[EXCELLENT]§r: < 50ms
    - §e[GOOD]§r: 50ms - 100ms
    - §6[AVERAGE]§r: 100ms - 200ms
    - §c[POOR]§r: 200ms - 400ms
    - §4[CRITICAL]§r: > 400ms
- **Sorted Display**: Players are automatically sorted by their ping, showing the most stable connections first.

> Usage: ":ping"
> Example: :ping

### **GUI Integration**
- Located in the **Utility** category.
- **Network Latency**: Opens a form providing an overview of connection quality with a refresh option to update the statistics.

### **Notes**
- The output is formatted into a clean, aligned list in the chat.
- Useful for validating "lag" claims during moderation sessions.

---

## pvp
### At A Glance
The `pvp` command allows players to control Player vs. Player (PvP) settings. Players can toggle their own PvP mode, enable or disable PvP globally, or check the current PvP status.

?> Required Clearance Level To Execute: `4` (for global toggle)

### How It Works
- **Player PvP Toggle:** Players can enable or disable PvP for themselves. A cooldown prevents frequent toggling.
- **Global PvP:** Admins can enable or disable PvP for the entire server. Disabling also stops the Paradox PvP management system but the in-game gamerule may need adjustment.
- **Status Check:** Players can see their PvP status and the server’s global PvP state.
- **Cooldowns & Penalties:** Logging out during PvP cooldown triggers penalties, including inventory loss. Players are alerted when rejoining.


> Usage: ":pvp [ global | status | help ]"  
> Example: :pvp               (toggles PvP for yourself)  
> Example: :pvp global        (toggles PvP for the server)  
> Example: :pvp status        (shows PvP status)  
> Example: :pvp help  

### Notes
- **Safe Zones:** To bypass PvP in certain areas, assign players the tag `paradoxBypassPvPCheck`. This is owner-managed.
- **Global PvP Toggle:** Only players with clearance `4` can toggle global PvP. This will stop the Paradox PvP system and can optionally update the world’s PvP gamerule.

---

## pvpCooldown
### At A Glance
Admins can set a custom cooldown (in seconds) for PvP actions. The cooldown determines how long players must wait between PvP events.


> Usage: ":pvpCooldown <time in seconds>"  
> Example: :pvpCooldown 30  


**Limits:** Minimum `10` seconds, Maximum `3600` seconds (1 hour).

---

## pvpToggleCooldown
### At A Glance
Admins can set a custom cooldown (in seconds) for toggling personal PvP mode. This prevents frequent switching.


> Usage: ":pvpToggleCooldown <time in seconds>"  
> Example: :pvpToggleCooldown 30  


**Limits:** Minimum `10` seconds, Maximum `3600` seconds (1 hour).

---

## scripture
### At A Glance
The `scripture` command allows players to enable or disable receiving **scripture verses** in-game along with optional **daily diamond rewards**. Players with scripture enabled receive verses at a regular interval, displayed on-screen with an optional reward.

?> Required Clearance Level To Execute: `3`

### **How It Works**
- Each player can **enable or disable** scripture mode using the command.
- When scripture mode is **enabled**, the player will receive a verse every **30 minutes** (configurable in code).
- Verses are displayed **on-screen** with the reference as a title and the verse text as a subtitle.
- Players receive **1 reward item per verse** (up to 10 per day), randomly chosen between **diamonds** and **netherite ingots**.
- Daily reward counters reset at **midnight** server time.
- The system tracks which verses have already been shown, ensuring **variety without repetition**.

### Usage

> :scripture -t <player> [-e | -d]  
> Example: :scripture -t PlayerName -e  – Enable scripture mode for PlayerName  
> Example: :scripture -t PlayerName -d  – Disable scripture mode for PlayerName  

### **Actions**
1. **Enable Scripture** – Turns on scripture verse notifications and daily rewards for the target player.
2. **Disable Scripture** – Turns off scripture verse notifications and daily rewards for the target player.

### **GUI Integration**
- The command can also be executed via an **in-game GUI form**, allowing selection of a player and toggling enable/disable options.
- The form includes:
  - Dropdown of all players.
  - Toggle buttons to enable or disable scripture mode.

### Notes
- Scripture mode is **per-player**; enabling for one player does not affect others.
- Rewards are **limited to 10 per player per day** to prevent abuse.
- Verses are selected from a **shuffled queue** to avoid immediate repetition.
- Players can manually disable scripture mode at any time.
- On server restart, the **interval automatically resumes**, applying only to players who have scripture mode enabled.

---

## setrank
### At A Glance
The `setrank` command allows admins to manage chat ranks for players. You can:

- Set a specific rank for a player.
- Reset a player’s rank to default.
- Enable or disable the rank system globally.

?> Required Clearance Level To Execute:  
- `3` – Set or reset individual player ranks.  
- `4` – Disable or enable ranks globally.

### How It Works
The command uses flags to determine the action:

- `-t` or `--target <player>` — Specifies the target player.  
- `-r` or `--rank <rank>` — Sets the chat rank for the target player.  
- `--reset` — Resets the target player’s rank to default.  
- `-d` — Disables the rank system globally (requires clearance 4).  
- `-e` — Enables the rank system globally (requires clearance 4).  

When executed, the command verifies the provided arguments and checks that the target player exists. Players and the command sender are notified when a rank is set or reset. If ranks are globally disabled, only users with clearance `4` can modify global rank settings.


> Usage: ":setrank [ -t | --target <player> ] [ -r | --rank <rank> ] [ --reset ] [ -d | -e ]"  
> Example: :setrank --target PlayerName --rank [Member]  
> Example: :setrank -t PlayerName -r [Admin]  
> Example: :setrank -t PlayerName --reset  
> Example: :setrank --target PlayerName --reset  
> Example: :setrank -d  
> Example: :setrank -e  

### Notes
- When a rank is set, the player’s `nameTag` updates to show the rank before their username.  
- The system forces a client sync by teleporting the player to their current location.  
- Global rank changes immediately affect all players.  
- Players without clearance `4` cannot modify global rank settings if ranks are disabled.  

---

## tpr
### At A Glance
The `tpr` command allows players to manage teleport requests:

- Send a teleport request to another player.
- Accept or deny incoming requests.

Requests have a `60` second timeout. Players are notified when a request is sent, accepted, or denied.

?> Required Clearance Level To Execute: `1`

### How It Works
1. **Send a request** – Use `:tpr <player>` to request teleporting to another player.
2. **Accept a request** – Use `:tpr accept` to accept a pending teleport request.
3. **Deny a request** – Use `:tpr deny` to deny a pending teleport request.
4. Requests automatically expire after 60 seconds if no response is given.
5. Players cannot send requests to themselves.
6. Players in prison cannot send teleport requests.

### Usage

> :tpr <player>       - Send a teleport request to <player>  
> :tpr accept         - Accept the pending teleport request  
> :tpr deny           - Deny the pending teleport request  
> :tpr help           - Show help for the teleport request system  


### Examples

> :tpr Lucy  
> :tpr Steve  
> :tpr accept  
> :tpr deny  

### Notes
- Only one teleport request can be pending for a player at a time.
- Players receive messages about the status of their requests (sent, accepted, denied, or timed out).

---

## tps
### At A Glance
The `tps` command toggles a real-time, on-screen performance monitor. It allows administrators to track the server's Ticks Per Second (TPS) and overall health status directly on their HUD without opening menus or checking logs.

?> Required Clearance Level To Execute: `4`

### **How It Works**
- **Calculation:** The system measures the time elapsed between ticks. Since Minecraft Bedrock targets 20 TPS, any dip below this indicates server-side lag.
- **Real-Time HUD:** When enabled, a Title and Subtitle appear on the center of the screen, updating every second (20 ticks).
- **Color-Coded Status:**
  - <span class="tps-healthy">Healthy</span> (18.0 - 20.0 TPS): The server is running optimally.
  - <span class="tps-warning">Warning</span> (15.0 - 18.0 TPS): Minor lag detected.
  - <span class="tps-struggling">Struggling</span> (10.0 - 15.0 TPS): Significant lag; anti-cheat detections may be less reliable.
  - <span class="tps-critical">Critical</span> (< 10.0 TPS): Severe lag; high risk of false-positive detections.
- **Toggle Mechanism:** Running the command once enables the monitor; running it again disables it.
- **Persistence:** The monitor remains active until the player toggles it off or leaves the server.

> Usage: ":tps"  
> Example: :tps  

### **Notes**
- **Anti-Cheat Correlation:** This tool is vital for moderators. If a player is flagged for "Reach" or "NoClip" while the TPS is in the <span class="tps-struggling">Struggling</span> or <span class="tps-critical">Critical</span> range, the detection should be treated with caution.
- **Non-Intrusive:** The HUD uses a 0-tick fade-in to ensure the text remains static and readable without flickering during updates.
- **Automatic Cleanup:** To prevent memory leaks, the system automatically stops monitoring for any player who disconnects or crashes.
- **GUI Integration:** The monitor can also be toggled via the `:gui` menu under the Utility category.

---

## transfer
### At A Glance
The `transfer` command allows players to connect to another **Minecraft Bedrock server** by specifying a hostname (IP or domain) and port. This is useful for switching between network servers, hubs, or external worlds.

?> Required Clearance Level To Execute: `1`

### How It Works
- Players can manually input a **hostname** and **port** to connect to another server.
- The command supports both **chat usage** and **GUI form input**.
- The most recently used server details are saved for potential future use.
- The command automatically verifies whether the server environment supports transfers.
- If executed on platforms that do not support server transfers (such as **Realms**), the command safely disables itself.
- Provides feedback if the connection fails or input is invalid.

> Usage: ":transfer -h <hostname> -p <port>"  
> Example: :transfer -h play.example.com -p 19132  
> Example: :transfer -h 25.777.25.777 -p 25806  

### GUI Integration
- The command can be executed via an **in-game modal form**.
- Players are prompted to enter:
  - Hostname (IP address or domain)
  - Port number
- The form automatically retries if the player is busy to ensure it appears correctly.

### Actions
1. **Enter Hostname** – Specify the server IP or domain name.
2. **Enter Port** – Specify the server port number.
3. **Transfer** – Attempts to connect to the specified server.

### Notes
- Hostnames may be either:
  - IPv4 address (example: `25.777.25.777`)
  - Domain name (example: `play.example.com`)
- Ports must be valid numbers (example: `19132`).
- The command will not function on platforms that do not support server transfer functionality.
- Failed transfers typically indicate:
  - Incorrect hostname
  - Incorrect port

---

## waypoint
### At A Glance
The `waypoint` command provides players with a personal navigation GPS. It allows you to save multiple destinations, activate navigation to any of them, and provides a real-time directional HUD on your screen. Server administrators can also configure maximum waypoint limits globally or per player.

?> Required Clearance Level To Execute: `1` (User Actions) | `4` (Limit Management)

### **How It Works**
- **Set Waypoint**: Saves your current location as a named navigation target and activates its HUD. Appending `--no-gps` saves the location without immediately starting active tracking.
- **Rename Waypoint**: Allows you to change the identifier of an existing saved waypoint.
- **Go To Waypoint**: Activates the directional HUD for a previously saved waypoint.
- **Clear Waypoint**: Removes a specific named waypoint. If no name is provided, it stops the currently active navigation target.
- **List Waypoints**: Displays all your saved waypoints alongside coordinate/dimension info and current usage against your maximum waypoint limit.
- **Directional HUD**: An arrow appears on your action bar pointing toward the active target, along with the distance.
- **Dimension Check**: Notifies you if you are in a different dimension than your active waypoint.
- **Auto-Arrival**: Automatically stops navigation once you are within 3 blocks of the active target.
- **Limit Management (Level 4)**: Admins can modify maximum allowed waypoints per player or server-wide.

> Usage: `:waypoint <set [name] [--no-gps] | goto [name] | clear [name] | list | rename <old> --to <new>>`  
> Usage (Admin): `:waypoint [ -t | --target <player> | -g | --global ] [ -l | --limit <amount> ] [ --reset-limit ]`  

> Example: :waypoint set MyHouse  
> Example: :waypoint set SecretBase --no-gps  
> Example: :waypoint rename MyHouse --to MainHQ  
> Example: :waypoint goto MainHQ  
> Example: :waypoint clear MainHQ  
> Example: :waypoint clear  
> Example: :waypoint list  
> Example (Admin): :waypoint -g -l 10  
> Example (Admin): :waypoint -g --reset-limit  
> Example (Admin): :waypoint -t Steve -l 8  
> Example (Admin): :waypoint -t Steve --reset-limit  

---

## whois
### At A Glance
The `whois` command provides moderators with a quick "dossier" of a specific online player. It displays non-sensitive forensic data and real-time status information.

?> Required Clearance Level To Execute: `3`

### **How It Works**
- It aggregates data from the player's session and the Paradox database.
- **Clearance Level**: Shows the player's current Paradox security level.
- **Current Platform**: Identifies the player's current device platform (Mobile, Desktop, Console).
- **First Platform**: Records the platform the player first joined from.
- **Aliases**: Pulls known previous names from the identity database to detect alternate accounts.
- **Location**: Displays current coordinates and dimension.
- **First Joined**: Shows the date the player first joined the server.
- **Last Seen**: Displays the last date and time the player was online.
- **Security Flags**: Highlights players with recorded spoofing history.
- **Administrative Oversight (Level 4)**: Paradox-Ops can view internal runtime IDs and detailed spoof logs.

> Usage: ":whois <player|id> [ --clear ] | :whois --clearall"
> Example: :whois Pete9xi
> Example: :whois Pete9xi --clear
> Example: :whois --clearall

### **GUI Integration**
- Available under the **Utility** category for Level 2+ staff.
- Features a player dropdown for quick selection without typing.

### **Notes**
- The command only works on players who are currently online.
  - Target server offline
  - Network restrictions
- Intended for use on **BDS**, proxy networks, or server hubs, not for Realms.
