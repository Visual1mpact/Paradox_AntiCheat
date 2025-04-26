<img src="Media\paradox-header.png" alt="Paradox AntiCheat Logo"> </img>

!> This documentation could change with any version. Be sure to check it periodically for updates.

## !ban
### At A Glance
The `!ban` command is used to ban a player from the server, with an optional reason. It can also list all currently banned players. This command is vital for maintaining server security and enforcing rules.

!> Required Clearance Level To Execute: `3`

> ```
> Usage: "!ban [ -t | --target <player> ] [ -r | --reason <reason> ] [ -l | --list ]"
> Example: !ban -t Steve Bob -r Inappropriate Behavior
> Example: !ban -l
> ```

## !command
### At A Glance
The `!command` command enables or disables other commands dynamically. This allows administrators to manage active commands without restarting the server.

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!command [ enable | disable ] <commandName1> [commandName2] ..."
> Example: !command disable kick ban
> Example: !command enable kick ban
> ```

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
The `!deop` command revokes Paradox-Op permissions from a player, reducing their clearance level to 3 or lower.

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!deop <player>"
> Example: !deop Peye9xi
> ```

## !despawn
### At A Glance
The `!despawn` command removes entities from the game, either all entities or a specific type. It helps with managing entity populations and improving server performance.

!> Required Clearance Level To Execute: `3`

> ```
> Usage: "!despawn <entity_type | all>"
> Example: !despawn all
> Example: !despawn iron_golem
> Example: !despawn help
> ```

## !freeze
### At A Glance
The `!freeze` command allows administrators to lock a player in place this allows them to investigate any potential issue. This command acts as a toggle.

!> Required Clearance Level To Execute: `3`

> ```
> Usage: "!freeze"
> Example: !freeze pete9xi
> ```

## !gui
### At A Glance
The `!gui` command provides access to an interactive administrative menu, simplifying server management tasks.

!> Required Clearance Level To Execute: `1`

> ```
> Usage: "!gui"
> Example: !gui
> ```


## !kick
### At A Glance
The `!kick` command removes a player from the server, with or without a reason. It's useful for addressing disruptive behavior.

!> Required Clearance Level To Execute: `3`

> ```
> Usage: "!kick [ -t | --target <player> ] [ -r | --reason <reason> ]"
> Example: !kick -t Pete9x -r Spamming Chat!
> ```

## !lockdown
### At A Glance
The `!lockdown` command prevents players without a security clearance of 4 from connecting to the server, useful for maintenance or during attacks.

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!lockdown [optional]"
> Example: !lockdown
> ```

## !modules
### At A Glance
The `!modules` command displays the status of all registered modules, including whether they are enabled or disabled, and the settings for each module.

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!modules [optional]"
> Example: !modules> 
> ```


## !op
### At A Glance
The `!op` command grants Paradox-Op status to a player, providing elevated permissions.

!> Required Clearance Level To Execute: `4`

### Initial Setup and Security
Upon setting up Paradox, the server owner must set a secure OP password for future administrative actions.

### Security Clearance Levels
- **Level 4**: Paradox-Op status, granting full administrative control.

### `!op list`
The `!op list` command displays all players with security clearance level 4.

> ```
> Usage: "!op <player> | !op list"
> Example: !op Pete9xi
> ```

## !opsec
### At A Glance
The `!opsec` command allows administrators to modify a player's security clearance level, adjusting their permissions and access rights.

!> Required Clearance Level To Execute: `4`

### **Levels of Clearance**
- **Level 1**: Basic permissions (regular players).
- **Level 2**: Enhanced permissions (moderators).
- **Level 3**: Advanced permissions (senior moderators).
- **Level 4**: Paradox-Op status (full administrative privileges).

> ```
> Usage: "!opsec <player> <clearance>"
> Example: !opsec tim123 3
> ```

## !prefix
### At A Glance
The `!prefix` command allows administrators to change the prefix used for commands on the server.

!> Required Clearance Level To Execute: `2`

> ```
> Usage: "!prefix [optional]"
> Example: !prefix @@
> Example: !prefix $
> ```

## !punish
### At A Glance
The `!punish` command removes items from a player's inventory, equipment, or ender chest, acting as a disciplinary tool.

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!punish <player> [ --inventory | -i ] [ --equipment | -e ] [ --enderchest | -ec ]"
> Example: !punish Player Name
> Example: !punish "Player Name" --inventory
> Example: !punish Player Name -i
> Example: !punish Player Name --equipment
> Example: !punish Player Name -e
> Example: !punish Player Name --enderchest
> Example: !punish Player Name -ec
> Example: !punish "Player Name" --inventory --equipment --enderchest
> Example: !punish "Player Name" -i -e -ec
> Example: !punish help
> ```

## !tpa
### At A Glance
The `!tpa` command allows players to teleport to one another, streamlining coordination.

!> Required Clearance Level To Execute: `3`

> ```
> Usage: "!tpa <player> <player>"
> Example: !tpa Lucy Steve
> Example: !tpa @Steve @Lucy
> ```

## !unban
### At A Glance
The `!unban` command lifts a ban from a player, enabling them to rejoin the server.

!> Required Clearance Level To Execute: `3`

> ```
> Usage: "!unban <player>"
> Example: !unban Steve
> ```

## !vanish
### At A Glance
The `!vanish` command makes a player invisible, allowing them to monitor the server without detection.

!> Required Clearance Level To Execute: `2`

### **How It Works**
The `!vanish` command puts the player into spectator mode, rendering them invisible to others.

> ```
> Usage: "!vanish <player>"
> Example: !vanish Pete9xi
> ```

## !whitelist
### At A Glance
The `!whitelist` command allows administrators to add or remove players from the whitelist 

!> Required Clearance Level To Execute: `3`

### **How It Works**
The `!whitelist` automatically checks if a player's device meets the minimum requirements when they join the world. If a player’s render distance is too low or too high, they will be banned.

> ```
> Usage: "!whitelist <player>"
> Example: !whitelist Pete9xi
> ```

### Notes
This is amid at blocking external **Bots** from connecting, if you use a discord bot for example ThirdEye you will need to whitelist it in order for the bot to join your server/realm.

## !spooflog
### At A Glance
The `!spooflog` command allows administrators to view and manage spoofing attempts on player names. It provides a log of when a name was first seen, last seen, and any spoofing attempts made by other players. The command can also be used to clear individual spoof logs or all logs.

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!spooflog <playerName> [--clear] | !spooflog --clearall"
> Example: !spooflog Bob
> Example: !spooflog "Some Player"
> Example: !spooflog Bob --clear
> Example: !spooflog --clearall
> ```

### **Options**
- `<playerName>`: Specifies the player whose spoof logs are to be displayed.
- `--clear`: Clears the spoof log for the specified player.
- `--clearall`: Clears all spoof logs in the database.

### **Notes**
- The `!spooflog` command is useful for tracking name spoofing attempts, which can help in identifying malicious players.
- If a player name has been spoofed multiple times, all attempts will be displayed in the log for review.
