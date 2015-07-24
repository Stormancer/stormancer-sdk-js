var Greeter = (function () {
    function Greeter(element) {
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
        ///Local debug test configuration
        //var sceneName = "test-scene";
        //var config = Stormancer.Configuration.forAccount("test", "echo");
        //config.serverEndpoint = "http://localhost:8081";
        var _this = this;
        //Online test configuration
        var sceneName = "scene1";
        var config = Stormancer.Configuration.forAccount("d9590543-56c3-c94a-f7bf-c394b26deb15", "newtest");
        var client = $.stormancer(config);
        var scenePromise = client.getPublicScene(sceneName, "moi");
        var timeAtConnexion = null;
        var deferred = $.Deferred();
        scenePromise.then(function (scene) {
            _this.scene = scene;
            scene.registerRoute("echo.out", function (message) {
                console.log("Message received :", message);
                _this.receivedSpan.innerHTML = message;
            });
            return scene.connect().then(function () {
                timeAtConnexion = performance.now();
                _this.timerToken = setInterval(function () {
                    var localDateString = new Date().toLocaleString();
                    _this.sentSpan.innerHTML = localDateString;
                    _this.sendMessage("echo.in", localDateString);
                    console.log("server clock", client.clock());
                }, 2000);
            });
        });
    };
    Greeter.prototype.sendMessage = function (routeName, message) {
        this.scene.send(routeName, message);
        console.log("Message sent on " + routeName + ":" + message);
    };
    Greeter.prototype.messageReceived = function (packet) {
        console.log("Packet received :", packet);
        this.receivedSpan.innerHTML = msgpack.unpack(packet.data);
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