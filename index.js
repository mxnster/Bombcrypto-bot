const puppeteer = require('puppeteer');
const dappeteer = require('@chainsafe/dappeteer');
const getPixels = require("get-pixels")
const { Telegraf } = require('telegraf');
const sharp = require('sharp');
const config = require('./config');
const Jimp = require('jimp');
const fs = require('fs');
const _ = require('lodash');

const CHAT_ID = config.CHAT_ID;
const bot = new Telegraf(config.telegramAPI);
sharp.cache(false);


const CONNECT_WALLET = [{ x: 440, y: 550, r: 255, g: 170, b: 35, a: 255 }, { x: 440, y: 500, r: 255, g: 115, b: 35, a: 255 }]
const CONNECT_WALLET_TEST = [{ x: 497, y: 503, r: 255, g: 255, b: 255, a: 255 }, { x: 501, y: 547, r: 255, g: 255, b: 255, a: 255 }]
const MENU = [{ x: 630, y: 623, r: 255, g: 255, b: 255, a: 255 }, { x: 749, y: 623, r: 255, g: 255, b: 255, a: 255 }]
const FARM = [{ x: 92, y: 65, r: 255, g: 255, b: 255, a: 255 }, { x: 92, y: 88, r: 255, g: 255, b: 255, a: 255 }, { x: 81, y: 77, r: 255, g: 255, b: 255, a: 255 }]
const LOADING = [{ x: 290, y: 577, r: 239, g: 142, b: 70, a: 255 }, { x: 540, y: 470, r: 21, g: 15, b: 27, a: 255 }]
const ERROR = [{ x: 494, y: 187, r: 255, g: 255, b: 255, a: 255 }, { x: 553, y: 190, r: 255, g: 255, b: 255, a: 255 }]
const GREEN_STAMINA = { x: 340, y: 267, r: 120, g: 159, b: 57, a: 255 }
const KEY = [{ x: 142, y: 69, r: 255, g: 255, b: 255, a: 255 }, { x: 149, y: 91, r: 255, g: 255, b: 255, a: 255 }]
const ZERO = [{ x: 173, y: 73, r: 255, g: 255, b: 255, a: 255 }, { x: 173, y: 87, r: 255, g: 255, b: 255, a: 255 }, { x: 176, y: 90, r: 255, g: 255, b: 255, a: 255 }, { x: 187, y: 90, r: 255, g: 255, b: 255, a: 255 }, { x: 189, y: 73, r: 255, g: 255, b: 255, a: 255 }, { x: 189, y: 87, r: 255, g: 255, b: 255, a: 255 }, { x: 176, y: 71, r: 255, g: 255, b: 255, a: 255 }, { x: 186, y: 71, r: 255, g: 255, b: 255, a: 255 }, { x: 178, y: 82, r: 255, g: 255, b: 255, a: 255 }, { x: 185, y: 76, r: 255, g: 255, b: 255, a: 255 }]


const timeout = ms => new Promise(res => setTimeout(res, ms))

let browser;
let metamask;
let page;
let status;
let workersTimer;
let errorTimer;
let refreshIntervales = [];
let greenWorkers;
let firstLogin = true;
let afterRestart = false;


async function main() {
    if (!afterRestart) {
        browser = await dappeteer.launch(puppeteer, { metamaskVersion: 'v10.1.1' });
        metamask = await dappeteer.setupMetamask(browser);
        console.log(`[${(getDate())}] Setting up metamask`);
        await metamask.importPK(config.privateKey)

        await metamask.addNetwork({
            networkName: 'Binance Smart Chain',
            rpc: 'https://bsc-dataseed.binance.org/',
            chainId: 56,
            symbol: 'BNB',
            explorer: 'https://bscscan.com'
        })
        await metamask.switchNetwork('Binance Smart Chain');

        let pages = await browser.pages();

        if (pages.length > 1) {
            await pages[0].close();
        }
    }


    page = await browser.newPage();
    page.on('dialog', async dialog => {
        console.log(`[${(getDate())}] Alert clicked!`);
        await dialog.dismiss()
    });

    await page.setViewport({
        width: 1050,
        height: 700,
        deviceScaleFactor: 1,
    });
    await page.goto('https://app.bombcrypto.io/');
    await page.waitForTimeout(15000)
    await page.setCacheEnabled(false);

    await page.screenshot({ path: 'start.png' })
    let ready = await findButton(CONNECT_WALLET_TEST, 'start.png')
    if (ready) {
        await login()
    } else {
        console.log(`[${(getDate())}] An error occurred while loading the game starting page, reloading...`);
        await forceRestart()
    }
}


