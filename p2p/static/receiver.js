const wss = new WebSocket("wss://192.168.0.111:50000");

const startBtn = document.getElementById("start");
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
        bytes =  report.bytesReceived;
        headerBytes = report.headerBytesReceived;
        packets = report.packetsReceived;

        if (lastResult && lastResult.has(report.id)) {
            const bitrate = 8 * (bytes - lastResult.get(report.id).bytesReceived) / 
                (now - lastResult.get(report.id).timestamp);

            const headerRate = 8 * (headerBytes - lastResult.get(report.id).headerBytesReceived) /
                (now - lastResult.get(report.id).timestamp);
            
            const packetsPerSecond = packets - lastResult.get(report.id).packetsReceived;

            if (bitrate) {
                bitrateText.innerText = `${bitrate.toFixed(2)} kbps`;
            }

            if (headerRate) {
                headerRateText.innerText = `${headerRate.toFixed(2)} kbps`;
            }

            if (packetsPerSecond) {
                ppsText.innerText = `${packetsPerSecond}`;
            }
        }

    lastResult = res;         
    });
    });

}, 1000);