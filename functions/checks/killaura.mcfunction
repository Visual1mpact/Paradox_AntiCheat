#Places a fake entity behind the player and see if they will hit the entity
#Summons the killaura detector entity every 4 min
scoreboard players add @s[scores={aura_timer=..2400}] aura_timer 1
execute @s[scores={aura_timer=2400..}] ~~~ summon paradox:killaura ^ ^ ^-3
execute @s[scores={aura_timer=2400..}] ~~~ scoreboard players set @s aura_timer 0