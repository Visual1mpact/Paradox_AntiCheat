#!/bin/bash

shopt -s nullglob
files=(entities/*.json)

total=${#files[@]}
current=0

echo "Processing ${total} files"

for file in "${files[@]}"; do
    if [ "$file" != "entities/player.json" ]; then
        ((current++))

        # Show progress bar
        progress=$(awk "BEGIN { printf \"%.2f\", $current/$total * 100 }")
        printf "[%-50s] %s%% (%s/%s)\r" "${progress// /#}" "$progress" "$current" "$total"

        # Check if the file contains the event object
        if ! grep -q '^\s*"events": {' "$file"; then
            # If it doesn't exist, add it to the entity object
            sed -i '/^\s*"minecraft:entity": {/a \ \ \ \ "events": {\n \ \ \ \ \ \ \ \ "paradox:kick": {\n \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ "add": {\n \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ "component_groups": ["paradox:kick"]\n \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ }\n \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ }\n \ \ \ \ \ \ \ \ }\n' "$file"
            if grep -q '^\s*"component_groups": {' "$file"; then
                echo "[Component_Groups] File ${file} updated with paradox:kick component group"
            else
                echo "[Events & Component_Groups] File ${file} updated with paradox:kick event and component group"
            fi
        # Check if the file contains the component group
        elif ! grep -q '^\s*"paradox:kick": {' "$file"; then
            # If it doesn't exist, add it to the component_groups object
            sed -i '/^\s*"component_groups": {/a \ \ \ \ "paradox:kick": {\n \ \ \ \ \ \ \ \ "minecraft:despawn": {\n \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ \ "remove_child_entities": true\n \ \ \ \ \ \ \ \ \ \ \ \ \ \ }\n \ \ \ \ \ \ \ \ }\n' "$file"
            echo "[Events] File ${file} updated with paradox:kick event"
        else
            echo "[No Update] File ${file} already contains paradox:kick event and component group"
        fi
    fi
done

echo "Processing complete"
