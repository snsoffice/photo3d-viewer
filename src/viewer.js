String.prototype.format = function () {
    var str = this;
    for ( var i = 0; i < arguments.length; i ++ ) {
	str = str.replace( '{' + i + '}', arguments[ i ] );
    }
    return str;
};

// 图片数据信息
var configData = {
    image: {
        url: 'images/coffee.jpg',
        size: [4230, 3064],
        points: [ [0, 0], [100, 100] ],
    },
    points3d: [ [0, 0, 1000], [100, 30, 1000] ],
};

// 视窗的大小
var view = {
    width: window.innerWidth,
    height: window.viewHeight,
    padding: 20,
};

// 摄像机位置
var cameraPostion = [ 0, 0, 3000 ];

var container, stats;
var camera, scene, renderer;

// 选项设置
var options;

// 纹理装载
var textureLoader;

// 三维空间点
var particles;
var PARTICLE_SIZE = 100;

// 三维空间点和像素坐标的连线
var lines;

// 交互操作
var raycaster, intersects;
var mouse, INTERSECTED = null;

var params = {
    scale: 1.0,
    grid: true,
};

init();
animate();

function init() {
    container = document.getElementById( 'container' );

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xf0f0f0 );

    camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.fromArray( cameraPostion );

    scene.add( camera );
    scene.add( new THREE.AmbientLight( 0xf0f0f0 ) );

    var light = new THREE.SpotLight( 0xffffff, 1.5 );
    light.position.set( 0, 0, 2000 );
    light.castShadow = true;
    light.shadow = new THREE.LightShadow( new THREE.PerspectiveCamera( 70, 1, 1, 10000 ) );
    light.shadow.bias = -0.000222;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    scene.add( light );

    textureLoader = new THREE.TextureLoader();

    var width = configData.image.size[0];
    var height = configData.image.size[1];

    var planeGeometry = new THREE.PlaneGeometry( width, height );
    // planeGeometry.rotateX( - Math.PI / 2 );
    var planeMaterial = new THREE.ShadowMaterial( { opacity: 0.2 } );
    var plane = new THREE.Mesh( planeGeometry, planeMaterial );
    plane.position.z = 10;
    plane.receiveShadow = true;
    scene.add( plane );

    var photoGeometry = new THREE.PlaneGeometry( width, height );
    // photoGeometry.rotateX( - Math.PI / 2 );
    var photoMesh = new THREE.Mesh( photoGeometry );
    scene.add( photoMesh );

    textureLoader.load( configData.image.url, function ( texture ) {

        photoMesh.material = new THREE.MeshBasicMaterial( {
            map: texture,
            alphaTest: 0.5,
            side: THREE.DoubleSide,
            transparent : true
        } );

    } );

    createModelSpots();
    createLines();

    var helper = new THREE.GridHelper( width > height ? width : height, 100 );
    helper.rotateX( Math.PI / 2 );
    helper.position.z = 20;
    helper.material.opacity = 0.25;
    helper.material.transparent = true;
    scene.add( helper );

    var axes = new THREE.AxesHelper( 1000 );
    axes.position.set( 0, 0, 100 );
    scene.add( axes );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    container.appendChild( renderer.domElement );

    stats = new Stats();
    // container.appendChild( stats.dom );

    var gui = new dat.GUI();
    gui.add( params, 'scale', 0, 1 ).step( 0.1 ).onChange( function( value ) {

    });
    gui.add( params, 'grid' ).onChange( function ( value ) {
        helper.visible = value;
    } );
    gui.open();

    // Controls
    var controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.damping = 0.2;
    controls.addEventListener( 'change', render );
    controls.addEventListener( 'start', function() {
    } );
    controls.addEventListener( 'end', function() {
    } );

    //
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    window.addEventListener( 'resize', onWindowResize, false );
    document.addEventListener( 'mousemove', onDocumentMouseMove, false );
}

function animate() {
    requestAnimationFrame( animate );
    render();
    stats.update();
}

