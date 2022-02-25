tellraw @s[tag=!paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r §7You are now op!"}]}
tellraw @s[tag=paradoxOpped] {"rawtext":[{"text":"\nTo OP someone use this command: /execute <PlayerName> ~~~ function op."}]}
tag @s[type=player,tag=!paradoxOpped] add paradoxOpped
tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is now Paradox-Opped."}]}