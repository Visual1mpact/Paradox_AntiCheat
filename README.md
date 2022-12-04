<div align="center">
<img src="https://i.imgur.com/ZS38i7c.png" border="0">
<div align="center">
  Updated for 1.19.50 <br/>
  Paradox is based on Scythe AntiCheat and can be found [here.](https://github.com/MrDiamond64/Scythe-AntiCheat "here.")</div>
  
**Paradox exists due to some differences within Scythe so under the GPLv3 License
I have forked the project and rebranded it to fix those differences. All original commit
history pertaining to Scythe still exists within this project and is free to review.**

**Given the uproar between Scythe and UAC I found the name Paradox to be fitting for the cause.**

**Paradox:** A statement or situation that contradicts itself, opposed to common sense and yet perhaps true.

Check the [wiki](https://github.com/Visual1mpact/Paradox_AntiCheat/wiki).

<div align="left">
  
<div align="center">
  <img src="https://www.codefactor.io/repository/github/pete9xi/paradox_anticheat/badge/main" alt="Grade"/>
  <img src="https://img.shields.io/github/downloads/Pete9xi/Paradox_AntiCheat/total?style=plastic&logo=appveyor" alt="Downloads"/>
  <img src="https://img.shields.io/github/commit-activity/m/Pete9xi/Paradox_AntiCheat?style=plastic&logo=appveyor" alt="Commits Per Month"/>
  <img src="https://img.shields.io/github/last-commit/Pete9xi/Paradox_AntiCheat?style=plastic&logo=appveyor" alt="Last Commit"/>
  <img src="https://img.shields.io/github/license/Visual1mpact/Paradox_AntiCheat?style=plastic&logo=appveyor" alt="License"/>
</div>
  
# <img src="https://i.imgur.com/5W2YXCD.png" border="0" width="150">
When applying the pack to your world make sure the addon is at the top of the behavior pack list and GameTest Framework is enabled. This is to ensure all checks and systems work properly. The versioning system for Paradox goes as follows. The first number denotes the pack version. This will rarely change unless there has been major changes to the code. The second number denotes the major revision of the pack version. These particular changes mostly involve around features being added or removed. The third number indicates the minor revision of the Pack. This evolves around bug fixes. By knowing this structure it should help understand what kind of changes have been made by knowing the version.

# <img src="https://i.imgur.com/AXWmBA3.png" border="0" width="150">

To install this anticheat to your realm/world you need to install the .mcpack, apply it to your world and enable GameTest Framework. Once you have done this the anticheat should be fully up and running. Education Edition is required for the command `!fly <username>` to work.

To give yourself permission to use Paradox in your world you will need to edit a file inside this project called config.js. It can be located at `/scripts/data/config.js`. In this file, towards the bottom, you will find a property called `encryption` and this property will contain an additional property called `password`. You MUST fill in your password or you will NOT gain permission to use Paradox during the initial process. There will be an example provided inside the file to show you how to do it. If you are not familiar with editing files then now is the time to learn as this will be mandatory! Once you have filled in your password then you will need to take note of your password. Do not share it with anyone, unless at your own risk. Install the Anti Cheat, load your world, then enter the command `!op <password>`. This will grant you permission to use Paradox and from here you can give others permission to use paradox with the command `!op <username>`. For more information about this Anti Cheat and its options then see the command `!help`.

Paradox will kick you out if you have any illegal items in your inventory so if you think Paradox may flag you after installing then it is highly suggested to drop your entire inventory prior to activating this Anti Cheat!!!

If you reset your world for any reason then it is recommended to change `password`.
