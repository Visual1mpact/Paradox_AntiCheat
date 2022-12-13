tellraw @a[tag=notify] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r Getting all Paradox Logs from: "},{"selector":"@s"}]}
execute as @s[m=c] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is in Creative Mode"}]}
execute as @s[m=s] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is in Survival Mode"}]}
execute as @s[m=a] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is in Adventure Mode"}]}
tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is currently at X= "},{"score":{"name":"@s","objective":"xPos"}},{"text":", Y= "},{"score":{"name":"@s","objective":"yPos"}},{"text":", Z= "},{"score":{"name":"@s","objective":"zPos"}}]}

execute as @s[scores={autoclickervl=1..}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"autoclickervl"}},{"text":" AutoClicker Violations"}]}
execute as @s[scores={badpacketsvl=1..}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"badpacketsvl"}},{"text":" BadPackets[1] Violations"}]}
execute as @s[scores={killauravl=1..}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"killauravl"}},{"text":" KillAura Violations"}]}
execute as @s[scores={flyvl=1..}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"flyvl"}},{"text":" Fly Violations"}]}
execute as @s[scores={illegalitemsvl=1..}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"illegalitemsvl"}},{"text":" Illegal Items Violations"}]}
execute as @s[scores={interactusevl=1..}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"interactusevl"}},{"text":" Killaura/A Violations"}]}
execute as @s[scores={cbevl=1..}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"cbevl"}},{"text":" Command Block Exploit Violations"}]}
execute as @s[scores={gamemodevl=1..}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"gamemodevl"}},{"text":" Gamemode Change Violations"}]}
execute as @s[scores={autototemvl=1..}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"autototemvl"}},{"text":" AutoTotem Violations"}]}
execute as @s[scores={spammervl=1..}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"spammervl"}},{"text":" Spammer Violations"}]}
execute as @s[scores={namespoofvl=1..}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"namespoofvl"}},{"text":" NameSpoof Violations"}]}
execute as @s[scores={crashervl=1..}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"crashervl"}},{"text":" Crasher Violations"}]}
execute as @s[scores={reachvl=1..}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"reachvl"}},{"text":" Reach Violations"}]}
execute as @s[scores={invmovevl=1..}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"invmovevl"}},{"text":" InventoryMods Violations"}]}
execute as @s[scores={noslowvl=1..}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"noslowvl"}},{"text":" NoSlow Violations"}]}
execute as @s[scores={invalidsprintvl=1..}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"invalidsprintvl"}},{"text":" InvalidSprint Violations"}]}
execute as @s[scores={armorvl=1..}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"armorvl"}},{"text":" Enchanted Armor Violations"}]}
execute as @s[scores={antikbvl=1..}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has "},{"score":{"name":"@s","objective":"antikbvl"}},{"text":" Anti Knockback Violations"}]}

execute as @s[scores={ench_helmet=0,detect_helmet=1}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §4Unenchanted§r"},{"text":" §7Leather"}]}
execute as @s[scores={ench_helmet=1,detect_helmet=1}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §aEnchanted§r"},{"text":" §7Leather"}]}
execute as @s[scores={ench_helmet=0,detect_helmet=2}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §4Unenchanted§r"},{"text":" §fChain"}]}
execute as @s[scores={ench_helmet=1,detect_helmet=2}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §aEnchanted§r"},{"text":" §fChain"}]}
execute as @s[scores={ench_helmet=0,detect_helmet=3}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §4Unenchanted§r"},{"text":" §fIron"}]}
execute as @s[scores={ench_helmet=1,detect_helmet=3}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §aEnchanted§r"},{"text":" §fIron"}]}
execute as @s[scores={ench_helmet=0,detect_helmet=4}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §4Unenchanted§r"},{"text":" §6Gold"}]}
execute as @s[scores={ench_helmet=1,detect_helmet=4}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §aEnchanted§r"},{"text":" §6Gold"}]}
execute as @s[scores={ench_helmet=0,detect_helmet=5}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §4Unenchanted§r"},{"text":" §bDiamond"}]}
execute as @s[scores={ench_helmet=1,detect_helmet=5}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §aEnchanted§r"},{"text":" §bDiamond"}]}
execute as @s[scores={ench_helmet=0,detect_helmet=6}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §4Unenchanted§r"},{"text":" §8Netherite"}]}
execute as @s[scores={ench_helmet=1,detect_helmet=6}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §aEnchanted§r"},{"text":" §8Netherite"}]}
execute as @s[scores={ench_helmet=0,detect_helmet=7}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §4Unenchanted§r"},{"text":" §2Turtle Shell"}]}
execute as @s[scores={ench_helmet=1,detect_helmet=7}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Helmet: §aEnchanted§r"},{"text":" §2Turtle Shell"}]}

execute as @s[scores={ench_chest=0,detect_chest=1}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §4Unenchanted§r"},{"text":" §7Leather"}]}
execute as @s[scores={ench_chest=1,detect_chest=1}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §aEnchanted§r"},{"text":" §7Leather"}]}
execute as @s[scores={ench_chest=0,detect_chest=2}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §4Unenchanted§r"},{"text":" §fChain"}]}
execute as @s[scores={ench_chest=1,detect_chest=2}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §aEnchanted§r"},{"text":" §fChain"}]}
execute as @s[scores={ench_chest=0,detect_chest=3}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §4Unenchanted§r"},{"text":" §fIron"}]}
execute as @s[scores={ench_chest=1,detect_chest=3}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §aEnchanted§r"},{"text":" §fIron"}]}
execute as @s[scores={ench_chest=0,detect_chest=4}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §4Unenchanted§r"},{"text":" §6Gold"}]}
execute as @s[scores={ench_chest=1,detect_chest=4}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §aEnchanted§r"},{"text":" §6Gold"}]}
execute as @s[scores={ench_chest=0,detect_chest=5}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §4Unenchanted§r"},{"text":" §bDiamond"}]}
execute as @s[scores={ench_chest=1,detect_chest=5}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §aEnchanted§r"},{"text":" §bDiamond"}]}
execute as @s[scores={ench_chest=0,detect_chest=6}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §4Unenchanted§r"},{"text":" §8Netherite"}]}
execute as @s[scores={ench_chest=1,detect_chest=6}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §aEnchanted§r"},{"text":" §8Netherite"}]}
execute as @s[scores={ench_chest=0,detect_chest=7}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §4Unenchanted§r"},{"text":" §7Elytra"}]}
execute as @s[scores={ench_chest=1,detect_chest=7}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Chestplate: §aEnchanted§r"},{"text":" §7Elytra"}]}

execute as @s[scores={ench_legs=0,detect_leggings=1}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §4Unenchanted§r"},{"text":" §7Leather"}]}
execute as @s[scores={ench_legs=1,detect_leggings=1}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §aEnchanted§r"},{"text":" §7Leather"}]}
execute as @s[scores={ench_legs=0,detect_leggings=2}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §4Unenchanted§r"},{"text":" §fChain"}]}
execute as @s[scores={ench_legs=1,detect_leggings=2}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §aEnchanted§r"},{"text":" §fChain"}]}
execute as @s[scores={ench_legs=0,detect_leggings=3}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §4Unenchanted§r"},{"text":" §fIron"}]}
execute as @s[scores={ench_legs=1,detect_leggings=3}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §aEnchanted§r"},{"text":" §fIron"}]}
execute as @s[scores={ench_legs=0,detect_leggings=4}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §4Unenchanted§r"},{"text":" §6Gold"}]}
execute as @s[scores={ench_legs=1,detect_leggings=4}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §aEnchanted§r"},{"text":" §6Gold"}]}
execute as @s[scores={ench_legs=0,detect_leggings=5}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §4Unenchanted§r"},{"text":" §bDiamond"}]}
execute as @s[scores={ench_legs=1,detect_leggings=5}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §aEnchanted§r"},{"text":" §bDiamond"}]}
execute as @s[scores={ench_legs=0,detect_leggings=6}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §4Unenchanted§r"},{"text":" §8Netherite"}]}
execute as @s[scores={ench_legs=1,detect_leggings=6}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Leggings: §aEnchanted§r"},{"text":" §8Netherite"}]}

execute as @s[scores={ench_boots=0,detect_boots=1}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §4Unenchanted§r"},{"text":" §7Leather"}]}
execute as @s[scores={ench_boots=1,detect_boots=1}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §aEnchanted§r"},{"text":" §7Leather"}]}
execute as @s[scores={ench_boots=0,detect_boots=2}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §4Unenchanted§r"},{"text":" §fChain"}]}
execute as @s[scores={ench_boots=1,detect_boots=2}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §aEnchanted§r"},{"text":" §fChain"}]}
execute as @s[scores={ench_boots=0,detect_boots=3}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §4Unenchanted§r"},{"text":" §fIron"}]}
execute as @s[scores={ench_boots=1,detect_boots=3}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §aEnchanted§r"},{"text":" §fIron"}]}
execute as @s[scores={ench_boots=0,detect_boots=4}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §4Unenchanted§r"},{"text":" §6Gold"}]}
execute as @s[scores={ench_boots=1,detect_boots=4}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §aEnchanted§r"},{"text":" §6Gold"}]}
execute as @s[scores={ench_boots=0,detect_boots=5}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §4Unenchanted§r"},{"text":" §bDiamond"}]}
execute as @s[scores={ench_boots=1,detect_boots=5}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §aEnchanted§r"},{"text":" §bDiamond"}]}
execute as @s[scores={ench_boots=0,detect_boots=6}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §4Unenchanted§r"},{"text":" §8Netherite"}]}
execute as @s[scores={ench_boots=1,detect_boots=6}] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"text":"Boots: §aEnchanted§r"},{"text":" §8Netherite"}]}

execute as @s[tag=freeze] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is currently frozen by a staff member"}]}
execute as @s[tag=vanish] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is currently in vanish"}]}
execute as @s[tag=flying] at @s run tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has fly mode enabled"}]}

tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"\n§߈§r§4[§6Paradox§4]§r "},{"text":" ----- DEBUG STATS -----"}]}

execute as @s[tag=ground] at @s run tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"\n§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" onGround: §6true"}]}
execute as @s[tag=jump] at @s run tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" isJumping: §6true"}]}
execute as @s[tag=sneak] at @s run tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" isSneaking: §6true"}]}
execute as @s[tag=gliding] at @s run tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" isGliding: §6true"}]}
execute as @s[tag=levitating] at @s run tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" isLevitating: §6true"}]}
execute as @s[tag=riding] at @s run tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" isRiding: §6true"}]}
execute as @s[tag=left] at @s run tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" isSwinging: §6true"}]}
execute as @s[tag=right] at @s run tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" isUsing: §6true"}]}
execute as @s[tag=moving] at @s run tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" isMoving: §6true"}]}
execute as @s[tag=hasGUIopen] at @s run tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" hasGUIopen: §6true"}]}
execute as @s[tag=sprint] at @s run tellraw @a[tag=notify,tag=debug] {"rawtext":[{"text":"§߈§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" isSprinting: §6true"}]}
