const puppeteer = require('puppeteer');
const axios = require('axios');
const { token, chatId } = require('./config.js');

async function main() {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://www.acfun.cn/u/4075269', {
    waitUntil: 'networkidle0',
  });

  let videos = [];

  setInterval(async () => {
    await page.reload({
      waitUntil: 'networkidle0',
    });
    const currentVideos = await getVideos(page);
    const newVideos = currentVideos.filter(
      v => !videos.map(({ link }) => link).includes(v.link)
    );
    if (videos.length > 0 && newVideos.length > 0) {
      await sendTelegram(newVideos);
    }
    if (currentVideos.length > 0) {
      videos = currentVideos;
    }
  }, 15 * 60 * 1000);
}

async function getVideos(page) {
  const videos = await page.evaluate(() => {
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
  return videos;
}

async function sendTelegram(videos) {
  for (const video of videos) {
    try {
      const response = await axios.post(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          chat_id: chatId,
          text: video.description,
          disable_web_page_preview: true,
        }
      );

      console.log(new Date());
      if (response.data && response.data.ok) {
        console.log('Message sent.');
      } else {
        console.log('Telegram server error.');
        console.log(response.data);
      }
    } catch (err) {
      console.log(new Date());
      console.log('Failed to send message.');
    }
  }
}

main().catch(err => console.log(err.stack));