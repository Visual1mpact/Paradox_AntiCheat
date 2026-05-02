<img src="Media\paradox-header.png" alt="Paradox AntiCheat Logo"> </img>

?> This documentation could change with any version. So be sure to check it once in a while.

## !afk
### At A Glance
The `AFK` command toggles the AFK management module, which automatically tracks player activity and kicks inactive players after a specified timeout. This helps maintain active player engagement and prevents inactive accounts from taking up server slots.

### Default Settings
- **Timeout:** 10 minutes (can be customized via command arguments)
- **Check Frequency:** Every 5 seconds
- **Exemptions:** Players with Level 4 security clearance are ignored

### How It Works
- **Activity Tracking:** The module monitors player movement via velocity checks.  
- **AFK Detection:** If a player's velocity remains below a minimal threshold for the configured timeout, they are flagged as AFK.  
- **Kicking Inactive Players:** Flagged players who remain AFK past the timeout are automatically kicked.  
- **Real-Time Updates:** Player activity is updated whenever they move, preventing false positives.  
- **Player Leave Handling:** Players are removed from tracking upon logout to avoid stale data.  

?> Required Clearance Level To Execute: `4`


> Usage: "!afk [ hours ] [ minutes ] [ seconds ]"  
> Example: !afk 0 10 0  

## !anticrash
### At A Glance
The `anticrash` command toggles a specialized defense module that monitors for packet-based exploits intended to crash the server.

### How It Works
- **Signature Detection:** Specifically looks for malformed `SubChunkRequestPacket` payloads.
- **Array Validation:** The module checks the length of position offset arrays within incoming packets. If a packet exceeds the safe threshold (designed to catch 2.5m+ entries), it is immediately dropped.
- **Auto-Ban:** Because these attacks are strictly intentional and impossible to trigger with a vanilla client, the system automatically bans the sender to maintain server stability.

?> Required Clearance Level To Execute: `4`

> Usage: "!anticrash"
> Example: !anticrash

## !aimbotmonitor
### At A Glance
The `!aimbotmonitor` command toggles a detection module that analyzes player rotation patterns to identify external aim-assist and smoothing software.

?> Required Clearance Level To Execute: `4`

> Usage: "!aimbotmonitor"
> Example: !aimbotmonitor

### **Behavior & Notes**
- **Signature Detection:** Identifies the mathematical consistency produced by external smoothing loops (like those using `SendInput`).
- **Combat Analysis:** Evaluates how a player's crosshair tracks entities during combat.
- **Heuristic Strikes:** Uses a strike system to avoid false positives from erratic human movement.
- **Logging:** Alerts administrators when a player exhibits suspicious rotation signatures.

## !antifly
### At A Glance
The `antifly` command toggles the Anti-Fly detection module, which monitors player movement to detect and prevent unauthorized flying. By enabling this module, server administrators can maintain fair gameplay and prevent exploits that allow players to fly in Survival or Adventure modes without proper permissions.

### How It Works
- **Movement Monitoring:** The module continuously tracks players’ airborne status, including whether they are falling (`isFalling`) or flying (`isFlying`), and their vertical and horizontal velocities.  
- **Gamemode Restrictions:** Only applies to players in **Survival** or **Adventure** mode. Creative and Spectator mode players are excluded.  
- **Trident & Glide Exclusions:** Players using certain items like tridents, gliding, climbing, or swimming are temporarily ignored to avoid false positives.  
- **Hover Detection:** If a player hovers in the air unnaturally for more than a threshold, the module teleports them back to a safe “airportLanding” position.  
- **Security Clearance Bypass:** Level 4 administrators are exempt from anti-fly enforcement.  
- **Scheduled Checks:** The module runs periodically using a generator to evaluate all players, minimizing server impact.  

?> Required Clearance Level To Execute: `4`


> Usage: "!antifly [ help ]"  
> Example: !antifly  


## !antispam
### At A Glance
Toggles the chat spam detection module, which monitors players sending too many messages in a short period.  
This helps prevent chat flooding, bot spam, and ensures fair communication.

