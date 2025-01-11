<img src="Media\paradox-header.png" alt="Paradox AntiCheat Logo"> </img>

!> This documentation could change with any version. So be sure to check it once in a while.

## !afk
### At A Glance
The `AFK` command serves as a toggle that allows users to enable or disable the AFK management module. This module is designed to automatically kick players from the server/realm if they remain inactive for a specified period.

### Default Settings
By default, the AFK module is set to kick players after 10 minutes of inactivity. However, this duration can be easily customized through the command itself.

### How It Works
The AFK module operates by periodically checking each player's movement. Specifically, it monitors the player's velocity—if a player’s velocity remains at zero (indicating no movement) for the duration of the set timer, the module flags the player as AFK. Once flagged, if the player remains inactive, they will be kicked from the server/realm.

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!afk [ hours ] [ minutes ] [ seconds ]",
> Example: !afk 0 10 0
> ```

## !autoclicker
### At A Glance
The `autoclicker` command toggles the auto-clicker detection module, a tool designed to identify and prevent players from using auto-clicker hacks that provide an unfair advantage.

### How It Works
The auto-clicker detection module is designed to monitor and regulate the rate at which players click, ensuring that no one gains an unfair advantage by using auto-clicking software/hacks. The module tracks each player's clicks per second (CPS) and takes corrective action if the CPS exceeds a predefined threshold.

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!autoclicker [ help ]",
> Example: !autoclicker
> ```

## !antifly
### At A Glance
The `antifly` command acts as a toggle to enable or disable the anti-fly detection module. This module is designed to monitor player movements and detect unauthorized flying activities, helping to prevent cheating and maintain fair gameplay. By enabling this module, server administrators can ensure that players are not using exploits or hacks to fly in game modes where flying is not allowed.

### How it works
The anti-fly detection module operates by continuously monitoring the status and movements of players in the server. The module evaluates two key conditions: whether the player is currently falling (`isFalling`) and whether the player is flying (`isFlying`).
If a player is detected as flying without falling and they are in Survival or Adventure mode, it suggests that they may be using an exploit to fly, as falling is the natural consequence of being airborne in these modes without valid flying mechanics (like using an Elytra).

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!antifly [ help ]",
> Example: !antifly
> ```

## !gamemode
### At A Glance
The `gamemode` command provides administrators with the ability to manage and configure allowed game modes on the server. With this command, users can permit or restrict specific game modes, ensuring that players adhere to the intended gameplay experience. Additionally, it can be used to list the current game mode configurations, offering a quick overview of the server's allowed modes.

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!antifly [ help ]",
> Example: !antifly
> ```

## !killaura
### At A Glance
The `Killaura` detection module is designed to identify and mitigate the use of illegal attack automation (commonly known as "killaura") on the server. By analyzing player behavior—such as attack speed, distance, and orientation—this module can detect suspicious activities and prevent unfair gameplay by restoring health to victims of potential cheaters. This ensures a balanced and fair experience for all players on the server.

### How It Works
The `Killaura` detection module monitors player attacks to identify and counteract suspicious behavior. It tracks attack frequency, ensuring players don't exceed the maximum allowed rate of 12 attacks per second. It also checks the distance between the attacker and the target, and verifies that the attacker is facing the target within a specified angle. If any of these criteria are breached, the module flags the behavior as suspicious and restores the health of the attacked player to mitigate any unfair advantage, thus promoting fair play on the server.

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!killaura [ help ]",
> Example: !killaura
> ```

## !lagclear
### At A Glance
The `!lagclear` command is designed to manage server performance by removing excess items and entities through a timed operation. Administrators can specify the duration of the lag-clear process in hours, minutes, and seconds, or use default settings for an immediate action. This command helps maintain server efficiency and reduce lag by periodically clearing unnecessary items and entities.

### How It Works
The `!lagclear` module initiates a timed process to clear server lag by removing excess items and entities. Administrators set a countdown period, and the command generates a countdown with periodic messages to inform players of the upcoming lag-clear. When the countdown ends, the command clears items and entities from the server to improve performance. This process is continuously monitored, and if the lag-clear functionality is disabled, the operation is halted, and any scheduled tasks are cleared.

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!lagclear [ hours ] [ minutes ] [ seconds ]"
> Example: !lagclear 0 15 0
> ```

