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
        receivedDiv.innerHTML += "Received: ";
        this.receivedSpan = document.createElement("span");
        receivedDiv.appendChild(this.receivedSpan);
    }

    start() {
        ///Local debug test configuration
        //var sceneName = "test-scene";
        //var config = Stormancer.Configuration.forAccount("test", "echo");
        //config.serverEndpoint = "http://localhost:8081";

        //Online test configuration
        var sceneName = "scene1";
        var config = Stormancer.Configuration.forAccount("d9590543-56c3-c94a-f7bf-c394b26deb15", "newtest");
        

        var client = $.stormancer(config);

        var scenePromise = client.getPublicScene(sceneName, "moi");

        var deferred = $.Deferred<string>();
        scenePromise.then(scene => {
            this.scene = scene;
            scene.registerRoute<string>("echo.out", message => {
                console.log("Message received :", message);
                this.receivedSpan.innerHTML = message;
            });

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
        this.scene.send(routeName, message);
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
