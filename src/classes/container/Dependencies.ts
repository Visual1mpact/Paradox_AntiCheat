import { World, System, GameMode } from "@minecraft/server";
import { MessageFormData, ModalFormData } from "@minecraft/server-ui";

// Define a type alias for the GameMode enum
type GameModeEnum = typeof GameMode;

export class MinecraftEnvironment {
    private static instance: MinecraftEnvironment;
    private world?: World;
    private system?: System;
    private gameMode?: GameModeEnum; // Use the type alias here

    private constructor(world?: World, system?: System, gameMode?: GameModeEnum) {
        this.world = world;
        this.system = system;
        this.gameMode = gameMode;
    }

    // Method to get a singleton instance of MinecraftEnvironment
    public static getInstance(world?: World, system?: System, gameMode?: GameModeEnum): MinecraftEnvironment {
        if (!MinecraftEnvironment.instance) {
            // If no instance exists, create a new one and store it
            MinecraftEnvironment.instance = new MinecraftEnvironment(world, system, gameMode);
        }
        // Return the singleton instance
        return MinecraftEnvironment.instance;
    }

    // Getter method for retrieving the world instance
    public getWorld(): World | undefined {
        return this.world;
    }

    // Getter method for retrieving the system instance
    public getSystem(): System | undefined {
        return this.system;
    }

    // Getter method for retrieving the gameMode instance
    public getGameMode(): GameModeEnum | undefined {
        return this.gameMode;
    }

    // Method to initialize modalFormData
    public initializeModalFormData(): ModalFormData {
        // Return a new instance of ModalFormData
        return new ModalFormData();
    }

    // Method to initialize messageFormData
    public initializeMessageFormData(): MessageFormData {
        // Return a new instance of ModalFormData
        return new MessageFormData();
    }
}
