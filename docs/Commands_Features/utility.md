<img src="Media\paradox-header.png" alt="Paradox AntiCheat Logo"> </img>

!> This documentation could change with any version. Be sure to check it periodically.

## !channels
### At A Glance
The `!channels` command allows players to manage private chat channels. Players can create, join, invite, leave, and transfer ownership of channels in a controlled environment.

!> Required Clearance Level To Execute: `1`

### **How It Works**
- Each chat channel has an owner and members, with dynamically updated membership data.
- Players can **create** new channels if they are not already in one.
- Players can **join** existing channels by name.
- Owners can **invite** other players; invitations expire after 30 seconds.
- Players can **leave** channels at any time. Ownership is automatically transferred if the owner leaves.
- Channel **ownership** can be transferred to another member.
- All changes notify relevant players to ensure smooth communication.


> Usage: "!channel <create | join | invite | leave | transfer | help>"
> Example: !channel create --room myTeam
> Example: !channel join --room myTeam
> Example: !channel invite --room myTeam --target Visual1mpact
> Example: !channel leave
> Example: !channel transfer --room myTeam --target Visual1mpact
> Example: !channel help


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

## !debugdb
### At A Glance
The `!debugdb` command allows admins to inspect all initialized database entries in detail. It provides a GUI view of the databases, including:

- List of database names
- Individual entry pointers
- Entry sizes in bytes
- Chunk counts for chunked entries
- Total size of each database

!> Required Clearance Level To Execute: `4`

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

> !debugdb


### Examples

> !debugdb


### Notes
- This command is mainly for debugging and inspection purposes.
- Ensure you close your chat window before executing, as the GUI will appear on screen.
- Large databases may result in truncated output in the form for readability and performance.
- Useful for checking database sizes, pointer structure, and detecting chunked entries.

## !home
### At A Glance
The `!home` command allows players to manage personal locations. Players can save, delete, list, and teleport to homes within the game.

!> Required Clearance Level To Execute: `1`  

### **How It Works**
- Players can **set** a home at their current coordinates.
- **Delete** removes an existing home.
- **Teleport** moves the player to a saved home.
- **List** shows all saved homes, including their coordinates and dimension.
- Homes are **encrypted** per player for security.
- Maximum of **5 homes per player**.

?> Note: Players cannot use `!home` while imprisoned.  

> Usage: "!home <set | delete | teleport | list | help> [homeName]"  
> Example: !home set MyHome  
> Example: !home delete MyHome  
> Example: !home teleport MyHome  
> Example: !home list  
> Example: !home help  

### **Notes**
- Home names are **case-sensitive**.
- Teleportation checks the dimension; if invalid, the teleport fails.
- If the maximum number of homes is reached, players must delete an existing home before adding a new one.
- All saved locations are secured via per-player encryption to prevent tampering.

## !invclone
### At A Glance
The `!invclone` command allows admins to clone a player's entire inventory into chests placed in the world for inspection, or to remove previously cloned chests.

- **Clone a player's inventory:** Creates chests near the executor, filling them with the target player's items. Each item has a lore tag indicating its source.
- **Remove cloned chests:** Deletes previously cloned chests within a nearby area.

!> Required Clearance Level To Execute: `4`

### How It Works
1. **Inventory Cloning**
   - When executed with a target player name, the command retrieves the player's inventory.
   - Chests are placed sequentially near the command executor’s location.
   - Items are distributed across the chests, and each item gets a lore tag: `Source: <PlayerName>'s Inventory`.
   - The number of chests depends on how many items are in the inventory.

2. **Removing Cloned Chests**
   - Executing the command with `remove` (or no arguments) searches a radius around the executor.
   - Any chest containing items tagged with `Source:` is replaced with air, effectively deleting the cloned inventory.
   - Provides feedback on how many chests were removed.

### Usage

> !invclone <player>   - Clone the specified player's inventory into chests  
> !invclone remove      - Remove all nearby cloned inventory chests  


### Examples

> !invclone Pte9xi  
> !invclone remove  


### Notes
- Only valid players with an accessible inventory can be cloned.
- The cloned chests are placed next to the executor’s current position.
- Items inside cloned chests have lore indicating their original owner.
- Removing cloned chests only affects those created by this command.
- The search radius for removal is approximately 20 blocks horizontally and 5 blocks vertically.

## !invsee
### At A Glance
The `!invsee` command allows players with sufficient clearance to view another player's inventory in detail, including items, quantities, and enchantments.

!> Required Clearance Level To Execute: `3`

### **How It Works**
- When executed with a player name, it retrieves the target player's inventory.
- Displays **all inventory slots**, indicating empty ones.
- Shows **item type, amount, and enchantments**, including level and max level.
- If the player is invalid or not found, an error message is returned.
- Designed for monitoring or moderation purposes.


> Usage: "!invsee <player>"  
> Example: !invsee PlayerName  
> Example: !invsee help  


### **Notes**
- Player names are **case-sensitive**.
- Inventory components are retrieved securely; missing or invalid components will trigger an error.
- Intended for **moderation** or **administrative oversight**.

## !info
### At A Glance
The `!info` command displays a GUI-based overview of the **Paradox AntiCheat** project, including version, authors, license, links, and description.

!> Required Clearance Level To Execute: `1`

### **How It Works**
- Shows a **MessageFormData GUI** with all relevant information for the server.
- Information includes:
  - **Version** – Current Paradox AC version.
  - **License** – License type (GPL-3.0).
  - **Authors** – Main and co-authors.
  - **Links** – GitHub, Discord, and Wiki.
  - **Description** – Brief explanation of the project and design philosophy.
