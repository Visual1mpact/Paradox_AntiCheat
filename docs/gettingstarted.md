![Paradox AntiCheat Logo](Media/paradox-header.png)

# Required Experimental Flags

Paradox requires certain experimental features to be enabled in your world:

* **Scripting API**

![ScriptingAPI](Media/BetaAPI_Setting.PNG)

Make sure these are enabled in your world settings before loading Paradox.

---

# Granting OP Access

All security and OP management is handled **in-game** via the `!op` command.

### How it Works

* The first player to run `!op` in the world automatically becomes the **host**.
* The host has full security clearance (**level 4**) and can grant OP to other players.
* Use the following command in chat:

```
!op
```

* Running `!op` without arguments grants OP if you are the first player (host).
* Running `!op <playerName>` grants OP to another player.
* Running `!op list` displays all players with OP (security clearance level 4) along with the host.

**Example Commands:**

```
!op
!op Alice
!op "Player Name"
!op list
```

All OP grants are tracked automatically.

---

# Security Clearance Levels

* Level 4: Highest clearance, can manage OP and modules.
* Players granted OP by the host are automatically given level 4 clearance.
* Only players with level 4 clearance or the host can grant OP.

---

# Next Steps

Once Paradox is loaded and OP is assigned:

* Check available commands in chat:

```
!help
```

* Enable the modules you want to use for your world.
* Paradox is now fully running and ready to monitor and manage your world.
