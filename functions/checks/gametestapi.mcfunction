# True
execute @s[type=player,scores={gametestapi=..0}] ~~~ scoreboard players set paradox:config gametestapi 1

# False
execute @s[type=player,scores={gametestapi=1..}] ~~~ scoreboard players set paradox:config gametestapi 0

scoreboard players operation @a gametestapi = paradox:config gametestapi