async function login() {
    try {
        status = 'login';
        clearTimeout(errorTimer)

        await page.screenshot({ path: 'start1.png' })
        let ready = await findButton(CONNECT_WALLET_TEST, 'start1.png')

        if (ready) {
            await moveAndClick(570, 510)

            await page.waitForTimeout(2000)

            if (firstLogin) {
                await metamask.approve()
                console.log(`[${(getDate())}] Connecting wallet`);
                await page.waitForTimeout(3000)
                firstLogin = false;
            }

            let pages = await browser.pages();

            await pages[0].reload()
            await pages[0].waitForTimeout(5000)

            do {
                await metamask.sign()
                console.log(`[${(getDate())}] Signing`);
                await page.waitForTimeout(5000)
                sign = await pages[0].$('.request-signature__footer__sign-button')
            } while (sign)


            for (let j = 0; j < 12; j++) {
                await page.waitForTimeout(10000)
                await page.screenshot({ path: 'menu.png' })
                let menu = await findButton(MENU, 'menu.png')
                let loading = await findButton(LOADING, 'menu.png')
                let error = await findButton(ERROR, 'menu.png')

                if (menu) {
                    console.log(`[${(getDate())}] Logged in`);
                    status = 'menu';
                    await page.waitForTimeout(1000);
                    await goWork()
                    await errorDetector()
                    break;
                }

                else if (loading) {
                    console.log(`[${(getDate())}] Loading...`);
                }

                else if (error) {
                    console.log(`[${(getDate())}] An error was detected while loading the game, reloading...`);
                    await forceRestart()
                    break;
                }

                if (j == 11) {
                    console.log(`[${(getDate())}] Game load time limit exceeded, reloading...`);
                    await forceRestart()
                    break;
                }
            }
        } else {
            console.log(`[${(getDate())}] An error occurred while connecting the wallet, restarting...`);
            await forceRestart()
        }
    } catch (err) { console.log(err) }
}


async function forceRestart() {
    console.log(`[${(getDate())}] Reloading...`);
    status = 'restart';
    let pages = await browser.pages();
    afterRestart = true;

    if (pages.length > 1) {
        pages.forEach(function (page) {
            if (page.url().includes('bomb') || page.url().includes('about:blank')) {
                page.close()
            } else page.reload()
        })
    }

    clearRefreshIntervales()
    clearTimeout(workersTimer)
    clearTimeout(errorTimer)

    await page.waitForTimeout(10000)
    await main()
}


async function goWork() {
    console.log(`[${(getDate())}] Sending to work`);

    let menu = await findButton(MENU, 'status.png')
    let farm = await findButton(FARM, 'status.png')

    if (status == 'farming' && farm) {
        await backToMenu()
    }

    if (status == 'menu') {
        await moveAndClick(936, 578)
        status = 'workers';
        await page.screenshot({ path: 'workers.png' })

        await page.waitForTimeout(10000)

        if (!config.onlyGreenStamina) {
            await page.mouse.move(444, 205)
            await page.mouse.click(444, 205)
            await page.waitForTimeout(1000)
            console.log(`[${(getDate())}] Sent everyone to work`);
        } else {
            // sleep
            await page.mouse.move(504, 207)
            await page.mouse.click(504, 207)
            await page.waitForTimeout(2000)

            await page.mouse.move(460, 540)

            for (let i = 0; i < 50; i++) {
                await page.mouse.wheel({ deltaY: 9007199254740991 })
                await page.waitForTimeout(10)
            }

            console.log(`[${(getDate())}] Looking for workers with a green stamina`);
            greenWorkers = 0;
            for (let i = 0; i < 3; i++) {
                if (i != 0) {
                    for (let i = 0; i < 20; i++) {
                        await page.mouse.wheel({ deltaY: -9007199254740991 })
                        await page.waitForTimeout(10)
                    };
                }
                await findGreenStamninaWorkers()
            }
            console.log(`[${(getDate())}] Sent ${greenWorkers}x workers`);
        }


        await moveAndClick(584, 158)

        status = 'menu'
        await page.waitForTimeout(5000)

        await page.screenshot({ path: 'afterWorkers.png' })
        let afterWorkers = await findButton(MENU, 'afterWorkers.png')

        if (afterWorkers) {
            await goFarm()

            workersTimer = setTimeout(goWork, (config.workersInterval * 60 * 1000) + getRandomNumber(0, 300000), false)
            for (i = 1; i < config.workersInterval / config.refreshMapInterval; i++) {
                let refresh = setTimeout(refreshMap, (config.refreshMapInterval * 60 * 1000 * i) + getRandomNumber(0, 60000))
                refreshIntervales.push(refresh)
            }

        } else {
            console.log(`[${(getDate())}] Something went wrong while sending the workers, reloading...`);
            bot.telegram.sendPhoto(CHAT_ID, { source: 'afterWorkers.png' })
            bot.telegram.sendMessage(CHAT_ID, `Something went wrong while sending the workers`)
            await forceRestart()
        }
    }
}

