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
        console.log("start");
        var sceneName = "main";
        var config = Stormancer.Configuration.forAccount("d81fc876-6094-3d92-a3d0-86d42d866b96", "hello-world-tutorial");
        $("#sendButton").click(function (e) {
            var message = document.querySelector("#message").value;
            console.log("click", message);
            this.sendMessage("echo.in", message);
        }.bind(this));
        var client = new Stormancer.Client(config);
        console.log("get");
        client.getPublicScene(sceneName, "moi").then(function (scene) {
            console.log("got");
            console.log("connect");
            return scene.connect().then(function () {
                console.log("connected");
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
