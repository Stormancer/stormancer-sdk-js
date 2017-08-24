class Greeter {
    constructor(element) {
        this._connected = false;
        this._element = element;
        this._element.innerHTML += "The time is: ";
        var sentDiv = document.createElement("div");
        element.appendChild(sentDiv);
        sentDiv.innerHTML += "Sent: ";
        this._sentSpan = document.createElement('span');
        sentDiv.appendChild(this._sentSpan);
        var receivedDiv = document.createElement("div");
        element.appendChild(receivedDiv);
        receivedDiv.innerHTML += "Received: ";
        this._receivedSpan = document.createElement("span");
        receivedDiv.appendChild(this._receivedSpan);
    }
    start() {
        console.log("start!");
        var config = Stormancer.Configuration.forAccount("58ec9ba7-56e4-3d89-2c55-c9435e08b26b", "tester");
        var client = new Stormancer.Client(config);
        console.log("getPublicScene");
        client.getPublicScene("main", "").then(scene => {
            console.log("getPublicScene OK");
            console.log("Scene.connect");
            scene.addRoute("echo", this.onEcho.bind(this));
            return scene.connect().then(() => {
                console.log("Scene.connect OK");
                this._connected = true;
                scene.send("echo", "stormancer");
                this._timerToken = setInterval(() => {
                    console.log("check clock", client.clock());
                }, 2000);
                console.log("RPC");
                var rpcService = scene.getComponent("rpcService");
                rpcService.rpc("rpc", "stormancer", packet => {
                    var msgpack = new Stormancer.MsgPackSerializer();
                    var response = msgpack.deserialize(packet.data);
                    if (response === "stormancer") {
                        console.log("RPC OK");
                    }
                    else {
                        console.error("RPC failed");
                    }
                });
            });
        }).catch(onRejected => {
            console.log("getPublicScene Failed", onRejected);
        });
        $("#sendButton").click(function (e) {
            var message = document.querySelector("#message").value;
            console.log("click", message);
            this.sendMessage("echo", message);
        }.bind(this));
    }
    onEcho(packet) {
        console.log("Packet received :", packet);
        var msgPackSerializer = new Stormancer.MsgPackSerializer();
        this._receivedSpan.innerHTML += "<br>" + msgPackSerializer.deserialize(packet.data);
    }
    stop() {
        clearTimeout(this._timerToken);
    }
}
window.onload = () => {
    var el = document.getElementById('content');
    var greeter = new Greeter(el);
    greeter.start();
};
//# sourceMappingURL=app.js.map