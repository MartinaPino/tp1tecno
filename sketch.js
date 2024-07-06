let trazos = [];
let cantidadTrazos = 11;
let imagenesEnPantalla = [];
let maxImages = 7;
let maxImagenesRojas = 3;
let maxImagenesNegras = 4;
let intervaloGeneracion = 30; // Generación de imágenes en frames
let ultimoTiempoGeneracion = 0;
let estado = "generar"; 
let audioContext;
let mic;
let pitch;
let gestorAmp;
let gestorPitch;
let umbral_sonido = 0.05;
let antesHabiaSonido;
let marcaEnElTiempo;
let duracionVibracion = 3000; // 3 segundos de vibración
let intervaloDesaparicion = 500; // Intervalo entre la desaparición de cada imagen (1 segundo)
let tiempoUltimaDesaparicion = 0;
let altura;
let empezoElSonido;
let terminoElSonido;
let haySonido;

let FREC_MIN = 400; //no se si es grave -500 grave
let FREC_MAX = 900; //+500 agudo

function preload() {
    for (let i = 0; i < cantidadTrazos; i++) {
        let nombre = "data/trazo" + nf(i, 2) + ".png";
        trazos[i] = loadImage(nombre);
    }
}

function setup() {
    select('body').style('background-color', 'rgb(205, 205, 205)');
    createCanvas(900, 550);
    imageMode(CENTER);

    audioContext = getAudioContext();
    mic = new p5.AudioIn();
    mic.start(startPitch);
    userStartAudio();

    gestorAmp = new GestorSenial(0.05, 0.5);
    gestorPitch = new GestorSenial(FREC_MIN, FREC_MAX);
}

function draw() {
    background(255);

    let vol = mic.getLevel();
    gestorAmp.actualizar(vol);

    haySonido = gestorAmp.filtrada > umbral_sonido;
    empezoElSonido = haySonido && !antesHabiaSonido;
    terminoElSonido = !haySonido && antesHabiaSonido;
    altura = gestorPitch.filtrada;

    if (estado === "generar") {
        if (imagenesEnPantalla.length < maxImages) {
            generarImagenes();
        } else {
            estado = "vibrar";
            marcaEnElTiempo = millis();
        }
    } else if (estado === "vibrar" && millis() - marcaEnElTiempo >= duracionVibracion) {
        estado = "desaparecer";
        tiempoUltimaDesaparicion = millis();
    }

    // Dibujar todas las imágenes actualmente en pantalla
    for (let i = 0; i < imagenesEnPantalla.length; i++) {
        let imagenActual = imagenesEnPantalla[i];
        
        let posX = imagenActual.x;
        let posY = imagenActual.y;

        // Aplicar vibración solo si el estado es "vibrar" y hay sonido
        if (estado === "vibrar" && haySonido) {
            let vibracionIntensidad = map(altura, FREC_MIN, FREC_MAX, 5, 20); // Ajustar el rango según lo necesites
            let vibracionX = random(-vibracionIntensidad, vibracionIntensidad); // Variación aleatoria en el eje x
            let vibracionY = random(-vibracionIntensidad, vibracionIntensidad); // Variación aleatoria en el eje y
            posX += vibracionX;
            posY += vibracionY;

            // Actualizar las posiciones en el objeto de la imagen
            imagenActual.x = posX;
            imagenActual.y = posY;
        }

        push();
        translate(posX, posY);
        rotate(imagenActual.rotation);
        tint(imagenActual.tint[0], imagenActual.tint[1], imagenActual.tint[2], imagenActual.tint[3]);
        image(imagenActual.img, 0, 0, imagenActual.width, imagenActual.height);
        pop();
    }
    noTint();

    if (estado === "desaparecer" && millis() - tiempoUltimaDesaparicion >= intervaloDesaparicion) {
        if (imagenesEnPantalla.length > 0) {
            imagenesEnPantalla.shift(); // Remover la primera imagen de la lista
        }
        tiempoUltimaDesaparicion = millis(); // Actualizar el tiempo de última desaparición
    }

    // Verificar si todas las imágenes han desaparecido
    if (estado === "desaparecer" && imagenesEnPantalla.length === 0) {
        reiniciarEstado(); // Llama a la función para reiniciar el estado
    }
    

    elegirLineas();
    antesHabiaSonido = haySonido;
}
function reiniciarEstado() {
    // Reinicia todas las variables globales a sus valores iniciales
    imagenesEnPantalla = [];
    estado = "generar";
    frameCount=0;
    ultimoTiempoGeneracion = 0;
    antesHabiaSonido = false;
    marcaEnElTiempo = 0;
    tiempoUltimaDesaparicion = 0;
    empezoElSonido = false;
    terminoElSonido = false;
    haySonido = false;
    altura=0;
    MIDI=0;
}

