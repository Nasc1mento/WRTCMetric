const wss = new WebSocket("wss://192.168.0.111:50000");

const startBtn = document.getElementById("start");
const btn = document.getElementById("btn");
const bitrateText = document.getElementById("bitrate");
const headerRateText = document.getElementById("headerrate");
const ppsText = document.getElementById("pps");


let peerConnection = null;
let lastResult;


const start = async () => {
    peerConnection = new RTCPeerConnection();
    peerConnection.addTransceiver("video", { direction: "recvonly" });
    peerConnection.addTransceiver("audio", { direction: "recvonly" });

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

btn.onclick = () => {
    if (!window.RTCPeerConnection) {
        console.log("Your browser does not support RTCPeerConnection");
    }
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

            console.log(res.packetLost)

            if (lastResult && lastResult.has(report.id)) {
                const lastReport = lastResult.get(report.id);
    
                const lastNow = lastReport.timestamp;
                const lastBytes = lastReport.bytesReceived;
                const lastPackets = lastReport.packetsReceived;
                const lastHeaderBytes = lastReport.headerBytesReceived;
    
                console.log(bytes- lastBytes);
                const bitrate = 8 * (bytes - lastBytes) / (now - lastNow);
                const headerRate = 8 * (headerBytes - lastHeaderBytes) / (now - lastNow);
                const packetsPerSecond = packets - lastPackets;
                    
                bitrateText.innerText = `${bitrate.toFixed(2)} kbps`;
                headerRateText.innerText = `${headerRate.toFixed(2)} kbps`;
                ppsText.innerText = `${packetsPerSecond}`;
            }
        }
    lastResult = res;         
    });
    });
}, 1000);