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
		if(file.match(/export-.*.json/)) {
			inputFile = file;
		}
	});
}

console.log('Reading', inputFile, '...');

let labelBoxData = fs.readFileSync(`./${inputFile}`);
labelBoxData = JSON.parse(labelBoxData);

if (!fs.existsSync(outputPath)){
	fs.mkdirSync(outputPath);
}

for(let i=0; i<labelBoxData.length; i++) {

	const item = labelBoxData[i];
	const filename = sanitizeFilename(item['External ID']);
	if(fs.existsSync(`${outputPath}/${filename}`)) {
		console.log(`${outputPath}/${filename}`, 'already exists – skipping.')
		continue;
	}

	//for testing:
	//if(i > 0) break;
	//if(filename !== 'P2017.3.1740') continue;

	(function(item) {
		setTimeout(function() {
			goFetch(item);
		}, i*5000);
	})(item);
}

	
function goFetch(item) {

	const labels = item.Label;
	if(labels === 'Skip') return;

	const filename = sanitizeFilename(item['External ID']);
	const url = item['Labeled Data'];

	console.log('******* requesting', url, '*******');

	request({ url, encoding: null }, (err, resp, buffer) => {

		if(!fs.existsSync(`${outputPath}/${filename}`)){
			fs.mkdirSync(`${outputPath}/${filename}`);
		}

		//save whole image
		sharp(buffer)
		.toFile(`${outputPath}/${filename}/${filename}.jpg`, (err, info) => { console.log(err || 'saved image', info) });

    	for(let label in labels) {

			let labelSant = sanitizeLabel(label);

			for(let coords of labels[label]) {

				const { geometry } = coords;
				const { top, left, width, height } = getGeometryBoundaries(geometry);	
				
				const thumbName = `${filename}-${labelSant}-${top}-${left}.png`;

				//save cutouts
				sharp(buffer)
    				.extract({ left, top, width, height })
		  			.toFile(`${outputPath}/${filename}/${thumbName}`, (err, info) => { 

						if(err) {
							console.log(err);
							console.log(filename, label, top, left, width, height);
						} else {
							console.log('saved thumb', info);
						}
					});
			}
		}
	});
}

function getGeometryBoundaries(geometry) {

	let top = 9999, left = 9999, width = 0, height = 0;

	//find the highest and lowest x and y
	for(let i=0; i<geometry.length; i++) {
		if(geometry[i].x < top) top = geometry[i].y;
		if(geometry[i].y < left) left = geometry[i].x;

		if(geometry[i].x > width) width = geometry[i].x;
		if(geometry[i].y > height) height = geometry[i].y;
	}

	width = width - left;
	height = height - top;
	width = height = rectifyGeometry(width, height);

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
	return label.replace(/[\s.,/()]/g, '');
}