### How It Works
- **Message Tracking:** Each player’s chat messages are tracked over a short window (~5 seconds).  
- **Threshold:** Sending more than 5 messages within the time window triggers the anti-spam system.  
- **Mute:** Offending players are muted for 2 minutes (messages sent during this time are blocked).  
- **Dynamic Updates:** Once the mute expires, players regain normal chat permissions automatically.  
- **Command Handling:** Commands prefixed with `!` (or server-defined prefix) are intercepted and executed separately, preventing false triggers.  
- **Channels & Rank Handling:** Messages are routed through channels or globally with proper chat rank formatting.  
- **Performance Optimizations:**  
  - Player message times are stored efficiently in memory.  
  - Channel member caches are used to reduce repeated data lookups.  
  - Debouncing ensures database updates for channel activity happen at most once per 5 seconds.  

?> Required Clearance Level To Execute: `4`


> Usage: "!antispam [ help ]",  
> Example: !antispam  
> Example: !antispam help  


?> Note: The module listens to `beforeEvents.chatSend`. Commands like `/tellraw` used by external bots will not be flagged, though future updates may improve this coverage.


## !autoclicker
### At A Glance
The `autoclicker` command toggles the Auto-Clicker detection module, which monitors player attack speed to prevent the use of automated clicking tools. By enabling this module, administrators can maintain fair combat and prevent players from gaining an unfair advantage.

### How It Works
- **Click Tracking:** Each player’s clicks per second (CPS) are tracked using a tick-based system.  
- **CPS Threshold:** Players exceeding the maximum CPS (configured at 14 CPS) are flagged.  
- **Damage Prevention:** If a player is detected exceeding the CPS limit, their attacks are canceled to prevent unfair damage.  
- **Staff Notification:** Level 4 administrators are automatically notified of suspicious behavior, including player name and CPS.  
- **Event-Based:** Detection occurs on the `EntityHurtBeforeEvent`, ensuring real-time checks without overloading the server.  
- **Security Clearance Bypass:** Administrators with Level 4 clearance are excluded from auto-clicker checks.  

?> Required Clearance Level To Execute: `4`


> Usage: "!autoclicker [ help ]"  
> Example: !autoclicker  

## !autototem
### At A Glance
The `autototem` command toggles a detection module that identifies automated inventory interactions used to replenish Totems of Undying.

### How It Works
- **Equip Speed Validation:** Monitors the time between a player's offhand becoming empty (totem pop) and a new totem being equipped.
- **Mitigation:** If a totem appears in the offhand faster than humanly possible (under 250ms), the totem is automatically removed, and staff are alerted.

?> Required Clearance Level To Execute: `4`

> Usage: "!autototem"
> Example: !autototem

## !chestforensic
### At A Glance
The `Chest Forensic` module provides a **secure chest locking system with full audit logging**.  
Players can lock containers, while administrators can investigate **ownership, access history, and suspicious activity**.

This module is both a **protection system** and a **forensic tool**, allowing Level 4 staff to trace exactly who interacted with any storage block.

### How It Works
- **Chest Locking:**
  - Players can **lock a chest using a stick**.
  - Only the **owner** (or Level 4 staff) can unlock it.
  - Locked chests **cannot be opened or broken** by other players.

- **Double Chest Support:**
  - Adjacent chests are treated as a **single container**.
  - Both sides share the same owner and logs.

- **Access Logging:**
  - Every interaction is recorded:
    - Successful access
    - Denied access attempts
    - Break attempts
  - Logs include:
    - Player name
    - Timestamp
    - Chest location key

- **Placement Tracking:**
  - The system tracks **who placed the chest**.
  - Only the placer (or Level 4 staff) can lock it initially.

- **Admin Overrides:**
  - Level 4 staff can:
    - Open locked chests
    - Unlock any chest
    - View all logs
  - All overrides are **logged and broadcast to staff**.

- **Automatic Log Cleanup:**
  - Logs are retained for **30 days**.
  - Older entries are automatically pruned to optimize performance.

