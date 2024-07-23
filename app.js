import axios from 'axios';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
const app = express();
const PORT = 5173;
app.use(express.json());
app.use(cors()); 
const server = app.listen(PORT, () => {
    console.log(`Server is listening on port: ${PORT}`);
});
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for simplicity, modify as needed
    methods: ['GET', 'POST'],
  },
});


let accessToken
const WEBHOOK_VERIFY_TOKEN = 'NOICE';
let pageID ;
let userIGSID;

  
const allowedOrigins =['*']
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token, X-Api-Version'
  );
  res.header(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS, PATCH'
  );

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
    if(!accessToken){
    await getPageInfo('EAAVZBobCt7AcBO0dMSwS2ZBezKgPYoqe8FVOsbjkucIoYWy2Q1oyON9YbAXn9zF34QtTv1P0HMu8vTK9b4qomL7sjAoXxq9I3Uq3kNyOHn2TSQ84Xwmq7Pi9aOEQeZAe3KoQwnKN7CB0rbhNEwuqwC7sWXarNR4ZB6xh4W2ZCr6yClyWB3O4KnbF4BAZDZD');
    }
    try {
        const response = await axios.post(`https://graph.facebook.com/v19.0/${pageID}/messages?access_token=${accessToken}`, {
            recipient : {
                id : rec_id
              },
               message :{
                text: message
              }
        });
        const response1 = await axios.get(`https://graph.facebook.com/${pageID}/messages`);
        console.log("loooook here",response1.data);
        
        return response1.data
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
    console.log("commentandeverything{----------",commentID);
    console.log("commentandeverything{----------",message);
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
    console.log("commentandeverything{----------",commentID)
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

const getInstagramConversations = async () => {
  try {
    const response = await axios.get(`https://graph.facebook.com/v20.0/${pageID}/conversations?fields=id,name&platform=instagram`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const conversations = response.data.data;

    // Extract id and name from each conversation
    const extractedData = conversations.map(conversation => ({
      id: conversation.id,
      name: conversation.name
    }));

    console.log(extractedData); // This will log the extracted data

    // Send the extracted data to the frontend
    // Here you can send it using your preferred method, e.g., a response in an Express endpoint
    return extractedData;

  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
};

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
    const isStory=req.body.isStory;

    await getPageInfo('EAAVZBobCt7AcBO0dMSwS2ZBezKgPYoqe8FVOsbjkucIoYWy2Q1oyON9YbAXn9zF34QtTv1P0HMu8vTK9b4qomL7sjAoXxq9I3Uq3kNyOHn2TSQ84Xwmq7Pi9aOEQeZAe3KoQwnKN7CB0rbhNEwuqwC7sWXarNR4ZB6xh4W2ZCr6yClyWB3O4KnbF4BAZDZD');
    await getInstagramID();
    console.log("Thjis isss a story",isStory)
    const mediaID= await uploadMedia(image_url, caption,isStory);

    res.status(200).send(mediaID)

})


app.post('/post-video', async (req, res) => {
    const { video_url, isReel } = req.body;

    if (!video_url) {
        return res.status(400).send({ error: 'video_url is required' });
    }

    //const mediaType = isReel ? 'REELS' : 'VIDEO';
    await getPageInfo('EAAVZBobCt7AcBO0dMSwS2ZBezKgPYoqe8FVOsbjkucIoYWy2Q1oyON9YbAXn9zF34QtTv1P0HMu8vTK9b4qomL7sjAoXxq9I3Uq3kNyOHn2TSQ84Xwmq7Pi9aOEQeZAe3KoQwnKN7CB0rbhNEwuqwC7sWXarNR4ZB6xh4W2ZCr6yClyWB3O4KnbF4BAZDZD');
    await getInstagramID();

    try {
        // Step 1: Create a media post
        const mediaResponse = await axios.post(
            `https://graph.facebook.com/v20.0/${userIGSID}/media`,
            {
                media_type:'REELS',
                video_url: video_url
                //upload_type: 'resumable'
            },
            {
                params: {
                    access_token: accessToken
                }
            }
        );

        const mediaId = mediaResponse.data.id;

        // Step 2: Check upload status before publishing
        const checkStatusUri = `https://graph.facebook.com/v20.0/${mediaId}?fields=status_code&access_token=${accessToken}`;
        const isUploaded = await isUploadSuccessful(0, checkStatusUri);

        if (isUploaded) {
            // Step 3: Publish the media
            const publishResponse = await axios.post(
                `https://graph.facebook.com/v20.0/${userIGSID}/media_publish`,
                {
                    creation_id: mediaId
                },
                {
                    params: {
                        access_token: accessToken
                    }
                }
            );

            const publishedMediaId = publishResponse.data.id;

            // Step 4: Get PermaLink to redirect the user to the post
            const permaLinkUri = `https://graph.facebook.com/v20.0/${publishedMediaId}?fields=permalink&access_token=${accessToken}`;
            const permalinkResponse = await axios.get(permaLinkUri);
            const permalink = permalinkResponse.data.permalink;

            res.send({
                success: true,
                publishedMediaId,
                permalink
            });
        } else {
            res.status(500).send({ error: 'Reel upload failed or timed out' });
        }
    } catch (error) {
        console.error('Error posting reel:', error);

        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Error response data:', error.response.data);
            console.error('Error response status:', error.response.status);
            res.status(500).send({ error: `Failed to post reel on Instagram: ${error.response.data.error.message}` });
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received:', error.request);
            res.status(500).send({ error: 'No response received from Instagram API' });
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error setting up the request:', error.message);
            res.status(500).send({ error: 'Error setting up request to Instagram API' });
        }
    }
});
function _wait(n) { return new Promise(resolve => setTimeout(resolve, n)); }
// Function to check upload status
const isUploadSuccessful = async(retryCount, checkStatusUri) => {
    try {
        if (retryCount > 30) return false;
        const response = await axios.get(checkStatusUri);
        if(response.data.status_code != "FINISHED") {
            await _wait(3000);
            await isUploadSuccessful(retryCount+1, checkStatusUri);
        }
        return true;
    } catch(e) {
        throw e;
    }
}
app.post('/uploadCarousel', async (req, res) => {
    try {
        console.log('Starting carousel upload process...');
        await getPageInfo('EAAVZBobCt7AcBO0dMSwS2ZBezKgPYoqe8FVOsbjkucIoYWy2Q1oyON9YbAXn9zF34QtTv1P0HMu8vTK9b4qomL7sjAoXxq9I3Uq3kNyOHn2TSQ84Xwmq7Pi9aOEQeZAe3KoQwnKN7CB0rbhNEwuqwC7sWXarNR4ZB6xh4W2ZCr6yClyWB3O4KnbF4BAZDZD');
        await getInstagramID();

        const { image_urls, caption } = req.body;
        console.log('Received image URLs:', image_urls);

        const mediaIDs = [];

        for (const url of image_urls) {
            console.log(`Processing media URL: ${url}`);

            let postData;

            if (isVideoUrl(url)) {
                postData = {
                    video_url: url,
                    is_carousel_item: true,
                    access_token: accessToken,
                    media_type: 'VIDEO',
                    caption: caption || ''
                };
            } else {
                postData = {
                    image_url: url,
                    is_carousel_item: true,
                    access_token: accessToken,
                    media_type: 'IMAGE',
                    caption: caption || ''
                };
            }

            // Step 1: Create media post
            console.log(`Creating media post for URL: ${url}`);
            const response = await axios.post(`https://graph.facebook.com/v20.0/${userIGSID}/media`, postData, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const responseData = response.data;

            if (!response.data.id) {
                throw new Error(`Error uploading carousel media ${url}: ${response.data.error.message}`);
            }
            console.log(`Media post created successfully for URL: ${url}`);
            const checkStatusUri = `https://graph.facebook.com/v20.0/${response.data.id}?fields=status_code&access_token=${accessToken}`;
            console.log(`Checking upload status for media ${url}`);
            const isUploaded = await isUploadSuccessful(0, checkStatusUri);

            if (!isUploaded) {
                throw new Error(`Upload for media ${url} failed or timed out`);
            }

            mediaIDs.push(responseData.id);
            console.log(`Upload status check successful for media ${url}`);
        }

        // Create carousel container
        console.log('Creating carousel container...');
        const createContainerData = {
            caption: caption,
            media_type: 'CAROUSEL',
            children: mediaIDs.join(','),
            access_token: accessToken
        };

        const containerResponse = await axios.post(`https://graph.facebook.com/v20.0/${userIGSID}/media`, createContainerData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const containerData = containerResponse.data;

        if (!containerData.id) {
            throw new Error(`Error creating carousel container: ${containerData.error.message}`);
        }
        console.log('Carousel container created successfully:', containerData);

        // Check upload status for the container
        const checkStatusUri = `https://graph.facebook.com/v20.0/${containerData.id}?fields=status_code&access_token=${accessToken}`;
        const isUploaded2 = await isUploadSuccessful(0, checkStatusUri);

        // Publish the carousel
        console.log('Publishing carousel...');
        if (!isUploaded2) {
            throw new Error(`Upload for media ${containerData.id} failed or timed out`);
        } else {
            const publishResponse = await axios.post(`https://graph.facebook.com/v20.0/${userIGSID}/media_publish?creation_id=${containerData.id}&access_token=${accessToken}`);
            if (publishResponse.status !== 200) {
                throw new Error(`Error publishing carousel: ${publishResponse.data.error.message}`);
            }

            const publishData = publishResponse.data;
            console.log('Carousel published successfully:', publishData);
            res.status(200).json({ carousel_media_id: publishData.id });
        }
    } catch (error) {
        console.error('Error uploading carousel media:', error);
        res.status(500).json({ error: 'Error uploading carousel media' });
    }
});


// Function to check if URL is a video URL
const isVideoUrl = (url) => {
    const videoExtensions = ['.mp4', '.avi', '.mov']; // Add more extensions if needed
    return videoExtensions.some(ext => url.includes(ext));
};


app.post('/fetch-conversation', async (req, res) => {
    await getPageInfo('EAAVZBobCt7AcBO0dMSwS2ZBezKgPYoqe8FVOsbjkucIoYWy2Q1oyON9YbAXn9zF34QtTv1P0HMu8vTK9b4qomL7sjAoXxq9I3Uq3kNyOHn2TSQ84Xwmq7Pi9aOEQeZAe3KoQwnKN7CB0rbhNEwuqwC7sWXarNR4ZB6xh4W2ZCr6yClyWB3O4KnbF4BAZDZD');
    const { conversationId } = req.body;
  
    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId and accessToken are required' });
    }
  
    const url = `https://graph.facebook.com/v20.0/${conversationId}/messages`;
    const params = {
      fields: 'message,from,id,attachments{name}',
      limit: 50,
      pretty: 0,
      access_token: accessToken
    };
  
    try {
      const response = await axios.get(url, { params });
      res.json(response.data);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ error: 'Failed to fetch conversation' });
    }
  });