## !namespoof
### At A Glance
The `name-spoof` detection module monitors player names to prevent players from impersonating others by using similar-looking names.

### How It Works
This module helps protect the server by automatically detecting and kicking or banning players with inappropriate or duplicate names. When a player joins, the system checks if their name meets allowed standards, like minimum length and allowed characters. If a name is invalid or has special characters, the player is banned; if it's too similar to an existing player’s name, they’re kicked to avoid confusion.

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!namespoof [ help ]",
> Example: !namespoof
> Example: !namespoof help
> ```

## !platformblock
### At A Glance
Blocks players from joining based on their platform or lists current platform restrictions.

### How It Works
When a player joins the server or realm, it will check to see if the player's platform (console, mobile, or PC) is allowed. If the player’s platform matches one marked as blocked in the settings, the check kicks the player with a message explaining that their platform isn’t authorized.

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!platformblock <platform> [ -e | -d | -l | --list ]",
> Example: !platformblock console -e (Enables Console to be blocked)
> Example: !platformblock console -d (Disables Console to be blocked)
> Example: !platformblock -l (Lists the current configuration.)
> ```

## !reach
### At A Glance
Toggles the module that checks if players are hit from a fair distance; this is not block related and has no effect on block placement. 

### How It Works
The Reach module provides a combat distance check, which helps prevent players from attacking others from too far away. When enabled, the module continuously tracks each player's recent positions and velocities, storing up to 10 recent movements for accuracy. During an attack event, it checks the distance between the attacker and their target; if the distance exceeds 4.5 blocks, the target’s lost health is restored, effectively nullifying the attack. The module uses cubic interpolation on player positions to account for possible lag, ensuring that only legitimate hits within the allowed range are considered valid.

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!reach [ help ]",
> Example: !reach
> Example: !reach help
> ```

## !scaffold
### At A Glance
Toggles the scaffold detection module, which looks for players placing blocks at a high rate of speed while walking/running above air or towering up. 

### How It Works
The Scaffold module monitors block placements to detect and prevent scaffold hacks. When a player places more than 3 blocks in a short time window (within 20 ticks or 1 second), the module inspects the positions to identify suspicious patterns, like if the blocks are aligned in a straight line. If detected, the module replaces these blocks with air to undo the placement, aiming to prevent unfair advantages from automated building hacks. This system automatically filters out block placements in Creative mode or when the player is sneaking, ensuring legitimate actions are not falsely flagged.

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!scaffold [ help ]",
> Example: !scaffold
> Example: !scaffold help
> ```

## !antispam
### At A Glance
Toggles the chat spam check module, which monitors players sending a large number of chat messages within a short time.

### How It Works
The spam module monitors player messages within the game. If a player sends 6 messages within 3 seconds, which exceeds the threshold of 5 messages, they will be muted for the next 2 minutes, and any messages they try to send during this time will be blocked. Once the mute expires, they can send messages again. This system helps prevent chat flooding and ensures that players who spam excessively are temporarily muted.

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!antispam [ help ]",
> Example: !antispam
> Example: !antispam help
> ```

!> This module listens to `beforeEvents.chatSend`, meaning commands like `/tellraw`, which are used by external bots, will not be flagged. However, we are hoping to bring this feature soon!

## !worldborder
### At A Glance
The `World Border` module is designed to restrict players from going beyond specific boundaries in each dimension based on coordinates relative to the world's origin (0,0,0), not the world spawn.

### How It Works
The `World Border` module automatically monitors player positions across different dimensions (Overworld, Nether, End) and ensures they remain within specified borders. When a player exceeds the set border in any dimension, the system teleports them back inside the boundary to a safe location, ensuring they don't fall or suffocate by adjusting their Y-coordinate. Players with security clearance 4 are exempt from the border restrictions. If a player reaches the border, they receive a message informing them of the teleportation.

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!worldborder [ --overworld | -o <size> ] [ --nether | -n <size> ]
            [ --end | -e <size> ] [ -d | --disable ] [ -l | --list ]",
> Example: !worldborder -o 10000 -n 5000 -e 10000
> Example: !worldborder --overworld 10000 --nether 5000
> Example: !worldborder --overworld 10000
> Example: !worldborder --nether 5000
> Example: !worldborder -n 5000
> Example: !worldborder disable
> Example: !worldborder -l
> Example: !worldborder --list
> ```