- **Real-Time Alerts:**
  - Staff are notified when:
    - A locked chest is accessed
    - Someone attempts unauthorized access
    - A chest is locked/unlocked

### Chest Key Format
Each chest is identified by a unique key:

```
dimension_x_y_z
```

Example:
```
overworld_0_64_0
```

### Forensic Features
Administrators can investigate:

- **Chest Ownership**
- **Last Access Time**
- **Recent Access Logs (last 10 events)**
- **Player Activity Across Multiple Chests**

This makes it easy to detect:
- Theft attempts
- Griefing
- Suspicious player behavior

### Commands & Options
- **Lookup Chest**
  - Displays owner and access logs
- **Lookup Player (Online/Offline)**
  - Shows all chest interactions by a player
- **Enable Module**
  - Starts chest locking system
- **Disable Module**
  - Stops all chest lock enforcement

### GUI Features
The module includes a full GUI with:
- Chest selector dropdown
- Online player selector
- Offline player input
- Toggle buttons for enabling/disabling the system

### Examples
> Usage: "!chestforensic < chestKey | playerName | on | off >"  
> Example: !chestforensic overworld_0_64_0  
> Example: !chestforensic Player123  
> Example: !chestforensic on  
> Example: !chestforensic off  

### Staff Notes
- Access logs are **global and persistent** via `chestLockDB`
- Double chests use a **canonical key system** to prevent duplication
- All enforcement occurs in:
  - `beforeEvents` (for prevention)
  - `afterEvents` (for logging & state updates)
- Module can be safely toggled at runtime without restart

## !criticals
### At A Glance
The `criticals` command toggles a detection module designed to stop "Packet Criticals." These are exploits that allow a player to deal critical hit damage while standing on the ground by sending fake packets to the server.

### How It Works
- **Ground Proximity Check:** Detects if a player claims to be airborne but is actually within a tiny distance (under 0.55 blocks) of a solid floor.
- **Velocity Validation:** Legitimate critical hits only happen when falling (negative Y velocity). This module flags players dealing criticals while having positive or zero vertical velocity.
- **Anti-Loop Teleport:** When a packet crit is detected, the attack is cancelled, and the player is teleported to their current location to reset their movement state and break the cheat's automation loop.
- **Gamemode Aware:** Automatically ignores players in Creative or Spectator modes.

?> Required Clearance Level To Execute: `4`

> Usage: "!criticals"
> Example: !criticals

## !deathcoords
### At A Glance
The `deathcoords` command toggles the Death Coordinates module. When enabled, this feature automatically sends a private message to players upon death, providing their exact coordinates and the dimension where they died. This helps players navigate back to their death location to retrieve lost items.

### How It Works
- **Event Detection**: The module monitors the `EntityDieAfterEvent` to trigger specifically when a player dies.
- **Data Capture**: Upon death, the system retrieves the player's current X, Y, and Z coordinates and identifies the dimension (Overworld, Nether, or End).
- **Private Notification**: A message is sent directly to the deceased player in the format: `[Paradox] You died at: X, Y, Z in Dimension.`
- **Administrative Control**: Level 4 administrators can toggle this module on or off globally using the command or through the administrative GUI.
- **Persistence**: The enabled/disabled state is saved in the Paradox database (`deathCoords_b`) and persists across server restarts.

?> Required Clearance Level To Execute: `4`


> Usage: "!deathcoords"  
> Example: !deathcoords  

## !dimensionlock
### At A Glance
The `dimensionlock` command toggles a restriction on specific dimensions, preventing non-administrative players from entering the Nether or The End.

### How It Works
- **Enforcement**: Monitors for dimension change events. If a player attempts to enter a locked dimension while enforcement is active, they are immediately teleported back to the spawn point of their original dimension.
- **Exemptions**: Players with Level 4 security clearance are exempt from these restrictions.
- **Global Toggle**: The entire module can be enabled or disabled globally. Disabling it stops all dimension enforcement without losing your specific lock settings.
- **Individual Locking**: Administrators can independently lock or unlock the Nether (`nether`) and The End (`end`). Locking a dimension automatically enables the module if it was disabled.
- **Status Listing**: Admins can view the current module state and specific dimension lock status using the list flag.
- **Persistence**: The locked status of each dimension is saved and persists across server restarts.