app.post('/fetch-media', async (req, res) => {
    await getPageInfo('EAAVZBobCt7AcBO0dMSwS2ZBezKgPYoqe8FVOsbjkucIoYWy2Q1oyON9YbAXn9zF34QtTv1P0HMu8vTK9b4qomL7sjAoXxq9I3Uq3kNyOHn2TSQ84Xwmq7Pi9aOEQeZAe3KoQwnKN7CB0rbhNEwuqwC7sWXarNR4ZB6xh4W2ZCr6yClyWB3O4KnbF4BAZDZD');
    await getInstagramID();

    if (!userIGSID || !accessToken) {
        return res.status(400).json({ error: 'userIGSID and accessToken are required' });
    }

    const url = `https://graph.facebook.com/v20.0/${userIGSID}`;
    const params = {
        fields: 'media',
        access_token: accessToken
    };

    try {
        const response = await axios.get(url, { params });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching media IDs:', error);
        res.status(500).json({ error: 'Failed to fetch media IDs' });
    }
});
app.post('/fetch-single-post', async (req, res) => {
    await getPageInfo('EAAVZBobCt7AcBO0dMSwS2ZBezKgPYoqe8FVOsbjkucIoYWy2Q1oyON9YbAXn9zF34QtTv1P0HMu8vTK9b4qomL7sjAoXxq9I3Uq3kNyOHn2TSQ84Xwmq7Pi9aOEQeZAe3KoQwnKN7CB0rbhNEwuqwC7sWXarNR4ZB6xh4W2ZCr6yClyWB3O4KnbF4BAZDZD');
    await getInstagramID();

    const { mediaID } = req.body;

    if (!mediaID || !userIGSID || !accessToken) {
        return res.status(400).json({ error: 'mediaID, userIGSID, and accessToken are required' });
    }

    const url = `https://graph.facebook.com/v20.0/${mediaID}`;
    const params = {
        fields: 'comments{text,username,replies{username,text}},caption,media_url,comments_count,children',
        access_token: accessToken
    };

    try {
        const response = await axios.get(url, { params });
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching media details:', error);
        res.status(500).json({ error: 'Failed to fetch media details' });
    }
});
async function uploadMedia(image_url, caption,isStory){
    const mediaType = isStory ? 'STORIES' : 'IMAGE';
    console.log("this is media type for stoty",mediaType);
    try {
        // Uploading image in container
        const uploadResponse = await axios.post(`https://graph.facebook.com/v19.0/${userIGSID}/media`, {
            access_token: accessToken,
            image_url: image_url,
            media_type: mediaType,
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
    var isEcho='FALSE';
    console.log("RECEIVED WEBHOOK:", JSON.stringify(req.body, null, 2));
    const bodyType = req.body.entry?.[0].changes?.[0].field;
    //replying to commments
    if(bodyType == "comments") {
        const commentID = req.body.entry?.[0].changes?.[0].value?.id;
        const message = req.body.entry?.[0].changes?.[0].value?.text;
        const mediaID = req.body.entry?.[0].changes?.[0].value?.media?.id;
        io.emit('new_comment_insta', { commentID, message, mediaID });
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
        const message_body = req.body.entry?.[0].messaging?.[0];
        const rec_id = message_body.sender.id;
    
        if (rec_id !== userIGSID && !message_body.message?.is_deleted) {
          const postback = message_body?.postback;
          const message = message_body?.message;
            console.log("This is a long one:::::::::::::::::::::::::",req.body.entry);
          isEcho = message_body.message?.is_echo;
          if(!isEcho){
          io.emit('new_message_insta', { message, rec_id });}
    
          if (postback) {
            let postbackID = parseInt(postback.payload);
    
            if (postbackID < 300 && postbackID >= 200) {
              const id = postbackID % 200;
              const reply = pers_menu[id].reply;
              sendString(reply, rec_id);
            } else {
              nextNode.forEach(i => {
                if (flow[i].id === postbackID) {
                  currNode = i;
                  nextNode = adjList[currNode];
                  currNode = nextNode ? nextNode[0] : null;
                  if (currNode === null || adjList[currNode] === undefined) {
                    console.log('No next node available');
                    return;
                  }
                  sendNodeMessage(currNode, rec_id);
                  return;
                }
              });
            }
          } else if (message) {
            return;
            if (currNode !== 4) {
              inputMap.set(currNode, message.text);
              currNode = nextNode ? nextNode[0] : null;
            }
            if (currNode === null || adjList[currNode] === undefined) {
              console.log('No next node available');
              return;
            }
            sendNodeMessage(currNode, rec_id);
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
app.get('/instagram-conversations', async (req, res) => {
    await getPageInfo('EAAVZBobCt7AcBO0dMSwS2ZBezKgPYoqe8FVOsbjkucIoYWy2Q1oyON9YbAXn9zF34QtTv1P0HMu8vTK9b4qomL7sjAoXxq9I3Uq3kNyOHn2TSQ84Xwmq7Pi9aOEQeZAe3KoQwnKN7CB0rbhNEwuqwC7sWXarNR4ZB6xh4W2ZCr6yClyWB3O4KnbF4BAZDZD');
    try {
      const data = await getInstagramConversations();
      res.json(data);
    } catch (error) {
      res.status(500).send('Error fetching conversations');
    }
  });
io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  
    socket.on('send_message', async (message) => {
      const { rec_id, text } = message;

      await sendString(text, rec_id);
    });
    
    socket.on('send_comment_reply', async (message) => {
        const {comment_id, text } = message;
        await replyToComment(comment_id, text);
      });
  });
app.get("/", (req, res) => {
    res.send(`<pre>Nothing to see here. Checkout README.md to start.</pre>`);
});

