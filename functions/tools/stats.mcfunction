# Gets all Paradox statistics on a user

tellraw @a[tag=notify] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r Getting all Paradox Logs from: "},{"selector":"@s"}]}
execute @s[m=c] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is in Creative Mode"}]}
execute @s[m=s] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is in Survival Mode"}]}
execute @s[m=a] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is in Adventure Mode"}]}
tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is currently at X= "},{"score":{"name":"@s","objective":"xPos"}},{"text":", Y= "},{"score":{"name":"@s","objective":"yPos"}},{"text":", Z= "},{"score":{"name":"@s","objective":"zPos"}}]}

execute @s[scores={autoclickervl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"autoclickervl"}},{"text":" AutoClicker Violations"}]}
execute @s[scores={anglevl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"anglevl"}},{"text":" BadPackets[1] Violations"}]}
execute @s[scores={badpackets2=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"badpackets2"}},{"text":" BadPackets[2] Violations"}]}
execute @s[scores={killauravl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"killauravl"}},{"text":" KillAura Violations"}]}
execute @s[scores={phasevl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"phasevl"}},{"text":" Phase Violations"}]}
execute @s[scores={flyvl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"flyvl"}},{"text":" Fly Violations"}]}
execute @s[scores={illegalitemsvl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"illegalitemsvl"}},{"text":" Illegal Items Violations"}]}
execute @s[scores={jesusvl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"jesusvl"}},{"text":" Jesus Violations"}]}
execute @s[scores={epearlGlitch=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"epearlGlitch"}},{"text":" Ender Pearl Violations"}]}
execute @s[scores={interactusevl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"interactusevl"}},{"text":" Killaura/A Violations"}]}
execute @s[scores={cbevl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"cbevl"}},{"text":" Command Block Exploit Violations"}]}
execute @s[scores={gamemodevl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"gamemodevl"}},{"text":" Gamemode Change Violations"}]}
execute @s[scores={autototemvl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"autototemvl"}},{"text":" AutoTotem Violations"}]}
execute @s[scores={spammervl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"spammervl"}},{"text":" Spammer Violations"}]}
execute @s[scores={namespoofvl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"namespoofvl"}},{"text":" NameSpoof Violations"}]}
execute @s[scores={crashervl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"crashervl"}},{"text":" Crasher Violations"}]}
execute @s[scores={reachvl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"reachvl"}},{"text":" Reach Violations"}]}
execute @s[scores={invmovevl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"invmovevl"}},{"text":" InventoryMods Violations"}]}
execute @s[scores={noslowvl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"noslowvl"}},{"text":" NoSlow Violations"}]}
execute @s[scores={invalidsprintvl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"invalidsprintvl"}},{"text":" InvalidSprint Violations"}]}
execute @s[scores={ench_helmet=0}] ~ ~ ~ tellraw @a[tag=notify] {"rawtext":[{"text":"Helmet: §cUnenchanted"}]}
execute @s[scores={ench_helmet=1}] ~ ~ ~ tellraw @a[tag=notify] {"rawtext":[{"text":"Helmet: §2Enchanted"}]}
execute @s[scores={ench_chest=0}] ~ ~ ~ tellraw @a[tag=notify] {"rawtext":[{"text":"Chestplate: §cUnenchanted"}]}
execute @s[scores={ench_chest=1}] ~ ~ ~ tellraw @a[tag=notify] {"rawtext":[{"text":"Chestplate: §2Enchanted"}]}
execute @s[scores={ench_legs=0}] ~ ~ ~ tellraw @a[tag=notify] {"rawtext":[{"text":"Leggings: §cUnenchanted"}]}
execute @s[scores={ench_legs=1}] ~ ~ ~ tellraw @a[tag=notify] {"rawtext":[{"text":"Leggings: §2Enchanted"}]}
execute @s[scores={ench_boots=0}] ~ ~ ~ tellraw @a[tag=notify] {"rawtext":[{"text":"Boots: §cUnenchanted"}]}
execute @s[scores={ench_boots=1}] ~ ~ ~ tellraw @a[tag=notify] {"rawtext":[{"text":"Boots: §2Enchanted"}]}


execute @s[tag=freeze] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is currently frozen by a staff member"}]}
execute @s[tag=vanish] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is currently in vanish"}]}
execute @s[tag=flying] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has fly mode enabled"}]}

tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"\n§߈§r§4[§6Paradox§4]§r "},{"text":" ----- DEBUG STATS -----"}]}

execute @s[tag=ground] ~~~ tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"\n§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" onGround: §6true"}]}
execute @s[tag=jump] ~~~ tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" isJumping: §6true"}]}
execute @s[tag=sneak] ~~~ tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" isSneaking: §6true"}]}
execute @s[tag=gliding] ~~~ tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" isGliding: §6true"}]}
execute @s[tag=levitating] ~~~ tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" isLevitating: §6true"}]}
execute @s[tag=riding] ~~~ tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" isRiding: §6true"}]}
execute @s[tag=left] ~~~ tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" isSwinging: §6true"}]}
execute @s[tag=right] ~~~ tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" isUsing: §6true"}]}
execute @s[tag=moving] ~~~ tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" isMoving: §6true"}]}
execute @s[tag=hasGUIopen] ~~~ tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" hasGUIopen: §6true"}]}
execute @s[tag=sprint] ~~~ tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" isSprinting: §6true"}]}
