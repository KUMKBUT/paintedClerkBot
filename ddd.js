import fetch from 'node-fetch';
       import { HttpProxyAgent } from 'http-proxy-agent';

       async function checkProxy(proxyUrl) {
           try {
               const proxyAgent = new HttpProxyAgent(proxyUrl);
               const response = await fetch('https://coworking.tyuiu.ru/shs/all_t/sh.php?action=group&union=0&sid=28713&gr=855&year=2025&vr=1', { // Любой надежный сайт
                   agent: proxyAgent,
                   timeout: 5000
               });

               if (response.ok) {
                   console.log(`Прокси ${proxyUrl} работает!`);
                   return true;
               } else {
                   console.warn(`Прокси ${proxyUrl} не работает. Статус: ${response.status}`);
                   return false;
               }
           } catch (error) {
               console.error(`Ошибка при проверке прокси ${proxyUrl}:`, error);
               return false;
           }
       }

       async function main() {
           const proxyUrl = 'http://87.239.31.42:80'; // **ВАШ ПРОКСИ**

           const isWorking = await checkProxy(proxyUrl);
           console.log(`Прокси ${proxyUrl} работает: ${isWorking}`);
       }

       main();