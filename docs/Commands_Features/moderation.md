<img src="Media\paradox-header.png" alt="Paradox AntiCheat Logo"> </img>

?> This documentation could change with any version. Be sure to check it periodically for updates.

## !allowlist
### At A Glance
The `!allowlist` command allows administrators to manage a list of players who are permitted to join the server. Players on the allowlist bypass certain automated protections and can be explicitly permitted to connect.

?> Required Clearance Level To Execute: `3`


> Usage: "!allowlist <add|remove|list|disable> <player>"  
> Example: !allowlist add Steve  
> Example: !allowlist remove Steve  
> Example: !allowlist list  
> Example: !allowlist disable  


### **Options**
- `add <player>`: Adds a player to the allowlist.  
  - If the player is already on the allowlist, a message will notify you that they are already listed.
- `remove <player>`: Removes a player from the allowlist.  
  - If the player is not on the allowlist, a message will notify you that they are not listed.
- `list`: Displays all players currently on the allowlist.  
  - If no players are listed, a message will indicate that the allowlist is empty.
- `disable`: Disables the allowlist and clears all stored players.

### **Behavior & Notes**
- Player names are **case-sensitive** when being added or removed.
- The allowlist **can be cleared entirely** using the `disable` option.
- Players on the allowlist are stored along with the ID of the administrator who added them.
- When no players are on the allowlist, the `list` option reports it as empty.
- The command provides **informative feedback** in all scenarios, including:
  - Adding a player already listed.
  - Removing a player not listed.
  - Disabling or clearing the allowlist.
- Input player names are sanitized to remove `@` symbols automatically.

## !ban
### At A Glance
The `!ban` command is used to ban a player from the server, with an optional reason. It can also list all currently banned players. This command is vital for maintaining server security and enforcing rules.

?> Required Clearance Level To Execute: `3`


> Usage: "!ban [ -t | --target <player> ] [ -r | --reason <reason> ] [ -l | --list ]"  
> Example: !ban -t Steve Bob -r Inappropriate Behavior  
> Example: !ban -l  


### **Options**
- `-t | --target <player>`: Specifies the player to ban.
- `-r | --reason <reason>`: Optionally provides a reason for the ban.
- `-l | --list`: Displays all currently banned players.

### **Notes**
- Multiple-word player names are supported and should be enclosed in quotes if needed.
- If no reason is provided, the default reason `"No reason provided."` is used.
- Players on the whitelist **cannot be banned**.
- Players with **Level-4 security clearance** cannot be banned.
- If the target player is online, they will be immediately kicked from the server.
- If the target player is offline, the ban will be stored and applied when they next attempt to join.
- Player names are **case-sensitive**.

### **Examples**
- Ban a single player with a reason:  
  `!ban -t Steve -r Griefing`  

- Ban multiple players at once:  
  `!ban -t "Steve Bob" -r Inappropriate Behavior`  

- List all banned players:  
  `!ban -l`

## !command
### At A Glance
The `!command` command enables or disables other commands dynamically. This allows administrators to manage active commands without restarting the server.

?> Required Clearance Level To Execute: `4`


> Usage: "!command [ enable | disable ] <commandName1> [commandName2] ..."  
> Example: !command disable kick ban  
> Example: !command enable kick ban  


### **Options**
- `enable`: Activates one or more previously disabled commands.
- `disable`: Deactivates one or more active commands.
- `<commandName(s)>`: Specifies the commands to enable or disable, space-separated.

### **Notes**
- The `!command` command itself cannot be disabled.
- Use the `disable` option with caution to avoid disabling critical commands.
- The command registry updates dynamically, reflecting real-time changes.

## !deop
### At A Glance
The `!deop` command revokes **Paradox-Op (Level-4)** permissions from a player, reducing their security clearance to **Level 1**. This allows administrators to manage who has full administrative access on the server.

?> Required Clearance Level To Execute: `4`


> Usage: "!deop <player>"  
> Example: !deop Peye9xi  


### **Behavior & Notes**
- **Host Protection:** The **Paradox Host** cannot be removed from the Level-4 security clearance list by anyone other than themselves. Attempts to do so will be denied.
- **Online Players:**  
  - If the target player is online, their **dynamic security clearance property is updated to Level 1**.  
  - They are removed from the Level-4 tracker and the security clearance list.
