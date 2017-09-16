const fs = require('fs')
const puppeteer = require('puppeteer')
const argv = require('yargs')
	.example('$0 --url=https://example.com')
	.option('url')
	.option('screen', {
		default: 'desk'
	})
	.option('width', {
		describe: 'Width of viewport'
	})
	.option('height', {
		describe: 'Height of viewport'
	})
	.option('out', {
		default: '-',
		describe: 'File path to save, no extension. If `-` specified, outputs to console in base64-encoded'
	})
	.option('delay', {
		default: 1500,
		describe: 'Delay to save screenshot after loading CSS. Milliseconds'
	})
	.option('css', {
		describe: 'Additional CSS URL to load'
	})
	.option('style', {
		describe: 'Additional style to apply to body'
	})
	.option('before_ss', {
		describe: 'A script file loaded before taking the screenshot'
	})
	.demandOption(['url'])
	.argv

const screens = {
	"mobile" : {
		"w": 400,
		"h": 600
	},
	"tablet": {
		"w": 880,
		"h": 700
	},
	"desk": {
		"w": 1440,
		"h": 1024
	}
}

const {url, screen, out, delay, css, style, width, height, before_ss} = argv

const sleep = (ms) => {
	return new Promise(resolve => setTimeout(resolve, ms))
}

(async () => {
	const browser = await puppeteer.launch({
		args: [
			'--no-sandbox',
			'--disable-gpu',
			'--disable-setuid-sandbox',
			'--remote-debugging-port=9222'
		]
	})

	const sizes = screens[screen]

	const page = await browser.newPage()

	await page.setViewport({'width': sizes.w, 'height': sizes.h, deviceScaleFactor: 1 })

	await page.goto(url)

	await sleep(delay)

	if ( typeof before_ss !== "undefined" ) {
		try {
			const bf = require(before_ss)
			bf(page)
		} catch (e) {
			console.log(e);
		}
	}

	var deviceDimentions = await page._client.send('Page.getLayoutMetrics');

	let ssArgs = {
		type: 'jpeg',
		quality: 50,
		clip: {
			x: 0,
			y: 0,
			width: sizes.w,
			height: deviceDimentions.contentSize.height
		}
	}

	if ( out !== '-' ) {
		ssArgs.path = out + '.jpeg';
	}

	await page.screenshot(ssArgs);

	browser.close();
})()
