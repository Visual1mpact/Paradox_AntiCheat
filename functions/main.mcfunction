# Prevents disabler hacks from possibly disabling the anticheat
gamerule randomtickspeed 1

# Run all the checks
function checks/angle
function checks/others
execute @s[scores={autoaura=1..}] ~~~ function checks/killaura

# Specific criteria checks
execute @s[type=player,scores={attacks=1..,autoclicker=1..}] ~~~ function checks/autoclicker
execute @e[type=ender_pearl,r=5] ~~~ function checks/epearlglitching
execute @s[type=player,tag=moving,tag=!flying,m=!c,tag=!jump,tag=!riding,tag=!gliding,tag=!levitating,tag=!vanish,scores={jesus=1..}] ~~~ function checks/jesus
execute @s[type=player,tag=moving,tag=!gliding,tag=!riding,tag=!vanish,scores={phase=1..}] ~~~ function checks/phase

# Optional checks
execute @s[type=player,tag=!paradoxOpped,m=a,scores={gma=1..}] ~~~ function checks/optional/gamemodeA
execute @s[type=player,tag=!paradoxOpped,m=c,scores={gmc=1..}] ~~~ function checks/optional/gamemodeC
execute @s[type=player,tag=!paradoxOpped,m=s,scores={gmc=1..}] ~~~ function checks/optional/gamemodeS
execute @s[scores={commandblocks=1..}] ~~~ function checks/optional/nocommandblocks
execute @s[scores={cmds=1..}] ~~~ function checks/optional/overridecommandblocksenabled
execute @s[type=player,tag=!paradoxOpped,scores={ench_boots=1,frostwalker=1..}] ~~~ function checks/optional/frostwalkerNBT
execute @s[type=player,scores={worldborder=1..}] ~~~ function checks/optional/worldborder

# Armor system
execute @s[scores={ench_helmet=1,encharmor=1..}] ~~~ function checks/optional/armorNBT
execute @s[scores={ench_chest=1,encharmor=1..}] ~~~ function checks/optional/armorNBT
execute @s[scores={ench_legs=1,encharmor=1..}] ~~~ function checks/optional/armorNBT
execute @s[scores={ench_boots=1,encharmor=1..}] ~~~ function checks/optional/armorNBT

#Anti-KB
event entity @s[tag=attacked,scores={atcd=12..,antikb=1..}] paradox:reset_mark_variant
tag @s[tag=attacked,scores={atcd=12..,antikb=1..}] remove attacked
scoreboard players add @s[tag=attacked,scores={antikb=1..}] atcd 1