- **Offline Players:**  
  - If the player is offline, their entry is removed from the stored security clearance list by name.
- **Validation Messages:**  
  - If the player does not exist in the Level-4 list, the command will notify the executor.  
  - If no player name is provided, the command will request a valid player name.
- **Input Sanitization:** Player names are automatically cleaned to remove `@` symbols.
- **Use Cases:** This command is useful for revoking full administrative privileges, especially when an administrator should no longer have high-level access.

## !despawn
### At A Glance
The `!despawn` command removes entities from the world, either **all entities** or a **specific entity type**, helping to manage entity populations and improve server performance.

?> Required Clearance Level To Execute: `3`


> Usage: "!despawn <entity_type | all>"  
> Example: !despawn all  
> Example: !despawn iron_golem  
> Example: !despawn help  


### **Behavior & Notes**
- **All Entities:** Using `all` will despawn every entity except players.  
- **Specific Entities:** Specifying an `entity_type` will despawn only entities of that type.
- **Protected Entities:**  
  - Entities that are **tamed** (e.g., pets) are **not removed**.  
  - Entities with a **custom name** (`nameTag`) are preserved.  
- **Reporting:** The command reports the **type and count** of entities that were successfully removed.  
- **Input Sanitization:** Player-supplied entity type names are cleaned of `@` symbols.

## !freeze
### At A Glance
The `!freeze` command allows administrators to **lock a player in place** by imprisoning them in a temporary structure and applying status effects. This is useful for investigating potential issues, controlling disruptive players, or handling suspicious activity. The command acts as a **toggle**, allowing the player to be released later.

?> Required Clearance Level To Execute: `3`


> Usage: "!freeze <player>"  
> Example: !freeze Pete9xi  


### **Behavior & Notes**
- **Prison Construction:**  
  - The command generates a temporary prison made of **bedrock** around the player, sized 5×4×5 blocks.  
  - The player is teleported to the center of this prison, at a high Y-level (default `y=200`) to prevent escape.
- **Freezing Effects:**  
  - The player receives **Weakness** for an extended duration (`amplifier: 255`) to disable combat actions.  
  - Player movement and camera controls are disabled if possible.
- **Toggle Behavior:**  
  - Running the command on a **non-imprisoned player** will imprison them.  
  - Running the command on an **already imprisoned player** will release them, remove the prison blocks, restore movement and camera, and remove status effects.
- **Dynamic Properties:**  
  - Player's **original location** and **dimension** are stored to safely return them after release.  
  - The prison location is tracked to enable safe removal of blocks.
- **Bots & Edge Cases:**  
  - Players that fail to freeze (e.g., bots or invalid entities) are still placed in the prison.
- **Protection:**  
  - Only the executing administrator can freeze/unfreeze players.  
  - Player name input is sanitized by removing `@` characters.

## !kick
### At A Glance
The `!kick` command removes a player from the server, optionally providing a reason. It is useful for addressing disruptive behavior or enforcing server rules.

?> Required Clearance Level To Execute: `3`


> Usage: "!kick [ -t | --target <player> ] [ -r | --reason <reason> ]"  
> Example: !kick -t Pete9xi -r Spamming Chat!  
> Example: !kick --target "Some Player" --reason "Griefing"  


### **Behavior & Notes**
- **Target Player:**  
  - Use `-t` or `--target` to specify the player to kick.  
  - Player names can include spaces; quotes are supported if needed.
- **Kick Reason:**  
  - Use `-r` or `--reason` to provide an optional reason for the kick.  
  - Default message is `"Farewell"` if no reason is supplied.
- **Execution Details:**  
  - The command finds the player using the **PlayerCache**.  
  - If the player is valid, it executes the `kick` command with a formatted message including the **executor name** and **reason**.  
  - If the player cannot be found or is invalid, the sender is notified.
- **Message Feedback:**  
  - Confirms to the administrator whether the player was successfully kicked.

## !gui
### At A Glance
The `!gui` command opens an interactive administrative menu for the player, filtered according to their security clearance. It simplifies server management by providing a visual interface for commands, actions, and dynamic input forms.

