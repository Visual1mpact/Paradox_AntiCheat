# Prevents disabler hacks from possibly disabling the anticheat
gamerule randomtickspeed 1

# Run all the checks
function checks/others

# Optional checks
execute as @s[scores={commandblocks=1..}] at @s run function checks/optional/nocommandblocks
execute as @s[scores={cmds=1..}] at @s run /function checks/optional/overridecommandblocksenabled

# Armor system
execute as @s[scores={ench_helmet=1,encharmor=1..}] at @s run /function checks/optional/armorNBT
execute as @s[scores={ench_chest=1,encharmor=1..}] at @s run /function checks/optional/armorNBT
execute as @s[scores={ench_legs=1,encharmor=1..}] at @s run /function checks/optional/armorNBT
execute as @s[scores={ench_boots=1,encharmor=1..}] at @s run /function checks/optional/armorNBT