function render() {
    // splines.uniform.mesh.visible = params.uniform;
    // splines.centripetal.mesh.visible = params.centripetal;
    // splines.chordal.mesh.visible = params.chordal;
    var geometry = particles.geometry;
    var attributes = geometry.attributes;
    raycaster.setFromCamera( mouse, camera );
    intersects = raycaster.intersectObject( particles );
    if ( intersects.length > 0 ) {
	if ( INTERSECTED != intersects[ 0 ].index ) {
	    attributes.size.array[ INTERSECTED ] = PARTICLE_SIZE;
	    INTERSECTED = intersects[ 0 ].index;
	    attributes.size.array[ INTERSECTED ] = PARTICLE_SIZE * 1.25;
	    attributes.size.needsUpdate = true;
            console.log('INTERSECTED is ' + INTERSECTED);
	}
    } else if ( INTERSECTED !== null ) {
        console.log('Clear INTERSECTED: ' + INTERSECTED);
	attributes.size.array[ INTERSECTED ] = PARTICLE_SIZE;
	attributes.size.needsUpdate = true;
	INTERSECTED = null;
    }
    renderer.render( scene, camera );
}

function createModelSpots() {
    var vertexShader =
        'attribute float size;\n' +
        'attribute vec3 customColor;\n' +
	'varying vec3 vColor;\n' +
	'void main() {\n' +
	'	vColor = customColor;\n' +
	'	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );\n' +
	'	gl_PointSize = size * ( 300.0 / -mvPosition.z );\n' +
	'	gl_Position = projectionMatrix * mvPosition;\n' +
	'}';
    var fragmentShader =
        'uniform vec3 color;\n' +
	'uniform sampler2D texture;\n' +
	'varying vec3 vColor;\n' +
	'void main() {\n' +
	'	gl_FragColor = vec4( color * vColor, 1.0 );\n' +
	'	gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );\n' +
	'	if ( gl_FragColor.a < ALPHATEST ) discard;\n' +
	'}';

    var items = configData.points3d;
    var n = items.length;

    var positions = new Float32Array( n * 3 );
    var colors = new Float32Array( n * 3 );
    var sizes = new Float32Array( n );
    var color = new THREE.Color();

    for ( var i = 0, j = 0; i < n; i ++ ) {
        items[ i ].forEach ( function ( value ) {
            positions[ j ] = value;
            j ++;
        } );
	color.setHSL( 0.01 + 0.1 * ( i / n ), 1.0, 0.5 );
	color.toArray( colors, i * 3 );
	sizes[ i ] = PARTICLE_SIZE * 0.5;
    }

    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
    geometry.addAttribute( 'customColor', new THREE.BufferAttribute( colors, 3 ) );
    geometry.addAttribute( 'size', new THREE.BufferAttribute( sizes, 1 ) );
    //
    var material = new THREE.ShaderMaterial( {
	uniforms: {
	    color:   { value: new THREE.Color( 0xffffff ) },
	    texture: { value: new THREE.TextureLoader().load( "textures/sprites/disc.png" ) }
	},
	vertexShader: vertexShader,
	fragmentShader: fragmentShader,
	alphaTest: 0.9
    } );

    //
    particles = new THREE.Points( geometry, material );
    scene.add( particles );

    geometry.computeBoundingSphere();
    if ( geometry.boundingSphere && geometry.boundingSphere.radius === 0 )
        geometry.boundingSphere.radius = PARTICLE_SIZE;

}

function createLines() {
    var material = new THREE.LineBasicMaterial( {
        color: 0xffffff,
        opacity: 0.6,
        linewidth: 1,
        vertexColors: THREE.VertexColors,
    } );
    var geometry = new THREE.BufferGeometry();

    var positions = [];
    var colors = [];

    var image = configData.image;
    var w = image.size[0], h = image.size[1];
    var points = image.points;

    var items = configData.points3d;
    var n = items.length;

    for (var i = 0; i < n; i++ ) {
        var x0 = points[ i ][ 0 ] - w / 2;
        var y0 = - points[ i ][ 1 ] + h / 2;
        positions.push( x0, y0, 0 );
        items[ i ].forEach( function ( v ) {
            positions.push( v );
        } );
        colors.push( Math.random() * 0.5 + 0.5, Math.random() * 0.5 + 0.5, 1 );
        colors.push( Math.random() * 0.5 + 0.5, Math.random() * 0.5 + 0.5, 1 );
    }

    geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
    geometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
    geometry.computeBoundingSphere();

    lines = new THREE.LineSegments( geometry, material );
    scene.add(lines);

}

function onDocumentMouseMove( event ) {
    event.preventDefault();
    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}