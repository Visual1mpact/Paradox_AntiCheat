tellraw @s[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r §7Your OP status has been revoked!"}]}
tag @s[type=player,tag=paradoxOpped] remove paradoxOpped
tellraw @a[tag=paradoxOpped] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is no longer Paradox-Opped."}]}