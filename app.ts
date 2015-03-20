class Greeter {
    element: HTMLElement;
    sentSpan: HTMLElement;
    receivedSpan: HTMLElement;
    timerToken: number;
    scene;

    constructor(element: HTMLElement) {


        this.element = element;

        var inputDiv = document.createElement("div");
        element.appendChild(inputDiv);
        var idInput = document.createElement("input");
        inputDiv.appendChild(idInput);
        idInput.type = "text";
        idInput.id = "byte";

        this.element.innerHTML += "The time is: ";

        var sentDiv = document.createElement("div");
        element.appendChild(sentDiv);
        sentDiv.innerHTML += "Sent: ";
        this.sentSpan = document.createElement('span');
        sentDiv.appendChild(this.sentSpan);

        var receivedDiv = document.createElement("div");
        element.appendChild(receivedDiv);
        receivedDiv.innerHTML += "Received: ";
        this.receivedSpan = document.createElement("span");
        receivedDiv.appendChild(this.receivedSpan);
    }

    start() {
        //var config = Stormancer.Configuration.forAccount("d9590543-56c3-c94a-f7bf-c394b26deb15", "testecho");

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
                }, 2000);
            });
        });
    }

    sendMessage(routeName, message) {
        this.scene.sendPacket(routeName, msgpack.pack(message) /*new Uint8Array([parseInt((<any>document.getElementById("byte")).value) this.i%256 ])*/ );
        console.log("Message sent on " + routeName + ":" + message);
    }

    messageReceived(packet: Stormancer.Packet<Stormancer.IScenePeer>) {
        console.log("Packet received :", packet);

        this.receivedSpan.innerHTML = msgpack.unpack(packet.data) /*(packet.data.length>0) ? packet.data[0].toString() : "NaN"*/;
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
