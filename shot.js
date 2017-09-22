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
	.option('configPath', {
		describe: 'A script file loaded before taking the screenshot'
	})
	.argv

const { configPath } = argv

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

const sleep = (ms) => {
	return new Promise(resolve => setTimeout(resolve, ms))
}

function shot(url, title, screen = 'desk', out = '-', delay = 1500, before_ss = null){
	puppeteer.launch().then(async browser => {
		console.log('shot a ss')

		const sizes = screens[screen]
		// console.log(browser);
		const page = await browser.newPage()
		// return sizes;

		await page.setViewport({'width': sizes.w, 'height': sizes.h, deviceScaleFactor: 1 })

		await page.goto(url)

		await sleep(delay)

		if ( typeof before_ss !== "undefined" && before_ss !== null ) {
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
			quality: 70,
			clip: {
				x: 0,
				y: 0,
				width: sizes.w,
				height: deviceDimentions.contentSize.height
			}
		}

		if ( out.indexOf('.json') ) {
			delete ssArgs.type
			delete ssArgs.quality

			let imgJson = {
				title: title,
				img: await page.screenshot(ssArgs)
			}


			await fs.writeFile( './' + out,  JSON.stringify(imgJson), 'utf8', function () {
				return null;
			});

		} else if ( out !== '-' ) {
			ssArgs.path = out + '.jpeg';
			await page.screenshot(ssArgs);
		}

		console.log('should close')
		browser.close();
	});
}

if ( typeof configPath === "undefined" ) {
	const {url, screen, out, delay } = argv
	shot(url, out, screen, out, delay)
} else {
	var config = fs.readFileSync(configPath, 'utf-8')
	config = JSON.parse(config)

	Object.keys( config ).forEach( key => {
		let pages = config[key];

		Object.keys( pages ).forEach( pageName => {
			let args = pages[pageName]
			setTimeout( function () {
				shot( args.url, pageName, args.screen, args.out )
			}, 200)
		})
	});
}