async function findGreenStamninaWorkers() {
    let _y;
    for (let i = 0; i < 15; i++) {
        await page.waitForTimeout(3000)
        await page.screenshot({ path: 'workers.png' })

        for (let y = _y ?? 565; y > 250; y -= 3, _y -= 3) {
            let colorStamina = await getPixelColor(330, y, 'workers.png');
            if (colorStamina.r == GREEN_STAMINA.r && colorStamina.g == GREEN_STAMINA.g && colorStamina.b == GREEN_STAMINA.b) {
                let colorButton = await getPixelColor(445, y + 3, 'workers.png')

                if (colorButton.g == 147 || colorButton.g == 141) {
                    await moveAndClick(445, y - 10)
                    _y = y + 5;
                    greenWorkers += 1;
                    break
                } else return
            }
            if (y <= 253) {
                return
            }
        }
    }
}

let keyCountSignature = [];
async function checkKeys() {
    if (status == "farming") {
        await page.screenshot({ path: 'key.png' })
        let key = await findButton(KEY, 'key.png')
        let countZero = await findButton(ZERO, 'key.png')

        if (key && !countZero) {
            let _keyCountSignature = [];

            for (let i = 0; i < ZERO.length; i++) {
                _keyCountSignature.push(await getPixelColor(ZERO[i].x, ZERO[i].y, 'key.png'))
            }

            if (!_.isEqual(keyCountSignature, _keyCountSignature) && keyCountSignature.length > 0) {
                keyCountSignature = _keyCountSignature
                console.log(`[${(getDate())}] Found a key!`);
                bot.telegram.sendMessage(CHAT_ID, `🔑 Found a key!`)
            } else if (keyCountSignature.length == 0) {
                keyCountSignature = _keyCountSignature
            }
        }
    }
}


async function goFarm() {
    if (status == 'menu') {
        await moveAndClick(560, 320)
        status = 'farming';
        console.log(`[${(getDate())}] Farming`);
        await page.waitForTimeout(1000)
        await page.screenshot({ path: 'farm.png' })
    }
    await page.waitForTimeout(5000)
    await checkKeys()
}

async function backToMenu() {
    await moveAndClick(90, 80)
    status = "menu"
    await page.waitForTimeout(5000)
}

async function refreshMap() {
    if (status == "farming") {
        console.log(`[${(getDate())}] Refreshing`);
        await backToMenu()
        await goFarm()
    }
}

async function getBalance() {
    if (page) {
        if (status == 'menu' || status == 'farming') {
            if (status == 'farming') {
                await moveAndClick(898, 80)
            }
            if (status == 'menu') {
                await moveAndClick(965, 80)
            }
            await page.waitForTimeout(2000)
            await page.screenshot({ path: 'balance.png' })
            await cropImage('balance.png', 280, 225, 490, 250)
            bot.telegram.sendPhoto(CHAT_ID, { source: 'cropped_balance.png' })
            await moveAndClick(794, 163)
            await page.waitForTimeout(5000)
        } else bot.telegram.sendMessage(CHAT_ID, `Can't check balance, sending workers`)
    }
}


