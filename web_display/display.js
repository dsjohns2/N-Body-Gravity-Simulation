
var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;

var UDAngle=0.0, eyeQuatUD = quat.create(), RLAngle = 0.0, eyeQuatLR=quat.create(), YAngle = 0.0, eyeQuatY=quat.create();
var axisToRot = vec3.create();
var speed = 0.00;
var bound = 200000000000;
var sun_scale = 10000000000;
var planet_scale = [2000000000, 2000000000, 2000000000, 2000000000, 2000000000*3, 2000000000*2, 2000000000, 2000000000];
var play_bool = true;
var increase_scale_bool = true;
var speed_of_rotation = 10;

// Create a place to store sphere geometry
var sphereVertexPositionBuffer;

//Create a place to store normals for shading
var sphereVertexNormalBuffer;

// View parameters
var eyePt = vec3.fromValues(0,0,10);
var viewDir = vec3.fromValues(0,0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);

// Create the normal
var nMatrix = mat3.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

//Create Sphere matrices
var positionMatrix = [];
var scaleMatrix = [];
var materialMatrix = [];
var data = [];

var num_spheres = 0;
var last_time_update = Date.now();
var frame_num = 0;

var mvMatrixStack = [];

/**
 * Sets up the buffers for the sphere mesh.
 */
//-------------------------------------------------------------------------
function setupSphereBuffers() {
    
    var sphereSoup=[];
    var sphereNormals=[];
    var numT=sphereFromSubdivision(6,sphereSoup,sphereNormals); 
    sphereVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereSoup), gl.STATIC_DRAW);
    sphereVertexPositionBuffer.itemSize = 3;
    sphereVertexPositionBuffer.numItems = numT*3;
    
    // Specify normals to be able to do lighting calculations
    sphereVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals),
                  gl.STATIC_DRAW);
    sphereVertexNormalBuffer.itemSize = 3;
    sphereVertexNormalBuffer.numItems = numT*3;    
}

/**
 * Draws a single sphere based off of the sphere matrices' elements.
 * @param cur_sphere: current sphere that is being drawn in the matrix
 * @return nothing
 */
//-------------------------------------------------------------------------
function drawSphere(cur_sphere){
 var transformVec = vec3.create();
 
 // Set up light parameters
 var Ia = vec3.fromValues(.5,.5,.5);
 var Id = vec3.fromValues(1.0,1.0,1.0);
 var Is = vec3.fromValues(1.0,1.0,1.0);
    
 // Set up materials
 var materialr = materialMatrix[cur_sphere*3+0];
 var materialg = materialMatrix[cur_sphere*3+1];
 var materialb = materialMatrix[cur_sphere*3+2];
 ka = vec3.fromValues(materialr,materialg,materialb);
 kd = vec3.fromValues(.4,0.4,0.4);
 ks = vec3.fromValues(.2*materialr,.2*materialg,.2*materialb);
    
 var lightPosEye4 = vec4.fromValues(2.0,2.0,2.0,1.0);
 lightPosEye4 = vec4.transformMat4(lightPosEye4,lightPosEye4,mvMatrix);
 var lightPosEye = vec3.fromValues(lightPosEye4[0],lightPosEye4[1],lightPosEye4[2]);
    
 //Translate    
 var positionx = positionMatrix[cur_sphere*3+0];
 var positiony = positionMatrix[cur_sphere*3+1];
 var positionz = positionMatrix[cur_sphere*3+2];
 vec3.set(transformVec,positionx,positiony,positionz);
 mat4.translate(mvMatrix, mvMatrix,transformVec);
    
 //Scale
 var scalex = scaleMatrix[cur_sphere*3+0];
 var scaley = scaleMatrix[cur_sphere*3+1];
 var scalez = scaleMatrix[cur_sphere*3+2];
 vec3.set(transformVec,scalex,scaley,scalez);
 mat4.scale(mvMatrix, mvMatrix,transformVec);
    
 uploadLightsToShader(lightPosEye,Ia,Id,Is);
 uploadMaterialToShader(ka,kd,ks);
 setMatrixUniforms();    
    
 gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           sphereVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);
 gl.drawArrays(gl.TRIANGLES, 0, sphereVertexPositionBuffer.numItems);      
}

/**
 * Uploads the model view matrix to the shader.
 */
