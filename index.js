const fs = require('fs');
const sharp = require('sharp');
const request = require('request');

let inputFile = '';
const outputPath = './out';

//read filename argument or look for a export-*.json in the folder
if(process.argv[2]) {
	inputFile = process.argv[2];
} else {
	fs.readdirSync('.').forEach(file => {
		if(file.match(/^export-.*.json$/)) {
			inputFile = file;
		}
	});
}

//make sure output folders exist
touchDir(outputPath, `${outputPath}/full/`, `${outputPath}/thumb/`);

console.log('Reading', inputFile, '...');

let labelBoxData = fs.readFileSync(`./${inputFile}`);
labelBoxData = JSON.parse(labelBoxData);


let fetchIndex = 0;
for(let i=0; i<labelBoxData.length; i++) {

	const item = labelBoxData[i];
	const filename = sanitizeFilename(item['External ID']);
	if(fs.existsSync(`${outputPath}/full/${filename}`)) {
		console.log(`${outputPath}/${filename}`, 'already exists – skipping')
		continue;
	}

	//for testing:
	//if(fetchIndex > 0) break;
	//if(filename !== 'P2017.3.531') continue;

	(function(item) {
		console.log('scheduling ', item['External ID']);
		setTimeout(function() {
			goFetch(item);
		}, fetchIndex*2000);
	})(item);

	fetchIndex++;
}

console.log('We are looking at ', fetchIndex, ' labeled images');
console.log('Which takes at least ', ((fetchIndex*2)/60).toFixed(2), ' minutes');

	
function goFetch(item) {

	const labels = item.Label;
	if(labels === 'Skip') return;

	const filename = sanitizeFilename(item['External ID']);
	const url = item['Labeled Data'];

	console.log('******* requesting', url, '*******');

	request({ url, encoding: null }, (err, resp, buffer) => {

		//make sure output folders exist
		touchDir(`${outputPath}/full/${filename}`, `${outputPath}/thumb/${filename}`);

		//save whole image
		sharp(buffer)
		.toFile(`${outputPath}/full/${filename}/${filename}.jpg`, (err, info) => { 
			if(err) {
				console.log(err);
				console.log(filename);
			} else {
				//console.log('saved image', info);
			}
		})
		.resize(1280)
		.toFile(`${outputPath}/thumb/${filename}/${filename}.jpg`, (err, info) => { 
			if(err) {
				console.log(err);
				console.log(filename);
			} else {
				//console.log('saved image', info);
			}
		})

		let counter = 0;
    	for(let label in labels) {

			let labelSant = sanitizeLabel(label);

			//force rectangles for everything but Frame
			const isFrame = (label === 'Frame');
			let forceRectangle = isFrame ? false : true;

			//@todo save frames
			if(isFrame) continue;

			for(let coords of labels[label]) {

				const { geometry } = coords;
				const { top, left, width, height } = getGeometryBoundaries(geometry, forceRectangle);
				
				let thumbName = `${filename}-${labelSant}-${top}-${left}`;
				
				counter++;

				//save cutouts
				sharp(buffer)
    				.extract({ left, top, width, height })
    				.toFile(`${outputPath}/full/${filename}/${thumbName}.jpg`, (err, info) => { 

						if(err) {
							console.log(err);
							console.log(filename, label, top, left, width, height);
						} else {
							//console.log('saved thumb', info);
						}
					})
					.resize(320, 320)
					.toFile(`${outputPath}/thumb/${filename}/${thumbName}.jpg`, (err, info) => { 

						if(err) {
							console.log(err);
							console.log(filename, label, top, left, width, height);
						} else {
							//console.log('saved thumb', info);
						}
					});
			}
		}

		console.log('processing ', counter, ' thumbnails for ', filename, ' ...');
	});
}

function getGeometryBoundaries(geometry, forceRectangle) {

	let top = 9999, left = 9999, width = 0, height = 0;

	//find the highest and lowest x and y
	for(let i=0; i<geometry.length; i++) {
		if(geometry[i].y < top) top = geometry[i].y;
		if(geometry[i].x < left) left = geometry[i].x;

		if(geometry[i].x > width) width = geometry[i].x;
		if(geometry[i].y > height) height = geometry[i].y;
	}

	width = width - left;
	height = height - top;
	
	if(forceRectangle) {
		width = height = rectifyGeometry(width, height);
	}

	//console.log('assuming geometry', {top, left, width, height});
	return {top, left, width, height};
}


function rectifyGeometry(width, height) {
	return Math.max(width, height);
}


function sanitizeFilename(filename) {
	const fileParts = filename.split('.'); 
	fileParts.pop();
	return fileParts.join('.');
}


function sanitizeLabel(label) {
	return label.replace(/[\s.,/()-]/g, '');
}

function touchDir() {
	[].forEach.call(arguments, path => {
		if(!fs.existsSync(path)){
			fs.mkdirSync(path);
		}
	})
}