?> Required Clearance Level To Execute: `1`


> Usage: "!gui"  
> Example: !gui  


### **Behavior & Notes**
- **Main Menu:** Displays accessible command categories based on the player's security clearance. Categories may include:
  - Moderation
  - Utility
  - Modules
- **Category Menu:** Selecting a category shows all commands within that category.
- **Command Actions:** Each command may have multiple actions or require dynamic input.
- **Dynamic Fields:**  
  - Players can be selected via dropdowns populated from online players.
  - Entities can be selected from existing world entities.
  - Text fields and toggle options are supported for command arguments.
- **Execution:**  
  - Commands are executed in the background once the player completes the form.
  - Arguments are parsed from dynamic fields and merged with static command arguments according to the command's specified order.
- **Navigation:**  
  - "Back" buttons are provided to return to previous menus.
  - Canceled or busy interactions reopen the main menu.

## !lockdown
### At A Glance
The `!lockdown` command toggles server lockdown, preventing players without a security clearance of 4 from joining. It is useful during maintenance or security incidents.

?> Required Clearance Level To Execute: `4`


> Usage: "!lockdown [optional]"  
> Example: !lockdown  


### **Behavior & Notes**
- **Lockdown Activation:**  
  - Kicks all currently connected players without clearance 4.
  - Sets a dynamic property (`lockdown_b`) to true to track lockdown state.
  - Subscribes a monitor function to the `playerSpawn` event to automatically kick new joiners who do not meet the required clearance.
- **Lockdown Deactivation:**  
  - Sets the `lockdown_b` property to false.
  - Unsubscribes the monitor function from the `playerSpawn` event.
  - Sends a confirmation message to the executor.
- **Kick Reason:**  
  - Players are informed: `"Under Maintenance! Sorry for the inconvenience."`
- **Security Check:**  
  - Only players with `securityClearance === 4` are allowed to remain or join during lockdown.

## !modules
### At A Glance
The `!modules` command displays the status of all registered modules, including whether they are enabled or disabled, and lists the specific settings for each module.

?> Required Clearance Level To Execute: `4`


> Usage: "!modules [optional]"  
> Example: !modules  


### **Behavior & Notes**
- **Module Status:**  
  Each module shows whether it is **ENABLED** or **DISABLED**.
- **Settings:**  
  - If a module has configurable settings, each setting is listed under the module in a tree format.
  - Setting names are converted to Title Case for readability.
- **Module Filtering:**  
  - Only modules with corresponding registered commands are displayed.
- **Dynamic Mapping:**  
  - Each internal module key (e.g., `afkCheck_b`) is mapped to its command name (e.g., `afk`) for clarity.
- **Example Display Format:**  
    
    ├─Afk: ENABLED
    │ ├─Timeout: 300
    │ └─KickOnIdle: true
    └─AutoClicker: DISABLED
    
## !mute
### At A Glance
The `!mute` command allows administrators to toggle a player's ability to send chat messages. This is a crucial tool for managing disruptive chat behavior without resorting to more severe actions like kicking or banning. Muted players can still execute commands but are prevented from sending public chat messages.

?> Required Clearance Level To Execute: `3`


> Usage: "{prefix}mute <player>"
> Example: `{prefix}mute Steve`
> Example: `{prefix}mute "Steve Bob"`
> Example: `{prefix}mute help`


### **Behavior & Notes**
- **Toggle Functionality:**
  - Executing `!mute` on a player who is not currently muted will mute them.
  - Executing `!mute` on a player who is already muted will unmute them.
- **Chat Restriction:**
  - Muted players will have their chat messages cancelled and will receive a notification that they are muted when they attempt to speak.
  - They can still use commands.
- **Security Protection:**
  - Players with **Level 4 security clearance** cannot be muted by other players, nor can they mute themselves. This prevents accidental self-silencing and maintains the integrity of high-level administrative roles.
- **Feedback Messages:**
  - The command sender receives confirmation of the mute/unmute action.
  - The target player receives a message informing them of their mute status change.
- **Player Lookup:**
  - Supports single or multi-word player names. Quotes are optional for names containing spaces.
  - If the target player is not found or is invalid, the sender is notified.
