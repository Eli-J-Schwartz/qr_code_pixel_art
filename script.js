width = 25
height = 25

createPixelGrid(width, height);

function createPixelGrid(w, h) {
    table = document.getElementById("pixel-table");

    table.innerHTML = "";

    for (var y = 0; y < h; y++) {
        var line = document.createElement("tr");
        for (var x = 0; x < w; x++) {
            var button = document.createElement("button");
            button.addEventListener('click',
                (event) => {
                    console.log(event);
                    if (event.target.old_back == "black") {
                        event.target.style.background = "white";
                        event.target.old_back = "white";
                        pixel_table[event.target.id] = 0;
                    } else {
                        event.target.style.background = "black";
                        event.target.old_back = "black";
                        pixel_table[event.target.id] = 1;
                    }
                });
            button.addEventListener('mouseover', 
                (event) => {
                    event.target.old_back = event.target.style.background;
                    event.target.style.background = 'grey';
                });
            button.addEventListener('mouseout', 
                (event) => {
                    event.target.style.backgroundColor = event.target.old_back;
                });
            button.style.borderRadius = 0;
            button.style.background = "black";
            button.id = String(y*w+x);
            button.style.width = 5;
            button.style.height = 5;
            var cell = document.createElement("td");
            cell.appendChild(button);
            line.appendChild(cell);
        }
        table.appendChild(line);
    }
    pixel_table = new Array(w*h).fill(1);
}

function setDimensions() {
    width = document.getElementById("widthPicker").value;
    height = document.getElementById("heightPicker").value;
    createPixelGrid(width, height);
}

function generate() {
    code = generateCodewords(formatText(document.getElementById("inputText").value))

    console.log(code);

    best_mask = 0;
    best_diff = 9999999;
    for (var mask = 0; mask < 8; mask++) {
        arr = createConstantPatterns();
        placePixels(code, arr, mask);

        placeFormat(arr, mask);

        diff = replaceArt(arr, pixel_table, width, height);
        if (diff < best_diff) {
            best_mask = mask;
            best_diff = diff;
        }
    }

    console.log(best_mask)

    arr = createConstantPatterns();
    placePixels(code, arr, best_mask);
    placeFormat(arr, best_mask); 
    replaceArt(arr, pixel_table, width, height);
    drawPixels(arr, 41);

}

function createConstantPatterns() {
    var qrArr = new Array(41*41).fill(1);

    for (var i = 0; i < 41; i++) {
        qrArr[6+41*i] = (i%2 == 0) ? 0 : 1;
        qrArr[6*41+i] = (i%2 == 0) ? 0 : 1;
    }

    for (var x = 0; x < 8; x++) {
        for (var y = 0; y < 8; y++) {
            qrArr[x+41*y] = 1;
            qrArr[x+41*y+41-8] = 1;
            qrArr[x+41*y+(41-8)*41] = 1;
        }
    }

    for (var x = 2; x < 5; x++) {
        for (var y = 2; y < 5; y++) {
            qrArr[x+41*y] = 0;
            qrArr[x+41*y+41-7] = 0;
            qrArr[x+41*y+(41-7)*41] = 0;
        }
    }

    for (var i = 0; i < 7; i++) {
        qrArr[i] = 0;
        qrArr[i*41] = 0;
        qrArr[6*41+i] = 0;
        qrArr[6+41*i] = 0;

        qrArr[i+41-7] = 0;
        qrArr[i*41+41-7] = 0;
        qrArr[6*41+i+41-7] = 0;
        qrArr[6+41*i+41-7] = 0;

        qrArr[i+(41-7)*41] = 0;
        qrArr[i*41+(41-7)*41] = 0;
        qrArr[6*41+i+(41-7)*41] = 0;
        qrArr[6+41*i+(41-7)*41] = 0;
    }

    qrArr[41*(41-6)-7] = 0;

    for (var i = 0; i < 5; i++) {
        qrArr[41*(41-9)+41+i-9] = 0;
        qrArr[41*(41-5)+41+i-9] = 0;


        qrArr[41*(41-9+i)+41-9] = 0;
        qrArr[41*(41-9+i)+41-5] = 0;
    }

    qrArr[41*(41-8)+8] = 0;

    return qrArr;
}

function formatText(text) {
    var bytes = new TextEncoder().encode(text);
    var len = text.length;
    console.log(bytes);

    var output = new Array(60);
    output[0] = 64 + (len>>4);
    output[1] = ((len&15) << 4) + (bytes[0] >> 4);
    for (var i = 1; i < len; i++) {
        output[1+i] = ((bytes[i-1]&15) << 4) + (bytes[i] >> 4);
    }
    output[len+1] = ((bytes[len-1]&15) << 4);

    var padbyte = 0xec;
    for (var i = len+2; i < 60; i++) {
        output[i] = padbyte;
        padbyte ^= (0xec ^ 0x11);
    }

    console.log(output);

    return output;
}

function GFMult(a, b) {
    var out = 0;

    for (var i = 0; i < 8; i++) {
        if ((a >> i) & 1 == 1) {
            out ^= b;
        }
        b = ((b<<1) & 0xff) ^ ((b>>7) * 0x1D);
    }

    return out;
}

