function generate() {
    alert("Test");

    imageArr = new Array(100);
    for (var i = 0; i < 100; i++) imageArr[i] = (i%3 == 0) ? 0 : 1;

    //drawPixels(createConstantPatterns(), 41);

    formatText(document.getElementById("inputText").value);

    code = generateCodewords(formatText(document.getElementById("inputText").value))

    console.log(code);

    arr = createConstantPatterns();
    placePixels(code, arr, 0);

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
    while (a.length > 28) {
        for (var i = 1; i < 29; i++) {
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

    img.src = canvas.toDataURL('image/png');
    document.body.appendChild(img);
}