//-------------------------------------------------------------------------
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/**
 * Uploads the projection matrix to the shader.
 */
//-------------------------------------------------------------------------
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

/**
 * Uploads the normal matrix to the shader.
 */
//-------------------------------------------------------------------------
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

/**
 * Pushes a mvmatrix to the stack.
 */
//----------------------------------------------------------------------------------
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}

/**
 * Pops a mvmatrix off the stack.
 */
//----------------------------------------------------------------------------------
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

/**
 * Sends the matrix uniforms to the shader.
 */
//----------------------------------------------------------------------------------
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

/**
 * Converts degrees to radians.
 */
//----------------------------------------------------------------------------------
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

//----------------------------------------------------------------------------------
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
    
  shaderProgram.uniformAmbientMatColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientMatColor");  
  shaderProgram.uniformDiffuseMatColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseMatColor");
  shaderProgram.uniformSpecularMatColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularMatColor");   
}


//-------------------------------------------------------------------------
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//-------------------------------------------------------------------------
function uploadMaterialToShader(a,d,s) {
  gl.uniform3fv(shaderProgram.uniformAmbientMatColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMatColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMatColorLoc, s);
}


//----------------------------------------------------------------------------------
function setupBuffers() {
    setupSphereBuffers();     
}

/**
 * Draws the spheres.
 */
//----------------------------------------------------------------------------------
function draw() { 
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    //mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);
    mat4.ortho(pMatrix, -1*bound, bound, -1*bound, bound, -1*bound, bound);

    // We want to look down -z, so create a lookat point in that direction    
    //vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);    
    
    //draw spheres
    for(var i=0; i<num_spheres; i++){
        mvPushMatrix();
        drawSphere(i);
        mvPopMatrix();
    }
}

// From https://stackoverflow.com/questions/14446447/how-to-read-a-local-text-file
function readTextFile(file)
{
    var rawFile = new XMLHttpRequest();
    rawFile.open("GET", file, false);
    rawFile.onreadystatechange = function ()
    {
        if(rawFile.readyState === 4)
        {
            if(rawFile.status === 200 || rawFile.status == 0)
            {
                var allText = rawFile.responseText;
                convertToMatrix(allText);
            }
        }
    }
    rawFile.send(null);
}

function convertToMatrix(text)
{
    var cur_body_matrix = text.split("\n");
    data.push(cur_body_matrix);
}

function update_positions(position_idx){
    positionMatrix = [];
    num_spheres = 0;
    for(var i=0; i<data.length; i++){
        num_spheres++;

        var position_vector = data[i][position_idx].split(" ");

        positionMatrix.push(parseFloat(position_vector[0]));
        positionMatrix.push(parseFloat(position_vector[1]));
        positionMatrix.push(parseFloat(position_vector[2]));
    }
}

function set_scale_and_material(){
    scaleMatrix = [];
    materialMatrix = [];
    for(var i=0; i<data.length; i++){        
        if(i == 0){
            scaleMatrix.push(sun_scale);
            scaleMatrix.push(sun_scale);
            scaleMatrix.push(sun_scale);
        }
        else{
            scaleMatrix.push(planet_scale[i-1]);
            scaleMatrix.push(planet_scale[i-1]);
            scaleMatrix.push(planet_scale[i-1]);
        }
    }
    //Sun
    materialMatrix.push(1);
    materialMatrix.push(1);
    materialMatrix.push(0);
    //Mercury
    materialMatrix.push(.5);
    materialMatrix.push(.5);
    materialMatrix.push(.5);
    //Venus
    materialMatrix.push(.6);
    materialMatrix.push(.6);
    materialMatrix.push(0);
    //Earth
    materialMatrix.push(0);
    materialMatrix.push(0);
    materialMatrix.push(1);
    //Mars
    materialMatrix.push(1);
    materialMatrix.push(0);
    materialMatrix.push(0);
    //Junipter
    materialMatrix.push(1);
    materialMatrix.push(.25);
    materialMatrix.push(0);
    //Saturn
    materialMatrix.push(1);
    materialMatrix.push(.9);
    materialMatrix.push(0);
    //Uranus
    materialMatrix.push(0);
    materialMatrix.push(0);
    materialMatrix.push(1);
    //Neptune
    materialMatrix.push(0);
    materialMatrix.push(0);
    materialMatrix.push(1);
}

