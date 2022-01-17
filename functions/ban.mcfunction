execute @s[tag=!op] ~~~ tellraw @a[tag=op] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" has been §4banned!"}]}
tag @s[tag=!op] remove freeze
tag @s[tag=!op] add isBanned
tellraw @s[tag=op] {"rawtext":[{"text":"\nTo ban someone use this command \"/execute [playername] ~~~ function ban\""}]}