function polyDiv(a, b) {
    //console.log(a.slice());
    while (a.length > b.length-1) {
        for (var i = 1; i < b.length; i++) {
            a[i] ^= GFMult(b[i], a[0])
        }
        a.shift();
    }
    //console.log(a.slice());
    return a;
}

function generateECC(data) {
    var generatorPoly = [1, 252, 9, 28, 13, 18, 251, 208, 150, 103, 174, 100, 41, 167, 12, 247, 56, 117, 119, 233, 127, 181, 100, 121, 147, 176, 74, 58, 197];

    return polyDiv(data.concat(new Array(28).fill(0)).slice(), generatorPoly);
}

function generateCodewords(data) {
    var out = new Array(43*4).fill(0);

    //console.log(out);
    for (var i = 0; i < 4; i++) {
        ecc = generateECC(data.slice(15*i, 15*(i+1)));
        for (var j = 0; j < 15; j++) {
            out[i+4*j] = data[i*15+j];
        }
        for (var j = 15; j < 43; j++) {
            out[i+4*j] = ecc[j-15];
        }
    }

    return out;
}

function getBit(codewords, i) {
    return (codewords[i >> 3] >> (7-(i&7))) & 1;
}

function isReservedPixel(x, y) {
    if (x == 6 || y == 6) return true;
    if (x < 9 && y < 9) return true;
    if (x > 32 && y < 9) return true;
    if (x < 9 && y > 32) return true;
    if (x < 37 && x > 31 && y < 37 && y > 31) return true;
    return false;
}

function evalMask(x, y, m) {
    if (m == 0) return (x + y) % 2 == 0;
    if (m == 1) return y % 2 == 0;
    if (m == 2) return x % 3 == 0;
    if (m == 3) return (x + y) % 3 == 0;
    if (m == 4) return (Math.floor(x/3) + Math.floor(y/3)) % 2 == 0;
    if (m == 5) return x*y%2 + x*y%3 == 0;
    if (m == 6) return ((x*y)%3 + x*y)%2 == 0;
    if (m == 7) return ((x*y)%3 + x+y)%2 == 0;
}

function placePixels(codewords, qrArr, mask) {
    var x = 40;
    var y = 40;

    var going_up = true;
    var about_to_change_y = false;
    
    for (var i = 0; i < 43*4*8; ) {
        if (!isReservedPixel(x, y)) {
            qrArr[y*41+x] = 1-getBit(codewords, i);
            if (evalMask(x, y, mask)) qrArr[y*41+x] = 1 - qrArr[y*41+x];
            console.log(x, y, getBit(codewords, i));
            i++;
        }

        if (!about_to_change_y) {
            x--;
            about_to_change_y = true;
        } else {
            if (y == 0 && going_up) {
                going_up = false;
                x--;
                if (x == 6) x--;
            } else if (y == 40 && !going_up) {
                going_up = true;
                x--;
            } else if (going_up) {
                x++;
                y--;
            } else {
                x++;
                y++;
            }

            about_to_change_y = false;
        }
    }
}

function placeFormat(qrArr, mask) {
    var fm = Array(15).fill(0);
    fm[0] = 1;
    fm[2] = mask >> 2;
    fm[3] = (mask >> 1) & 1;
    fm[4] = mask & 1;
    var eccPoly = [1, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1];
    var ecc = polyDiv(fm.slice(), eccPoly);
    console.log(ecc);

    var format = Array(15).fill(0);
    var fmask = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];

    for (var i = 0; i < 5; i++) {
        format[i] = fm[i] ^ fmask[i];
    }

    for (var i = 5; i < 15; i++) {
        format[i] = ecc[i-5] ^ fmask[i];
    }

    for (var i = 0; i < 6; i++) {
        qrArr[8*41+i] = 1-format[i];
        qrArr[8+41*i] = 1-format[14-i];

        qrArr[(40-i)*41+8] = 1-format[i];
        qrArr[(40-i)+41*8] = 1-format[14-i];
    }

    qrArr[8*41+7] = 1 - format[6];
    qrArr[8+41*7] = 1 - format[8];
    qrArr[8+41*8] = 1 - format[7];

    qrArr[34*41+8] = 1-format[6];
    qrArr[34+41*8] = 1-format[8];
    qrArr[33+41*8] = 1-format[7];



    console.log(format);
}

function replaceArt(pixels, replacement, width, height) {
    var diffCount = 0;

    xoff = 20-Math.floor((width-1)/2);
    yoff = 20-Math.floor((height-1)/2);
    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            if (pixels[(y+yoff)*41+x+xoff] != 1-replacement[y*width+x]) diffCount++;
            pixels[(y+yoff)*41+x+xoff] = 1-replacement[y*width+x];
        }
    }

    return diffCount;
}

function drawPixels(pixels, width) {
    var height = Math.ceil(pixels.length / width);

    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    var imgData = context.createImageData(width, height);

    canvas.height = height;
    canvas.width = width;

    for (var i = 0; i < pixels.length; i++) {
        imgData.data[4*i] = pixels[i]*255;
        imgData.data[4*i+1] = pixels[i]*255;
        imgData.data[4*i+2] = pixels[i]*255;
        imgData.data[4*i+3] = 255;
    }

    console.log(imgData)

    context.putImageData(imgData, 0, 0);

    var img = new Image();

    img.src = canvas.toDataURL('image/svg');
    document.getElementById("qrCodeOutput").src = img.src;
}