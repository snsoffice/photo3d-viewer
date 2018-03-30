String.prototype.format = function () {
    var str = this;
    for ( var i = 0; i < arguments.length; i ++ ) {
	str = str.replace( '{' + i + '}', arguments[ i ] );
    }
    return str;
};

( function ( window, document, undefined ) {

'use strict';

    // 图片数据信息，读取配置文件得到
    var configData;
    var sampleConfig = {
        // 图片缩放比例
        scale: 1.0,
        // 查询照片信息
        image: {
            url: 'images/world_map_front.jpg',
            size: [1920, 2560],
            points: [ [10, 10], [100, 100] ],
        },
        // 参考照片信息
        refimage: {
            url: 'images/world_map_left.jpg',
            size: [1920, 2560],
            mask: [ 0, 0, 1920, 2560 ],
            points: [ [10, 10], [100, 100] ],
        },
        // 对应的三维坐标
        points3d: [ [0, 0, 230], [100, 30, 370] ],
        // 相对位置
        position: [ 0, 0, 0 ],
        // 相对角度(度): pitch, yaw, roll
        rotation: [ 0, -15 / 180 * Math.PI, 0 ],
    };

    // 视窗的大小
    var viewport = {
        width: window.innerWidth,
        height: window.viewHeight,
        padding: 20,
    };

    // 摄像机位置
    // 默认位置通过计算获得，使得图片正好布满窗口
    var cameraPostion = [ 0, 0, 3000 ];
    // 摄像机面对的点
    var cameraLookat = [ 0, 0, 0 ];

    var container, stats;
    var camera, scene, renderer;
    var imagePlane, refimagePlane, shadowPlane;
    var gridHelper, axesHelper;

    // 纹理装载
    var textureLoader;

    // 三维空间点
    var particles;

    // 图片关键点
    var keypoints, refkeypoints;

    // 三维空间点和像素坐标的连线
    var objlines;

    // 匹配关键点的连线
    var matchlines;
    
    // 交互操作
    var raycaster, intersects;
    var mouse, INTERSECTED = null;
    // 判断鼠标是否在点精灵范围大小内，例如 10 个像素内
    var POINT_THRESHOLD = 10.0;

    // 算法选项
    var params = {
        // 挖掘次数，默认不进行挖掘
        dig: 0,

        // 参考照片关键点数目

        // 测试照片关键点数目

    };
        
    // 显示选项
    var options = {

        // 是否显示表格
        grid: false,

        // 是否显示坐标轴
        axes: false,

        // 是否显示匹配的线条
        match_line: true,

        // 是否显示参考图片
        refimage: true,

        // 参考图片透明度
        refopacity: 0.6,

        // 是否显示三维点对应的线条
        particle_line: true,

        // 显示两张匹配照片的时候相对距离
        distance: 1200,

        // 三维空间点的大小
        particle_size: 60,

        // 空间坐标缩放比例
        particle_scale: 1,

    };

    var palette = {
        // 三维空间点颜色
        particle: [ 0, 128, 255, 0.3 ],

        // 匹配关键点颜色
        match: [ 0, 255, 0, 0.8 ],

        // 不匹配关键点颜色
        outiler: [ 255, 0, 0, 0.8 ],
    };
    
    // 装载配置文件，生成三维视图
    function load( config ) {
        configData = config;

        scene = new THREE.Scene();
        // scene.background = new THREE.Color( 0xf0f0f0 );
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

        // 设置图片缩放比例
        var s = config.scale === undefined ? 1.0 : config.scale;        
        var width = config.image.size[0] * s;
        var height = config.image.size[1] * s;

        // 显示物体阴影的平面
        var planeGeometry = new THREE.PlaneGeometry( width, height );
        // planeGeometry.rotateX( - Math.PI / 2 );
        var planeMaterial = new THREE.ShadowMaterial( { opacity: 0.2 } );
        shadowPlane = new THREE.Mesh( planeGeometry, planeMaterial );
        shadowPlane.position.z = 10;
        shadowPlane.receiveShadow = true;
        scene.add( shadowPlane );

        // 创建基准图片
        var geometry = new THREE.PlaneGeometry( width, height );
        // photoGeometry.rotateX( - Math.PI / 2 );
        imagePlane = new THREE.Mesh( geometry );

        if ( config.image && config.image.url ) 
            textureLoader.load( config.image.url, function ( texture ) {

                imagePlane.material = new THREE.MeshBasicMaterial( {
                    map: texture,
                    alphaTest: 0.5,
                    side: THREE.DoubleSide,
                    transparent : true
                } );
                scene.add( imagePlane );

            } );

        // 创建辅助图片
        geometry = new THREE.PlaneGeometry( width, height );
        // geometry.rotateY( - Math.PI / 2 );
        refimagePlane = new THREE.Mesh( geometry );
        refimagePlane.position.z = options.distance;
        // refimagePlane.quaternion.setFromAxisAngle( 0, - Math.PI / 2, 0 );
        // refimagePlane.position.set( 0, - width / 2, height / 2 );

        if ( config.refimage && config.refimage.url ) 

            // if ( config.rotation )
            //     refimagePlane.rotation.fromArray( config.rotation );

            textureLoader.load( config.refimage.url, function ( texture ) {

                refimagePlane.material = new THREE.MeshBasicMaterial( {
                    map: texture,
                    alphaTest: 0.1,
                    side: THREE.DoubleSide,
                    opacity: 0.6,
                    transparent : true
                } );
                scene.add( refimagePlane );

            } );

        // 创建关键点和匹配线条
        createImageKeypoints( config );
        createRefimageKeypoints( config );
        createMatchLines( config );

        // 创建三维坐标点和线条
        createParticles( config );
        createParticleLines( config );

        // 创建辅助表格
        gridHelper = new THREE.GridHelper( width > height ? width : height, 100 );
        gridHelper.rotateX( Math.PI / 2 );
        gridHelper.position.z = 20;
        gridHelper.material.opacity = 0.25;
        gridHelper.material.transparent = true;
        gridHelper.visible = options.grid;
        scene.add( gridHelper );

        // 创建辅助坐标轴
        axesHelper = new THREE.AxesHelper( 1000 );
        axesHelper.position.set( 0, 0, options.distance + 10 );
        axesHelper.visible = options.axes;
        scene.add( axesHelper );

        // 设置摄像头位置
        resetCamera( config );
    }

    // 根据配置文件信息计算摄像机默认位置，使之正好能够布满视窗
    function resetCamera( config ) {
    }

    // 初始化
    function init() {
        container = document.getElementById( 'container' );
        textureLoader = new THREE.TextureLoader();

        // 性能统计，暂不显示
        stats = new Stats();
        // container.appendChild( stats.dom );

        camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 10000 );
        camera.position.fromArray( cameraPostion );

        renderer = new THREE.WebGLRenderer( { antialias: true } );
        renderer.setPixelRatio( window.devicePixelRatio );
        renderer.setSize( window.innerWidth, window.innerHeight );
        renderer.shadowMap.enabled = true;
        container.appendChild( renderer.domElement );

        // 选项设置
        var gui = new dat.GUI();
        gui.add( options, 'grid' ).onChange( function ( value ) {
            if ( gridHelper ) gridHelper.visible = value;
        } );

        gui.add( options, 'axes' ).onChange( function ( value ) {
            if ( axesHelper ) axesHelper.visible = value;
        } );

        gui.add( options, 'match_line' ).onChange( function ( value ) {
            if ( matchlines ) matchlines.visible = value;
        } );

        gui.add( options, 'particle_line' ).onChange( function ( value ) {
            if ( objlines ) objlines.visible = value;
        } );

        gui.add( options, 'refimage' ).onChange( function ( value ) {
            if ( refimagePlane ) refimagePlane.visible = value;
        } );

        gui.add( options, 'refopacity', 0, 1 ).step( 0.1 ).onChange( function( value ) {
            if ( refimagePlane && refimagePlane.material )
                refimagePlane.material.opacity = value;
        });

        gui.add( options, 'distance', 1000, 2000 ).step( 100 ).onChange( function( value ) {
            resetDistance( value );
        });

        gui.add( options, 'particle_size', 30, 80 ).step( 10 ).onChange( function( value ) {
        });

        gui.add( options, 'particle_scale', 0.8, 3.2 ).step( 0.2 ).onChange( function( value ) {
            resetParticleScale( value );
        });

        var colorFolder = gui.addFolder('Palette');
        colorFolder.addColor(palette, 'particle');
        colorFolder.addColor(palette, 'match');
        colorFolder.addColor(palette, 'outiler');
        gui.open();

        // 鼠标控制方式
        var controls = new THREE.OrbitControls( camera, renderer.domElement );
        controls.damping = 0.2;
        controls.addEventListener( 'change', render );
        controls.addEventListener( 'start', function() {
        } );
        controls.addEventListener( 'end', function() {
        } );

        // 判断鼠标指针所在的对象
        raycaster = new THREE.Raycaster();
        raycaster.params.Points.threshold = POINT_THRESHOLD;        
        mouse = new THREE.Vector2(Infinity, Infinity);

        window.addEventListener( 'resize', onWindowResize, false );
        document.addEventListener( 'mousemove', onDocumentMouseMove, false );
        document.querySelector( '#load-config' ).addEventListener( 'click', onLoadConfigClick, false );
        document.querySelector( '#select-config-file' ). addEventListener( 'change', onHandleFiles, false );

    }

    function animate() {
        requestAnimationFrame( animate );
        if (scene)
            render();
        stats.update();
    }

    function render() {
        var geometry = particles.geometry;
        var attributes = geometry.attributes;
        raycaster.setFromCamera( mouse, camera );
        intersects = raycaster.intersectObject( particles );
        if ( intersects.length > 0 ) {
	    if ( INTERSECTED != intersects[ 0 ].index ) {
	        attributes.size.array[ INTERSECTED ] = options.particle_size;
	        INTERSECTED = intersects[ 0 ].index;
	        attributes.size.array[ INTERSECTED ] = options.particle_size * 1.5;
	        attributes.size.needsUpdate = true;
                showSpotInformation( INTERSECTED );
	    }
        }
        else if ( INTERSECTED !== null ) {
	    attributes.size.array[ INTERSECTED ] = options.particle_size;
	    attributes.size.needsUpdate = true;
	    INTERSECTED = null;
        }

        renderer.render( scene, camera );
    }

    function createParticles( config ) {
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

        var items = config.points3d;
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
	    sizes[ i ] = options.particle_size * 0.5;
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

    function createParticleLines( config ) {

        var material = new THREE.LineBasicMaterial( {
            color: 0xffffff,
            opacity: 0.6,
            linewidth: 1,
            vertexColors: THREE.VertexColors,
        } );
        var geometry = new THREE.BufferGeometry();

        var positions = [];
        var colors = [];

        var image = config.image;
        var w = image.size[0], h = image.size[1];
        var points = image.points;

        var items = config.points3d;
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

        objlines = new THREE.LineSegments( geometry, material );
        scene.add( objlines );

    }

    function resetParticleScale( value ) {
        if (1) {
            particles.scale.setScalar( value );
            var geometry = particles.geometry;
            var attributes = geometry.attributes;
            for ( var i = 0; i < attributes.size.count; i ++ )
                attributes.size.array[ i ] = options.particle_size / value;
            attributes.size.needsUpdate = true;
        }

        if (1) {
            var geometry = objlines.geometry;
            var attributes = geometry.attributes;
            for ( var i = 0, j = 0; i < attributes.position.count / 2; i ++ ) {
                var pos = configData.points3d[ i ];
                j += 3;
                attributes.position.array[ j ++ ] = pos[ 0 ] * value;
                attributes.position.array[ j ++ ] = pos[ 1 ] * value;
                attributes.position.array[ j ++ ] = pos[ 2 ] * value;
            }
            attributes.position.needsUpdate = true;
        }
    }

    function resetDistance( value ) {
        if ( refimagePlane ) {
            refimagePlane.position.z = value;
        }

        if ( matchlines ) {
            var geometry = matchlines.geometry;
            var attributes = geometry.attributes;
            for ( var i = 0; i < attributes.position.count; i ++ )
                attributes.position.array[ i * 6 + 5 ] = value;
            attributes.position.needsUpdate = true;
        }

        if ( refkeypoints ) {
            var geometry = refkeypoints.geometry;
            var attributes = geometry.attributes;
            for ( var i = 0; i < attributes.position.count; i ++ )
                attributes.position.array[ i * 3 + 2 ] = value;
            attributes.position.needsUpdate = true;            
        }
    }

    function createKeypoints( imagePoints, offset, width, height ) {
        var vertexShader =
            'attribute float size;\n' +
	    'void main() {\n' +
	    '	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );\n' +
	    '	gl_PointSize = size * ( 300.0 / -mvPosition.z );\n' +
	    '	gl_Position = projectionMatrix * mvPosition;\n' +
	    '}';
        var fragmentShader =
            'uniform vec3 color;\n' +
	    'uniform sampler2D texture;\n' +
	    'void main() {\n' +
	    '	gl_FragColor = vec4( color, 1.0 );\n' +
	    '	gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );\n' +
	    '	if ( gl_FragColor.a < ALPHATEST ) discard;\n' +
	    '}';

        var n = imagePoints.length;

        var positions = new Float32Array( n * 3 );
        var sizes = new Float32Array( n );
        var w2 = width / 2;
        var h2 = height / 2;
        for ( var i = 0, j = 0; i < n; i ++ ) {
            positions[ j ++ ] = imagePoints[ i ][ 0 ]  - w2;
            positions[ j ++ ] = - imagePoints[ i ][ 1 ]  + h2;
            // z 值
            positions[ j ++ ] = offset;
	    sizes[ i ] = options.particle_size * 0.5;
        }

        var geometry = new THREE.BufferGeometry();
        geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
        geometry.addAttribute( 'size', new THREE.BufferAttribute( sizes, 1 ) );
        //
        var material = new THREE.ShaderMaterial( {
	    uniforms: {
	        color:   { value: new THREE.Color().fromArray( palette.match ) },
	        texture: { value: new THREE.TextureLoader().load( "textures/cross2.png" ) }
	    },
	    vertexShader: vertexShader,
	    fragmentShader: fragmentShader,
	    alphaTest: 0.9
        } );

        //
        var points = new THREE.Points( geometry, material );

        geometry.computeBoundingSphere();
        if ( geometry.boundingSphere && geometry.boundingSphere.radius === 0 )
            geometry.boundingSphere.radius = PARTICLE_SIZE;
        return points

    }

    function createImageKeypoints( config ) {        
        var image = config.image;
        keypoints = createKeypoints( image.points, 5, image.size[ 0 ], image.size[ 1 ] );
        scene.add( keypoints );
    }

    function createRefimageKeypoints( config ) {
        var image = config.refimage;
        refkeypoints = createKeypoints( image.points, options.distance + 5, image.size[ 0 ], image.size[ 1 ] );
        scene.add( refkeypoints );
    }

    function createMatchLines( config ) {
        var material = new THREE.LineBasicMaterial( {
            color: 0xffffff,
            opacity: 0.6,
            linewidth: 1,
            vertexColors: THREE.VertexColors,
        } );
        var geometry = new THREE.BufferGeometry();

        var positions = [];
        var colors = [];

        var w2 = config.image.size[0] / 2, h2 = config.image.size[1] / 2;
        var imagePoints = config.image.points;
        var refimagePoints = config.refimage.points;
        var n = imagePoints.length;

        var c = palette.match.slice(0, 3);

        for (var i = 0; i < n; i++ ) {
            var x0 = imagePoints[ i ][ 0 ] - w2;
            var y0 = - imagePoints[ i ][ 1 ] + h2;
            positions.push( x0, y0, 0 );

            var x1 = refimagePoints[ i ][ 0 ] - w2;
            var y1 = - refimagePoints[ i ][ 1 ] + h2;
            positions.push( x1, y1, options.distance );

            colors.push( c[0], c[1], c[2] );
            colors.push( c[0], c[1], c[2] );
        }

        geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
        geometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
        geometry.computeBoundingSphere();

        matchlines = new THREE.LineSegments( geometry, material );
        scene.add( matchlines );
    }

    function onHandleFiles( event ) {
        var file = this.files[ 0 ];
        var url = window.URL.createObjectURL( file );

        // Get JSON configuration file
        var request = new XMLHttpRequest();

        request.onloadend = function () {
            window.URL.revokeObjectURL( url );    
        };

        request.onload = function() {

            if (request.status != 200) {
                // Display error if JSON can't be loaded
                var a = document.createElement('a');
                a.href = url;
                a.innerHTML = a.href;
                showError('The file ' + a.outerHTML + ' could not be accessed.');
                return;
            }

            load( JSON.parse(request.responseText) );
        };

        request.open('GET', url);
        request.send();
    }

    function onLoadConfigClick( event ) {
        event.preventDefault();
        var input = document.getElementById( 'select-config-file' );
        if ( input )
            input.click();
    }

    function onDocumentMouseMove( event ) {
        event.preventDefault();
        mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    }

    function onDocumentMouseClick( event ) {
        event.preventDefault();
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );
    }

    function showSpotInformation( index ) {
        var p = configData.image.points[ index ];
        var s = configData.points3d[ index ];
        var html = [ '<table>' ];
        html.push( '<tr><td>序号</td><td>U</td><td>V</td></tr>' );
        html.push( '<tr>', '<td>' + index + '</td>', '<td>' + parseInt( p[ 0 ] ) + '</td><td>' + parseInt( p[ 1 ] ) + '</td></tr>' );
        html.push( '<tr><td>X</td><td>Y</td><td>Z</td></tr>');
        html.push( '<tr><td>' + s[ 0 ].toFixed( 2 ) + '</td><td>' + s[ 1 ].toFixed( 2 ) + '</td><td>' + s[ 2 ].toFixed( 2 ) + '</td></tr>' );
        html.push( '</table>' );
        // document.querySelector( '#message' ).innerHTML = html.join( '' );
    }

    function showError( msg ) {
        alert( msg );
    }

    // 暂时没有使用，保留备用
    function parseURLParameters() {
        var URL;
        if (window.location.hash.length > 0) {
            // Prefered method since parameters aren't sent to server
            URL = [window.location.hash.slice(1)];
        } else {
            URL = decodeURI(window.location.href).split('?');
            URL.shift();
        }
        if (URL.length < 1) {
            return;
        }
        URL = URL[0].split('&');
        var configFromURL = {};
        for (var i = 0; i < URL.length; i++) {
            var option = URL[i].split('=')[0];
            var value = URL[i].split('=')[1];
            if (value == '')
                continue; // Skip options with empty values in URL config
            switch(option) {
            case 'hfov': case 'pitch': case 'yaw': case 'haov': case 'vaov':
            case 'minHfov': case 'maxHfov': case 'minPitch': case 'maxPitch':
            case 'minYaw': case 'maxYaw': case 'vOffset': case 'autoRotate':
                configFromURL[option] = Number(value);
                break;
            case 'autoLoad': case 'ignoreGPanoXMP':
                configFromURL[option] = JSON.parse(value);
                break;
            case 'author': case 'title': case 'firstScene': case 'fallback':
            case 'preview': case 'panorama': case 'config':
                configFromURL[option] = decodeURIComponent(value);
                break;
            default:
                showError('An invalid configuration parameter was specified: ' + option);
                return;
            }
        }

        var request;

        // Check for JSON configuration file
        if (configFromURL.config) {
            // Get JSON configuration file
            request = new XMLHttpRequest();
            request.onload = function() {
                if (request.status != 200) {
                    // Display error if JSON can't be loaded
                    var a = document.createElement('a');
                    a.href = configFromURL.config;
                    a.innerHTML = a.href;
                    showError('The file ' + a.outerHTML + ' could not be accessed.');
                    return;
                }

                var responseMap = JSON.parse(request.responseText);

                // Set JSON file location
                if (responseMap.basePath === undefined)
                    responseMap.basePath = configFromURL.config.substring(0, configFromURL.config.lastIndexOf('/')+1);

                // Merge options
                for (var key in responseMap) {
                    if (configFromURL.hasOwnProperty(key)) {
                        continue;
                    }
                    configFromURL[key] = responseMap[key];
                }

                // Create viewer
                load( responseMap );
            };
            request.open('GET', configFromURL.config);
            request.send();
            return;
        }
    }

    // 初始化
    init();
    animate();

    // 直接从 URL 中装载配置文件
    // parseURLParameters();
    load( sampleConfig );

// End of wrapper
} ) ( window, document );
