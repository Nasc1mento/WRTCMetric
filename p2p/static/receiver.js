"use strict";

const wss = new WebSocket("wss://192.168.0.111:50000");
const startBtn = document.getElementById("start");
const video = document.getElementById("video");

// how 

let peerConnection = null;
let dataChannel = null;
let lastResult;


const start = async () => {
    peerConnection = new RTCPeerConnection();

    peerConnection.addTransceiver("video", { direction: "recvonly" });
    // peerConnection.addTransceiver("audio", { direction: "recvonly" });

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            wss.send(JSON.stringify({ type: "candidate", candidate: event.candidate }));
        }
    }

    peerConnection.ontrack = event => {
        const video = document.getElementById("video");
        video.srcObject = event.streams[0];
    }

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    wss.send(JSON.stringify({ type: "offer", offer: offer }));

    wss.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        console.log(message);
        switch (message.type) {
            case "answer":
                await peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
                break;

            case "candidate":
                await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
                break;

            default:
                break;
        }
    }
};

startBtn.onclick = () => {
    start();
}

window.setInterval(async () => {

    if (!peerConnection) {
        return;
    }   

    const receiver = peerConnection.getReceivers()[0];

    if (!receiver) {
        return;
    }

    receiver.getStats().then(res => {res.forEach(report => {

        if (report.type === "inbound-rtp") {

            const now = report.timestamp;

            const bytes =  report.bytesReceived;
            const headerBytes = report.headerBytesReceived;
            const packets = report.packetsReceived;
            const packetsLost = report.packetsLost;

            if (lastResult && lastResult.has(report.id)) {
                const lastReport = lastResult.get(report.id);
    
                const lastNow = lastReport.timestamp;
                const lastBytes = lastReport.bytesReceived;
                const lastPackets = lastReport.packetsReceived;
                const lastHeaderBytes = lastReport.headerBytesReceived;
                    
                const data = {
                    bitrate: ((bytes - lastBytes) / (now - lastNow)).toFixed(2),
                    headerRate: ((headerBytes - lastHeaderBytes) / (now - lastNow)).toFixed(2),
                    packets: packets,
                    packetsPerSecond: packets - lastPackets,
                    packetsLost: packetsLost,
                }

                showJson(data, "stats");
            }
        }
        
    });
    lastResult = res; 
    });
}, 1000);