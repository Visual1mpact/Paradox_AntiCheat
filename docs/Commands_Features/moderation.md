<img src="Media\paradox-header.png" alt="Paradox AntiCheat Logo"> </img>

!> This documentation could change with any version. So be sure to check it once in a while.

## !ban
### At A Glance
The ban command is used to ban a player from the server, with the option to provide a reason for the ban. Additionally, it can be used to list all currently banned players. This command is an essential tool for maintaining server security and enforcing rules, ensuring a safe and enjoyable environment for all players.

!> Required Clearance Level To Execute: 3

> ```
> Usage: "!ban [ -t | --target <player> ] [ -r | --reason <reason> ] [ -l | --list ]",
> Example: !ban -t Steve Bob -r Inappropriate Behavior
> Example: !ban -l
> ```

## !command
### At a Glance
The `!command` command enables or disables other commands dynamically. This provides administrators with flexibility in managing which commands are active on the server. It is an essential moderation tool for customizing command availability without requiring code changes or server restarts.

!> Required Clearance Level To Execute: 4

> ```
> Usage: "!command [ enable | disable ] <commandName1> [commandName2] ...",
> Example: !command disable kick ban
> Example: !command enable kick ban
> ```

### **Options**
- `enable`: Activates one or more previously disabled commands, making them available for use.
- `disable`: Deactivates one or more active commands, preventing them from being executed.
- `<commandName(s)>`: Specifies one or more command names to enable or disable. Multiple commands should be space-separated.

### **Notes**
- The `!command` command cannot be disabled itself to prevent accidental loss of administrative control.
- Use the `disable` option cautiously to ensure critical commands remain functional.
- This command dynamically updates the command registry, ensuring real-time changes are reflected.


## !kick
### At A Glance
The kick command is used to remove a specified player from the server. This can be done with or without providing a reason for the kick. The command is useful for quickly addressing disruptive behavior or enforcing server rules.

!> Required Clearance Level To Execute: 3


> ```
> Usage: "!kick [ -t | --target <player> ] [ -r | --reason <reason> ]"
> Example: !kick -t Pete9x -r Spamming Chat!
> ```


## !lockdown
### At A Glance
The lockdown command initiates a server-wide lockdown to prevent any players who do not have a security clearance level of 4 from connecting. This command is especially useful during maintenance or when the server is under attack, ensuring that only high-clearance administrators can access the server while the lockdown is in effect.

!> Required Clearance Level To Execute: 4


> ```
> Usage: "!lockdown [ optional ]"
> Example: !lockdown
> ```


## !deop
### At A Glance
The deop command is used to remove Paradox-Op permissions from a player, effectively revoking their security clearance level 4 status. By using this command, administrators can ensure that only the appropriate individuals retain access to the highest levels of server permissions.

!> Required Clearance Level To Execute: 4

> ```
>   usage: "!deop <player>",
>   examples: !deop Peye9xi
> ```



## !despawn
### At A Glance
The despawn command is used to remove entities from the game world. It can be applied to either all entities or a specified type, depending on the parameters provided. This command is essential for managing entity populations, reducing server lag, or addressing specific gameplay situations.

!> Required Clearance Level To Execute: 3

>```
> Usage: "!despawn <entity_type | all>"
>Example: !despawn all
>Example: !despawn iron_golem
>Example: !despawn help
>```

## !op
### At A Glance
The op command is used to grant a player Paradox-Op status within the server, providing them with elevated permissions and access.

!> Required Clearance Level To Execute: 4

### Initial Setup and Security
During the initial setup of Paradox, the server owner will be presented with a secure OP Configuration Interface. This interface allows the owner to establish a new password, which will serve as the security key for all future OP-related actions.

This password is critical for managing server permissions and should be kept secure. Once set, it is used to grant Paradox-Op status to players through the !op command.

### Security Clearance Levels
Players who are granted Paradox-Op status using the !op command are assigned a security clearance level of 4. This level signifies a high degree of trust and grants the player significant administrative privileges within the server.

### !op list
The !op list command is used to display a list of all players who currently hold a security clearance level 4, this command allows administrators to quickly see who has a clearance level of 4.


> ```
> Usage: "!op <player> | !op list"
> !op Pete9xi
> ```


## !opsec
### At A Glance
The opsec command allows server administrators to change a player's security clearance level. This command is used to adjust the permissions and access rights of players, ensuring they have the appropriate level of authority within the server.

!> Required Clearance Level To Execute: 4

### Levels Of Clarence
- Level 1: Basic permissions, typically for regular players.
- Level 2: Enhanced permissions, often for moderators.
- Level 3: Advanced permissions, suitable for senior moderators or co-admins.
- Level 4: Paradox-Op status, granting full administrative privileges.

> ```
>   Usage: "!opsec <player> <clearance>"
>   examples: !opsec tim123 3
> ```


## !prefix
### At A Glance
The prefix command is used to change the prefix for commands on the server. This allows customization of the command prefix to suit the preferences of the server administrators. The maximum length for the prefix is two characters.

!> Required Clearance Level To Execute: 2

> ```
>   Usage: "!prefix [ optional ]"
>   Example: !prefix @@
>   Example: !prefix $
> ```


## !punish
### At A Glance
The punish command is used to remove items from a specified player's inventory, equipment, and/or ender chest. This command can be utilized as a disciplinary action to manage player behavior by clearing different types of storage.

!> Required Clearance Level To Execute: 4

> ```
>   Usage: "!punish <player> [ --inventory | -i ] [ --equipment | -e ] [ --enderchest | -ec ]"
>
>   Example: !punish Player Name
>   Example: !punish "Player Name" --inventory
>   Example: !punish Player Name -i
>   Example: !punish Player Name --equipment
>   Example: !punish Player Name -e
>   Example: !punish Player Name --enderchest
>   Example: !punish Player Name -ec
>   Example: !punish "Player Name" --inventory --equipment --enderchest
>   Example: !punish "Player Name" -i -e -ec
>   Example: !punish help
> ```


## !tpa
### At A Glance
The tpa command facilitates teleportation between players by allowing one player to teleport to another or vice versa. This command is useful for quickly moving players to different locations or assisting with coordination on the server. This is in place as an alternative to granting Moderators Server Op access.

!> Required Clearance Level To Execute: 3

> ```
>   Usage: "!tpa <player> <player>",
>   Example: !tpa Lucy Steve
>   Example: !tpa @Steve @Lucy
> ```


## !unban
### At A Glance
The unban command is used to lift the ban on a previously banned player, allowing them to rejoin the server. This command is essential for administrators to reverse bans that were either mistakenly applied or have since been resolved. It works by adding the player to a queue, when that player rejoins the server the ban on them will be removed.

!> Required Clearance Level To Execute: 3

> ```
>   Usage: "!unban <player>"
>   Example: !unban Steve
> ```


## !vanish
### At A Glance
The vanish command allows a player to become invisible, enabling them to monitor online players without being detected. This is a useful tool for moderators to observe player behavior discreetly.

!> Required Clearance Level To Execute: 2

### How it works
The vanish command works by changing the specified player's game mode to spectator mode, effectively making them invisible to other players.

> ```
>   Usage: "!vanish <player>"
>   Example: !vanish Pete9xi
> ```
