/**
 * A utility class for string transformations.
 */
class StringTransformation {
    /**
     * Converts a string to camelCase.
     * @param {string} str - The input string.
     * @returns {string} The camelCase string.
     */
    public static toCamelCase(str: string): string {
        const regExp = /[^a-zA-Z0-9]+(.)/gi;
        return str.replace(regExp, (match) => {
            return match[1].toUpperCase();
        });
    }

    /**
     * Converts a string to PascalCase.
     * @param {string} str - The input string.
     * @returns {string} The PascalCase string.
     */
    public static toPascalCase(str: string): string {
        const camelCase = this.toCamelCase(str);
        return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
    }

    /**
     * Converts a string to Title Case.
     * @param {string} str - The input string.
     * @returns {string} The Title Case string.
     */
    public static titleCase(str: string): string {
        return str.replace(/^[-_]*(.)/, (_, c) => c.toUpperCase()).replace(/[-_]+(.)/g, (_, c) => " " + c.toUpperCase());
    }
}
