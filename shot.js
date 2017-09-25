const fs = require('fs')
const Jimp = require("jimp")
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
			const shot = async function (url, title = 'result', screen = 'desk', path = './', delay = 1500, before_ss = null, last = false, compare_with = null ) {
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

				const imgData = await page.screenshot({
					clip: {
						x: 0,
						y: 0,
						width: sizes.w,
						height: deviceDimentions.contentSize.height
					}
				})

				await Jimp.read(imgData).then( async function (image) {

					if ( compare_with !== null ) {

						Jimp.read( path + compare_with + ".png", function (err, image2) {
							var diff = Jimp.diff(image, image2, 0.2);

							diff.image.write( path + 'diff-' + title + '.png',function (err) {} )
						})
					}

					return await image.getBase64( Jimp.MIME_PNG, function () {
						this.write( path + title + ".png" );
					} )
				})

				await Jimp.read(imgData).then(function (image) {
					return image.resize( 300, Jimp.AUTO )
				}).then(function (image) {
					return image.crop( 0, 0, 300, 300 )
				}).then(function (image) {
					image.write( path + "thumb-" + title + ".png" )

					if ( compare_with !== null ) {

						Jimp.read( path +  "thumb-" + compare_with + ".png", function (err, image2) {
							var diff = Jimp.diff(image, image2, 0.2);

							diff.image.write( path + 'diff-' +  "thumb-" + title + '.png',function (err) {} )
						})
					}

				}).catch(function (err) {
					console.error(err);
				});

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

				Object.keys(config).forEach( function(key) {
					let pages = config[key]["pages"],
						last = false,
						outPath = config[key]["outPath"]

					Object.keys(pages).forEach( function( pageName, k ) {
						let args = pages[pageName]
						let compare_with = null

						if ( ( Object.keys(pages).length - 1) === k) {
							last = true
						}

						if ( typeof args['compare_with'] !== "undefined" && typeof pages[args['compare_with']] !== "undefined" ) {
							compare_with = args['compare_with']
						}

						shot( args.url, pageName, args.screen, outPath, 1000, null, last, compare_with)
					})
				});
			}
		})
		.catch( e => {
			console.log(e)
		})
})();