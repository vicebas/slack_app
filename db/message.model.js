const { Table, Entity } = require("dynamodb-toolbox");
const { v4: uuidv4 } = require('uuid');
const DynamoDB = require("aws-sdk/clients/dynamodb");
const DocumentClient = new DynamoDB.DocumentClient();

class Message {

        constructor(workspace, userId,  user, status, external, text, pk = uuidv4()){
            this.workspace = workspace;
            this.userId = userId;
            this.user = user;
            this.status = status;
            this.pk = pk;
            this.text = text;
            this.external = external;
            this.sk = `${this.workspace}-${this.userId}`;
        }
        setSK(){
            this.sk = `${this.workspace}-${this.userId}`;
        }
        setWorkspace(workspace){
            this.workspace = workspace;
            this.setSK();
        }
        setUser(userId, user){
            this.userId = userId;
            this.user = user;
            this.setSK();
        }
        setStatus(status){
            this.status = status;
        }
        setPK(pk){
            this.pk = pk;
        }



        static table = new Table({
            // Specify table name (used by DynamoDB)
            name: "Messages",

            // Define partition and sort keys
            partitionKey: "pk",
            sortKey: "sk",
            indexes:{
                "workspaceIndex": {
                    partitionKey: "workspace",
                }
            },

            // Add the DocumentClient
            DocumentClient,
        });
        static entity = new Entity({
            // Specify entity name
            name: "Message",

            // Define attributes
            attributes: {
                pk: { partitionKey: true },
                sk: { hidden: true, sortKey: true },
                workspace: { type: "string" },
                userId: {  type: "string"  },
                user: {  type: "string"  },
                text: {  type: "string"  },
                external: { type: "boolean" },
                status: { type: "boolean" },
            },

            // Assign it to our table
            table: Message.table,
        });
        toObject(){
            return{
                pk: this.pk,
                sk: this.sk,
                workspace: this.workspace,
                userId: this.userId,
                user: this.user,
                text: this.text,
                external: this.external,
                status: this.status,
            }
        }
        save(){
            return Message.entity.put(this.toObject());
        }
    static async  get(messageId) {
        return new Message(...(await Message.entity.get({pk: messageId}))['Item'])
    }

    static async  list(teamId) {
        const messages = (await Message.entity.query( teamId, {index:'workspaceIndex'}))['Items'];
        return messages.map(message => new Message(message.workspace, message.userId, message.user, message.status, message.external, message.text, message.pk))
    }

}
module.exports = Message;
