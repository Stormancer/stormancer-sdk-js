class Greeter {
    element: HTMLElement;
    sentSpan: HTMLElement;
    receivedSpan: HTMLElement;
    timerToken: number;
    scene;

    constructor(element: HTMLElement) {
        this.element = element;
        this.element.innerHTML += "The time is: ";

        var sentDiv = document.createElement("div");
        element.appendChild(sentDiv);
        sentDiv.innerHTML += "Sent: ";
        this.sentSpan = document.createElement('span');
        sentDiv.appendChild(this.sentSpan);

        var receivedDiv = document.createElement("div");
        element.appendChild(receivedDiv);
        receivedDiv.innerHTML += "Sent: ";
        this.receivedSpan = document.createElement("span");
        receivedDiv.appendChild(this.receivedSpan);
    }

    start() {
        var config = Stormancer.Configuration.forAccount("714d5095-cba1-ffec-4c0b-cccca70e0d93", "testecho");
        config.serverEndpoint = "http://localhost:8081";
        var client = $.stormancer(config);

        var scenePromise = client.getPublicScene("scene1", "moi");

        var deferred = $.Deferred<string>();
        scenePromise.then(scene => {
            this.scene = scene;
            scene.addRoute("echo.out", packet => this.messageReceived(packet));

            return scene.connect().then(() => {
                this.timerToken = setInterval(() => {
                    var localDateString = new Date().toLocaleString();
                    this.sentSpan.innerHTML = localDateString;
                    this.sendMessage("echo.in", localDateString);
                }, 500);
            });
        });
    }

    sendMessage(routeName, message) {
        this.scene.sendPacket(routeName, msgpack.pack(message));
        console.log("Message sent on " + routeName + ":" + message);
    }

    messageReceived(packet: Stormancer.Packet<Stormancer.IScenePeer>) {
        console.log("Packet received :", packet);

        this.receivedSpan.innerHTML = msgpack.unpack(packet.data);
    }

    stop() {
        clearTimeout(this.timerToken);
    }
}

window.onload = () => {
    var el = document.getElementById('content');
    var greeter = new Greeter(el);
    greeter.start();
};
