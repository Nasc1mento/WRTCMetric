"use "


const wss = new WebSocket("wss://192.168.0.111:50000");
        
const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const video = document.getElementById("video");


let stream = null;
let peerConnection = null;
let dataChannel = null;
let lastResult;


let tR1;
let now1;
let tSV1;
let tS1;
let msg;

const start = async () => {
    stream = await navigator.mediaDevices.getUserMedia({ "video": true});
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
        // console.log(report);
        
        if (report.type === "outbound-rtp") {


            const now = report.timestamp;
            const bytes = report.bytesSent;
            const headerBytes = report.headerBytesSent;
            const packets = report.packetsSent;
            const nackCount = report.nackCount;
            const pliCount = report.pliCount;
            

            if (lastResult && lastResult.has(report.id)) {
                const lastReport = lastResult.get(report.id);
                const lastNow = lastReport.timestamp;
                const lastBytes = lastReport.bytesSent;
                const lastPackets = lastReport.packetsSent;
                const lastHeaderBytes = lastReport.headerBytesSent;

                const data = {
                    ahahah: report.lastPacketReceivedTimestamp,
                    bytesRate: ((bytes - lastBytes) / (now - lastNow)).toFixed(2),
                    headerRate: ((headerBytes - lastHeaderBytes) / (now - lastNow)).toFixed(2),
                    packets: packets,  
                    packetsPerSecond: packets - lastPackets, 
                    nackCount: nackCount,
                    pliCount: pliCount,
                }

                showJson(data, "json");
            }

        }      
    });
    lastResult = res;   
    }); 
}, 1000);