- The GUI **automatically retries** if the player is busy.
- Players are prompted to **close their chat window** before the form is displayed.

> Usage: "!info"  
> Example: !info

### Notes
- The command is **available to all players** (security clearance 1).
- The displayed GUI is **read-only**; players cannot modify content through this form.
- Designed for quick access to Paradox AC information without needing console access.

## !pvp
### At A Glance
The `!pvp` command allows players to control Player vs. Player (PvP) settings. Players can toggle their own PvP mode, enable or disable PvP globally, or check the current PvP status.

!> Required Clearance Level To Execute: `4` (for global toggle)

### How It Works
- **Player PvP Toggle:** Players can enable or disable PvP for themselves. A cooldown prevents frequent toggling.
- **Global PvP:** Admins can enable or disable PvP for the entire server. Disabling also stops the Paradox PvP management system but the in-game gamerule may need adjustment.
- **Status Check:** Players can see their PvP status and the server’s global PvP state.
- **Cooldowns & Penalties:** Logging out during PvP cooldown triggers penalties, including inventory loss. Players are alerted when rejoining.


> Usage: "!pvp [ global | status | help ]"  
> Example: !pvp               (toggles PvP for yourself)  
> Example: !pvp global        (toggles PvP for the server)  
> Example: !pvp status        (shows PvP status)  
> Example: !pvp help  


### Notes
- **Safe Zones:** To bypass PvP in certain areas, assign players the tag `paradoxBypassPvPCheck`. This is owner-managed.
- **Global PvP Toggle:** Only players with clearance `4` can toggle global PvP. This will stop the Paradox PvP system and can optionally update the world’s PvP gamerule.

---

## !pvpCooldown
### At A Glance
Admins can set a custom cooldown (in seconds) for PvP actions. The cooldown determines how long players must wait between PvP events.


> Usage: "!pvpCooldown <time in seconds>"  
> Example: !pvpCooldown 30  


**Limits:** Minimum `10` seconds, Maximum `3600` seconds (1 hour).

---

## !pvpToggleCooldown
### At A Glance
Admins can set a custom cooldown (in seconds) for toggling personal PvP mode. This prevents frequent switching.


> Usage: "!pvpToggleCooldown <time in seconds>"  
> Example: !pvpToggleCooldown 30  


**Limits:** Minimum `10` seconds, Maximum `3600` seconds (1 hour).

## !scripture
### At A Glance
The `!scripture` command allows players to enable or disable receiving **scripture verses** in-game along with optional **daily diamond rewards**. Players with scripture enabled receive verses at a regular interval, displayed on-screen with an optional reward.

!> Required Clearance Level To Execute: `3`

### **How It Works**
- Each player can **enable or disable** scripture mode using the command.
- When scripture mode is **enabled**, the player will receive a verse every **30 minutes** (configurable in code).
- Verses are displayed **on-screen** with the reference as a title and the verse text as a subtitle.
- Players receive **1 reward item per verse** (up to 10 per day), randomly chosen between **diamonds** and **netherite ingots**.
- Daily reward counters reset at **midnight** server time.
- The system tracks which verses have already been shown, ensuring **variety without repetition**.

### Usage

> !scripture -t <player> [-e | -d]  
> Example: !scripture -t PlayerName -e  – Enable scripture mode for PlayerName  
> Example: !scripture -t PlayerName -d  – Disable scripture mode for PlayerName  

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

## !setrank
### At A Glance
The `!setrank` command allows admins to manage chat ranks for players. You can:

- Set a specific rank for a player.
- Reset a player’s rank to default.
- Enable or disable the rank system globally.

!> Required Clearance Level To Execute:  
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


> Usage: "!setrank [ -t | --target <player> ] [ -r | --rank <rank> ] [ --reset ] [ -d | -e ]"  
> Example: !setrank --target PlayerName --rank [Member]  
> Example: !setrank -t PlayerName -r [Admin]  
> Example: !setrank -t PlayerName --reset  
> Example: !setrank --target PlayerName --reset  
> Example: !setrank -d  
> Example: !setrank -e  


### Notes
- When a rank is set, the player’s `nameTag` updates to show the rank before their username.  
- The system forces a client sync by teleporting the player to their current location.  
- Global rank changes immediately affect all players.  
- Players without clearance `4` cannot modify global rank settings if ranks are disabled.  

## !tpr
### At A Glance
The `!tpr` command allows players to manage teleport requests:

- Send a teleport request to another player.
- Accept or deny incoming requests.

Requests have a `60` second timeout. Players are notified when a request is sent, accepted, or denied.

!> Required Clearance Level To Execute: `1`

### How It Works
1. **Send a request** – Use `!tpr <player>` to request teleporting to another player.
2. **Accept a request** – Use `!tpr accept` to accept a pending teleport request.
3. **Deny a request** – Use `!tpr deny` to deny a pending teleport request.
4. Requests automatically expire after 60 seconds if no response is given.
5. Players cannot send requests to themselves.
6. Players in prison cannot send teleport requests.

### Usage

> !tpr <player>       - Send a teleport request to <player>  
> !tpr accept         - Accept the pending teleport request  
> !tpr deny           - Deny the pending teleport request  
> !tpr help           - Show help for the teleport request system  


### Examples

> !tpr Lucy  
> !tpr Steve  
> !tpr accept  
> !tpr deny  

### Notes
- Only one teleport request can be pending for a player at a time.
- Players receive messages about the status of their requests (sent, accepted, denied, or timed out).
