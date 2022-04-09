tellraw @a[tag=notify] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r Getting all Paradox Logs from: "},{"selector":"@s"}]}
execute @s[m=c] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is in Creative Mode"}]}
execute @s[m=s] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is in Survival Mode"}]}
execute @s[m=a] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is in Adventure Mode"}]}
tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is currently at X= "},{"score":{"name":"@s","objective":"xPos"}},{"text":", Y= "},{"score":{"name":"@s","objective":"yPos"}},{"text":", Z= "},{"score":{"name":"@s","objective":"zPos"}}]}

execute @s[scores={autoclickervl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"autoclickervl"}},{"text":" AutoClicker Violations"}]}
execute @s[scores={badpacketsvl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"badpacketsvl"}},{"text":" BadPackets[1] Violations"}]}
execute @s[scores={killauravl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"killauravl"}},{"text":" KillAura Violations"}]}
execute @s[scores={flyvl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"flyvl"}},{"text":" Fly Violations"}]}
execute @s[scores={illegalitemsvl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"illegalitemsvl"}},{"text":" Illegal Items Violations"}]}
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
execute @s[scores={armorvl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"armorvl"}},{"text":" Enchanted Armor Violations"}]}
execute @s[scores={antikbvl=1..}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"antikbvl"}},{"text":" Anti Knockback Violations"}]}

