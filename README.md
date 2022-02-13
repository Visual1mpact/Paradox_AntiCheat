<div align="center">
<img src="https://i.imgur.com/ZS38i7c.png" border="0">
<div align="center">
  
  Paradox is based on Scythe AntiCheat and can be found [here.](https://github.com/MrDiamond64/Scythe-AntiCheat "here.")</div>
  
**Paradox exists due to some differences within Scythe so under the GPLv3 License
I have forked the project and rebranded it to fix those differences. All original commit
history pertaining to Scythe still exists within this project and is free to review.**

**Given the uproar between Scythe and UAC I found the name Paradox to be fitting for the cause.**

**Paradox:** A statement or situation that contradicts itself, opposed to common sense and yet perhaps true.
<div align="left">
  
<div align="center">
  <img src="https://www.codefactor.io/repository/github/visual1mpact/paradox_anticheat/badge/main" alt="Grade"/>
  <img src="https://img.shields.io/github/downloads/Visual1mpact/Paradox_AntiCheat/total?style=plastic&logo=appveyor" alt="Downloads"/>
  <img src="https://img.shields.io/github/commit-activity/m/Visual1mpact/Paradox_AntiCheat?style=plastic&logo=appveyor" alt="Commits Per Month"/>
  <img src="https://img.shields.io/github/last-commit/Visual1mpact/Paradox_AntiCheat?style=plastic&logo=appveyor" alt="Last Commit"/>
  <img src="https://img.shields.io/github/license/Visual1mpact/Paradox_AntiCheat?style=plastic&logo=appveyor" alt="License"/>
</div>
  
# <img src="https://i.imgur.com/5W2YXCD.png" border="0" width="150">
When applying the pack to your world make sure the addon is at the top of the behavior pack list and GameTest Framework is enabled. This is to ensure all checks and systems work properly. The versioning system for Paradox goes as follows. The first number denotes the pack version. This will rarely change unless there has been major changes to the code. The second number denotes the major revision of the pack version. These particular changes mostly involve around features being added or removed. The third number indicates the minor revision of the Pack. This evolves around bug fixes. By knowing this structure it should help understand what kind of changes have been made by knowing the version.

# <img src="https://i.imgur.com/AXWmBA3.png" border="0" width="150">
To install this anticheat to your realm/world you need to install the .mcpack, apply it to your world and enable GameTest Framework, once you have done this the anticheat should be fully up and running.

# <img src="https://i.imgur.com/a5pxx97.png" border="0" width="370">

  AutoClicker -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Max CPS check.

  AutoTotem -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Checks if a player equips a totem while moving<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(B) => Checks if a player equips a totem while using an item<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(C) => Checks if a player equips a totem while swinging their hand<br />

  BadPackets -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(1) => Checks for invalid player head rotations<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(2) => Chat message length check (Requires GameTest Framework)

  Command Block Exploit -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Clears animal buckets/beehives<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(B) => Replaces beehives with air<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(C) => Kills all command block minecarts<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(D) => Kills all NPC's (to disable use /function settings/npc)<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(E) => Instant despawn time for command block minecarts<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Scans all blocks players place for cbe and then removes them. (Requires Gametest Framework)<br />

  Crasher -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Checks if a player's position is invalid. (Requires GameTest FrameWork)<br />

  Disabler -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Detects Penguins Admin Giver by intercepting a function it runs.

  Ender Pearl Glitching -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Checks if an ender pearl is inside a climbable block.

  Fly -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Checks for creative fly while in survival.

  Illegal Items -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Clears illegal items from everybody's inventories. Stacks over 64 included. (Requires Gametest Framework)<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(B) => Clears dropped items.<br />
    
  InvalidSprint -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Checks for sprinting while having the blindness effect. (Requires GameTest FrameWork)<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(B) => Checks for sprinting while using an item.<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(C) => Checks for sprinting while sneaking.<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(D) => Checks for sprinting while using an elytra.<br />

  InventoryMods-><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(C) => Checks for using an item while having a chest open.<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(D) => Checks for attacking players while having a chest open.<br />

  Jesus -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Checks if the player is above water/lava blocks.<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(B) => Motion check. (Requires GameTest FrameWork)

  Killaura -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Checks for attacking while using an item.<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(B) => Checks for swinging hand while dead. <br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(C) => Checks for no swing. Instantly detects toolbox killaura.
  
  NameSpoof -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Checks if a player's name is longer then 16 characters. (Requires GameTest FrameWork)<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(B) => Invalid characters check. (Requires GameTest FrameWork)<br />

  NoSlow -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Checks for high movement speeds while using or eating an item. (Requires GameTest FrameWork)

  Phase -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Detect if someone moves inside a block.

  Spammer -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Checks if someone sends a message while moving. (Requires GameTest FrameWork)<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(B) => Checks if someone sends a message while swinging their hand. (Requires GameTest FrameWork)<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(C) => Checks if someone sends a message while using an item. (Requires GameTest FrameWork)<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(D) => Checks if someone sends a message while having a chest opened. (Requires GameTest FrameWork)<br />

  Reach -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Check if someone hits a player outside a 5 block radius. (Requires GameTest FrameWork)

  Xray -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Alerts staff if a player finds a diamond or ancient debris. (Requires GameTest FrameWork)
  
  Enchanted Armor -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Checks for players wearing enchanted armor.

  Anti Knockback -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Checks for knockback resistance and prevents it. (Requires GameTest FrameWork)
  
  Anti Scaffold -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Checks for scaffold by detecting block placements per second. (Requires GameTest FrameWork)

  Anti Nuker -><br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(A) => Checks for nuker by detecting block breaks per second. (Requires GameTest FrameWork)

# <img src="https://i.imgur.com/ONwNwQC.png" border="0" width="400">
To receive anti-cheat alerts use:
```/function notify``` or ```!notify```

To ban a player use:
```/execute <playername> ~~~ function ban``` or ```!ban <username>```

To freeze a player use:
```/execute <playername> ~~~ function tools/freeze``` or ```!freeze <username>```

To enter vanish use:
```/function tools/vanish``` or ```!vanish```

To be able to fly in survival mode use:
```/function tools/fly``` or ```!fly```

To view a players anticheat logs use:
```/execute <playername> ~~~ function tools/stats``` or ```!stats <username>```

To clear someones ender chest use:
```/execute <playername> ~~~ function tools/ecwipe``` or ```!ecwipe <username>```

Additionally, there are custom features you can enable like anti-gamemode change to further enhance your realm security, these options can be used by /function settings/<name>

# <img src="https://i.imgur.com/wxqdSFv.png" border="0" width="100">

Q: Does the AntiCheat auto-ban?<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;A: No.

Q: Is it customizable?<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;A: Yes using /function settings/<name> or by modifying the files
