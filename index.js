const persistence = require("./persistence")
const presentation = require("./presentation")

/**
 * Starts the application by connecting to MongoDB then launching the web server.
 * @returns {Promise<void>}
 */
async function start() {
    await persistence.getClient()
    presentation.startServer()
}

start()