execute @s[scores={ench_helmet=0,detect_helmet=1}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §4Unenchanted§r"},{"text":" §7Leather"}]}
execute @s[scores={ench_helmet=1,detect_helmet=1}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §aEnchanted§r"},{"text":" §7Leather"}]}
execute @s[scores={ench_helmet=0,detect_helmet=2}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §4Unenchanted§r"},{"text":" §fChain"}]}
execute @s[scores={ench_helmet=1,detect_helmet=2}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §aEnchanted§r"},{"text":" §fChain"}]}
execute @s[scores={ench_helmet=0,detect_helmet=3}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §4Unenchanted§r"},{"text":" §fIron"}]}
execute @s[scores={ench_helmet=1,detect_helmet=3}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §aEnchanted§r"},{"text":" §fIron"}]}
execute @s[scores={ench_helmet=0,detect_helmet=4}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §4Unenchanted§r"},{"text":" §6Gold"}]}
execute @s[scores={ench_helmet=1,detect_helmet=4}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §aEnchanted§r"},{"text":" §6Gold"}]}
execute @s[scores={ench_helmet=0,detect_helmet=5}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §4Unenchanted§r"},{"text":" §bDiamond"}]}
execute @s[scores={ench_helmet=1,detect_helmet=5}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §aEnchanted§r"},{"text":" §bDiamond"}]}
execute @s[scores={ench_helmet=0,detect_helmet=6}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §4Unenchanted§r"},{"text":" §8Netherite"}]}
execute @s[scores={ench_helmet=1,detect_helmet=6}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §aEnchanted§r"},{"text":" §8Netherite"}]}
execute @s[scores={ench_helmet=0,detect_helmet=7}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §4Unenchanted§r"},{"text":" §2Turtle Shell"}]}
execute @s[scores={ench_helmet=1,detect_helmet=7}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §aEnchanted§r"},{"text":" §2Turtle Shell"}]}

execute @s[scores={ench_chest=0,detect_chest=1}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §4Unenchanted§r"},{"text":" §7Leather"}]}
execute @s[scores={ench_chest=1,detect_chest=1}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §aEnchanted§r"},{"text":" §7Leather"}]}
execute @s[scores={ench_chest=0,detect_chest=2}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §4Unenchanted§r"},{"text":" §fChain"}]}
execute @s[scores={ench_chest=1,detect_chest=2}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §aEnchanted§r"},{"text":" §fChain"}]}
execute @s[scores={ench_chest=0,detect_chest=3}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §4Unenchanted§r"},{"text":" §fIron"}]}
execute @s[scores={ench_chest=1,detect_chest=3}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §aEnchanted§r"},{"text":" §fIron"}]}
execute @s[scores={ench_chest=0,detect_chest=4}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §4Unenchanted§r"},{"text":" §6Gold"}]}
execute @s[scores={ench_chest=1,detect_chest=4}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §aEnchanted§r"},{"text":" §6Gold"}]}
execute @s[scores={ench_chest=0,detect_chest=5}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §4Unenchanted§r"},{"text":" §bDiamond"}]}
execute @s[scores={ench_chest=1,detect_chest=5}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §aEnchanted§r"},{"text":" §bDiamond"}]}
execute @s[scores={ench_chest=0,detect_chest=6}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §4Unenchanted§r"},{"text":" §8Netherite"}]}
execute @s[scores={ench_chest=1,detect_chest=6}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §aEnchanted§r"},{"text":" §8Netherite"}]}
execute @s[scores={ench_chest=0,detect_chest=7}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §4Unenchanted§r"},{"text":" §7Elytra"}]}
execute @s[scores={ench_chest=1,detect_chest=7}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §aEnchanted§r"},{"text":" §7Elytra"}]}

execute @s[scores={ench_legs=0,detect_leggings=1}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §4Unenchanted§r"},{"text":" §7Leather"}]}
execute @s[scores={ench_legs=1,detect_leggings=1}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §aEnchanted§r"},{"text":" §7Leather"}]}
execute @s[scores={ench_legs=0,detect_leggings=2}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §4Unenchanted§r"},{"text":" §fChain"}]}
execute @s[scores={ench_legs=1,detect_leggings=2}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §aEnchanted§r"},{"text":" §fChain"}]}
execute @s[scores={ench_legs=0,detect_leggings=3}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §4Unenchanted§r"},{"text":" §fIron"}]}
execute @s[scores={ench_legs=1,detect_leggings=3}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §aEnchanted§r"},{"text":" §fIron"}]}
execute @s[scores={ench_legs=0,detect_leggings=4}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §4Unenchanted§r"},{"text":" §6Gold"}]}
execute @s[scores={ench_legs=1,detect_leggings=4}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §aEnchanted§r"},{"text":" §6Gold"}]}
execute @s[scores={ench_legs=0,detect_leggings=5}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §4Unenchanted§r"},{"text":" §bDiamond"}]}
execute @s[scores={ench_legs=1,detect_leggings=5}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §aEnchanted§r"},{"text":" §bDiamond"}]}
execute @s[scores={ench_legs=0,detect_leggings=6}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §4Unenchanted§r"},{"text":" §8Netherite"}]}
execute @s[scores={ench_legs=1,detect_leggings=6}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §aEnchanted§r"},{"text":" §8Netherite"}]}

execute @s[scores={ench_boots=0,detect_boots=1}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §4Unenchanted§r"},{"text":" §7Leather"}]}
execute @s[scores={ench_boots=1,detect_boots=1}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §aEnchanted§r"},{"text":" §7Leather"}]}
execute @s[scores={ench_boots=0,detect_boots=2}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §4Unenchanted§r"},{"text":" §fChain"}]}
execute @s[scores={ench_boots=1,detect_boots=2}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §aEnchanted§r"},{"text":" §fChain"}]}
execute @s[scores={ench_boots=0,detect_boots=3}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §4Unenchanted§r"},{"text":" §fIron"}]}
execute @s[scores={ench_boots=1,detect_boots=3}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §aEnchanted§r"},{"text":" §fIron"}]}
execute @s[scores={ench_boots=0,detect_boots=4}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §4Unenchanted§r"},{"text":" §6Gold"}]}
execute @s[scores={ench_boots=1,detect_boots=4}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §aEnchanted§r"},{"text":" §6Gold"}]}
execute @s[scores={ench_boots=0,detect_boots=5}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §4Unenchanted§r"},{"text":" §bDiamond"}]}
execute @s[scores={ench_boots=1,detect_boots=5}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §aEnchanted§r"},{"text":" §bDiamond"}]}
execute @s[scores={ench_boots=0,detect_boots=6}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §4Unenchanted§r"},{"text":" §8Netherite"}]}
execute @s[scores={ench_boots=1,detect_boots=6}] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §aEnchanted§r"},{"text":" §8Netherite"}]}

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
