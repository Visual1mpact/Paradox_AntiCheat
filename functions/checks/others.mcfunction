# other stuff

scoreboard players add @s[tag=right] right 1
scoreboard players add @s[scores={last_attack=1..}] last_attack 1

execute as @s[tag=!left,scores={last_attack=4..}] at @s run /function checks/alerts/noswing

# If the player is under y=-104 this teleports them back to y=-104
tp @s[y=-105,dy=-205] ~ -104 ~