const getStack = () => Error().stack.replace(/^.*\n?(.*\n?)?/, "");
export default getStack;
