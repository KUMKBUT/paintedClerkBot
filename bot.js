import fetch from 'node-fetch';
import encoding from 'encoding';
import * as cheerio from 'cheerio';
import TelegramBot from 'node-telegram-bot-api';

let html

async function fetchHtml(url) {
  try {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer(); 
    const contentType = response.headers.get('content-type');
    let encodingType = 'utf-8';

    if (contentType && contentType.includes('charset=')) {
      encodingType = contentType.split('charset=')[1].trim();
    }

    const decodedHtml = encoding.convert(Buffer.from(buffer), 'UTF8', encodingType).toString('UTF8'); //конвертируем buffer
    return decodedHtml;
  } catch (error) {
    console.error("Error fetching HTML:", error);
    return null;
  }
}

async function main() {
  const url = 'https://coworking.tyuiu.ru/shs/all_t/sh.php?action=group&union=0&sid=28713&gr=855&year=2025&vr=1';
    html = await fetchHtml(url);

    const $ = cheerio.load(html)
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
    return arrFin
} 
main()
import { config } from 'dotenv';
config();

const token = process.env.token
const bot = new TelegramBot(token, {polling: true})

bot.onText(/^\/ScheludOk7$/, async(ctx) => {
  console.log(111)
  let rasp = await main()
  console.log(JSON.stringify(rasp, null, 2))
  for(let u of rasp){
    let message = ''
    for(let i of u.lesson){
      if(i.attr === 'empty'){
        message += `${i.time} | Нет занятий\n\n`
      } else {
        message += `${i.time} | ${i.disc}\n<i>${i.prep}</i> - ${i.cab}\n\n`
      }
    }
    await bot.sendMessage(ctx.from.id, `<b>${u.day.day} ${u.day.weak}</b>\n\n${message}`, {reply_to_message_id: ctx.message_id, parse_mode: 'HTML'})
  }
})
console.log('first runn!!')






