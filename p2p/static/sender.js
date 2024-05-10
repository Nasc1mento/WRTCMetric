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

    const receiver = peerConnection.getReceivers()[0];

    if (!receiver) {
        return;
    }

    receiver.getStats().then(res => {res.forEach(report => {
        let bytes;
        let packets;
        let headerBytes;

        const now = report.timestamp;
        bytes =  report.bytesSent;
        headerBytes = report.headerBytesSent;
        packets = report.packetsSent;

        if (lastResult && lastResult.has(report.id)) {
            const bitrate = 8 * (bytes - lastResult.get(report.id).bytesSent) / 
                (now - lastResult.get(report.id).timestamp);
            const headerRate = 8 * (headerBytes - lastResult.get(report.id).headerBytesSent) /
                (now - lastResult.get(report.id).timestamp);

            if (bitrate) {
                bitrateText.innerText = `${bitrate.toFixed(2)} kbps`;
            }

            if (headerRate) {
                headerRateText.innerText = `${headerRate.toFixed(1)} kbps`;
            }

            const packetsPerSecond = packets - lastResult.get(report.id).packetsReceived;

            if (packetsPerSecond) {
                ppsText.innerText = `${packetsPerSecond}`;
            }

            const packetsLost = report.packetsLost - lastResult.get(report.id).packetsLost;

            if (packetsLost) {
                packetsLostText.innerText = `${packetsLost}`;
            }
        }

    lastResult = res;         
    });
    });

}, 1000);