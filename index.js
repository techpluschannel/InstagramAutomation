import 'dotenv/config';
import { ChatGPTAPI } from 'chatgpt'
import { IgApiClient } from 'instagram-private-api';
import { Configuration, OpenAIApi } from 'openai';
import sharp from 'sharp';
import Downloader from "nodejs-file-downloader";
import fs from "fs";
import { readFile } from 'fs';
import { promisify } from 'util';
const readFileAsync = promisify(readFile);

const download = async (url) => {
  let name;
  const downloader = new Downloader({
    url,
    directory: "./downloads",
    onProgress: function (percentage, chunk, remainingSize) {
      console.log("% ", percentage);
      console.log("Current chunk of data: ", chunk);
      console.log("Remaining bytes: ", remainingSize);
    },
    onBeforeSave: (deducedName) => {
      name = deducedName;
    },
  });

  try {
    await downloader.download();
    return name;
  } catch (error) {
    console.log(error);
  }
}


async function getPhotos(qoute) {

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log(qoute);
  const openai = new OpenAIApi(configuration);
  const response = await openai.createImage({
    prompt: qoute,
    n: 1,
    size: "1024x1024",
  });


  let fname = await download(response.data.data[0].url);
  const data = await sharp(`./downloads/${fname}`)
    .jpeg()
    .toFile(`./downloads/${fname}.jpg`);

  console.log(data);
  fs.unlinkSync(`./downloads/${fname}`)

  return `./downloads/${fname}.jpg`;
}
var num = 0;


const getCaption = async () => {
  const api = new ChatGPTAPI({
    apiKey: process.env.OPENAI_API_KEY
  })

  //Chatgpt command
  const res = await api.sendMessage("{ 'prompt': 'Tell me a motivational Instagram caption.' , 'temperature': 0.8}")
  return res.text;
}

const getCommand = async (caption) => {
  const api = new ChatGPTAPI({
    apiKey: process.env.OPENAI_API_KEY
  })

  //Chatgpt command
  const res = await api.sendMessage(`Discribe a motivational nature landscape in one sentence according to the following motivational qoute : '${caption}'`);
  return res.text;
}

const ig = new IgApiClient();

async function login() {
  ig.state.generateDevice(process.env.IG_USERNAME);
  ig.state.proxyUrl = process.env.IG_PROXY;
  await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);
}

const postToInstagram = async () => {
  try {
    var caption = await getCaption();
    var command = await getCommand(caption);
    const path = await getPhotos(command);

    await login();

    const publishResult = await ig.publish.photo({
      file: await readFileAsync(path),
      caption: caption,
    });

    console.log("Posted to Instagram");
    fs.unlinkSync(path)
  } catch (e) {
    console.log(e);
    console.log("Error in posting to Instagram");
  }

}

postToInstagram();
setInterval(postToInstagram, process.env.DELAY_TIME * 1000)