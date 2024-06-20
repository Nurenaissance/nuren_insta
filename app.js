import axios from 'axios';
import express from 'express';



const express = require('express');
const app = express();

app.use(express.json());

const PORT = 5173;
let accessToken;
const WEBHOOK_VERIFY_TOKEN = 'NOICE';
let pageID;
let userIGSID;

// Use a wildcard for allowed origins
const allowedOrigins = ['*'];

app.use((req, res, next) => {
  // If you want to allow all origins
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Alternatively, if you want to allow specific origins, you could use:
  // const origin = req.headers.origin;
  // if (allowedOrigins.includes(origin)) {
  //   res.setHeader('Access-Control-Allow-Origin', origin);
  // }

  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token, X-Api-Version'
  );
  res.header(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS, PATCH'
  );

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});
  

const inputMap = new Map();
var currNode=4
var adjList;
var flow, ice_breakers, pers_menu;
var name;
var mentionReply, commentReply, privateReply;

app.post("/ig-flowdata" , async (req,res) => {
    adjList=req.body.adjacencyList;
    flow = req.body.nodes;
    ice_breakers = req.body.ice_breakers;
    if(ice_breakers) set_iceBreakers(ice_breakers)
    pers_menu = req.body.pers_menu;
    if(pers_menu) set_persMenu(pers_menu)
    mentionReply = req.body.reply?.to_mentions;
    commentReply = req.body.reply?.to_comments;
    privateReply = req.body.reply?.to_private;

    console.log("REC DATA: ", req.body)

    res.status(200).json({ success: true, message: "flowdata sent successfully"});
})

async function set_persMenu(pers_menu){
    let cta = [];
    let type;
    for(let i=0;i<pers_menu.length;i++){
        if(pers_menu[i].type == 'link') {
            cta.push({
                type : "web_url",
                title : pers_menu[i].body,
                url : pers_menu[i].reply
            })
        }
        else if(pers_menu[i].type == 'text'){
            cta.push({
                type : "postback",
                title : pers_menu[i].body,
                payload : `20${i}`
            })
        }
    }
    try{
        const response = await axios.post(`https://graph.facebook.com/v11.0/${pageID}/messenger_profile?platform=instagram&access_token=${accessToken}` ,{
            
            persistent_menu : [
                {
                    call_to_actions : cta,
                    locale : "default"
                }
            ]
        })
        console.log("persistent menu set successfully")
        return response.data
    } catch (error) {
        console.error("ERROR in setting persistent menu", error.response.data);
        return null;
    }
}

async function set_iceBreakers(ice_breakers){
    let cta = [];
    for(let i=0;i<ice_breakers.length;i++){
        cta.push({
            question : ice_breakers[i].body,
            payload : ice_breakers[i].id
        })
    }
    try{
        const response = await axios.post(`https://graph.facebook.com/v11.0/${pageID}/messenger_profile?platform=instagram&access_token=${accessToken}` ,{
            platform : "instagram",
            ice_breakers : [
                {
                    call_to_actions : cta,
                    locale : "default"
                }
            ]
        })
        console.log("ice breakers set successfully")
        return response.data
    } catch (error) {
        console.error("ERROR in setting ice breakers", error.response.data);
        return null;
    }
}
//quick replies
async function sendQuickReplies(main_text, replies, rec_id){
    let quick_replies=[]
    for(let i=0;i<replies.length;i++){
        const reply = replies[i];
        quick_replies.push({
            type : "postback",
            title : flow[reply].body,
            payload : flow[reply].id 
        })
    }
    try {
        const response = await axios.post(`https://graph.facebook.com/v19.0/${pageID}/messages?access_token=${accessToken}`, {
            recipient : {
                id : rec_id
              },
              messaging_type : "RESPONSE",
               message :{
                 text : main_text,
                 quick_replies :quick_replies
              }
        });
        return response.data
    } catch (error) {
        console.error("ERROR in sending quick reply", error.response.data);
        return null;
    }
}

async function setGenericElement(buttons, title, subtitle, rec_id, url, image_url){
    let cta = [];
    for(let i=0;i<buttons.length;i++){
        const buttonNode = buttons[i];
        if(flow[buttonNode].type == 'link') {
            cta.push({
                type : "web_url",
                title : flow[buttonNode].body,
                url : flow[buttonNode].url
            })
        }
        else if(flow[buttonNode].type == 'text'){
            cta.push({
                type : "postback",
                title : flow[buttonNode].body,
                payload : flow[buttonNode].id.toString()
            })
        }
    }
    console.log("GENERIC ROWS ", cta)
    try {
       let elements={}
       if(title) elements.title = title;
       if(image_url) elements.image_url = image_url;
       if(subtitle) elements.subtitle = subtitle;
       if(url) elements.default_action={
        type: "web_url",
        url: url
       };
       elements.buttons=cta;
        const response = await axios.post(`https://graph.facebook.com/v19.0/${pageID}/messages?access_token=${accessToken}`, {
            recipient : {
                id : rec_id
              },
               message :{
                attachment : {
                    type : "template",
                    payload: {
                        template_type : "generic",
                        elements : [
                            elements
                        ]
                    }
                }
              }
        });
        return response.data
    } catch (error) {
        console.error("ERROR in sending generic template", error.response.data);
        return null;
    }
    
}

