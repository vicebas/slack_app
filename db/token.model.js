const {Table, Entity} = require("dynamodb-toolbox");
const {v4: uuidv4} = require('uuid');
var AWS = require("aws-sdk");
const DynamoDB = require("aws-sdk/clients/dynamodb");
AWS.config.update({
    endpoint: "http://localhost:8000"
});
const DocumentClient = new DynamoDB.DocumentClient();

class OAuthToken {
    static table = new Table({
        name: "oauthTokens",
        partitionKey:  "teamId",
        DocumentClient
    });
    static entity = new Entity({
        // Specify entity name
        name: "OAuthToken",

        // Define attributes
        attributes: {
            token: {type: "string"},
            teamId: {type: "string", partitionKey: true},
            teamName: {type: "string"},
            clientId: {type: "string"},
            userId: {type: "string"},
        },
        table: OAuthToken.table
    });

    constructor(token, teamId, teamName, clientId, userId) {
        this.token = token;
        this.teamId = teamId;
        this.teamName = teamName;
        this.clientId = clientId;
        this.userId = userId;

    }

    toObject() {
        return {
            token: this.token,
            teamId: this.teamId,
            teamName: this.teamName,
            clientId: this.clientId,
            userId: this.userId,
        }
    }

    save() {
      console.log(this.toObject())
        return OAuthToken.entity.put(this.toObject());
    }
    static async  get(teamId) {
        const {token, clientId, teamName, userId } =(await OAuthToken.entity.get({teamId: teamId}))['Item'];
        return new OAuthToken(token, teamId, clientId, teamName, userId)
    }
}

module.exports = OAuthToken;
