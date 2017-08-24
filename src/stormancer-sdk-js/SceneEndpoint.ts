namespace Stormancer {
    export class SceneEndpoint {
        public tokenData: ConnectionData;

        public token: string;
    }

    export class ConnectionData {
        public Endpoints: Map;

        public AccountId: string;
        public Application: string;

        public SceneId: string;

        public Routing: string;

        public Issued: Date;

        public Expiration: Date;

        public UserData: Uint8Array;

        public ContentType: string;

        public Version: number;
    }
}
