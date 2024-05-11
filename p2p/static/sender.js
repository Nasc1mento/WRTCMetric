const wss = new WebSocket("wss://192.168.0.111:50000");
        
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const video = document.getElementById("video");
const bitrateText = document.getElementById("bitrate");
const headerRateText = document.getElementById("headerrate");
const ppsText = document.getElementById("pps");
const packetsLostText = document.getElementById("packetslost");

let stream = null;
let peerConnection = null;
let lastResult;

const start = async () => {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false});
    video.srcObject = stream;
};

wss.onmessage = async (event) => {
    console.log(event);
    const message = JSON.parse(event.data);
    console.log(message);
    switch (message.type) {
        case "offer":
            peerConnection = new RTCPeerConnection();
            stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
            
            peerConnection.onicecandidate = event => {
                if (event.candidate) {
                    wss.send(JSON.stringify({ type: "candidate", candidate: event.candidate }));
                }
            }

            await peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            wss.send(JSON.stringify({ type: "answer", answer: answer }));
            break;

        case "candidate":
            await peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
            break;
        default:
            break;
    }
};

const stop = () => {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
    video.srcObject = null;
    peerConnection.close();
};

startBtn.onclick = async () => {
    await start();
};

stopBtn.onclick = () => {
    stop();
};

window.setInterval(()=> {

    if (!peerConnection) {
        return;
    }

    const receiver = peerConnection.getSenders()[0];

    if (!receiver) {
        return;
    }

    receiver.getStats().then(res => {res.forEach(report => {
        
    const packetsLost = res.packetsLost;
    console.log(packetsLost);
  

        if (report.type === "outbound-rtp") {

            const now = report.timestamp;
            const bytes = report.bytesSent;
            const headerBytes = report.headerBytesSent;
            const packets = report.packetsSent;
            
            if (lastResult && lastResult.has(report.id)) {
                const lastReport = lastResult.get(report.id);
                const lastNow = lastReport.timestamp;
                const lastBytes = lastReport.bytesSent;
                const lastPackets = lastReport.packetsSent;
                const lastHeaderBytes = lastReport.headerBytesSent;

                const bitrate =(bytes - lastBytes) / (now - lastNow);
                const headerRate = (headerBytes - lastHeaderBytes) / (now - lastNow);
                const packetsPerSecond = packets - lastPackets;
                    
                bitrateText.textContent = `${bitrate.toFixed(2)} Bps`;
                headerRateText.innerText = `${headerRate.toFixed(2)} Bps`;
                ppsText.innerText = `${packetsPerSecond}`;
            }
        }
        lastResult = res;         
    });
    });

}, 1000);

