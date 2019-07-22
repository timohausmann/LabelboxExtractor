# LabelBox Extractor

This script will extract full images and rectangular thumbnails from [Labelbox](https://labelbox.com/) Export Data (JSON) and store them in individual folders.

Install dependencies

    npm install

Run script (looks for an export.json in the working directory)

    node index.js 
    
Run script (pass export.json filename as an argument)    

    node index.js export-filename.json

Write to log

    node index.js > log.log