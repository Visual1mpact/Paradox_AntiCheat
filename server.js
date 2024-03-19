const http = require("http");
const os = require("os");
const finalhandler = require("finalhandler");
const serveStatic = require("serve-static");

const serve = serveStatic("docs", { index: ["index.html"] });
const server = http.createServer((req, res) => {
    serve(req, res, finalhandler(req, res));
});

const PORT = process.env.PORT || 4000;

// Function to handle server shutdown
const handleShutdown = () => {
    console.log("\nShutting down server...");
    server.close(() => {
        console.log("Server has been gracefully closed.");
        process.exit(0);
    });
};

// Listen for process termination signals
process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);

server.listen(PORT, "0.0.0.0", () => {
    const interfaces = os.networkInterfaces();
    let localhostUrl = `http://localhost:${PORT}`;
    console.log(`Server is running at ${localhostUrl}`);

    // Print IP addresses for all available network interfaces
    Object.keys(interfaces).forEach((iface) => {
        interfaces[iface].forEach((details) => {
            if (details.family === "IPv4") {
                console.log(`Server is also accessible at http://${details.address}:${PORT}`);
            }
        });
    });
});
