/**
@namespace Stormancer
*/
module Stormancer {

    /**
    @class ApiClient
    */
    export class ApiClient {

        /**
        Constructor
        @param {Object} config Configuration object
        @param {Object} tokenHandler Token handler
        */
        constructor(config: Configuration, tokenHandler: ITokenHandler) {
            this._config = config;
            this._tokenHandler = tokenHandler;
        }

        private _config: Configuration;

        private createTokenUri = "{0}/{1}/scenes/{2}/token";

        private _tokenHandler: ITokenHandler;

        /**
        Get a scene endpoint
        @param {string} accountId Account ID
        @param {string} applicationName Application name
        @param {string} sceneId Scene ID
        @param {Object} userData Some user data sent at connection
        */
        public getSceneEndpoint<T>(accountId: string, applicationName: string, sceneId: string, userData: T): JQueryPromise<SceneEndpoint> {
            var serializer = new MsgPackSerializer();
            //var data: Uint8Array = serializer.serialize(userData);
            var url = this._config.getApiEndpoint() + Helpers.stringFormat(this.createTokenUri, accountId, applicationName, sceneId);            
            return $.ajax({
                type: "POST",
                url: url,
                headers: {
                    "Accept": "application/json",
                    "x-version": "1.0.0"
                },
                dataType: "json",
                contentType: "application/json",
                data: JSON.stringify(userData)
            }).then(result => {
                return this._tokenHandler.decodeToken(result);
            });
        }
    }
}
