const {WebClient} = require('@slack/web-api');
require('dotenv').config()
const axios = require('axios');
const qs = require('qs');
const OAuthToken = require('./db/token.model.js');
const Message = require('./db/message.model.js');


const handler = async (event) => {
    const body = JSON.parse(event.body);
    if (body.challenge) {
        return {
            statusCode: 200,
            headers: {'Content-Type': 'text/plain'},
            body: body.challenge,
        };
    }
    // Ignore messages from bot in IM
    const {channel_type: channelType, bot_id: botId} = body.event;
    if (channelType === 'im' && botId) {
        return {statusCode: 200};
    }

    if (body.event) {
        const {team_id: team, event} = body
        const {text, user, team: teamUser} = event;
        const token = await OAuthToken.get(team);
        if(team == teamUser && !body.authorizations[0].is_bot) {
            return {statusCode: 200};
        }


        const wc = new WebClient(token.token);
        const userData = await wc.users.info({user})
        console.log(userData)
        const message = new Message(team, userData.user.id, userData.user.name, false,  team == teamUser, text)
        await message.save()
        await listMessage(token.token, team,token.userId )
    }


    return {statusCode: 200};
};

const authorize = async (event) => {
    try {
        const response = await axios.post('https://slack.com/api/oauth.v2.access', qs.stringify({
            client_id: process.env.SLACK_CLIENT_ID,
            client_secret: process.env.SLACK_CLIENT_SECRET,
            code: event.multiValueQueryStringParameters.code[0],
            redirect_uri: process.env.SLACK_REDIRECT_URI,
        }));
        if (!response.data.ok) {
            console.log(response.data.error)
            return {
                statusCode: 200,
                headers: {'Content-Type': 'text/plain'},
                body: `Not Authorized: ${response.data.error}`,
            };
        }
        console.log(response.data)
        const {access_token, scope, team, bot_user_id, authed_user} = response.data;
        const oAuthToken = new OAuthToken(access_token, team.id, team.name, bot_user_id,authed_user.id );
        await oAuthToken.save();
        console.log('Saved token');
        return {
            statusCode: 200,
            headers: {'Content-Type': 'text/plain'},
            body: `You can close this window now`,
        };
    } catch (error) {
        console.log(error);
        return {
            statusCode: 500,
            headers: {'Content-Type': 'text/plain'},
            body: error.message,
        };
    }
};

const listMessage = async (token, teamId,user ) => {
    let message = await Message.list(teamId)
    message = message.map( (item) =>
            JSON.parse("[\n" +
            "\t\t{\n" +
            "\t\t\t\"type\": \"section\",\n" +
            "\t\t\t\"text\": {\n" +
            "\t\t\t\t\"type\": \"mrkdwn\",\n" +
            `\t\t\t\t\"text\": \"You have a new request:\\n*${item.user} - ${item.text}*\"\n` +
            "\t\t\t}\n" +
            "\t\t},\n" +
            "\t\t{\n" +
            "\t\t\t\"type\": \"section\",\n" +
            "\t\t\t\"text\": {\n" +
            "\t\t\t\t\"type\": \"mrkdwn\",\n" +
            "\t\t\t\t\"text\": \"Status\"\n" +
            "\t\t\t},\n" +
            "\t\t\t\"accessory\": {\n" +
            "\t\t\t\t\"type\": \"static_select\",\n" +
            "\t\t\t\t\"initial_option\": {\n" +
            "\t\t\t\t\t\"text\": {\n" +
            "\t\t\t\t\t\t\"type\": \"plain_text\",\n" +
            `\t\t\t\t\t\t\"text\": \"${item.status?'Complete':'Open'}\"\n` +
            "\t\t\t\t\t},\n" +
            `\t\t\t\t\t\"value\": \"${item.status?'true':'false'}\"\n` +
            "\t\t\t\t},\n" +
            "\t\t\t\t\"placeholder\": {\n" +
            "\t\t\t\t\t\"type\": \"plain_text\",\n" +
            "\t\t\t\t\t\"text\": \"Select an item\",\n" +
            "\t\t\t\t\t\"emoji\": true\n" +
            "\t\t\t\t},\n" +
            "\t\t\t\t\"options\": [\n" +
            "\t\t\t\t\t{\n" +
            "\t\t\t\t\t\t\"text\": {\n" +
            "\t\t\t\t\t\t\t\"type\": \"plain_text\",\n" +
            "\t\t\t\t\t\t\t\"text\": \"Open\"\n" +
            "\t\t\t\t\t\t},\n" +
            "\t\t\t\t\t\t\"value\": \"false\"\n" +
            "\t\t\t\t\t},\n" +
            "\t\t\t\t\t{\n" +
            "\t\t\t\t\t\t\"text\": {\n" +
            "\t\t\t\t\t\t\t\"type\": \"plain_text\",\n" +
            "\t\t\t\t\t\t\t\"text\": \"Complete\"\n" +
            "\t\t\t\t\t\t},\n" +
            "\t\t\t\t\t\t\"value\": \"true\"\n" +
            "\t\t\t\t\t}\n" +
            "\t\t\t\t],\n" +
            "\t\t\t\t\"action_id\": \"static_select-action\"\n" +
            "\t\t\t}\n" +
            "\t\t}\n" +
            "\t]\n")
        );
    console.log(JSON.stringify(
       {
            "blocks": [].concat(...message)
        }
    ));
    const response = await axios.post('https://slack.com/api/views.publish', {

        user_id: user,
        view: {
            "type": "home",
            "blocks": [].concat(...message)
        }
    }, { headers: { Authorization: `Bearer ${token}` } });

    console.log(response.data)
    return response.data;
}



module.exports = {handler, authorize, listMessage};
