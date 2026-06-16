const fs = require('fs');
const path = require('path');

const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const buffer = Buffer.from(base64Data, 'base64');

fs.writeFileSync('d:/StockSync/mock_image.png', buffer);
console.log('Mock image created at d:/StockSync/mock_image.png');