async function errorDetector() {
    await page.screenshot({ path: 'status.png' })

    let error = await findButton(ERROR, 'status.png')
    let logout = await findButton(CONNECT_WALLET, 'status.png')

    if (error) {
        console.log(`[${(getDate())}] Error detected, reloading...`);
        bot.telegram.sendPhoto(CHAT_ID, { source: 'status.png' })
        bot.telegram.sendMessage(CHAT_ID, `Ошибка!`)
        await forceRestart()
    }

    if (logout && status != 'restart') {
        console.log(`[${(getDate())}] Logout detected, relogin...`);
        bot.telegram.sendPhoto(CHAT_ID, { source: 'status.png' })
        await forceRestart()
    }

    errorTimer = setTimeout(errorDetector, 60000)
}


async function stuckDetector() {
    let notificationInterval;
    fs.stat("status.png", async function (err, stats) {
        let seconds = ((new Date().getTime() - stats.mtime) / 1000).toFixed(0);
        if (seconds > 300 && !firstLogin) {
            await forceRestart()

            if (seconds > notificationInterval) {
                bot.telegram.sendMessage(CHAT_ID, `Most likely the bot stopped working 😥`)
                notificationInterval += 1800
            }
        } else notificationInterval = 1800;
    });

    setTimeout(stuckDetector, 300000)
}


async function createFreshScreenshot() {
    if (page) {
        await page.screenshot({ path: 'freshSS.png' })
        bot.telegram.sendPhoto(CHAT_ID, { source: 'freshSS.png' })
        await page.waitForTimeout(5000)
    }
}

function clearRefreshIntervales() {
    if (refreshIntervales) {
        refreshIntervales.forEach(interval => {
            clearInterval(interval)
        })
    }
}


async function getPixelColor(x, y, path) {
    let pixels = [];
    getPixels(path, function (err, px) {
        if (err) {
            console.log(`[${(getDate())}] Bad image path`);
            return
        }
        pixels = px
    })
    for (let i = 0; i < 1000; i++) {
        if (pixels.data) {
            i = (((y - 1) * pixels.shape[0]) + x) * 4;
            obj = { x: x, y: y, r: pixels.data[i++], g: pixels.data[i++], b: pixels.data[i++], a: pixels.data[i++] }
            return obj
        }
        await timeout(5)
    }
}

async function findButton(button, image) {
    try {
        let confirmations = 0;
        for (let i = 0; i < button.length; i++) {
            let color = await getPixelColor(button[i].x, button[i].y, image)
            if (button, image, color) {
                if (button[i].r == color.r && button[i].g == color.g && button[i].b == color.b) {
                    confirmations++
                }
            }
        }

        if (confirmations == button.length) {
            return true
        }
        else return false

    } catch (error) {
        console.log(error);
    }
}

async function cropImage(image, left, top, width, height) {
    try {
        await sharp(image)
            .extract({ left: left, top: top, width: width, height: height })
            .toFile(`cropped_${image}`);
    } catch (error) {
        console.log(error);
    }
}
function getDate() {
    let date = new Date();

    let month = (date.getMonth() + 1).toString().padStart(2, '0');
    let day = date.getDate().toString().padStart(2, '0');
    let hours = date.getHours().toString().padStart(2, '0');
    let minutes = date.getMinutes().toString().padStart(2, '0');
    let seconds = date.getSeconds().toString().padStart(2, '0');

    return `${day}.${month}, ${hours}:${minutes}:${seconds}`;
}


async function moveAndClick(x, y) {
    xR = getRandomNumber(-6, 6);
    yR = getRandomNumber(-3, 3)
    await page.mouse.move(x + xR, y + yR)
    await page.mouse.click(x + xR, y + yR)
}

function getRandomNumber(from, to) {
    return Math.round(Math.random() * (to - from) + from);
}

process.on('unhandledRejection', (reason, promise) => {
    console.log('Unhandled Rejection', reason);
})


bot.catch(() => {
    if (!firstLogin) {
        console.log('Ooops, tg error')
    }
})

bot.command('balance', (ctx) => ctx.update.message.from.id == CHAT_ID && getBalance());
bot.command('getscreenshot', (ctx) => ctx.update.message.from.id == CHAT_ID && createFreshScreenshot());
bot.command('restart', (ctx) => ctx.update.message.from.id == CHAT_ID && forceRestart() && ctx.reply('Reloading'));

bot.hears(/da|Da|Да|да/, ctx => {
    buff = new Buffer.from('0J/QuNC30LTQsA==', 'base64');
    ctx.reply(buff.toString('utf-8'))
});

async function start() {
    console.log(`Follow us: https://t.me/cryptolbs`);
    main();
    stuckDetector()
    bot.launch()
}
start()