?> Required Clearance Level To Execute: `4`

> Usage: "!dimensionlock < nether | end | on | off | --list > [ on | off ]"  
> Example: !dimensionlock nether on  
> Example: !dimensionlock end off  
> Example: !dimensionlock on  
> Example: !dimensionlock off  
> Example: !dimensionlock --list  

## !gamemode
### At A Glance
The `gamemode` command allows server administrators to manage which game modes are permitted for players. This includes enabling or disabling specific modes—Adventure, Creative, Survival, or Spectator—and enforcing these restrictions in real time. Administrators can also list current configurations to review which modes are allowed.

### How It Works
- **Enable / Disable Modes:** Administrators can toggle individual game modes, ensuring players cannot switch to disallowed modes.  
- **Enforce Gamemode Rules:** Changes in player game modes are monitored. If a player attempts to switch to a disallowed mode, they are reverted to a valid mode.  
- **Fallback Handling:** If a player’s current mode becomes disallowed, the system automatically assigns them an allowed mode, prioritizing Survival, Adventure, Creative, or Spectator in that order.  
- **Security Clearance Bypass:** Players with Level 4 security clearance are exempt from gamemode restrictions.  
- **Current Configuration Listing:** Admins can view which game modes are currently allowed and whether gamemode checks are enabled.  

?> Required Clearance Level To Execute: `4`


> Usage: "!gamemode [ -a | -c | -s | -sp | -e | -d | --enable | --disable | -l | --list ]"  
> Examples:  
>   !gamemode -a  
>   !gamemode -c -s  
>   !gamemode -a -c -sp  
>   !gamemode --enable  
>   !gamemode --disable  
>   !gamemode -l  
>   !gamemode --list  


## !invsync
### At A Glance
The `InvSync` module helps prevent **inventory duplication exploits** that occur when players disconnect or rejoin during item transactions. It works by storing inventory snapshots and verifying that player inventories remain synchronized when they reconnect.

Administrators can use this module to monitor inventory integrity, force synchronization checks, and investigate suspicious inventory changes.

### How It Works
When the module is enabled, the system periodically creates **inventory snapshots** for players. These snapshots store the current state of a player's inventory, including item counts and timestamps.

When a player reconnects or when a manual check is triggered, the module compares the player's current inventory with the stored snapshot. If inconsistencies are detected, the system records an **anomaly event** for administrative review.

Administrators can also manually:

- Force a new snapshot of all players
- Trigger an immediate inventory recheck
- Clear stored snapshot data
- View forensic reports for specific players

The forensic report displays:
- Snapshot timestamps
- Inventory item counts
- Suspicious stack sizes
- Recent anomaly events

This system helps identify potential **duplication exploits or abnormal inventory states**.

?> Required Clearance Level To Execute: `4`


> Usage: "!invsync [ help | status | snapshot | check | clear | forensic <player> ]"  
> Example: !invsync  
> Example: !invsync status  
> Example: !invsync snapshot  
> Example: !invsync check  
> Example: !invsync clear  
> Example: !invsync forensic Steve  


## !killaura
### At A Glance
The `Killaura` detection module helps maintain fair combat on the server by detecting illegal attack automation (commonly known as “killaura”). It monitors player attack behavior, including speed, distance, and orientation, to identify suspicious activity and prevent unfair advantages. When a potential exploit is detected, the module can cancel the attack and notify staff for review.

### How It Works
- **Attack Frequency:** The module tracks the number of attacks per second and ensures players do not exceed the maximum allowed rate (default: 12 attacks/sec).  
- **Distance & Orientation:** Checks the distance between the attacker and the target, and verifies that the attacker is facing the target within a configurable angle.  
- **Suspicious Pattern Detection:** Uses dynamic thresholds and historical attack intervals to detect unnatural attack patterns indicative of automation.  
- **Mitigation:** When suspicious behavior is detected, the attack is cancelled, preventing unfair damage. Staff with Level 4 security clearance are notified with relevant details.  
- **Continuous Monitoring:** The module subscribes to entity damage events and actively analyzes PvP interactions to maintain fairness.

