<img src="Media\paradox-header.png" alt="Paradox AntiCheat Logo"> </img>

!> This documentation could change with any version. So be sure to check it once in a while.

## !channels

### At A Glance

The !channels command provides players with ability to manage chat channels this allows them to create, join, invite, leave, and transfer ownership of created channels.

### How It Works

This works by managing player chat channels, including creating, joining, inviting, leaving, and transferring channel ownership. It stores channel data, with each channel having an owner and members, and dynamically updates this data. When a player uses the channel command,it processes arguments to execute the specified action. Invitations include a timeout, after which they automatically expire. The command also checks permissions and updates players on channel changes, ensuring smooth, real-time management of private chat channels.

!> Required Clearance Level To Execute: 1

> ```
> Usage: "!channel <create | join | invite | leave | transfer | help>"
> Example: !channel create --room myTeam
> Example: !channel join --room myTeam
> Example: !channel transfer --room myTeam --target Visual1mpact
> ```

## !home

### At A Glance

The !home command provides players with ability to manage locations this allows them to save, delete, and teleport to those saved locations

### How It Works

The !home command gives players a convenient way to manage personal locations within the game. With this command, players can save specific coordinates as "homes," allowing them to return to these points later. encryption library to store each player’s homes securely. The command supports several key functions: saving a new location as a home, deleting an existing home, and teleporting directly to a saved home. This feature is particularly useful for players who want quick access to frequently visited areas, such as bases, resource-rich zones, or other significant locations on the map.

?>There is currently a hard coded limit of 5 maximum homes to be saved per player.

!> Required Clearance Level To Execute: 1

> ```
> Usage: "!home <set | delete | teleport | list | help> [ homeName ]"
> Example: !home set MyHome
> Example: !home delete MyHome
> Example: !home teleport MyHome
> Example: !home list
> ```

## !invsee

### At A Glance
The invsee command allows players with the appropriate security clearance to view another player's entire inventory in the game. 

### How It Works
When a player issues the command, followed by a player name, it retrieves the specified player's inventory and displays detailed information about each item, including enchantments and item quantities, in the chat. If the player doesn't exist or the command is not executed properly, the user is informed with an error message. 

!> Required Clearance Level To Execute: 3

> ```
> Usage: "!invsee <player>"
> Example: !invsee Pte9xi
> Example: !invsee help
> ``

## !pvp

### At A Glance

The !pvp command provides players with control over Player vs. Player (PvP) settings. Users can toggle their own PvP mode, enable or disable PvP globally across the server, or check the current PvP status.

### How It Works

The PvP management system handles PvP status, cooldowns, and punishments for players who log out during PvP. It listens to events like entity hits, effects added, and player spawns or logouts. When a player attacks another, it checks if PvP is enabled, manages health adjustments to prevent unfair attacks, and starts a cooldown period preventing logout. If a player logs out during the cooldown, they are marked for punishment, which includes inventory loss. Upon rejoining, punished players receive an alert and have their inventory cleared.

!> Required Clearance Level To Execute: 4

> ```
> Usage: "!pvp [ global | status | help ]"
> Example: !pvp (disables/enables PVP for the player who executed the command)
> Example: !pvp global
> Example: !pvp status
> Example: !pvp help
> ```
> !> !pvp global command will disable PVP for the server this stops the PVP module built into Paradox. This also disables the gamerule. The owner can then re enable the PVP gamerule via the gamerule command </gamerule pvp true>
>
> !> To bypass PvP for safe zones you must give them a tag: paradoxBypassPvPCheck, Paradox provides no function to do this it is down the the owner to implement.
>
>
## !pvpCooldown
Admins can use this command to set a custom PvP action cooldown in seconds. The cooldown time can be adjusted to any value between 10 and 3600 seconds (1 hour).

> ```
> Usage: "!pvpCooldown <time in seconds>"
> Example: !pvpCooldown 30
> ```

## !pvpToggleCooldown 
Admins can use this command to set a custom cooldown for toggling PvP in seconds. This allows for adjusting how frequently players can toggle their personal PvP state, with a range between 10 and 3600 seconds.

> ```
> Usage: "!pvpToggleCooldown  <time in seconds>"
> Example: pvpToggleCooldown  30
> ```

## !setrank

### At A Glance
The `setrank` command allows you to set a player's rank within chat, reset a player's rank, or disable the rank functionality globally.

### How It Works
The command uses flags to specify the target player (`-t` or `--target`) and the rank (`-r` or `--rank`), or to reset the rank (`--reset`). Additionally, the `--disable` flag can be used to disable rank functionality for the entire server. 

When executed, it checks the provided arguments and ensures the target player exists. If a rank is specified, it updates the player's rank; if the `--reset` flag is used, it removes the player's rank. If the `--disable` flag is used, it disables the rank system entirely, but this can only be executed by users with clearance level 4. Both the command sender and the target player (if applicable) receive notifications about the rank change.

!> Required Clearance Level To Execute: 3 for setting ranks, 4 for disabling ranks globally.

> ```
> Usage: "!setrank [ -t | --target <player> ] [ -r | --rank <rank> ] [ --reset ] [ --disable ]"
> Example: setrank --target PlayerName --rank [Member]
> Example: !setrank -t PlayerName -r [Admin]
> Example: !setrank -t PlayerName --reset
> Example: !setrank --target PlayerName --reset
> Example: !setrank --disable
> ```

## !tpr

### At A Glance

The tpr command allows players to send teleport requests to other players, and to accept or deny incoming requests.

### How It Works
A player can initiate a teleport request to another player by using the command with the target player’s name. The request is stored with a timeout of 60 seconds The target player is notified about the incoming request.

The target player can accept or deny the request by responding in chat with either !tpr accept to approve it or !tpr deny to prevent the request completing this will then clear the request allowing the targeted player to receive a new request.

!> Required Clearance Level To Execute: 1

> ```
> Usage: "!tpr <player | accept | deny | help>"
> Example: !tpr Lucy
> Example: !tpr Steve
> Example: !tpr accept
> Example: !tpr deny
> ```



