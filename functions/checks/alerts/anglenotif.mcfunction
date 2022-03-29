tp @s[type=player,tag=!noBadAngle] ~~~ facing @s
scoreboard players add @s[type=player,tag=!noBadAngle] anglevl 1
execute @s[type=player,tag=!noBadAngle] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §6has failed §7(Player) §4BadPackets[1]. VL= "},{"score":{"name":"@s","objective":"anglevl"}}]}
