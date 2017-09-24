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

const {configPath} = argv

const screens = {
	"mobile": {
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

(async () => {
	const app = await puppeteer.launch({
		args: [
			'--no-sandbox',
			'--disable-gpu',
			'--disable-setuid-sandbox',
			'--remote-debugging-port=9222'
		]
	})
		.then(async browser => {

			const shot = async function (url, title, screen = 'desk', out = '-', delay = 1500, before_ss = null, last = false ) {
				const sizes = screens[screen]
				const page = await browser.newPage()
				await page.setViewport({'width': sizes.w, 'height': sizes.h, deviceScaleFactor: 1})
				await page.goto(url)
				await sleep(delay)

				if (typeof before_ss !== "undefined" && before_ss !== null) {
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

				if (out.indexOf('.json')) {
					delete ssArgs.type
					delete ssArgs.quality

					const imgData = await page.screenshot(ssArgs)

					var base64Image = new Buffer(imgData, 'binary').toString('base64');

					let imgJson = {
						title: title,
						img:base64Image
					}

					console.log(out)

					try {
						const file = await fs.writeFile( out, JSON.stringify(imgJson), 'utf8', function () {
							return null;
						});
					} catch(e) {
						console.log(e)
					}


				} else if (out !== '-') {
					ssArgs.path = out + '.jpeg';
					await page.screenshot(ssArgs);
				}

				if ( last ) {
					// console.log('should close')
					await browser.close()
				}
			}

			if (typeof configPath === "undefined") {
				const {url, screen, out, delay} = argv
				await shot(url, out, screen, out, delay)
			} else {
				var config = fs.readFileSync(configPath, 'utf-8')
				config = JSON.parse(config)

				// await shot( 'https://andrei-lupu.com', 'page', 'desk', 'page.json' );

				Object.keys(config).forEach( function(key) {
					let pages = config[key];
					var last = false

					Object.keys(pages).forEach( function( pageName, k ) {

						let args = pages[pageName];

						if ( ( Object.keys(pages).length - 1) === k) {
							last = true
						}

						shot( args.url, pageName, args.screen, args.out, 1000, null, last )
					})
				});
			}

		})
		.catch( e => {
			console.log(e)
		})
})();