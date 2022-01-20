#Detect armor and replace with unenchanted version
execute @s[scores={helmet=1,ench_helmet=1}] ~~~ replaceitem entity @s slot.armor.head 0 leather_helmet 1 0
execute @s[scores={helmet=2,ench_helmet=1}] ~~~ replaceitem entity @s slot.armor.head 0 chainmail_helmet 1 0
execute @s[scores={helmet=3,ench_helmet=1}] ~~~ replaceitem entity @s slot.armor.head 0 iron_helmet 1 0
execute @s[scores={helmet=4,ench_helmet=1}] ~~~ replaceitem entity @s slot.armor.head 0 golden_helmet 1 0
execute @s[scores={helmet=5,ench_helmet=1}] ~~~ replaceitem entity @s slot.armor.head 0 diamond_helmet 1 0
execute @s[scores={helmet=6,ench_helmet=1}] ~~~ replaceitem entity @s slot.armor.head 0 netherite_helmet 1 0
execute @s[scores={helmet=7,ench_helmet=1}] ~~~ replaceitem entity @s slot.armor.head 0 turtle_helmet 1 0

execute @s[scores={chest=1,ench_chest=1}] ~~~ replaceitem entity @s slot.armor.chest 0 leather_chestplate 1 0
execute @s[scores={chest=2,ench_chest=1}] ~~~ replaceitem entity @s slot.armor.chest 0 chainmail_chestplate 1 0
execute @s[scores={chest=3,ench_chest=1}] ~~~ replaceitem entity @s slot.armor.chest 0 iron_chestplate 1 0
execute @s[scores={chest=4,ench_chest=1}] ~~~ replaceitem entity @s slot.armor.chest 0 golden_chestplate 1 0
execute @s[scores={chest=5,ench_chest=1}] ~~~ replaceitem entity @s slot.armor.chest 0 diamond_chestplate 1 0
execute @s[scores={chest=6,ench_chest=1}] ~~~ replaceitem entity @s slot.armor.chest 0 netherite_chestplate 1 0
execute @s[scores={chest=7,ench_chest=1}] ~~~ replaceitem entity @s slot.armor.chest 0 elytra 1 0

execute @s[scores={leggings=1,ench_legs=1}] ~~~ replaceitem entity @s slot.armor.legs 0 leather_leggings 1 0
execute @s[scores={leggings=2,ench_legs=1}] ~~~ replaceitem entity @s slot.armor.legs 0 chainmail_leggings 1 0
execute @s[scores={leggings=3,ench_legs=1}] ~~~ replaceitem entity @s slot.armor.legs 0 iron_leggings 1 0
execute @s[scores={leggings=4,ench_legs=1}] ~~~ replaceitem entity @s slot.armor.legs 0 golden_leggings 1 0
execute @s[scores={leggings=5,ench_legs=1}] ~~~ replaceitem entity @s slot.armor.legs 0 diamond_leggings 1 0
execute @s[scores={leggings=6,ench_legs=1}] ~~~ replaceitem entity @s slot.armor.legs 0 netherite_leggings 1 0

execute @s[scores={boots=1,ench_boots=1}] ~~~ replaceitem entity @s slot.armor.feet 0 leather_boots 1 0
execute @s[scores={boots=2,ench_boots=1}] ~~~ replaceitem entity @s slot.armor.feet 0 chainmail_boots 1 0
execute @s[scores={boots=3,ench_boots=1}] ~~~ replaceitem entity @s slot.armor.feet 0 iron_boots 1 0
execute @s[scores={boots=4,ench_boots=1}] ~~~ replaceitem entity @s slot.armor.feet 0 golden_boots 1 0
execute @s[scores={boots=5,ench_boots=1}] ~~~ replaceitem entity @s slot.armor.feet 0 diamond_boots 1 0
execute @s[scores={boots=6,ench_boots=1}] ~~~ replaceitem entity @s slot.armor.feet 0 netherite_boots 1 0
 
scoreboard players add @s[type=player] armorvl 1
 
#Notify Staff
execute @s[type=player] ~~~ tellraw @a[tag=notify] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §1has failed §7(Enchantment) §4Armor/A. VL= "},{"score":{"name":"@s","objective":"armorvl"}}]}

#Notify Offenders who are not staff
tellraw @s[type=player,tag=!op] {"rawtext":[{"text":"§r§4[§6Paradox§4]§r You used enchanted armor. Violations: "},{"score":{"name": "@s","objective": "armorvl"}}]}