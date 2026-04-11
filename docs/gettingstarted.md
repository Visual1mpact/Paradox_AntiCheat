![Paradox AntiCheat Logo](Media/paradox-header.png)

# Required Experimental Flags

Paradox requires certain experimental features to be enabled in your world:

* **Scripting API**

![ScriptingAPI](Media/BetaAPI_Setting.PNG)

Make sure these are enabled in your world settings before loading Paradox.

---

# OP & Security Clearance Overview

Paradox uses a two-layer administrative system to manage permissions:

1. **OP (Level 4)** – The highest clearance, required for critical management tasks.
2. **Security Clearance Levels (1–4)** – Define access to commands and modules.

All OP and clearance changes are handled **in-game** via the `!op` and `!opsec` commands. Changes are persistent and tracked automatically.

---

## OP (Level 4)

Level 4 is the **highest security clearance**. It allows full management of Paradox modules and the ability to grant OP to other players.

### How OP Works

1. **Host Initialization**

   * If no host exists, any player with **server operator privileges** (BDS operator, Realm host, LAN host) can initialize the host by running:

   ```
   !op
   ```

   * The player becomes the **host** and is automatically granted **Level 4 clearance**.
   * Host information is saved in the world’s dynamic properties for persistence.

2. **Granting OP to Other Players**

   * Only the **host** can grant Level 4 clearance to others.
   * Use:

   ```
   !op <playerName>
   ```

   * The target player is granted Level 4 clearance and receives a notification.

3. **Listing OP Players**

   * Any Level 4 user can view all Level 4 players, including the host:

   ```
   !op list
   ```

### Example Commands

```
!op
!op Alice
!op "Player Name"
!op list
```

---

## Security Clearance Levels

Paradox defines access through **Level 1–4 security clearances**:

<div class="clearance-matrix">
  <div class="clearance-level">
    <span class="level-num">4</span>
    <h4>Paradox OP</h4>
    <p>Full system access. Manage all modules, grant OP, and modify identity records.</p>
  </div>
  <div class="clearance-level">
    <span class="level-num">3</span>
    <h4>Administrator</h4>
    <p>High-level moderation. Access to bans, unbans, and advanced forensic tools.</p>
  </div>
  <div class="clearance-level">
    <span class="level-num">2</span>
    <h4>Moderator</h4>
    <p>Standard field operations. Access to vanish, muting, and basic player tracking.</p>
  </div>
  <div class="clearance-level">
    <span class="level-num">1</span>
    <h4>Member</h4>
    <p>Default access. Use channels, teleport requests, and view project info.</p>
  </div>
</div>

### Changing Clearance Levels

* Use the `!opsec` command to change Levels 1–3:

```
!opsec <playerName> <clearanceLevel>
```

* **Restrictions:**

  * Level 4 cannot be assigned via `!opsec`. Only the `!op` command can assign Level 4.
  * Only Level 4 users (host or OP) can run `!opsec`.

### Example Commands

```
!opsec Bob 3
!opsec "Player Name" 2
```

---

## Important Notes

* **Host Authority:** Only the host can grant Level 4 to other players.
* **Persistence:** All OP and clearance changes are saved automatically in world properties.
* **Notifications:** Players are notified whenever their security clearance changes.
* **No first-player limitation:** OP assignment no longer depends on being the first player; it depends on server operator privileges for initialization.

---

## Next Steps

Once the host and OP are assigned:

* Check available commands:

```
!help
```

* Configure and enable Paradox modules for your world.
* Paradox is now fully running and ready to monitor and manage your world.
