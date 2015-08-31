/** @module Stormancer */
module Stormancer {
    export class ApiClient {
        constructor(config: Configuration, tokenHandler: ITokenHandler) {
            this._config = config;
            this._tokenHandler = tokenHandler;
        }

        private _config: Configuration;
        private createTokenUri = "{0}/{1}/scenes/{2}/token";
        private _tokenHandler: ITokenHandler;

        public getSceneEndpoint(accountId: string, applicationName: string, sceneId: string, userData: any): Promise<SceneEndpoint> {
            //var serializer = new MsgPackSerializer();
            //var data: Uint8Array = serializer.serialize(userData);

            var url = this._config.getApiEndpoint() + Helpers.stringFormat(this.createTokenUri, accountId, applicationName, sceneId);

            //return $.ajax({
            //    type: "POST",
            //    url: url,
            //    headers: {
            //        "Accept": "application/json",
            //        "x-version": "1.0.0"
            //    },
            //    dataType: "json",
            //    contentType: "application/json",
            //    data: JSON.stringify(userData)
            //}).then(result => {
            //    return this._tokenHandler.decodeToken(result);
            //});

            return $http(url).post<SceneEndpoint>({}, {
                type: "POST",
                url: url,
                headers: {
                    "Accept": "application/json",
                    "x-version": "1.0.0"
                },
                dataType: "json",
                contentType: "application/json",
                data: JSON.stringify(userData)
            })
                .then(result => this._tokenHandler.decodeToken(result))
                .catch(error => console.log("error", error));
        }
    }
}
