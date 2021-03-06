process.env.TZ = 'Asia/Shanghai';

const querystring = require('querystring');
const puppeteer = require('puppeteer');
const axios = require('axios');
const { token, chatId } = require('./config.js');

async function main() {
  let videos = [];

  setInterval(async () => {
    const currentVideos = await getVideos();
    const newVideos = currentVideos.filter(
      v => !videos.map(({ link }) => link).includes(v.link)
    );
    if (videos.length > 0 && newVideos.length > 0) {
      await sendTelegram(newVideos);
    }
    // if (currentVideos.length > 0) {
    //   videos = currentVideos;
    // }
    videos = [...videos, ...newVideos];
  }, 15 * 60 * 1000);
}

async function getVideos() {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  let videos = [];
  try {
    const page = await browser.newPage();
    await page.goto('https://www.acfun.cn/u/4075269', {
      waitUntil: 'domcontentloaded',
    });
    videos = await page.evaluate(() => {
      const cards = document.querySelectorAll('#ac-space-video-list > a');
      const videos = [];
      for (const card of cards) {
        const link = card.href;
        const description = card.querySelector(
          'figure.video > figcaption > p.title.line'
        ).textContent;
        videos.push({
          link,
          description,
        });
      }
      return videos;
    });
  } catch (err) {
    console.log(new Date().toLocaleString());
    console.log(err.stack);
  }
  await browser.close();
  return videos;
}

async function sendTelegram(videos) {
  for (const video of videos) {
    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${token}/sendMessage?${querystring.stringify(
          {
            chat_id: chatId,
            parse_mode: 'HTML',
            text: `<a href='${video.link}'>${video.description}</a>`,
            disable_web_page_preview: true,
          }
        )}`
      );

      console.log(new Date().toLocaleString());
      if (response.data && response.data.ok) {
        console.log('Message sent.');
      } else {
        console.log('Telegram server error.');
        console.log(response.data);
      }
    } catch (err) {
      console.log(new Date().toLocaleString());
      console.log('Failed to send message.');
    }
  }
}

main().catch(err => console.log(err.stack));