?> Required Clearance Level To Execute: `4`


> Usage: "!killaura [ help ]"  
> Example: !killaura  


## !lagclear
### At A Glance
The `!lagclear` module helps maintain server performance by clearing excess items and entities. Administrators can schedule a countdown in hours, minutes, and seconds, or use default settings to trigger an immediate cleanup. This reduces lag caused by accumulated entities, dropped items, and unnecessary mobs.

### How It Works
- **Countdown Timer:** When executed, the command starts a timer and notifies players periodically with countdown messages.  
- **Scheduled Lag Clear:** At the end of the countdown:
  - All dropped items in the overworld are removed.
  - Hostile mobs without name tags or exceptions (bosses, tamed animals, or important raid mobs) are removed.
- **Safety Exceptions:** Certain entities are never removed (e.g., `ender_dragon`, `wither`, `shulker`, `warden`, tamed animals).  
- **Continuous Monitoring:** The system tracks global timers and job IDs to prevent duplicate runs. If the module is disabled, all scheduled jobs are cleared.  
- **Dynamic Timing:** Admins can specify a timer via command arguments or toggle the module on/off with defaults.

?> Required Clearance Level To Execute: `4`


> Usage: "!lagclear [ hours ] [ minutes ] [ seconds ]"  
> Example: !lagclear 0 15 0  
> Example: !lagclear (uses default 10-minute timer)  


## !namespoof
### At A Glance
The `Name-Spoof` module protects the server from players attempting to impersonate others using fake or similar-looking names. It automatically detects invalid names, duplicate names, or names that violate server rules.