- **GUI Integration:**
  - The command is accessible via the in-game GUI, allowing for easy selection of a target player to toggle their mute status.

### **Examples**
- Mute a player:
  `!mute PlayerName`
- Unmute a player:
  `!mute PlayerName`
- Mute a player with spaces in their name:
  `!mute "Another Player"`

## !op
### At A Glance
The `!op` command manages **Paradox Level-4 Security Clearance**, granting administrative privileges within the Paradox security system.

?> Required Clearance Level To Execute: `4`

### Initial Setup and Security
When Paradox is first installed, no host exists.  
The **first player with server operator privileges** who executes `!op` initializes the Paradox system and becomes the **Paradox Host**.

If a player without server operator privileges attempts to run `!op` before a host exists, the command will be denied.

Once the host is established, **only the host can grant additional Level-4 administrators**.

### Security Clearance Levels
- **Level 4**: Paradox-Op status, granting full administrative control.

### `!op`
Running `!op` without arguments attempts to grant **Level-4 security clearance to yourself**.

If no host exists yet, and the executing player has **server operator privileges**, they will become the **Paradox Host**.


> Usage: "!op"  
> Example: !op  


### `!op <player>`
Grants Level-4 Paradox security clearance to the specified player.

?> Only the **Paradox Host** may grant additional Level-4 administrators.


> Usage: "!op <player>"  
> Example: !op Pete9xi  


### `!op list`
Displays all players who currently have **Level-4 Paradox security clearance**, including the current host.


> Usage: "!op list"  
> Example: !op list  


### Notes
- The Paradox Host is the **only authority capable of granting new Level-4 administrators**.
- The host must have **server operator permissions** when initializing the system.
- Player names may contain spaces and may be quoted when necessary.
- Level-4 administrators are stored using their **player runtime IDs** to prevent impersonation.

## !opsec
### At A Glance
The `!opsec` command allows administrators to modify a player's security clearance level, adjusting their permissions and access rights.

?> Required Clearance Level To Execute: `4`

### **Levels of Clearance**
- **Level 1**: Basic permissions (regular players).
- **Level 2**: Enhanced permissions (trusted members).
- **Level 3**: Advanced permissions (senior moderators).
- **Level 4**: Paradox-Op status (full administrative privileges).


> Usage: "!opsec <player> <clearance>"  
> Example: !opsec tim123 3  


## !prefix
### At A Glance
The `!prefix` command allows administrators to change the command prefix used on the server. This prefix is what players type before any command to execute it.

?> Required Clearance Level To Execute: `4`


> Usage: "!prefix [new_prefix]"  
> Example: !prefix @@  
> Example: !prefix $  
> Example: !prefix !!  


### **Behavior & Rules**
- **Maximum Length:** The prefix is limited to **2 characters**.
- **Restricted Characters:** The prefix **cannot** contain:
  - Forward slash `/`
  - Section sign `§`
- **Feedback Messages:**  
  - If successful: `Prefix updated to: <newPrefix>`
  - If unchanged: `Prefix is already "<newPrefix>"`
  - If invalid characters: `Prefix cannot include the forward slash or section sign characters.`
  - If no prefix provided: `No new prefix provided.`

## !punish
### At A Glance
The `!punish` command removes items from a player’s inventory, equipment, and/or ender chest. This command acts as a disciplinary tool for administrators to enforce rules or correct behavior.

?> Required Clearance Level To Execute: `4`


> Usage: "!punish <player> [ --inventory | -i ] [ --equipment | -e ] [ --enderchest | -ec ]"  
> Example: !punish PlayerName  
> Example: !punish "Player Name" --inventory  
> Example: !punish PlayerName -i  
> Example: !punish PlayerName --equipment  
> Example: !punish PlayerName -e  
> Example: !punish PlayerName --enderchest  
> Example: !punish PlayerName -ec  
> Example: !punish "Player Name" --inventory --equipment --enderchest  
> Example: !punish "Player Name" -i -e -ec  
> Example: !punish help  


### **Behavior & Rules**
- **Flags:**
  - `--inventory` / `-i` — Wipes the player’s main inventory.
  - `--equipment` / `-e` — Clears the player’s armor and held items.
  - `--enderchest` / `-ec` — Removes all items from the player’s ender chest.
