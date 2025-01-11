<img src="Media\paradox-header.png" alt="Paradox AntiCheat Logo"> </img>

!> This documentation could change with any version. Be sure to check it periodically.

## !channels
### At A Glance
The `!channels` command provides players with the ability to manage chat channels, allowing them to create, join, invite, leave, and transfer ownership of channels.

### How It Works
This command manages player chat channels, including creation, joining, invitations, leaving, and transferring ownership. Channel data is stored, with each channel having an owner and members, and is dynamically updated. The command processes arguments to execute the specified action. Invitations include a timeout and automatically expire. Permissions are checked, and players are updated on any changes to channels, ensuring smooth management of private chat channels.

!> Required Clearance Level To Execute: `1`

> ```
> Usage: "!channel <create | join | invite | leave | transfer | help>"
> Example: !channel create --room myTeam
> Example: !channel join --room myTeam
> Example: !channel transfer --room myTeam --target Visual1mpact
> ```

## !home
### At A Glance
The `!home` command allows players to manage locations, enabling them to save, delete, and teleport to saved locations.

### How It Works
The `!home` command provides players with a way to manage personal locations within the game. Players can save specific coordinates as "homes" for later teleportation. Encryption is used to securely store each player's homes. The command supports saving a new home, deleting an existing one, and teleporting directly to a saved home. This feature is useful for accessing frequently visited areas, such as bases or resource-rich zones.

?> There is currently a hard-coded limit of `5` maximum homes that can be saved per player.

!> Required Clearance Level To Execute: `1`

> ```
> Usage: "!home <set | delete | teleport | list | help> [ homeName ]"
> Example: !home set MyHome
> Example: !home delete MyHome
> Example: !home teleport MyHome
> Example: !home list
> ```

## !invsee
### At A Glance
The `!invsee` command allows players with the appropriate security clearance to view another player's entire inventory in the game.

### How It Works
When a player issues the command, followed by a player name, it retrieves and displays detailed information about that player's inventory, including item enchantments and quantities. If the player doesn’t exist or the command isn’t executed properly, an error message is displayed.

!> Required Clearance Level To Execute: `3`

> ```
> Usage: "!invsee <player>"
> Example: !invsee Pte9xi
> Example: !invsee help
> ```

## !pvp
### At A Glance
The `!pvp` command provides players with control over Player vs. Player (PvP) settings. Players can toggle their own PvP mode, enable or disable PvP globally, or check the current PvP status.

### How It Works
The PvP system manages status, cooldowns, and penalties for players who log out during PvP. Events such as entity hits, added effects, and player spawns/logouts are monitored. When a player attacks, PvP status is checked, health adjustments are made to prevent unfair attacks, and cooldowns prevent logging out. Players who log out during cooldowns are penalized, which includes inventory loss. When they rejoin, they are alerted and their inventory is cleared.

!> Required Clearance Level To Execute: `4`

> ```
> Usage: "!pvp [ global | status | help ]"
> Example: !pvp (disables/enables PvP for the player who executed the command)
> Example: !pvp global
> Example: !pvp status
> Example: !pvp help
> ```

!> The `!pvp global` command disables PvP for the server, halting the built-in PvP module in Paradox. It also disables the gamerule. The owner can re-enable PvP via the gamerule command </gamerule pvp true>

!> To bypass PvP for safe zones, you must assign players a tag: `paradoxBypassPvPCheck`. Paradox does not provide this function; it is up to the owner to implement it.

## !pvpCooldown
### At A Glance
Admins can use this command to set a custom PvP action cooldown in seconds. The cooldown time can range from `10` to `3600` seconds (1 hour).

> ```
> Usage: "!pvpCooldown <time in seconds>"
> Example: !pvpCooldown 30
> ```

## !pvpToggleCooldown
### At A Glance
Admins can use this command to set a custom cooldown for toggling PvP in seconds. This allows adjustments for how frequently players can toggle their personal PvP state, with a range between `10` and `3600` seconds.

> ```
> Usage: "!pvpToggleCooldown <time in seconds>"
> Example: pvpToggleCooldown 30
> ```

## !setrank
### At A Glance
The `setrank` command allows you to set a player's rank within chat, reset a player's rank, or disable the rank functionality globally.

### How It Works
The command uses flags to specify the target player (`-t` or `--target`) and the rank (`-r` or `--rank`), or to reset the rank (`--reset`). Additionally, the `--disable` flag can disable rank functionality for the entire server.

When executed, the command verifies the provided arguments and ensures the target player exists. If a rank is specified, it updates the player's rank; if the `--reset` flag is used, it removes the player's rank. The `--disable` flag disables the rank system globally, but it can only be executed by users with clearance level `4`. Both the command sender and the target player (if applicable) receive notifications about the rank change.

!> Required Clearance Level To Execute: `3` for setting ranks, `4` for disabling ranks globally.

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
The `!tpr` command allows players to send teleport requests to other players and to accept or deny incoming requests.

### How It Works
A player can initiate a teleport request to another player by using the command with the target player's name. The request is stored with a timeout of `60` seconds. The target player is notified about the incoming request.

The target player can accept or deny the request by responding in chat with either `!tpr accept` or `!tpr deny`. Denying the request clears it and allows the target player to receive a new request.

!> Required Clearance Level To Execute: `1`

> ```
> Usage: "!tpr <player | accept | deny | help>"
> Example: !tpr Lucy
> Example: !tpr Steve
> Example: !tpr accept
> Example: !tpr deny
> ```
