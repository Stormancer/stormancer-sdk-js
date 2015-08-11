var Greeter = (function () {
    function Greeter(element) {
        this.connected = false;
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
    Greeter.prototype.start = function () {
        var _this = this;
        console.log("start!");
        ///Local debug test configuration
        //var sceneName = "test-scene";
        //var config = Stormancer.Configuration.forAccount("test", "echo");
        //config.serverEndpoint = "http://localhost:8081";
        //Online test configuration
        var sceneName = "matchmaker";
        var config = Stormancer.Configuration.forAccount("d81fc876-6094-3d92-a3d0-86d42d866b96", "matchmaking-test");
        $("#sendButton").click(function (e) {
            var message = document.querySelector("#message").value;
            console.log("click", message);
            this.sendMessage("echo.in", message);
        }.bind(this));
        var client = $.stormancer(config);
        console.log("I want my matchmaker!");
        client.getPublicScene(sceneName, "moi").then(function (matchmaker) {
            console.log("I have my matchmaker!");
            return matchmaker.connect().then(function () {
                console.log("connected to matchmaker!");
                matchmaker.getComponent("rpcService").RpcRaw("matchmaking.requestScene", new Uint8Array(0), function (packet) {
                    var response = msgpack.unpack(packet.data);
                    var scenePromise = client.getScene(response.ConnectionToken);
                    var timeAtConnexion = null;
                    var deferred = $.Deferred();
                    scenePromise.then(function (scene) {
                        _this.scene = scene;
                        scene.registerRoute("echo.out", function (message) {
                            console.log("Message received :", message);
                            _this.receivedSpan.innerHTML = message;
                        });
                        return scene.connect().then(function () {
                            _this.connected = true;
                            //this.timerToken = setInterval(() => {
                            //    var localDateString = new Date().toLocaleString();
                            //    this.sentSpan.innerHTML = localDateString;
                            //    this.sendMessage("echo.in", localDateString);
                            //    console.log("server clock", client.clock());
                            //}, 2000);
                        });
                    });
                });
            });
        });
    };
    Greeter.prototype.sendMessage = function (routeName, message) {
        if (this.scene && this.connected) {
            this.scene.send(routeName, message);
            console.log("Message sent on " + routeName + ":" + message);
        }
    };
    Greeter.prototype.messageReceived = function (packet) {
        console.log("Packet received :", packet);
        this.receivedSpan.innerHTML += "<br>" + msgpack.unpack(packet.data);
    };
    Greeter.prototype.stop = function () {
        clearTimeout(this.timerToken);
    };
    return Greeter;
})();
window.onload = function () {
    var el = document.getElementById('content');
    var greeter = new Greeter(el);
    greeter.start();
};
//# sourceMappingURL=app.js.map