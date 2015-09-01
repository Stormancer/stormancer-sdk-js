﻿class Greeter {
    element: HTMLElement;
    sentSpan: HTMLElement;
    receivedSpan: HTMLElement;
    timerToken: number;
    scene;
    connected: boolean = false;

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
        receivedDiv.innerHTML += "Received: ";
        this.receivedSpan = document.createElement("span");
        receivedDiv.appendChild(this.receivedSpan);
    }

    start() {
        console.log("start");

        ///Local debug test configuration
        //var sceneName = "test-scene";
        //var config = Stormancer.Configuration.forAccount("test", "echo");
        //config.serverEndpoint = "http://localhost:8081";

        //Online test configuration
        var sceneName = "main";
        var config = Stormancer.Configuration.forAccount("d81fc876-6094-3d92-a3d0-86d42d866b96", "hello-world-tutorial");

        $("#sendButton").click(function (e) {
            var message = (<any>document.querySelector("#message")).value;
            console.log("click", message)
            this.sendMessage("echo.in", message);
        }.bind(this));

        var client = new Stormancer.Client(config);

        console.log("get");
        client.getPublicScene(sceneName, "moi")
            .then(scene => {
                console.log("got");
                console.log("connect");
                return scene.connect().then(() => {
                    console.log("connected");
                });
            });
    }

    sendMessage(routeName, message) {
        if (this.scene && this.connected) {
            this.scene.send(routeName, message);
            console.log("Message sent on " + routeName + ":" + message);
        }
    }

    messageReceived(packet: Stormancer.Packet<Stormancer.IScenePeer>) {
        console.log("Packet received :", packet);

        this.receivedSpan.innerHTML += "<br>" + msgpack.unpack(packet.data);
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
