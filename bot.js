import fetch from 'node-fetch';
import * as encoding from 'encoding';
import { HttpProxyAgent } from 'http-proxy-agent';
import * as cheerio from 'cheerio';
import TelegramBot from 'node-telegram-bot-api';
import bodyParser from 'body-parser'
import express from 'express'

let html

async function getHtmlWithProxy(url, proxyUrl = null) {
    try {
        console.log("Начало getHtmlWithProxy");
        console.log("URL:", url);
        console.log("Proxy URL:", proxyUrl);

        const options = {};

        if (proxyUrl) {
            console.log("Используется прокси");
            const proxyAgent = new HttpProxyAgent(proxyUrl);
            options.agent = proxyAgent;
            console.log("ProxyAgent создан:", proxyAgent);
            console.log("Options после добавления агента:", options);
        } else {
            console.log("Прокси не используется");
        }

        console.log("Перед fetch");
        const response = await fetch(url, options);
        console.log("После fetch");

        if (!response.ok) {
            console.error("Ошибка HTTP:", response.status);
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        console.log("Получение buffer");
        const buffer = await response.arrayBuffer();
        console.log("Buffer получен, длина:", buffer.byteLength);

        const contentType = response.headers.get('content-type');
        console.log("Content-Type:", contentType);
        let encodingType = 'utf-8';

        if (contentType && contentType.includes('charset=')) {
            encodingType = contentType.split('charset=')[1].trim().replace(/['";]/g, '');
            console.log("Encoding Type из Content-Type:", encodingType);
        } else {
            console.log("Encoding Type не найден в Content-Type, используется UTF-8 по умолчанию.");
        }

        let decodedHtml;
        try {
            console.log("Попытка конвертации кодировки из", encodingType, "в UTF-8");
            // Используем encoding.convert
            decodedHtml = encoding.convert(Buffer.from(buffer), 'UTF8', encodingType).toString('UTF8');
            console.log("Конвертация успешна.");
        } catch (conversionError) {
            console.warn(`Ошибка конвертации из ${encodingType} в UTF-8. Используется TextDecoder с UTF-8 по умолчанию:`, conversionError);
            decodedHtml = new TextDecoder('utf-8').decode(buffer);
            console.log("Использован TextDecoder с UTF-8.");
        }

        console.log("Текст получен, длина:", decodedHtml.length);
        return decodedHtml;

    } catch (error) {
        console.error("Ошибка в getHtmlWithProxy:", error);
        return null;
    } finally {
        console.log("Завершение getHtmlWithProxy");
    }
}


async function main() {
  const url = 'https://coworking.tyuiu.ru/shs/all_t/sh.php?action=group&union=0&sid=28713&gr=855&year=2025&vr=1';
  const proxy ='http://87.239.31.42:80'
    html = await getHtmlWithProxy(url, proxy);

    const $ = cheerio.load(html)
    const nameGroup = $('div.head:eq(1) b').text();
    const firstRow = $('table#main_table tbody tr').first();
    let rowText = "";
    let arr = []
    let arrDisp = []
    let arrTime = []

    const cells = firstRow.find('td').slice(2);

    cells.each((i, cell) => {
      const cellText = $(cell).html().replace(/<br\s*[\/]?>/gi, " ").trim();

      rowText += cellText + " ";
    });
    const words = rowText.trim().split(' ');

    for (let i = 0; i < words.length; i += 3) {
        if (i + 2 < words.length) {
            arr.push({
                day: words[i],
                weak: words[i + 1],
                even: words[i + 2]
            });
        }
    }

    $('#main_table tbody tr:nth-child(n+2)').each((i, el) => {
      const row = $(el)
      const time = row.find('td.comm')
      const comm3Table = row.find('table.comm3')

      comm3Table.each((i, el) => {
        const row = $(el)
        if((i) === 0){
          // console.log(`${time.text()}`)
        }
        if(row.find('div.disc').text() === ''){
          //console.log('empty')
          arrDisp.push({time: time.text(), attr: 'empty'})
        } else {
          //console.log(`${row.find('div.disc').text()} | ${row.find('div.prep').text()} | ${row.find('div.cab').text()}`)
          arrDisp.push({
            time: time.text(),
            disc: row.find('div.disc').text(),
            prep: row.find('div.prep').text(),
            cab: row.find('div.cab').text(),
          })
        }
        
      })
      arrTime.push(time.text())
    })
    let arrFin = []
    for(let u = 0; u<= 5; u++){
      let daySchelud = {
        day: arr[u],
        lesson: []
      }
      for(let i = 0; i<= 6; i++){
        let disp = arrDisp.filter((name) => name.time === `${arrTime[i]}`)
        daySchelud.lesson.push(disp[u])
      }
      arrFin.push(daySchelud)
    }
    
    // console.log(JSON.stringify(arrFin, null, 2));
    arrFin.push({group: nameGroup})
    return arrFin
} 
main()
import { config } from 'dotenv';
config();

const token = process.env.token
const url = process.env.weburl
const port = process.env.PORT || 3000;
const bot = new TelegramBot(token)

const app = express();

app.use(bodyParser.json());

app.post(`/telegram-bot`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

bot.setWebHook(`${url}/telegram-bot`)
  .then(() => console.log('Webhook установлен!'))
  .catch(err => console.error('Ошибка при установке Webhook:', err));

bot.onText(/^\/ScheludOk7$/, async(ctx) => {
  console.log(111)
  let rasp = await main()
  let lesson = rasp.filter((name) => name.day )

  for(let u of lesson){
    let message = ''
    for(let i of u.lesson){
      if(u.group){ return }
      if(i.attr === 'empty'){
        message += `${i.time} | Нет занятий\n\n`
      } else {
        message += `${i.time} | ${i.disc}\n<i>${i.prep}</i> - ${i.cab}\n\n`
      }
    }
    await bot.sendMessage(ctx.from.id, `<b>${u.day.day} ${u.day.weak}</b>\n\n${message}`, {reply_to_message_id: ctx.message_id, parse_mode: 'HTML'})
  }
})

app.get('/', (req, res) => {
  res.send('Telegram Bot is running with Webhooks!');
});

app.listen(port, () => {
  console.log(`Telegram Bot is running with Webhooks on port ${port}`);
});
console.log('first runn!!')