async function sendButtons(buttons, main_text, rec_id){
    let button_rows=[]
    console.log("BUTTONS: " ,buttons)
    for(let i=0;i<buttons.length;i++){
        const buttonNode=buttons[i];
        if(flow[buttonNode].type == "link") {
            button_rows.push({
                type : "web_url",
                title : flow[buttonNode].body,
                url : flow[buttonNode].url
            })
        }
        else if(flow[buttonNode].type == "text"){
            console.log("BTTON TYPE TEXT")
            button_rows.push({
                type : "postback",
                title : flow[buttonNode].body,
                payload : flow[buttonNode].id.toString()
            })
        }
        console.log("TEST")
    }
    console.log("BUTTON ROWS ", button_rows)
    try {
        const response = await axios.post(`https://graph.facebook.com/v19.0/${pageID}/messages?access_token=${accessToken}`, {
            recipient : {
                id : rec_id
              },
               message :{
                attachment : {
                    type : "template",
                    payload: {
                        template_type : "button",
                        text: main_text,
                        buttons : button_rows
                    }
                }
              }
        });
        return response.data
    } catch (error) {
        console.error("ERROR in sending buttons", error.response.data);
        return null;
    }
}

async function sendString(message, rec_id){
    try {
        const response = await axios.post(`https://graph.facebook.com/v19.0/${pageID}/messages?access_token=${accessToken}`, {
            recipient : {
                id : rec_id
              },
               message :{
                text: message
              }
        });
        return response.data
    } catch (error) {
        console.error("ERROR in sending string message", error.response.data);
        return null;
    }
}

var nextNode;

async function sendNodeMessage(node, rec_id){
    if(node == 4 || nextNode.length != 0){
        console.log("NODE: ", node)
        nextNode = adjList[node];
        const node_message = flow[node].body;
        if(flow[node].type === "generic"){
            const buttons = nextNode;
            const title = flow[node].title
            const subtitle = flow[node].subtitle
            const url = flow[node].url
            const image_url = flow[node].image_url
            sendGeneric(buttons, title, subtitle, rec_id, url, image_url)
        }
        else if(flow[node].type === "button"){
            const buttons = nextNode;
            sendButtons(buttons, node_message, rec_id)
        }
        else if(flow[node].type === 'quick_replies'){
            const replies = nextNode;
            sendQuickReplies(node_message, replies, rec_id)
        }
        else if(flow[node].type === "string"){
            await sendString(node_message, rec_id)
            currNode = nextNode[0];
            sendNodeMessage(currNode, rec_id);
        }
        else if(flow[node].type === "input"){
            sendString(node_message, rec_id)
        }
    }
    else {
        currNode = 4;
        nextNode = adjList[currNode];
    }
}

async function replyToMentions(entryID, mediaID, commentID, message){
    try {
        const response = await axios.post(`https://graph.facebook.com/${entryID}/mentions`, {
            message: message,
            comment_id : commentID,
            media_id: mediaID,
            access_token: accessToken
        });
        return response.data
    } catch (error) {
        console.error("ERROR ", error.response.data);
        return null;
    }
}

async function replyToComment(commentID, message) {
    try {
        const response = await axios.post(`https://graph.facebook.com/${commentID}/replies`, {
            message: message,
            access_token: accessToken
        });
        return response.data;
    } catch (error) {
        console.error("ERROR in replying to comment", error.response.data);
        return null;
    }
}

async function replyToComment_private(commentID, message){
    try {
        const response = await axios.post(`https://graph.facebook.com/${pageID}/messages`, {
            recipient : {
                comment_id : commentID
            },
            message : {
                text : message
            },
            access_token: accessToken
        });
        return response.data;
    } catch (error) {
        console.error("ERROR in replying to comment", error.response.data);
        return null;
    }
}

async function getUserInfo() {
    try {
        const response = await axios.get(`https://graph.facebook.com/v19.0/${pageID}?fields=id%2Cname%2Caccess_token%2Cinstagram_business_account&access_token=${accessToken}`);
        console.log("RESONSE " ,response.data)

    } catch (error) {
        console.error('Error fetching user account information:', error.response ? error.response.data : error.message);
        return null;
    }
}

