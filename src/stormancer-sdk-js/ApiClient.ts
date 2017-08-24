/** @namespace Stormancer */
namespace Stormancer {

    export class ApiClient {

        constructor(config: Configuration, tokenHandler: ITokenHandler) {
            this._config = config;
            this._tokenHandler = tokenHandler;
        }

        private _config: Configuration;

        private createTokenUri = "{0}/{1}/scenes/{2}/token";

        private _tokenHandler: ITokenHandler;

        public getSceneEndpoint(accountId: string, applicationName: string, sceneId: string, userData: any): Promise<SceneEndpoint> {
            var url = this._config.getApiEndpoint() + Helpers.stringFormat(this.createTokenUri, accountId, applicationName, sceneId);
            
            var promise = $http(url).post<string>({}, {
                type: "POST",
                url: url,
                headers: {
                    "Accept": "application/json",
                    "x-version": "1.0.0"
                },
                dataType: "json",
                contentType: "application/json",
                data: JSON.stringify(userData)
            }).then(result => this._tokenHandler.decodeToken(JSON.parse(result)))
            promise.catch(error => console.error("get token error:" + error));
            return promise;
        }
    }
}
