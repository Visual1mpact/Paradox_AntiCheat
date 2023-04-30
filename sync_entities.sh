#!/bin/bash

# Define the directory where the entity JSON files are stored
entity_dir="./entities"

# Check if required utilities are installed
if ! command -v grep > /dev/null; then
    echo "Error: grep is not installed"
    exit 1
fi

if ! command -v sed > /dev/null; then
    echo "Error: sed is not installed"
    exit 1
fi

if ! command -v jq > /dev/null; then
    echo "Error: jq is not installed"
    exit 1
fi

# Loop through all JSON files in the entity directory
for file in "$entity_dir"/*.json; do
    # Ignore player.json (we handle it manually)
    if [[ $file == "${entity_dir}/player.json" ]]; then
        continue;
    fi

    # Remove comments from the file
    sed -i 's/\/\/.*//' "$file"

    # Ignore killaura as we need those to remain
    if [[ $file != "${entity_dir}/killaura.json" ]]; then
        # Update is_spawnable and is_summonable properties
        sed -i 's/"is_spawnable": [^,]*,/"is_spawnable": false,/' "$file"
        sed -i 's/"is_summonable": [^,]*,/"is_summonable": false,/' "$file"
    fi

    # Check if the file contains a "component_groups" object
    if grep -q '"component_groups":' "$file"; then
        # If the file contains a "component_groups" object, check if it contains the "paradox:kick" component group
        if ! grep -q '"paradox:kick":' "$file"; then
            # If the file does not contain the "paradox:kick" component group, add it to the "component_groups" object
            sed -i '/"component_groups": {/a \
                "paradox:kick": {\
                    "minecraft:instant_despawn": {\
                        "remove_child_entities": true\
                    }\
                },' "$file"
            echo "Added paradox:kick component group to $file"
        else
            echo "paradox:kick component group already exists in $file"
        fi
    else
        # If the file does not contain a "component_groups" object, add it and the "paradox:kick" component group to the entity
        sed -i '/"minecraft:entity": {/a \
            "component_groups": {\
                "paradox:kick": {\
                    "minecraft:instant_despawn": {\
                        "remove_child_entities": true\
                    }\
                }\
            },' "$file"
        echo "Added component_groups object and paradox:kick component group to $file"
    fi

    # Check if the file contains an "events" object
    if grep -q '"events":' "$file"; then
        # If the file contains an "events" object, check if it contains the "paradox:kick" event
        if ! grep -qE '^\s*"paradox:kick":' <(jq --slurp '.[0]["minecraft:entity"]["events"]' "$file"); then
            # If the file does not contain the "paradox:kick" event, add it to the "events" object
            sed -i '/"events": {/a \
                "paradox:kick": {\
                    "add": {\
                        "component_groups": ["paradox:kick"]\
                    }\
                },' "$file"
            echo "Added paradox:kick event to $file"
        else
            echo "paradox:kick event already exists in $file"
        fi
    else
        # If the file does not contain an "events" object, add it and the "paradox:kick" event to the entity
        sed -i '/"minecraft:entity": {/a \
            "events": {\
                "paradox:kick": {\
                    "add": {\
                        "component_groups": ["paradox:kick"]\
                    }\
                }\
            },' "$file"
        echo "Added events object and paradox:kick event to $file"
    fi
done
