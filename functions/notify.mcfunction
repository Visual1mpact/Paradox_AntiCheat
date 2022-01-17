tag @s[tag=notify] add nonotify
tag @s[tag=nonotify] remove notify
tellraw @a[tag=nonotify] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §rhas disabled cheat notifications."}]}

tag @s[tag=!nonotify] add notify
tellraw @a[tag=notify,tag=!nonotify] {"rawtext":[{"text":"\n§r§4[§6Paradox§4]§r "},{"selector":"@s"},{"text":" §rhas enabled cheat notifications."}]}

tag @s[tag=nonotify] remove nonotify