function generarImagenes() {
    if (frameCount - ultimoTiempoGeneracion >= intervaloGeneracion) {
        console.log("Altura MIDI para generar imagen:", altura);
        if (altura >= 64) { // A4 (MIDI 69) y superiores
            console.log("Llamando a lineasRojas() porque altura es mayor o igual a 70");
            lineasRojas();
        } else if (altura <= 54 && altura>=50) { // D#3 (MIDI 50) y inferiores
            console.log("Llamando a lineasNegras() porque altura es menor o igual a 50");
            lineasNegras();
        }
        ultimoTiempoGeneracion = frameCount;
    }
}

function elegirLineas() {
    if (terminoElSonido) {
        return;
    }

    if (empezoElSonido) {
        console.log("Empezó el sonido con altura MIDI:", altura);
        if (altura >= 64) { // A4 (MIDI 69) y superiores
            console.log("Llamando a lineasRojas() porque altura es mayor o igual a 70");
            lineasRojas();
        } else if (altura <= 54 && altura>=50) {// D#3 (MIDI 50) y inferiores
            console.log("Llamando a lineasNegras() porque altura es menor o igual a 50");
            lineasNegras();
        }
    
        marcaEnElTiempo = millis();

        if (millis() > marcaEnElTiempo + duracionVibracion) {
            // Estado de "dibujar" según tu lógica
            estado = "dibujar";
        }
    }
}

function startPitch() {
    pitch = ml5.pitchDetection('https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/', audioContext, mic.stream, modelLoaded);
}

function modelLoaded() {
    console.log("Modelo de pitchDetection cargado");
    getPitch();
}

function getPitch() {
    pitch.getPitch(function(err, frequency) {
        if (err) {
            console.error("Error en getPitch:", err);
            return;
        }
        if (frequency) {
            let midiNum = freqToMidi(frequency);
            console.log("Frecuencia detectada:", frequency, "Altura MIDI:", midiNum); // Verifica la altura MIDI en la consola
            gestorPitch.actualizar(midiNum);
        }
        getPitch();
    })
}

function lineasNegras() {
    console.log("dentro de negro");
    let countNegras = imagenesEnPantalla.filter(img => img.tipo === 'negra').length;
    if (countNegras >= maxImagenesNegras) {
        console.log("Ya hay suficientes líneas negras en pantalla");
        return;
    }
    let indice = int(random(trazos.length));
    let x = random(width);
    let y = random(height / 3);
    let originalWidth = trazos[indice].width;
    let originalHeight = trazos[indice].height;
    if (originalWidth && originalHeight) { // Verificar que las dimensiones originales existan
        let newWidth = random(400, 650); // Ajustado para tamaños más pequeños
        let newHeight = originalHeight * (newWidth / originalWidth);
        let rotation = random(TWO_PI);
        let img = {
            img: trazos[indice],
            x: x,
            y: y,
            width: newWidth,
            height: newHeight,
            tint: [0, 0, 0, 230], // Negro
            rotation: rotation,
            tipo: 'negra'
        };

        imagenesEnPantalla.push(img);
    } else {
        console.error("Dimensiones de la imagen no válidas:", originalWidth, originalHeight);
    }
}

function lineasRojas() {
    console.log("dentro de rojo");
    let countRojas = imagenesEnPantalla.filter(img => img.tipo === 'roja').length;
    if (countRojas >= maxImagenesRojas) {
        console.log("Ya hay suficientes líneas rojas en pantalla");
        return;
    }
    let indice = int(random(trazos.length));
    let x = random(width / 3);
    let y = random(height);
    let originalWidth = trazos[indice].width;
    let originalHeight = trazos[indice].height;
    if (originalWidth && originalHeight) { // Verificar que las dimensiones originales existan
        let newWidth = random(400, 650); // Ajustado para tamaños más pequeños
        let newHeight = originalHeight * (newWidth / originalWidth);
        let rotation = random(TWO_PI);
        let img = {
            img: trazos[indice],
            x: x,
            y: y,
            width: newWidth,
            height: newHeight,
            tint: [255, 0, 0, 230], // Rojo
            rotation: rotation,
            tipo:'roja'
        };

        imagenesEnPantalla.push(img);
    } else {
        console.error("Dimensiones de la imagen no válidas:", originalWidth, originalHeight);
    }
}

class GestorSenial {
    constructor(minFrecuencia, maxFrecuencia) {
        this.minFrecuencia = minFrecuencia;
        this.maxFrecuencia = maxFrecuencia;
        this.filtrada = 0;
    }

    actualizar(valor) {
        this.filtrada = map(valor, this.minFrecuencia, this.maxFrecuencia, this.minFrecuencia, this.maxFrecuencia);
    }
}

function freqToMidi(frequency) {
    return Math.round(69 + 12 * Math.log2(frequency / 440.0));
}