//----------------------------------------------------------------------------------
function startup() {
  canvas = document.getElementById("myGLCanvas");
  window.addEventListener( 'keydown', onKeyDown, false );
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  readTextFile("http://localhost:8000/body_num_0.txt");
  readTextFile("http://localhost:8000/body_num_1.txt");
  readTextFile("http://localhost:8000/body_num_2.txt");
  readTextFile("http://localhost:8000/body_num_3.txt");
  readTextFile("http://localhost:8000/body_num_4.txt");
  readTextFile("http://localhost:8000/body_num_5.txt");
  readTextFile("http://localhost:8000/body_num_6.txt");
  readTextFile("http://localhost:8000/body_num_7.txt");
  readTextFile("http://localhost:8000/body_num_8.txt");
  readTextFile("http://localhost:8000/body_num_9.txt");
  set_scale_and_material();
  tick();
}

//----------------------------------------------------------------------------------
function tick() {
    requestAnimFrame(tick);
    if(play_bool){
        var position_idx = frame_num * speed_of_rotation;
        if(position_idx < data[0].length - 1){
            update_positions(position_idx);
        }
        frame_num = frame_num + 1;
    }
    set_scale_and_material();
    draw();
}

/**
 * Handles the events of when certain keys are pressed.
 * The actions that correspond to the keys are documented
 * on the flight html page.
 * @param event
 * @return nothing
 */
function onKeyDown(event)
{
    //Increase planet size - right arrow
    if(event.keyCode =="39"){
        increase_scale_bool = true;
    }
    //Decrease planet size - left arrow
    if(event.keyCode =="37"){
        increase_scale_bool = false;
    }
    //Change sun size - 1
    if(event.keyCode =="49"){
        if(increase_scale_bool){
            sun_scale *= 1.1;
        }
        else{
            sun_scale /= 1.1;        
        }
    }
    //Change planet size - 2
    if(event.keyCode =="50"){
        if(increase_scale_bool){
            planet_scale[0] *= 1.1;
        }
        else{
            planet_scale[0] /= 1.1;        
        }
    }
    //Change planet size - 3
    if(event.keyCode =="51"){
        if(increase_scale_bool){
            planet_scale[1] *= 1.1;
        }
        else{
            planet_scale[1] /= 1.1;        
        }
    }
    //Change planet size - 4
    if(event.keyCode =="52"){
        if(increase_scale_bool){
            planet_scale[2] *= 1.1;
        }
        else{
            planet_scale[2] /= 1.1;        
        }
    }
    //Change planet size - 5
    if(event.keyCode =="53"){
        if(increase_scale_bool){
            planet_scale[3] *= 1.1;
        }
        else{
            planet_scale[3] /= 1.1;        
        }
    }
    //Change planet size - 6
    if(event.keyCode =="54"){
        if(increase_scale_bool){
            planet_scale[4] *= 1.1;
        }
        else{
            planet_scale[4] /= 1.1;        
        }
    }
    //Change planet size - 7
    if(event.keyCode =="55"){
        if(increase_scale_bool){
            planet_scale[5] *= 1.1;
        }
        else{
            planet_scale[5] /= 1.1;        
        }
    }
    //Change planet size - 8
    if(event.keyCode =="56"){
        if(increase_scale_bool){
            planet_scale[6] *= 1.1;
        }
        else{
            planet_scale[6] /= 1.1;        
        }
    }
    //Change planet size - 9
    if(event.keyCode =="57"){
        if(increase_scale_bool){
            planet_scale[7] *= 1.1;
        }
        else{
            planet_scale[7] /= 1.1;        
        }
    }
    //Increase display width - up arrow
    if(event.keyCode =="38"){
        bound *= 1.1;
    }
    //Decrease display width - down arrow
    if(event.keyCode =="40"){
        bound /= 1.1;
    }
    //Increase speed of rotation - I
    if(event.keyCode =="73"){
        speed_of_rotation += 10;
    }
    //Decrease speed of rotation - U
    if(event.keyCode =="85"){
        speed_of_rotation -= 10;
        if(speed_of_rotation <= 0){
            speed_of_rotation = 1;
        }
    }
    // Reset - R
    if(event.keyCode =="82"){
        frame_num = 0;
    }
    // Pause - P
    if(event.keyCode =="80"){
        play_bool = !play_bool;
    }
}