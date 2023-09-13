#!/bin/bash

# Define the directory where the entity JSON files are stored
entity_dir="./entities"

# Check if required utilities are installed
check_utility() {
  if ! command -v "$1" > /dev/null; then
    echo "Error: $1 is not installed"
    exit 1
  fi
}

check_utility grep
check_utility sed
check_utility jq

# Loop through all JSON files in the entity directory
for file in "$entity_dir"/*.json; do
  # Ignore player.json (we handle it manually)
  if [[ $file == "${entity_dir}/player.json" ]]; then
    continue
  fi

  # Remove comments from the file
  sed -i 's/\/\/.*//' "$file"

  # Check if the file contains a "component_groups" object
  if ! grep -q '"component_groups":' "$file"; then
    # If the file does not contain a "component_groups" object, add it
    sed -i '/"minecraft:entity": {/a \
        "component_groups": {},' "$file"
  fi

  # Check if the file contains a "paradox:kick" component group
  if ! jq -e '.["minecraft:entity"]["component_groups"]["paradox:kick"]' "$file" >/dev/null 2>&1; then
    # If the file does not contain the "paradox:kick" component group, add it
    jq '.["minecraft:entity"]["component_groups"]["paradox:kick"] = {
        "minecraft:instant_despawn": {
          "remove_child_entities": true
        }
      }' "$file" > temp.json && mv temp.json "$file"
  fi

  # Check if the file contains an "events" object
  if ! grep -q '"events":' "$file"; then
    # If the file does not contain an "events" object, add it
    sed -i '/"minecraft:entity": {/a \
        "events": {},' "$file"
  fi

  # Check if the file contains a "paradox:kick" event
  if ! jq -e '.["minecraft:entity"]["events"]["paradox:kick"]' "$file" >/dev/null 2>&1; then
    # If the file does not contain the "paradox:kick" event, add it
    jq '.["minecraft:entity"]["events"]["paradox:kick"] = {
        "add": {
          "component_groups": ["paradox:kick"]
        }
      }' "$file" > temp.json && mv temp.json "$file"
  fi

  echo "Processed $file"
done
