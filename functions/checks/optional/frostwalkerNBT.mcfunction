execute @s[scores={detect_boots=1,ench_boots=1,frostwalker=1..}] ~~~ replaceitem entity @s slot.armor.feet 0 leather_boots 1 0 {"item_lock": {"mode": "lock_in_slot"},"keep_on_death":{}}
execute @s[scores={detect_boots=2,ench_boots=1,frostwalker=1..}] ~~~ replaceitem entity @s slot.armor.feet 0 chainmail_boots 1 0 {"item_lock": {"mode": "lock_in_slot"},"keep_on_death":{}}
execute @s[scores={detect_boots=3,ench_boots=1,frostwalker=1..}] ~~~ replaceitem entity @s slot.armor.feet 0 iron_boots 1 0 {"item_lock": {"mode": "lock_in_slot"},"keep_on_death":{}}
execute @s[scores={detect_boots=4,ench_boots=1,frostwalker=1..}] ~~~ replaceitem entity @s slot.armor.feet 0 golden_boots 1 0 {"item_lock": {"mode": "lock_in_slot"},"keep_on_death":{}}
execute @s[scores={detect_boots=5,ench_boots=1,frostwalker=1..}] ~~~ replaceitem entity @s slot.armor.feet 0 diamond_boots 1 0 {"item_lock": {"mode": "lock_in_slot"},"keep_on_death":{}}
execute @s[scores={detect_boots=6,ench_boots=1,frostwalker=1..}] ~~~ replaceitem entity @s slot.armor.feet 0 netherite_boots 1 0 {"item_lock": {"mode": "lock_in_slot"},"keep_on_death":{}}
# Release locked items when Frostwalker is disabled
execute @s[scores={detect_boots=1,frostwalker=..0}] ~~~ replaceitem entity @s slot.armor.feet 0 leather_boots 1 0
execute @s[scores={detect_boots=2,frostwalker=..0}] ~~~ replaceitem entity @s slot.armor.feet 0 chainmail_boots 1 0
execute @s[scores={detect_boots=3,frostwalker=..0}] ~~~ replaceitem entity @s slot.armor.feet 0 iron_boots 1 0
execute @s[scores={detect_boots=4,frostwalker=..0}] ~~~ replaceitem entity @s slot.armor.feet 0 golden_boots 1 0
execute @s[scores={detect_boots=5,frostwalker=..0}] ~~~ replaceitem entity @s slot.armor.feet 0 diamond_boots 1 0
execute @s[scores={detect_boots=6,frostwalker=..0}] ~~~ replaceitem entity @s slot.armor.feet 0 netherite_boots 1 0
