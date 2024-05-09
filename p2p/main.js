const cors = require("cors");
const fs = require("fs");
const path = require("path");
const https = require("https");
const WebSocket = require("ws");
const express = require("express");

const port = 50000;

const corsOptions = {
    origin: "*",
};

const sslOptions = {
    key: fs.readFileSync("ssl/key.pem"),
    cert: fs.readFileSync("ssl/cert.pem")
};

const app = express();

app.use(cors(corsOptions));
app.use(express.static("static"));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/receiver", (req, res) => {
    res.sendFile(path.join(__dirname, "static/receiver.html"));
});

const server = https.createServer(sslOptions, app);
const wss = new WebSocket.Server({ server });

server.listen((port), () => {
    console.log("Running");
});

wss.on("connection", (ws) => {
    ws.on("close", () => {
        console.log("Client disconnected");
    });

    console.log("Client connected");

    ws.on('message', (message) => {

        const data = JSON.parse(message);

        switch (data.type) {
            case "offer":
                wss.broadcastEx(JSON.stringify({
                    type: "offer",
                    offer: data.offer
                }), ws);

                console.log("Offer: ", data.offer);
                break;

            case "answer":
                wss.broadcastEx(JSON.stringify({
                    type: "answer",
                    answer: data.answer,
                }), ws);

                console.log("Answer: ", data.answer);
                break;
            
            case "candidate":
                wss.broadcastEx(JSON.stringify({
                    type: "candidate",
                    candidate: data.candidate,
                }), ws);

                console.log("Candidate: ", data.candidate);
                break;

            default:
                break;
        }
    });

    ws.on('error', () => ws.terminate());
});


wss.broadcastEx = (message, ws) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client !== ws) {
            client.send(message);
        }
    });
}