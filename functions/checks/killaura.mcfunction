#Places a fake entity behind the player and see if they will hit the entity
#Summons the killaura detector entity every 4 min
scoreboard players add @s[scores={aura_timer=..2400}] aura_timer 1
execute as @s[scores={aura_timer=2400..}] at @s run summon paradox:killaura ^ ^ ^-3
execute as @s[scores={aura_timer=2400..}] at @s run scoreboard players set @s aura_timer 0