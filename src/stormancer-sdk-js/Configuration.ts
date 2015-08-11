module Stormancer {

    export class Configuration {
        
        /**
        Creates a Configuration. Prefer the **Configuration.forAccount** method instead of this constructor.
        @class Configuration
        @classdesc Represents the configuration of a Stormancer client. Use the static method **Configuration.forAccount** for creating a Configuration with an account ID and an application name.
        @memberof Stormancer
        */
        constructor() {
            this.transport = new WebSocketTransport();
            this.dispatcher = new DefaultPacketDispatcher();
            this.serializers = [];
            this.serializers.push(new MsgPackSerializer());
            this.plugins.push(new RpcClientPlugin());
        }

        /**
        API Endpoint URI
        @member Stormancer.Configuration#apiEndpoint
        */
        static apiEndpoint: string = "https://api.stormancer.com/";

        /**
        A string containing the target server endpoint.
        This value overrides the *apiEndpoint* property.
        */
        public serverEndpoint: string;

        /**
        A string containing the account name of the application.
        */
        public account: string;

        /**
        A string containing the name of the application.
        */
        public application: string;

        /**
        The plugins list
        */
        public plugins: IClientPlugin[] = [];

        /**
        Returns the API Endpoint URI to use.
        @return {string} API Endpoint URI
        */
        getApiEndpoint(): string {
            return this.serverEndpoint ? this.serverEndpoint : Configuration.apiEndpoint;
        }

        /**
        Creates a Configuration object targeting the public online platform.
        @method Stormancer.Configuration#forAccount
        @param {string} accountId Account ID
        @param {string} applicationName Application name
        @return {Stormancer.Configuration} The configuration object
        */
        static forAccount(accountId: string, applicationName: string): Configuration {
            var config = new Configuration();
            config.account = accountId;
            config.application = applicationName;
            return config;
        }

        /**
        The metadatas to send for connexion
        */
        public metadata: Map = {};

        /**
        Adds metadata to the connection.
        @param {string} key
        @param {string} value
        @return {Configuration} this
        */
        public Metadata(key: string, value: string): Configuration {
            this.metadata[key] = value;
            return this;
        }

        /**
        Gets or Sets the dispatcher to be used by the client.
        */
        public dispatcher: IPacketDispatcher;

        /**
        Gets or sets the transport to be used by the client.
        */
        public transport: ITransport;

        /**
        List of available serializers for the client.
        When negotiating which serializer should be used for a given remote peer, the first compatible serializer in the list is the one prefered.
        */
        public serializers: ISerializer[];
    }
}