async function getPageInfo(user_access_token){
    try{
        const response = await axios.get('https://graph.facebook.com/v20.0/me/accounts' ,{
            params : {
                access_token : user_access_token
            }
        });
        accessToken = response.data.data[0].access_token;
        pageID = response.data.data[0].id;
        console.log(response.data)
    }
    catch (error) {
        console.error('Error fetching page access token:', error.response ? error.response.data : error.message);
        return null;
    }
}

async function getInstagramID(){
    try{
        const response = await axios.get(`https://graph.facebook.com/v20.0/${pageID}`,{
            params:{
                fields : 'instagram_business_account',
                access_token : accessToken
            }
        })
        userIGSID = response.data.instagram_business_account.id;
        console.log(userIGSID);
        
    }catch (error) {
        console.error('Error fetching user IGSID:', error.response ? error.response.data : error.message);
        return null;
    }
}
app.post("/postImage" ,async (req,res) => {
    const image_url = req.body.image_url;
    const user_access_token = req.body.access_token;
    const caption = req.body?.caption;

    await getPageInfo(user_access_token);
    await getInstagramID()

    const mediaID= await uploadMedia(image_url, caption);

    res.status(200).send(mediaID)

})
async function uploadMedia(image_url, caption){
    try {
        // Uploading image in container
        const uploadResponse = await axios.post(`https://graph.facebook.com/v19.0/${userIGSID}/media`, {
            access_token: accessToken,
            image_url: image_url,
            caption : caption
        });
        const creation_id = uploadResponse.data.id;

        // Publishing container to Instagram page
        const publishResponse = await axios.post(`https://graph.facebook.com/v19.0/${userIGSID}/media_publish`, {
            access_token: accessToken,
            creation_id: creation_id
        });
        const mediaID = publishResponse.data.id;

        console.log("MEDIA SUCCESSFULLY UPLOADED WITH MEDIA ID:", mediaID);
        return mediaID;
    } catch (error) {
        console.error('Error uploading media:', error.response ? error.response.data : error.message);
        return null;
    }
}


var last_timestamp;
app.post("/webhook", async (req, res) => {
    
    console.log("RECEIVED WEBHOOK:", JSON.stringify(req.body, null, 2));
    const bodyType = req.body.entry?.[0].changes?.[0].field;
    //replying to commments
    if(bodyType == "comments") {
        if(commentReply){
        const commentID = req.body.entry?.[0].changes?.[0].value?.id;
        const message = commentReply;
        const parentID = req.body.entry?.[0].changes?.[0].value?.parent_id;

        if(parentID == undefined) replyToComment(commentID, message);
        }
        else if(privateReply){
            const commentID = req.body.entry?.[0].changes?.[0].value?.id;
            const message = privateReply;
            replyToComment_private(commentID, message)
        }
    }

    //replying to mentions
    else if(bodyType == "mentions") {
        const mention_reply = mentionReply;
        const commentID = req.body.entry?.[0].changes?.[0].value?.comment_id 
        const mediaID = req.body.entry?.[0].changes?.[0].value?.media_id
        const entryID = req.body.entry?.[0].id

        replyToMentions(entryID, mediaID, commentID, mention_reply);

    }

    //replying to messages
    else {
        const message_body=req.body.entry?.[0].messaging?.[0]
        const rec_id = message_body.sender.id;
        

        if(rec_id != userIGSID && !message_body.message?.is_deleted){
        
        
        const postback = message_body?.postback;
        const message = message_body?.message;
        // name = await getUserInfo(rec_id);
        // console.log("RECID: ", rec_id)
        if(postback){
            let postbackID=parseInt(postback.payload);

            if(postbackID < 300 && postbackID >= 200){
                const id= postbackID%200
                const reply = pers_menu[id].reply
                sendString(reply, rec_id)
            }
            else{
                console.log("POSTBACKID ", postbackID)
            nextNode.forEach(i => {
                console.log("TEST1")
                if(flow[i].id == postbackID){
                  currNode = i;
                  nextNode = adjList[currNode];
                  currNode = nextNode[0];
                  console.log("CURRNODE ", currNode)
                  sendNodeMessage(currNode, rec_id);
                  return;
                }
            })
            console.log("TEST2")
            }
        }
        else if(message){
            if(currNode!=4){
                inputMap.set(currNode, message.text)
                currNode=nextNode[0];
            }
            sendNodeMessage(currNode, rec_id)
        }
        }
    }


    res.sendStatus(200);
    
});



app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
        res.status(200).send(challenge);
        console.log("Webhook verified successfully!");
    } else {
        res.sendStatus(403);
    }
});

app.get("/", (req, res) => {
    res.send(`<pre>Nothing to see here. Checkout README.md to start.</pre>`);
});

const server = app.listen(PORT, () => {
    console.log(`Server is listening on port: ${PORT}`);
});