- **Default Behavior:**  
  - If no flags are provided, the command **wipes all three**: inventory, equipment, and ender chest.
- **Player Lookup:**  
  - Accepts multi-word player names. Quotes around names are optional but recommended for names with spaces.
- **Feedback Messages:**  
  - Success: `Punished "<PlayerName>"!`  
  - Failure: `Failed to punish "<PlayerName>"! Please try again.`

## !rename
### At A Glance
The `!rename` command allows administrators to assign a custom alias to a player. This alias overrides the player's name in chat and can optionally be displayed in their overhead nametag.

?> Required Clearance Level To Execute: `4`


> Usage: "!rename <player> <newName> [--ui | -u] [--reset]"  
> Example: !rename Steve CaptainSteve --ui  
> Example: !rename Steve OrdinarySteve  
> Example: !rename Steve --reset  


### **Options**
- `<player>`: Specifies the target player.
- `<newName>`: The alias to be assigned.
- `--ui | -u`: Toggles whether the alias should appear in the overhead nametag.
- `--reset`: Clears the alias and restores the player's original identity.

### **Behavior & Notes**
- **Chat Priority**: Paradox chat channels prioritize the alias over the player's native name once set.
- **UI Display**: If the UI flag is used, the alias is shown above the player's head, integrated with their current chat rank.
- **Persistence**: Aliases are stored as dynamic properties on the player and persist across sessions until reset.
- **Administrative Control**: Only Level 4 administrators can modify player identities to prevent abuse.
- **Identity Integrity**: Internal moderation logs and spoof checks continue to track the player's unique ID, ensuring accountability even when an alias is active.

## !spooflog
### At A Glance
The `!spooflog` command allows administrators to **inspect or clear player spoofing records** stored by the Paradox identity monitoring system.

These records help detect players attempting to **impersonate others by using similar or identical names**.

?> Required Clearance Level To Execute: `4`

### `!spooflog <playerName|id>`
Displays stored spoofing information for a player.

The search can match:
- Player name
- Known aliases
- Stored player ID


> Usage: "!spooflog <playerName|id>"  
> Example: !spooflog Bob  
> Example: !spooflog "Some Player"  


### `!spooflog <playerName|id> --clear`
Clears the spoofing record associated with the specified player.


> Usage: "!spooflog <playerName|id> --clear"  
> Example: !spooflog Bob --clear  


### `!spooflog --clearall`
Removes **all stored spoofing records** from the database.

?> This action cannot be undone.


> Usage: "!spooflog --clearall"  
> Example: !spooflog --clearall  


### Information Displayed
When viewing a spoof record, the command will display:

- **Player Name** – The primary recorded name.
- **Known Aliases** – Other names previously associated with the same player ID.
- **First Seen** – When the player was first recorded.
- **Last Seen** – Most recent login recorded.
- **Stored ID** – Internal identifier used to track the player.

### Notes
- Searches are **case-insensitive**.
- Partial name matches are supported.
- Alias matches are also considered when searching.
- Spoof logs are stored internally in the Paradox spoof database.

## !tpa
### At A Glance
The `!tpa` command allows players to teleport to one another, streamlining coordination and movement across the server. It ensures proper handling of multi-word player names and prevents teleportation for imprisoned players.

?> Required Clearance Level To Execute: `3`


> Usage: "!tpa <player> <player>"  
> Example: !tpa Lucy Steve  
> Example: !tpa @Steve @Lucy  


### **Behavior & Rules**
- **Player Selection:**
  - Accepts one or two-word player names. Quotes are optional for names containing spaces.
  - Players must exist and be valid; otherwise, the command fails.
- **Restrictions:**
  - Cannot be used if the sender is imprisoned.
- **Teleportation Logic:**
  - Teleports the first specified player to the second player’s current location.
  - Maintains dimension and rotation; ensures no block collision and resets velocity.
- **Feedback Messages:**
  - Success: `Teleported '<Player1>' to '<Player2>'.`
  - Failure: `Unable to teleport. Please try again.`
  - Invalid player: `Player '<PlayerName>' not found or not valid.`

## !unban
### At A Glance
The `!unban` command lifts a ban from a player, allowing them to rejoin the server. Supports both local and global bans.

