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
Required Clearance Level To Execute:

## !kick
### At A Glance
The `!kick` command removes a player from the server, with or without a reason. It's useful for addressing disruptive behavior.

!> Required Clearance Level To Execute: `3`

> ```
> Usage: "!kick [ -t | --target <player> ] [ -r | --reason <reason> ]"
> Example: !kick -t Pete9x -r Spamming Chat!
> ```
Required Clearance Level To Execute:

## !lockdown
### At A Glance
The `!lockdown` command prevents players without a security clearance of 4 from connecting to the server, useful for maintenance or during attacks.

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!lockdown [optional]"
> Example: !lockdown
> ```
Required Clearance Level To Execute:

## !deop
### At A Glance
The `!deop` command revokes Paradox-Op permissions from a player, reducing their clearance level to 3 or lower.

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!deop <player>"
> Example: !deop Peye9xi
> ```
Required Clearance Level To Execute:

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
Required Clearance Level To Execute:

## !gui
### At A Glance
The `!gui` command provides access to an interactive administrative menu, simplifying server management tasks.

!> Required Clearance Level To Execute: `1`

> ```
> Usage: "!gui"
> Example: !gui
> ```

### **Notes**
- Optimized for rapid server administration, minimizing input errors.
- Requires appropriate permissions for specific actions.
- Best on supported platforms (e.g., desktop versions of Minecraft Bedrock).
Required Clearance Level To Execute:

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
Required Clearance Level To Execute:

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
Required Clearance Level To Execute:

## !prefix
### At A Glance
The `!prefix` command allows administrators to change the prefix used for commands on the server.

!> Required Clearance Level To Execute: `2`

> ```
> Usage: "!prefix [optional]"
> Example: !prefix @@
> Example: !prefix $
> ```
Required Clearance Level To Execute:

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
Required Clearance Level To Execute:

## !tpa
### At A Glance
The `!tpa` command allows players to teleport to one another, streamlining coordination.

!> Required Clearance Level To Execute: `3`

> ```
> Usage: "!tpa <player> <player>"
> Example: !tpa Lucy Steve
> Example: !tpa @Steve @Lucy
> ```
Required Clearance Level To Execute:

## !unban
### At A Glance
The `!unban` command lifts a ban from a player, enabling them to rejoin the server.

!> Required Clearance Level To Execute: `3`

> ```
> Usage: "!unban <player>"
> Example: !unban Steve
> ```
Required Clearance Level To Execute:

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