### How It Works
- **Name Validation:** When a player joins, their name is checked for:
  - Minimum and maximum length (3–16 characters).  
  - Allowed characters (alphanumeric, underscore, space).  
  - Invalid or special characters (e.g., non-ASCII, `/`, `\`, `*`, `?`, `"`, `<`, `>`, `:`).  
- **Duplicate Detection:** Names are normalized to a “base name” (suffix numbers removed). If another player is already using the same base name, the joining player is kicked.  
- **Action Enforcement:**  
  - Invalid names trigger a **ban and kick**.  
  - Names that are suspicious but not banned trigger a **kick**.  
  - Duplicate names trigger a **kick**.  
- **Event Management:**  
  - The system subscribes to `playerSpawn` and `playerLeave` events to track active players and prevent collisions.  
  - Cleans up the tracking map when players leave.  

?> Required Clearance Level To Execute: `4`


> Usage: "!namespoof [ help ]"  
> Example: !namespoof  
> Example: !namespoof help  


## !noclip
### At A Glance
The `NoClip` detection module prevents players from phasing through solid blocks.  
It is essential for catching exploits that bypass normal collision mechanics, ensuring fair gameplay. Level 4 staff can monitor it via chat or GUI alerts.

### How It Works
- The module tracks player positions at short intervals (`CHECK_INTERVAL = 2` ticks) and monitors the **hitbox** for illegal movement through blocks.
- Each player’s **bounding box (AABB)** is checked against the world using a **tolerance-aware swept AABB** method:
  - **Corners:** All 8 corners of the swept bounding box are checked with `COLLISION_TOLERANCE` to reduce false positives.
  - **Interior:** If corners intersect solid blocks, the interior voxels are scanned.
  - **Ray-march:** A small fractional ray-step along the movement path detects diagonal clipping that the swept AABB may miss.
- Players must exceed **3 consecutive phase detections** (`PHASE_FLAGS_REQUIRED`) before being flagged.
- When flagged:
  - The player is **teleported back** to their previous location.
  - Staff with Level 4 clearance are **alerted** with the distance phased.
  - The player's phase flag count resets.
- Players in **Creative** or **Spectator** mode, or those recently damaged/knocked back (<2 seconds), are exempt from detection.
- Module automatically **cleans up tracking data** when players leave the server.

?> Required Clearance Level To Execute: `4`


> Usage: "!noclip"  
> Example: !noclip  
> Example: !noclip help  


## !packetmonitor
?> This module is only available on **Bedrock Dedicated Server (BDS)** due to the `@minecraft/server-net` dependency.  
It must be enabled via the `config/default/permissions.json` file.

### At A Glance
The `Packet Monitor` module monitors incoming network packets to detect potential spam or exploit attempts.  
It logs suspicious activity for administrative review and helps prevent server overloads caused by malicious or malfunctioning clients.

### How It Works
- The module tracks incoming packets per player using a **ring buffer**.
- Each packet type has a **threshold of 250 packets per 5 seconds**. Players exceeding this are flagged as potential spammers.
- Certain packets are **ignored** because they are common and not indicative of abuse:
  - `PlayerAuthInputPacket`
  - `SubChunkRequestPacket`
  - `ClientCacheBlobStatusPacket`
- Events exceeding thresholds are **logged to the server console**; no automatic ban or kick occurs.
- The module includes a **cleanup task** that periodically prunes old timestamps to prevent memory leaks.
- Administrators with **Level 4 clearance** can toggle the module on/off via chat or the GUI.
- If `@minecraft/server-net` is unavailable, the module will **fail to enable** and notify the admin.

?> Required Clearance Level To Execute: `4`


> Usage: "!packetmonitor [ help ]"  
> Example: !packetmonitor

## !pathing
### At A Glance
The `!pathing` command toggles a detection module that identifies automated movement and navigation scripts (often referred to as "Baritone" or "Navigator").

?> Required Clearance Level To Execute: `4`

### **How It Works**
- **Robotic Rotation:** Detects perfectly constant yaw precision, which is a hallmark of automated pathfinding.
- **Speed Validation:** Identifies horizontal movement speeds that exceed vanilla sprinting limits while maintaining robotic precision.
- **Mitigation:** If a player is flagged, their velocity is reset, and they are teleported back to their last valid location to disrupt the navigation loop.

> Usage: "!pathing"
> Example: !pathing

## !platformblock
### At A Glance
The `PlatformBlock` module manages which player platforms (console, desktop, mobile) are allowed to join the server. Administrators can block specific platforms, preventing unauthorized clients from connecting.

### How It Works
- **Platform Detection:** When a player joins, the system identifies their platform (console, desktop, or mobile).  
- **Restriction Enforcement:**  
  - If the player’s platform is marked as blocked, they are automatically kicked with a message explaining the restriction.  
  - Admins cannot block all platforms; at least one must remain unblocked to avoid accidental lockout.  
- **Commands & Options:**  
  - Enable a platform block: `!platformblock <platform> -e`  
  - Disable a platform block: `!platformblock <platform> -d`  
  - List current restrictions: `!platformblock -l`  
- **Safety Checks:**  
  - Admins cannot block their own platform.  
  - Works in tandem with allowlists, banlists, and spoof checks to maintain secure access.  

?> Required Clearance Level To Execute: `4`


> Usage: "!platformblock <platform> [ -e | -d | -l | --list ]"  
> Example: !platformblock console -e  
> Example: !platformblock desktop -d  
> Example: !platformblock -l  


## !ratelimit
### At A Glance
The `RateLimit` module protects the server from players attempting to overwhelm it with excessive packets.  
It enforces per-player, per-packet, and global packet rate limits, automatically banning or kicking offenders to prevent exploits and server crashes. Only Level 4 staff can toggle this module.

### How It Works
- **Packet Tracking:** Each player has a buffer of recent packets. Certain packet types are specifically monitored, including:
  - `CommandRequestPacket`
  - `LegacyTelemetryEventPacket`
  - `MovePlayerPacket`
  - `TextPacket`
  - `EmotePacket`
- **Limits Enforced:**  
  - Per-packet limits (e.g., 5 `CommandRequestPacket` per 1000 ms).  
  - Global server-wide limits to detect bursts.  
- **Detection:**  
  - If a player exceeds the limit for a packet type, the packet is canceled.  
  - If a player repeatedly violates limits, they are automatically banned.  
  - If global packet bursts occur or multiple violators appear in a short window, the server enters **lockdown** mode, notifying players and temporarily blocking new connections.  
- **Join Protection:**  
  - Flood protection limits the number of join attempts per 5 seconds.  
  - Banned players are immediately disconnected with a ban message.  
- **Cleanup:**  
  - When a player leaves, their packet data is cleared to optimize performance.  
  - Lockdown lifts automatically after a short duration.

?> Required Clearance Level To Execute: `4`


> Usage: "!ratelimit [ help ]",  
> Example: !ratelimit  


## !reach
### At A Glance
Toggles the module that checks if players are hitting others from a fair distance.  
This is strictly a combat check and does **not** affect block placement or movement.

### How It Works
- **Player Tracking:** Each player's recent positions are tracked and stored in a short history (up to 6–10 positions).  
- **Combat Check:** When a player attacks another player:
  - The distance between attacker and target is calculated using cubic interpolation to account for lag.
  - If the distance exceeds 4.5 blocks, the attack is canceled, and the target’s health remains unchanged.  
- **Staff Alerts:** Level 4 staff are notified when a player exceeds the allowed reach distance.  
- **Performance:** Position histories are updated at a fixed interval (every ~4 ticks) to optimize CPU usage.  

?> Required Clearance Level To Execute: `4`


> Usage: "!reach [ help ]",  
> Example: !reach  
> Example: !reach help  


## !scaffold
### At A Glance
The `Scaffold` module detects and prevents automated block placement hacks, commonly known as scaffold hacks. It monitors players building above air or towering up to identify unnatural placement patterns that could indicate cheating.

### How It Works
- **Block Placement Monitoring:** Tracks each block placed by players and the time of placement.  
- **Suspicious Pattern Detection:**  
  - If a player places more than 3 blocks within 20 ticks (1 second), the module evaluates their positions.  
  - A pattern is considered suspicious if at least two axes are constant, suggesting automated straight-line placement.  
- **Automatic Intervention:**  
  - Suspicious blocks are replaced with air to prevent unfair advantages.  
  - Blocks are returned to the player’s inventory when possible.  
- **False Positive Prevention:**  
  - Ignores placements in Creative mode, when sneaking, or for excluded blocks (like scaffolding).  
  - Ignores legitimate placements above solid blocks or farmland.  

?> Required Clearance Level To Execute: `4`


> Usage: "!scaffold [ help ]"  
> Example: !scaffold  
> Example: !scaffold help  


## !selfattack
### At A Glance
The `Self-Attack` module detects and prevents players from using modified clients or exploits to attack themselves. This type of exploit can bypass server mechanics or trigger unintended effects, potentially giving unfair advantages.

### How It Works
- **Entity Hit Detection:** Listens for `entity hit` events, which are triggered whenever one entity damages another.  
- **Self-Attack Check:** When a player attacks themselves, the system identifies the attacker and victim as the same entity.  
- **Automatic Enforcement:**  
  - The player is immediately banned, and their name is added to the server’s banned list.  
  - The system executes a kick command to remove the player from the game with a warning.  
- **Administrator Oversight:** Ensures exploits are prevented without manual intervention.  

?> Required Clearance Level To Execute: `4`


> Usage: "!selfattack [ help ]"  
> Example: !selfattack  
> Example: !selfattack help  


## !visioncheck
### At A Glance
Toggles the `Vision Check` module, which continuously monitors the contents of containers or player inventories that Level 4 security personnel are looking at, displaying the contents on their action bar in real-time.

### How It Works
- **Inventory Detection:** When a Level 4 player looks at a block or another player within 10 blocks, the module checks if the target has an inventory.  
- **Action Bar Display:** The items are summarized and displayed on the player’s action bar with item counts.  
- **Pagination & Rotation:**  
  - Up to 6 items are shown per page.  
  - Pages rotate automatically every 3 checks for containers with more than 6 items.  
- **Empty Inventory Handling:** If the target inventory is empty, a warning is shown instead.  
- **Player-State Tracking:** The module stores per-player state to manage page rotation, cooldowns, and last-target tracking.  
- **Real-Time Updates:** Checks run every 30 ticks (~1.5 seconds) and update dynamically as the player looks around.  
- **Security Compliance:** Only players with Level 4 security clearance can use this feature.  

?> Required Clearance Level To Execute: `4`


> Usage: "!visioncheck [ help ]",  
> Example: !visioncheck  
> Example: !visioncheck help  


## !worldborder
### At A Glance
Toggles the `World Border` module, which restricts players from exceeding configurable boundaries in each dimension (Overworld, Nether, End) relative to the world origin (0,0,0), rather than the spawn point. Players with Level 4 security clearance are exempt.

### How It Works
- **Border Enforcement:** Continuously monitors player positions in all dimensions and teleports them back inside the boundary if they exceed the set size.  
- **Safe Teleportation:** When returning a player to the border, their Y-coordinate is adjusted to avoid suffocation or falling, using an optimized search for safe blocks. Slow Falling is applied as a fallback if no safe spot is found.  
- **Notifications:** Players receive messages when they reach or exceed a border.  
- **Dimension-Specific:** Each dimension can have a separate border size.  
- **Commands & Options:**  
  - `--overworld | -o <size>`: Set Overworld border  
  - `--nether | -n <size>`: Set Nether border  
  - `--end | -e <size>`: Set End border  
  - `--disable | -d`: Disable all borders  
  - `--list | -l`: Display current border settings  
- **Performance Optimizations:**  
  - Uses generators to iterate over players efficiently.  
  - Teleport nudges are debounced to avoid spamming the player with messages.  
  - Runs checks every 20 ticks (1 second).  

?> Required Clearance Level To Execute: `4`


> Usage: "!worldborder [ --overworld | -o <size> ] [ --nether | -n <size> ]  
>        [ --end | -e <size> ] [ -d | --disable ] [ -l | --list ]",  
> Example: !worldborder -o 10000 -n 5000 -e 10000  
> Example: !worldborder --overworld 10000 --nether 5000  
> Example: !worldborder --overworld 10000  
> Example: !worldborder --nether 5000  
> Example: !worldborder -n 5000  
> Example: !worldborder disable  
> Example: !worldborder -l  
> Example: !worldborder --list  


## !xray
### At A Glance
The `Xray` module detects and reports suspicious mining activity that may indicate the use of Xray cheats. It monitors players mining high-value ores (e.g., diamonds, emeralds, ancient debris) at unusual rates or in patterns inconsistent with normal gameplay. Administrators with Level 4 Security Clearance are alerted when suspicious activity is detected.

### How It Works
- **Tracking Mining Behavior:** Monitors mined ores and counts rare blocks versus total mined blocks over a 2-minute rolling window.  
- **Suspicion Score:** Each ore has a suspicion weight; rare ores contribute more. The system calculates a suspicion score for each player.  
- **Alert Thresholds:**  
  - Low-level alert: suspicion ≥ 15  
  - Priority alert: suspicion ≥ 25  
  - Freeze player: suspicion ≥ 40 (applies slowness and mining fatigue)  
- **Vein-Jumping Detection:** Tracks consecutive mining of ores in unusual distances (indicative of Xray usage).  
- **Hidden Ore Detection:** Detects when players mine ores that are fully surrounded by solid blocks.  
- **Safe Zones:** Players can create temporary “Safe Zones” to prevent false positives when mining known resource areas. Safe Zones last 5 minutes and have cooldowns.  
- **Automatic Reset:** Player data is reset every 60 seconds and cleared when they leave the server to optimize performance.  
- **Administrator Notifications:** High-security staff are alerted with player name, ore type, count, and coordinates of suspicious mining activity.

?> Required Clearance Level To Execute: `4`


> Usage: "!xray [ -Help ]"  
> Example: !xray  