?> Required Clearance Level To Execute: `3`


> Usage: "!unban <player> [ --global | -g ]"  
> Example: !unban Steve  
> Example: !unban Steve --global  


### **Behavior & Rules**
- **Player Selection:**
  - Accepts single or multi-word player names.
  - Quotes are optional if the name contains spaces.
- **Ban Lists:**
  - **Local ban**: Stored in the server’s local `banlistDB`.
  - **Global ban**: Stored in the `globalBannedPlayers` dynamic property.
- **Flags:**
  - `--global` or `-g`: Removes the player from the global ban list instead of local.
- **Feedback Messages:**
  - Success: `Player "<PlayerName>" has been unbanned from the local/global ban list.`
  - Failure: `Player "<PlayerName>" is not in the local/global ban list.`
  - Invalid input: `Please provide a valid player name.`
  - Retrieval errors: `Failed to retrieve the ban list. Please contact an admin.`

## !vanish
### At A Glance
The `!vanish` command allows a player to become invisible, enabling them to monitor the server discreetly.

?> Required Clearance Level To Execute: `2`

### **How It Works**
- Sets the player’s **game mode to Spectator**, making them invisible to others.
- Automatically backs up the previous game mode so it can be restored when vanish is disabled.
- Can be applied to yourself or another player (with proper clearance).


> Usage: "!vanish <player>"  
> Example: !vanish Pete9xi  
> Example: !vanish "Player Name"  
> Example: !vanish  


### **Behavior & Rules**
- **Target Selection:**
  - If a player name is provided, the command targets that player.
  - If no player name is provided, defaults to the command sender.
  - Supports multi-word player names with or without quotes.
- **Toggling:**
  - If the target is not in Spectator mode, vanish is enabled.
  - If the target is already in Spectator mode, their previous game mode is restored.
- **Feedback Messages:**
  - Success (enabled): `Vanish enabled!`
  - Success (disabled): `Vanish disabled!`
  - Failure (player not found): `Player "<PlayerName>" not found.`

## !warn
### At A Glance
The `!warn` command is used to track player infractions. It serves as a middle ground between verbal warnings and formal bans.

?> Required Clearance Level To Execute: `3` (Level 4 to clear)

> Usage: "!warn <add|list|clear> <player> [reason]"
> Example: `!warn add Steve Spamming`

### **Behavior & Notes**
- **Automated Escalation:** 
  - If a player receives **3 warnings**, the system will automatically kick them and prevent them from rejoining until their warnings are cleared by a Level 4 admin.
- **Persistence:**
  - Warnings are stored in the Paradox database and persist even if the player leaves and rejoins.
- **Clearance Restrictions:**
  - Level 3 moderators can add and list warnings.
  - Only Level 4 administrators can use the `clear` action to reset a player's warning count.
- **GUI Selection:**
  - The GUI supports separate workflows for **Online Players** (dropdown selection) and **Offline Players** (manual text input) to ensure reliable UI interaction.

### **Actions**
1. **add** – Records a new warning against the player.
2. **list** – Displays the history of warnings for the specified player.
3. **clear** – Deletes all warnings for the player.

## !whitelist
### At A Glance
The `!whitelist` command allows administrators to manage the server whitelist by adding or removing players, or viewing all whitelisted players.

?> Required Clearance Level To Execute: `3`

### **How It Works**
- Automatically checks a player’s device when they join to ensure it meets minimum requirements.
- Prevents players with incompatible settings (e.g., render distance too low or too high) from joining.
- Primarily used to block bots or unauthorized clients from connecting. 
- Works with bots (like ThirdEye on Discord) if explicitly whitelisted.


> Usage: "!whitelist <add|remove|list> <player>"  
> Example: !whitelist add Pete9xi  
> Example: !whitelist remove Pete9xi  
> Example: !whitelist list  


### **Actions**
1. **Add Player** – Adds a player to the whitelist.
2. **Remove Player** – Removes a player from the whitelist.
3. **List Players** – Shows all currently whitelisted players.

### **Notes**
- Player names are **case-sensitive**.
- When adding a bot, ensure it is whitelisted before it attempts to join, otherwise it will be blocked.
- The whitelist can be managed via GUI or command line.
