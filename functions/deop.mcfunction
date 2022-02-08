tellraw @s[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r §7Your OP status has been revoked!"}]}
tag @s[type=player,tag=op] remove op
tellraw @a[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" is no longer Paradox-Opped."}]}