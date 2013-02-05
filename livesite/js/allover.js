/*! allover.js - ve06e593-dirty - 2012-11-29
* http://github.com/CRREL/allover.js
* Copyright (c) 2012 Pete Gadomski; Licensed MIT */

THREE.QTControls = function ( camera, domElement ) {

  // XXX Smarter
  var INITIAL_RADIUS = 200;
  var INITIAL_ROTATION = {
    xy: 3,
    z: 2
  };
  var MIN_RADIUS = 6;
  var MAX_RADIUS = 10000;

  this.camera = camera;

  var debug = true;

  this.domElement = ( domElement !== undefined ) ? domElement : document;
  if ( domElement ) {
    this.domElement.setAttribute( 'tabindex', -1 );
  }
  if ( debug ) {
    this.debug = $('<div id="debug"></div>').insertAfter(this.domElement);
  }

  // API
  this.panSpeed = 2;
  this.zoomSpeed = 30;
  this.rotation = {xy: 0, z: 0};
  this.destinationRotation = $.extend({}, this.rotation);
  this.center = {x: 0, y: 0, z: 0};
  this.destinationCenter = $.extend({}, this.center);
  this.radius = INITIAL_RADIUS;
  this.destinationRadius = INITIAL_RADIUS;
  this.boundingBox = null;

  this.handleEvent = function ( event ) {
    if ( typeof this[ event.type ] === 'function' ) {
      this[ event.type ]( event );
    }
  };

  this.mousedown = function( event ) {
    if ( this.domElement !== document ) {
      this.domElement.focus();
    }
    event.preventDefault();
    this.mouseStatus = event.which;
    this.mouseOnMouseDown = {x: event.pageX, y: event.pageY};
    this.rotationOnMouseDown = $.extend({}, this.destinationRotation);
  };

  this.mousemove = function( event ) {
    if ( this.mouseStatus > 0 ) {
      var dx = event.pageX - this.mouseOnMouseDown.x;
      var dy = event.pageY - this.mouseOnMouseDown.y;
      if ( this.mouseStatus === 1 ) {
        var newRotation = {
          xy: this.rotationOnMouseDown.xy + dx * -0.02,
          z: this.rotationOnMouseDown.z + dy * 0.02
        };
        this.adjustCameraPosition(newRotation);
      } else if ( this.mouseStatus === 3 ) {

        var downvector = Math.cos(this.rotation.z);
        var sidevector = Math.sin(this.rotation.xy);

        var newCenter = {
          x: this.center.x + this.panSpeed * (Math.sin(this.rotation.xy) * dx + Math.cos(this.rotation.xy) * dy * sidevector),
          y: this.center.y + this.panSpeed * (-Math.cos(this.rotation.xy) * dx + Math.sin(this.rotation.xy) * dy * sidevector),
          z: this.center.z + this.panSpeed * dy * downvector
        };
        this.adjustCenter(newCenter);

        this.mouseOnMouseDown.x = event.pageX;
        this.mouseOnMouseDown.y = event.pageY;
      }
    }
  };

  this.mouseup = function( event ) {
    event.preventDefault();

    this.mouseStatus = 0;

  };

  this.mousewheel = function ( event, delta ) {

    event.preventDefault();
    this.adjustRadius(delta, true);

  };

  this.update = function( delta ) {

    this.rotation.xy = this.rotation.xy * 0.92 + this.destinationRotation.xy * 0.02;
    this.rotation.z = this.rotation.z * 0.92 + this.destinationRotation.z * 0.02;
    this.radius = this.radius * 0.9 + this.destinationRadius * 0.1;
    this.center.x = this.center.x * 0.9 + this.destinationCenter.x * 0.1;
    this.center.y = this.center.y * 0.9 + this.destinationCenter.y * 0.1;
    this.center.z = this.center.z * 0.9 + this.destinationCenter.z * 0.1;

    var radius = Math.cos(this.rotation.z) * this.destinationRadius;
    var newx = Math.cos(this.rotation.xy) * radius;
    var newy = Math.sin(this.rotation.xy) * radius;
    var newz = Math.sin(this.rotation.z) * this.destinationRadius;

    this.camera.position.x = newx + this.center.x;
    this.camera.position.y = newy + this.center.y;
    this.camera.position.z = newz + this.center.z;

    if ( debug ) {
        this.debug.html("X position: " + Math.round(this.camera.position.x) +
          " &mdash; Y position: " + Math.round(this.camera.position.y) +
          " &mdash; Z position: " + Math.round(this.camera.position.z) +
          " &mdash; xy rotation: " + Number((this.rotation.xy).toFixed(3)) +
          " &mdash; z rotation: " + Number((this.rotation.z).toFixed(3)));
    }

    var v = new THREE.Vector3(this.center.x, this.center.y, this.center.z);
    this.camera.up.x = 0; this.camera.up.y = 0; this.camera.up.z = 1;
    this.camera.lookAt(v);

  };

  this.reset = function() {
    this.adjustCameraPosition(INITIAL_ROTATION);
    this.adjustRadius(INITIAL_RADIUS, false);
    this.adjustCenter(this.initialCenter);
  };

  this.adjustCameraPosition = function(rotation) {
    this.destinationRotation = $.extend({}, rotation);
  };

  this.adjustCameraPositionImmediate = function(rotation) {
    this.adjustCameraPosition(rotation);
    this.rotation = $.extend({}, rotation);
  };

  this.adjustRadius = function(value, delta) {
    if (delta) {
      this.destinationRadius -= this.zoomSpeed * value;
    } else {
      this.destinationRadius = value;
    }
    if (this.destinationRadius < MIN_RADIUS) {
      this.destinationRadius = MIN_RADIUS;
    }
    if (this.destinationRadius > MAX_RADIUS) {
      this.destinationRadius = MAX_RADIUS;
    }
  };

  this.adjustCenter = function(point) {
    var dims = ['x', 'y', 'z'];
    for (var i in dims) {
      var dim = dims[i];
      if (this.boundingBox.min[dim] > point[dim]) {
        this.destinationCenter[dim] = this.boundingBox.min[dim];
      } else {
        this.destinationCenter[dim] = point[dim];
      }
    }
  };

  this.getContainerDimensions = function() {

    if ( this.domElement !== document ) {

      return {
        size  : [ this.domElement.offsetWidth, this.domElement.offsetHeight ],
        offset  : [ this.domElement.offsetLeft,  this.domElement.offsetTop ]
      };

    } else {

      return {
        size  : [ window.innerWidth, window.innerHeight ],
        offset  : [ 0, 0 ]
      };

    }

  };

  this.setInitialCenter = function(x, y, z) {
    this.initialCenter = {x: x, y: y, z: z};
    this.center = $.extend({}, this.initialCenter);
    this.destinationCenter = $.extend({}, this.initialCenter);
    this.camera.position = new THREE.Vector3(x, y, z);
  };

  this.setBoundingBox = function(bbox) {
    this.boundingBox = bbox;
  };

  function bind( scope, fn ) {

    return function () {

      if (typeof fn !== 'undefined') {
        fn.apply( scope, arguments );
      }

    };

  }

  this.domElement.addEventListener( 'mousemove', bind( this, this.mousemove ), false );
  this.domElement.addEventListener( 'mousedown', bind( this, this.mousedown ), false );
  this.domElement.addEventListener( 'mouseup',   bind( this, this.mouseup ), false );

  this.domElement.addEventListener( 'keydown', bind( this, this.keydown ), false );
  this.domElement.addEventListener( 'keyup',   bind( this, this.keyup ), false );
  this.domElement.oncontextmenu = function() { return false; };
  $(this.domElement).on( 'mousewheel', bind( this, this.mousewheel ));

  this.adjustCameraPositionImmediate(INITIAL_ROTATION);

};

var Allover = Allover || {};

Allover.ShaderUtils = {

  lib: {

    /**
     * clipping box
     */

    'profile': {

      vertexShader: [

        "uniform float xCenter;",
        "uniform float yCenter;",
        "uniform float zCenter;",
        "uniform float rotation;",
        "uniform float size;",

        "attribute vec3 customColor;",

        "varying vec4 worldPosition;",
        "varying vec3 vColor;",

        "void main() {",
        
          "vColor = customColor;",

          "worldPosition = modelMatrix * vec4( position, 1.0 );",
          "worldPosition.x = cos( rotation ) * ( position.x - xCenter ) + sin( rotation ) * ( position.y - yCenter ) + xCenter;",
          "worldPosition.y = cos( rotation ) * ( position.y - yCenter ) - sin( rotation ) * ( position.x - xCenter ) + yCenter;",
         
          "vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",

          "gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );",

          "gl_Position = projectionMatrix * mvPosition;",
        
        "}"

      ].join( "\n" ),

      fragmentShader: [

        "uniform vec3 color;",
        "uniform float active;",
        "uniform float xClippingPlaneMax;",
        "uniform float xClippingPlaneMin;",
        "uniform float yClippingPlaneMax;",
        "uniform float yClippingPlaneMin;",
        "uniform float zClippingPlaneMax;",
        "uniform float zClippingPlaneMin;",

        "varying vec4 worldPosition;",
        "varying vec3 vColor;",

        "void main() {",

          "if ( active > 0.5 ) {",

            "if ( worldPosition.x < xClippingPlaneMin ) discard;",
            "if ( worldPosition.x > xClippingPlaneMax ) discard;",
            "if ( worldPosition.y < yClippingPlaneMin ) discard;",
            "if ( worldPosition.y > yClippingPlaneMax ) discard;",
            "if ( worldPosition.z < zClippingPlaneMin ) discard;",
            "if ( worldPosition.z > zClippingPlaneMax ) discard;",

          "}",

          "gl_FragColor = vec4( color * vColor, 1.0 );",

        "}"

      ].join( "\n" )
    }
  }
};

var Allover = Allover || {};

Allover.ProfileBox = function ( camera, domElement ) {

  // API

  this.SCALE_SPEED = 1;
  this.camera = camera;
  this.domElement = ( domElement !== undefined ) ? domElement : document;
  this.visible = false;

  this.attributes = {

    customColor: { type: 'c', value: [] }
  
  };

  this.uniforms = {

    size: { type: 'f', value: 1 },
    color: { type: 'c', value: new THREE.Color( 0xffffff ) },
    xClippingPlaneMax: { type: 'f', value: 99999 },
    xClippingPlaneMin: { type: 'f', value: -99999 },
    yClippingPlaneMax: { type: 'f', value: 99999 },
    yClippingPlaneMin: { type: 'f', value: -99999 },
    zClippingPlaneMax: { type: 'f', value: 99999 },
    zClippingPlaneMin: { type: 'f', value: -99999 },
    xCenter: { type: 'f', value: 0 },
    yCenter: { type: 'f', value: 0 },
    zCenter: { type: 'f', value: 0 },
    rotation: { type: 'f', value: 0 },
    active: { type: 'f', value: 0.0 }
  
  };

  // internals

  var that = this;

  var debug = true;

  var shift = false;
  var ctrl = false;
  var mousedown = false;
  var profileFace = [];

  var projector = new THREE.Projector();

  var objects = [];

  var mouse = new THREE.Vector2();

  var scaleStart = new THREE.Vector2();
  var scaleEnd = new THREE.Vector2();
  var scaleDelta = new THREE.Vector2();
  var scaleDeltaX = 1;
  var scaleDeltaY = 1;
  var scaleDeltaZ = 1;

  var panStart = new THREE.Vector2();
  var panEnd = new THREE.Vector2();
  var panDelta = new THREE.Vector2();

  var rotateStart = new THREE.Vector2();
  var rotateEnd = new THREE.Vector2();
  var rotateDelta = new THREE.Vector2();

  var lastPosition = new THREE.Vector3();

  var STATE = { NONE : -1, SCALE : 0, PAN : 1, ROTATE : 2 };
  var state = STATE.NONE;

  // events

  /**
   * Create a new profile box of given size and position.
   */
  this.create = function( size, position ) {

    if ( debug ) {

      console.log( 'create box with size (' + size.x + ', ' + size.y + ', ' + size.z + ') and position (' + position.x + ', ' + position.y + ', ' + position.z + ')' );

    }

    // create the box as a mesh of CubeGeometry
    this.profileBox = new THREE.Mesh(
      new THREE.CubeGeometry( size.x, size.y, size.z ),
      new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } ) );

    // half sizes are useful to have precomputed for subsequent updates to the clipping bounds
    var halves = {

      halfx: size.x / 2,
      halfy: size.y / 2,
      halfz: size.z / 2
    
    };

    $.extend( this.profileBox, halves );

    // position the box per input
    this.profileBox.position.x = position.x;
    this.profileBox.position.y = position.y;
    this.profileBox.position.z = position.z;

    // this is required of three.js
    this.profileBox.updateMatrixWorld();

    // the profile box is the one thing we will test for ray intersection when the user does a shift-click
    objects.push( this.profileBox );

    // it's assumed that if we've created it, we want it to be visible
    //this.setVisible( true );

  };

  this.isVisible = function() {

    return this.visible;

  };

  this.setVisible = function( visible ) {

    this.visible = visible;

  };

  this.getActive = function() {

    return this.uniforms[ 'active' ].value;

  };

  this.setActive = function( active ) {

    this.uniforms[ 'active' ].value = active;

  };

  this.setRotation = function( rotation ) {

    this.uniforms[ 'rotation' ].value = rotation;

  };

  this.setCenterX = function( xCenter ) {

    this.uniforms[ 'xCenter' ].value = xCenter;

  };

  this.setCenterY = function( yCenter ) {

    this.uniforms[ 'yCenter' ].value = yCenter;

  };

  this.setCenterZ = function( zCenter ) {

    this.uniforms[ 'zCenter' ].value = zCenter;

  };

  /**
   * Updates the center and XYZ min/max uniforms for the clipping shader.
   */
  this.updateBounds = function() {

    this.uniforms[ 'xClippingPlaneMax' ].value = this.profileBox.halfx * this.profileBox.scale.x + this.profileBox.position.x;
    this.uniforms[ 'xClippingPlaneMin' ].value = -this.profileBox.halfx * this.profileBox.scale.x + this.profileBox.position.x;
    this.uniforms[ 'yClippingPlaneMax' ].value = this.profileBox.halfy * this.profileBox.scale.y + this.profileBox.position.y;
    this.uniforms[ 'yClippingPlaneMin' ].value = -this.profileBox.halfy * this.profileBox.scale.y + this.profileBox.position.y;
    this.uniforms[ 'zClippingPlaneMax' ].value = this.profileBox.halfz * this.profileBox.scale.z + this.profileBox.position.z;
    this.uniforms[ 'zClippingPlaneMin' ].value = -this.profileBox.halfz * this.profileBox.scale.z + this.profileBox.position.z;
    this.uniforms[ 'xCenter' ].value = this.profileBox.position.x;
    this.uniforms[ 'yCenter' ].value = this.profileBox.position.y;
    this.uniforms[ 'zCenter' ].value = this.profileBox.position.z;
	if(debug)console.log(this.uniforms);

  };

  this.setSize = function( size ) {

    this.uniforms[ 'size' ].value = size;

  };

  this.scaleX = function( scale ) {

    scaleDeltaX += scale;

  };
  
  this.scaleY = function( scale ) {

    scaleDeltaY += scale;

  };

  this.scaleZ = function( scale ) {

    scaleDeltaZ += scale;

  };

  /**
   * Updates the scale of the profile box depending on the face of the box the user selected.
   *
   * This is the only way to change the size of the CubeGeometry.
   */
  this.update = function() {

    if ( that.profileFace  === 0 ) {
  
      if ( debug ) {
        console.log( 'scale x: ' + this.profileBox.scale.x + ', delta x: ' + scaleDeltaX );
      }

      this.profileBox.scale.x *= ( scaleDeltaX * this.SCALE_SPEED );
      this.updateBounds();

    } else if ( that.profileFace === 1 ) {

      this.profileBox.scale.x *= ( scaleDeltaX * -this.SCALE_SPEED );
      this.updateBounds();
    
    } else if ( that.profileFace === 2 ) {

      this.profileBox.scale.y *= ( scaleDeltaY * this.SCALE_SPEED );
      this.updateBounds();

    } else if ( that.profileFace === 3 ) {

      this.profileBox.scale.y *= ( scaleDeltaY * -this.SCALE_SPEED );
      this.updateBounds();

    } else if ( that.profileFace === 4 ) {

      this.profileBox.scale.z *= ( scaleDeltaZ * this.SCALE_SPEED );
      this.updateBounds();

    } else if ( that.profileFace === 5 ) {

      this.profileBox.scale.z *= ( scaleDeltaZ * -this.SCALE_SPEED );
      this.updateBounds();

    }

    // reset prior to next update
    scaleDeltaX = 1;
    scaleDeltaY = 1;
    scaleDeltaZ = 1;

  };

  /**
   * When scaling is requested, we get the difference in world coordinates of the start and end
   * mouse positions. This is translated into the scaling factor.
   */
/*
  function onScale( end, start ) {
    
    var vectorEnd = new THREE.Vector3( end.x, end.y, 0.5 );
    projector.unprojectVector( vectorEnd, that.camera );

    var vectorStart = new THREE.Vector3( start.x, start.y, 0.5 );
    projector.unprojectVector( vectorStart, that.camera );

    var vectorDelta = new THREE.Vector3();
    vectorDelta.sub( vectorEnd, vectorStart );

    that.scaleX( vectorDelta.x );
    that.scaleY( vectorDelta.y );
    that.scaleZ( vectorDelta.z );

  }

  function onMouseMove( event ) {

    event.preventDefault();

    if ( state === STATE.SCALE ) {
      
      // get current mouse position
      scaleEnd.set( event.clientX, event.clientY );

      // calculate the scale factor
      onScale( scaleEnd, scaleStart );

      // reinitialize the starting mouse position with current
      scaleStart.copy( scaleEnd );

    } else if ( state === STATE.PAN ) {
      // not implemented

    } else if ( state === STATE.ROTATE ) {
      // not implemented

    }

  }

  function onMouseDown( event ) {

    event.preventDefault();
    
    that.mousedown = true;

    // get the current mouse position in screen coordinates and subtract any offsets
    mouse.x = ( ( event.clientX - this.offsetLeft ) / window.innerWidth ) * 2 - 1;
    mouse.y = - ( ( event.clientY - this.offsetTop ) / window.innerHeight ) * 2 + 1;

    // project the mouse position into world coordinates and get the picking ray
    var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
    var ray = projector.pickingRay( vector, that.camera );

    if ( that.shift ) {

      // we do not allow the camera controls to change the scene if shift is clicked
      event.stopPropagation();
   
      // find intersections between the picking ray and the profile box
      var intersects = ray.intersectObjects( objects );

      if ( intersects.length > 0 ) {

        // record the face of the picking box that we actually intersected
        that.profileFace = intersects[0].faceIndex;

        if ( debug ) {
        
          console.log( 'intersects' );
          console.log( intersects[ 0 ] );

        }
      
        // we are in a scale state (note that no other states are currently implemented)
        state = STATE.SCALE;

        // this is the scale starting position
        scaleStart.set( event.clientX, event.clientY );

      }

    }

    document.addEventListener( 'mousemove', onMouseMove, true );
    document.addEventListener( 'mouseup', onMouseUp, true );
    document.addEventListener( 'mouseout', onMouseOut, true );
    
  }

  function onMouseUp() {
    
    that.mousedown = false;
    that.profileFace = "";

    document.removeEventListener( 'mousemove', onMouseMove, true );
    document.removeEventListener( 'mouseup', onMouseUp, true );
    document.removeEventListener( 'mouseout', onMouseOut, true );

    state = STATE.NONE;

  }

  function onMouseOut() {
    
    that.mousedown = false;
    that.profileFace = "";
    
    document.removeEventListener( 'mousemove', onMouseMove, true );
    document.removeEventListener( 'mouseup', onMouseUp, true );
    document.removeEventListener( 'mouseout', onMouseOut, true );

  }
*/

  function keydown( event ) {
    
    //window.removeEventListener( 'keydown', keydown );
    event.preventDefault();

    switch ( event.keyCode ) {
   
      case 37: // left arrow

        if ( event.shiftKey ) {

          that.profileBox.scale.x += 0.1;
          that.updateBounds();
 
        } else {

          that.profileBox.position.x += 10;
          that.setCenterX( that.profileBox.position.x );
          that.updateBounds();

        }
 
        break;

      case 39: // right arrow

        if ( event.shiftKey ) {

          that.profileBox.scale.x -= 0.1;
          that.updateBounds();

        } else {

          that.profileBox.position.x -= 10;
          that.setCenterX( that.profileBox.position.x );
          that.updateBounds();

        }

        break;

      case 38: // up arrow

        if ( event.shiftKey ) {

          that.profileBox.scale.y += 0.1;
          that.updateBounds();
 
        } else {

          that.profileBox.position.y -= 10;
          that.setCenterY( that.profileBox.position.y );
          that.updateBounds();

        }

        break;

      case 40: // down arrow

        if ( event.shiftKey ) {

          that.profileBox.scale.y -= 0.1;
          that.updateBounds();

        } else {

          that.profileBox.position.y += 10;
          that.setCenterY( that.profileBox.position.y );
          that.updateBounds();

        }

        break;

      case 33: // page up

        if ( event.shiftKey ) {

          that.profileBox.scale.z += 0.1;
          that.updateBounds();
 
        } else {

          that.profileBox.position.z += 10;
          that.setCenterZ( that.profileBox.position.z );
          that.updateBounds();

        }

        break;

      case 34: // page down

        if ( event.shiftKey ) {

          that.profileBox.scale.z -= 0.1;
          that.updateBounds();

        } else {

          that.profileBox.position.z -= 10;
          that.setCenterZ( that.profileBox.position.z );
          that.updateBounds();

        }

        break;

      case 67: // c
    
        // 'c' controls whether or not the clipping shader is active
        if ( that.getActive() > 0.5 ) {
          
          that.setActive( 0.0 );
        
        } else {
          
          if ( that.isVisible() ) {
          
            that.setActive( 1.0 );

          }
        
        }
        
        break;

/*
      case 16: // shift
        
        that.shift = true;
        break;

      case 17: // ctrl

        that.ctrl = true;
        break;
*/    
      case 81: // q
        
        // the clipping box is rotated about z with 'q' and 'e'
        that.profileBox.rotation.z -= 0.1;
        that.setRotation( that.profileBox.rotation.z );
        break;
      
      case 69: // e
        
        // the clipping box is rotated about z with 'q' and 'e'
        that.profileBox.rotation.z += 0.1;
        that.setRotation( that.profileBox.rotation.z );
        break;
      
      case 87: // w
        
        // the clipping box is translated along x with 'w' and 's'
        that.profileBox.position.x += 10;
        that.setCenterX( that.profileBox.position.x );
        that.updateBounds();
        break;
      
      case 83: // s
        
        // the clipping box is translated along x with 'w' and 's'
        that.profileBox.position.x -= 10;
        that.setCenterX( that.profileBox.position.x );
        that.updateBounds();
        break;
      
      case 65: // a
        
        // the clipping box is translated along y with 'a' and 'd'
        that.profileBox.position.y -= 10;
        that.setCenterY( that.profileBox.position.y );
        that.updateBounds();
        break;
      
      case 68: // d
        
        // the clipping box is translated along y with 'a' and 'd'
        that.profileBox.position.y += 10;
        that.setCenterY( that.profileBox.position.y );
        that.updateBounds();
        break;
    
    }
  }

/*
  function keyup( event ) {
    
    that.shift = false;
    that.ctrl = false;

    window.addEventListener( 'keydown', keydown, false );

  }
*/

  // listeners

//  this.domElement.addEventListener( 'mousedown', onMouseDown, true );
  window.addEventListener( 'keydown', keydown, false );
//  window.addEventListener( 'keyup', keyup, false );

};

var Allover = Allover || {};
Allover.viewer = {};

(function() {

    function windowInnerWidth() {
        return window.innerWidth;
    }
    function windowInnerHeight() {
        return window.innerHeight;
    }

    var DEFAULT_POINT_SIZE = 2;
    var MIN_POINT_SIZE = 1;
    var MAX_POINT_SIZE = 10;
    var WIDTH = windowInnerWidth();
    var HEIGHT = windowInnerHeight();

    var windowHalfX = WIDTH / 2;
    var windowHalfY = HEIGHT / 2;

    var VIEW_ANGLE = 45,
      ASPECT = WIDTH / HEIGHT,
      NEAR = 0.1,
      FAR = 10000;

    var scope = this;

    this.numberOfPoints = 0;

    this.run = function(options) {

        this.init(options);
        if (this.url) {
            this.loadPointsFromUrl();
        } else {
            this.loadPointsFromData();
        }
        this.animate();

    };

    this.init = function(options) {

        var that = this;

        this.reverseColorbrewerArrays();

        if ((options.url && options.data) || !(options.url || options.data)) {
            $.error("Viewer needs either url or data.");
        }

        this.url = options.url;
        this.data = options.data;
        if (!options.container) { $.error("Viewer must be initialized with a container."); }
        this.container = $(options.container);
        this.points = [];
        this.firstLoad = true;
        this.selectedColors = null;
        this.pointBuckets = [];
        this.scales = {
            elevation: null, height: null, intensity: null, pcid: null, classification: null
        };

        // defaults

        var defaultOptions = {
            stats: true,
            progressBar: true,
            buttonClass: 'btn',
            refreshCache: false,
            loadingImgSrc: null
        };
        if (typeof options === 'object') {
            options = $.extend(defaultOptions, options);
        } else {
            options = defaultOptions;
        }

        // internals

        this.clock = new THREE.Clock();
        this.renderer = new THREE.WebGLRenderer();
        this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
        this.scene = new THREE.Scene();
        this.scene.add(this.camera);
        this.controls = new THREE.QTControls(this.camera, this.container[0]);

        // the shaders are contained in their own file, the profile shader enables both
        // vertex colors and point clipping
        var shader = Allover.ShaderUtils.lib[ 'profile' ];

        // create the profile box
        // currently the shader attributes and uniforms are defined here, but maybe there is a better way
        this.pbox = new Allover.ProfileBox( this.camera, this.container[0] );

        this.material = new THREE.ShaderMaterial({
          attributes: this.pbox.attributes,
          uniforms: this.pbox.uniforms,
          depthTest: true,
          transparent: true,
          vertexColors: THREE.VertexColors,
          vertexShader: shader.vertexShader,
          fragmentShader: shader.fragmentShader
        });

        if (options.stats) {
            this.stats = new Stats();
            this.stats.domElement.style.position = 'absolute';
            this.stats.domElement.style.top = '0px';
            this.container.append(this.stats.domElement);
        } else {
            this.stats = null;
        }

        //this.createSidebar( options, that );

        this.refreshCache = options.refreshCache;

        if (options.loadingImgSrc) {
            this.loadingImg = $('<img src="' + options.loadingImgSrc + '"></img>');
            this.loadingImg.appendTo(this.container)
                .attr('style', 'position: absolute; top: ' +
                    windowInnerHeight() / 2 + 'px; left:' +
                    windowInnerWidth() / 2 + 'px;');
        }

        window.addEventListener( 'keydown', keydown, false );
        //window.addEventListener( 'keyup', keyup, false );
        window.addEventListener('resize', function() { that.resizeWindow(); }, false);
        this.setRequestAnimFrame();

    };

    this.createSidebar = function( options, that ) {

        // progress bar

        if (options.progressBar) {
            this.progressBar = {
                wrapper: $('<div class="grid-progressBar-wrapper"></div>'),
                element: $('<div class="grid-progressBar" style="display: none;"></div>'),
                coloredBar: $('<div class="grid-progressBar-color"></div>'),
                statusText: $('<div class="grid-progressBar-status">Loading</div>')
            };
            this.progressBar.wrapper.insertAfter(this.container);
            this.progressBar.statusText.appendTo(this.progressBar.wrapper);
            this.progressBar.element.appendTo(this.progressBar.wrapper);
            this.progressBar.coloredBar.appendTo(this.progressBar.element);
        } else {
            this.progressBar = null;
        }

        // select color

        $( "#colorize-select" ).change( function() {
          
          that.colorizePointsBy( this.value );
          
          if ( this.value === 'elevation' ) {

            $( "#colorbrewer-select" ).removeAttr( "disabled", "disabled" );

          } else {

            $( "#colorbrewer-select" ).attr( "disabled", "disabled" );

          }

        });

        $( "#colorbrewer-select" ).change( function() {
          
          that.recolorElevation( this.value );
          that.colorizePointsBy( 'elevation' );
        
        });

        // initialize the selects

        $( "#colorize-select" ).val( "imagery" ).attr( "selected", "selected" );
        $( "#colorbrewer-select" ).val( "RdYlBu" ).attr( "selected", "selected" );
        $( "#colorbrewer-select" ).attr( "disabled", "disabled" );

        // point size

        $( "#pointSizeSlider" ).slider({
                min: MIN_POINT_SIZE,
                max: MAX_POINT_SIZE,
                value: DEFAULT_POINT_SIZE,
                slide: function(event, ui) {
                    that.updatePointSize(ui.value);
                }
            });
        this.updatePointSize(DEFAULT_POINT_SIZE);

    };

    this.animate = function() {
        this.renderer.setSize(WIDTH, HEIGHT);
        this.container.append(this.renderer.domElement);
        this.clock.start();

        (function animloop(){
            window.requestAnimFrame($.proxy(animloop, this));
            this.render();
        }.apply(this));
    };

    this.render = function() {
        this.renderer.render(this.scene, this.camera);
        this.controls.update(this.clock.getDelta());

        // no need to update the profile box until it has been created
        if ( this.pbox.profileBox !== undefined ) {
          this.pbox.update();
        }

        this.stats.update();
    };
       
    this.setRequestAnimFrame = function() {
        // @see http://paulirish.com/2011/requestanimationframe-for-smart-animating/
        window.requestAnimFrame = (function(){
            return  window.requestAnimationFrame       ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame    ||
                window.oRequestAnimationFrame      ||
                window.msRequestAnimationFrame     ||
                function(callback, element) {
                    window.setTimeout(callback, 1000 / 60);
                };
        }());
    };

    // Need to adapt this code to deal with geojson
    // this.loadPoints = function (pk) {
    //     var params = {refresh_cache: this.refreshCache};
    //     if (typeof pk !== 'undefined') { params.cache_key = pk; }
    //     var url = this.url + '?' + $.param(params);

    //     $.ajax({
    //         url: url,
    //         dataType: 'json',
    //         success: function(data) {
    //             if (!data.points) {
    //                 this.progressBar.wrapper.html("Loaded!");
    //                 var that = this;
    //                 setTimeout(function() { that.progressBar.wrapper.hide(); }, 5000);
    //                 return;
    //             }
    //             var points = data.points.split('\n');
    //             delete data.points;
    //             var headers = points.splice(0, 1)[0].split(',');
    //             for (var i = headers.length - 1; i >= 0; i--) {
    //                 headers[i] = headers[i].replace(/"/g, '');
    //             }
    //             this.pointloader(headers, points, data);
    //         },
    //         context: this
    //     });

    //     // Only refresh once
    //     if (this.refreshCache) { this.refreshCache = false; }
    // };

    this.loadPointsFromData = function() {
        this.pointloader(this.data);
    };

    this.pointloader = function(data, pointcounter, pointBucket) {
        var that = this;
        var features = data.features;
        this.numberOfPoints += features.length;
        if (typeof pointcounter === 'undefined') {
            pointcounter = 0;
        }
        if (typeof pointBucket === 'undefined') {
            pointBucket = {
                geometry: new THREE.Geometry(),
                intensities: [],
                pcids: [],
                classifications: [],
                colors: {
                    imagery: [],
                    intensity: [],
                    elevation: [],
                    pcid: [],
                    classification: []
                }
            };
        }
        var loadPercent = Math.round(pointcounter * 100 / features.length);
        // if (this.progressBar !== null) {
        //   this.progressBar.element.show();
        //   this.progressBar.coloredBar.attr('style', 'width: ' + loadPercent + '%');
        // }
        
        var loadInterval = features.length / 100;
        for (var i = 0; i < loadInterval && features.length > pointcounter; i++, pointcounter++) {
            var point = features[pointcounter];
            var properties = point.properties;

            pointBucket.geometry.vertices.push(this.geometryToVector(point.geometry));

            if (this.firstLoad) {
                pointBucket.intensities.push(properties.Intensity);
                pointBucket.pcids.push(properties.PointSourceId);
                pointBucket.classifications.push(properties.Classification);
            } else {
                this.pushColorsIntoPointBucket(pointBucket,{
                    elevation: properties.Z,
                    intensity: properties.Intensity,
                    pcid: properties.PointSourceId,
                    classification: properties.Classification
                });
            }

            var imageryColor = new THREE.Color();
            imageryColor.setRGB(properties.Red / 256, properties.Green / 256,
                properties.Blue / 256);
            pointBucket.colors.imagery.push(imageryColor);

            if (properties.Red !== 0 || properties.Green !== 0 || properties.Blue !== 0) {
                this.colorizedPoints = true;
            }
        }

        if (features.length > pointcounter) {
            setTimeout(function(){ that.pointloader(data, pointcounter, pointBucket); }, 0);
            return;
        }

        // If it isn't the first load, the colors were set in the initial loop
        if (this.firstLoad) {
            this.setScalesFromPointBucket(pointBucket);

            for (var k = 0; k < pointBucket.geometry.vertices.length; k++) {
                this.pushColorsIntoPointBucket(pointBucket, {
                    elevation: pointBucket.geometry.vertices[k].z,
                    intensity: pointBucket.intensities[k],
                    pcid: pointBucket.pcids[k],
                    classification: pointBucket.classifications[k]
                });
            }
        }

        if (this.selectedColors === null) {
            if (this.colorizedPoints) {
                this.selectedColors = 'imagery';
            }
            else {
                // XXX Disable imagery button
                this.colorControls.find("[data-colorize=imagery]").attr('disabled', 'disabled');
                this.selectedColors = 'intensity';
            }
        }

        pointBucket.geometry.computeBoundingBox();
        var minx = pointBucket.geometry.boundingBox.min.x;
        var miny = pointBucket.geometry.boundingBox.min.y;
        var minz = pointBucket.geometry.boundingBox.min.z;
        var maxx = pointBucket.geometry.boundingBox.max.x;
        var maxy = pointBucket.geometry.boundingBox.max.y;
        var maxz = pointBucket.geometry.boundingBox.max.z;

        var xsize = (maxx - minx);
        var ysize = (maxy - miny);
        var zsize = (maxz - minz);

        var halfx = xsize / 2;
        var halfy = ysize / 2;
        var halfz = zsize / 2;

        var midx = halfx + minx;
        var midy = halfy + miny;
        var midz = halfz + minz;

        for (var ptidx = 0; ptidx < pointBucket.geometry.vertices.length; ptidx++) {
          pointBucket.geometry.vertices[ptidx].x = pointBucket.geometry.vertices[ptidx].x - midx;
          pointBucket.geometry.vertices[ptidx].y = pointBucket.geometry.vertices[ptidx].y - midy;
          pointBucket.geometry.vertices[ptidx].z = pointBucket.geometry.vertices[ptidx].z - midz;
        }

        pointBucket.geometry.colors = pointBucket.colors[this.selectedColors];
        this.pbox.attributes.customColor.value = pointBucket.geometry.colors;
        this.pbox.attributes.customColor.needsUpdate = true;
        var particles = new THREE.ParticleSystem(pointBucket.geometry, this.material);
        this.scene.add(particles);

        this.pointBuckets.push(pointBucket);

        // setTimeout(function() { that.loadPoints(data.pk); }, 0);
        // if (this.progressBar !== null) {
        //   this.progressBar.element.hide();
        //   this.progressBar.statusText.html("Getting next slice");
        // }

        if (!this.firstLoad) { return; }

        if (this.loadingImg) {
            this.loadingImg.hide();
        }

        pointBucket.geometry.computeBoundingBox();
        minx = pointBucket.geometry.boundingBox.min.x;
        miny = pointBucket.geometry.boundingBox.min.y;
        minz = pointBucket.geometry.boundingBox.min.z;
        maxx = pointBucket.geometry.boundingBox.max.x;
        maxy = pointBucket.geometry.boundingBox.max.y;
        maxz = pointBucket.geometry.boundingBox.max.z;

        xsize = (maxx - minx);
        ysize = (maxy - miny);
        zsize = (maxz - minz);

        halfx = xsize / 2;
        halfy = ysize / 2;
        halfz = zsize / 2;

        // Display axis
        midx = halfx + minx;
        midy = halfy + miny;
        midz = halfz + minz;
        var zquantiles = this.scales.height.quantiles();
        var medianz = zquantiles[zquantiles.length / 2];

        this.controls.setInitialCenter(midx, midy, midz);
        this.controls.setBoundingBox(pointBucket.geometry.boundingBox);

        $('#resetButton').click(function() {
            that.controls.reset();
        });

        ysize = 10;
        halfy = ysize / 2;

        // drop a small profile box in the middle of the scene
        var pboxSize = new THREE.Vector3( zsize, zsize, zsize );
        var pboxPosition = new THREE.Vector3( midx, midy, midz );
        this.pbox.create( pboxSize, pboxPosition );

        // and add it to the scene
        //this.scene.add( this.pbox.profileBox );

        // must call updateBounds to get the shader clipping values set correctly
        this.pbox.updateBounds();


		this.addLines(this.scene, minx, miny, minz, midx, midy, midz, maxx, maxy, maxz)


        this.firstLoad = false;
    };

	this.addLines = function(scene, minx, miny, minz, midx, midy, midz, maxx, maxy, maxz){
		
        // Set up the scene's dimensions
        var xLineMat = new THREE.LineBasicMaterial({
            color: 0xcc0000, opacity: 0.5, linewidth: 1
        });
        var xLineGeom = new THREE.Geometry();
        xLineGeom.vertices.push(new THREE.Vector3(minx, midy, 0));
        xLineGeom.vertices.push(new THREE.Vector3(maxx, midy, 0));

        var yLineMat = new THREE.LineBasicMaterial({
            color: 0x0000cc, opacity: 0.5, linewidth: 1
        });
        var yLineGeom = new THREE.Geometry();
        yLineGeom.vertices.push(new THREE.Vector3(midx, miny, 0));
        yLineGeom.vertices.push(new THREE.Vector3(midx, maxy, 0));

        var zLineMat = new THREE.LineBasicMaterial({
            color: 0x00cc00, opacity: 0.5, linewidth: 1
        });
        var zLineGeom = new THREE.Geometry();
        zLineGeom.vertices.push(new THREE.Vector3(midx, midy, Math.min(0, minz)));
        zLineGeom.vertices.push(new THREE.Vector3(midx, midy, Math.max(0, maxz)));

        var xLine = new THREE.Line(xLineGeom, xLineMat);
        var yLine = new THREE.Line(yLineGeom, yLineMat);
        var zLine = new THREE.Line(zLineGeom, zLineMat);

        scene.add(xLine);
        scene.add(yLine);
        scene.add(zLine);

	}

    this.reverseColorbrewerArrays = function() {
        colorbrewer.Purples[9].reverse();
        colorbrewer.Blues[9].reverse();
        colorbrewer.Greens[9].reverse();
        colorbrewer.Oranges[9].reverse();
        colorbrewer.Reds[9].reverse();
        colorbrewer.Greys[9].reverse();
        colorbrewer.Spectral[9].reverse();
        colorbrewer.RdYlGn[9].reverse();
        colorbrewer.RdYlBu[9].reverse();
    };

    this.recolorElevation = function( palette ) {

        switch ( palette ) {
            case 'Purples':
              this.scales.elevation.range( colorbrewer.Purples[9] );
              break;
            case 'Blues':
              this.scales.elevation.range( colorbrewer.Blues[9] );
              break;
            case 'Greens':
              this.scales.elevation.range( colorbrewer.Greens[9] );
              break;
            case 'Oranges':
              this.scales.elevation.range( colorbrewer.Oranges[9] );
              break;
            case 'Reds':
              this.scales.elevation.range( colorbrewer.Reds[9] );
              break;
            case 'Greys':
              this.scales.elevation.range( colorbrewer.Greys[9] );
              break;
            case 'Spectral':
              this.scales.elevation.range( colorbrewer.Spectral[9] );
              break;
            case 'RdYlGn':
              this.scales.elevation.range( colorbrewer.RdYlGn[9] );
              break;
            case 'RdYlBu':
              this.scales.elevation.range( colorbrewer.RdYlBu[9] );
              break;

        }

        for (var i = this.pointBuckets.length - 1; i >= 0; i--) {
         
            var bucket = this.pointBuckets[i];
            bucket.colors.elevation.length = 0; // reset to 0

            for (var k = 0; k < bucket.geometry.vertices.length; k++) {
        
                var elevationColor = new THREE.Color();

                var elevationColorValue = this.scales.elevation(bucket.geometry.vertices[k].z);

                // d3.rgb provides hex value with leading #, we strip that and replace it with 0x
                var elevationColorHexValue = '0x' + (d3.rgb(elevationColorValue).toString()).substr(1);
                elevationColor.setHex(elevationColorHexValue);

                bucket.colors.elevation.push(elevationColor);
            }

            bucket.geometry.colors = bucket.colors[ 'elevation' ];
            bucket.geometry.colorsNeedUpdate = true;
        }

    };

    this.setScalesFromPointBucket = function(pointBucket) {
        // http://stackoverflow.com/questions/6299500/tersest-way-to-create-an-array-of-integers-from-1-20-in-javascript
        function range1(i, divisor)  {
            if (typeof(divisor) === 'undefined') {
                divisor = i;
            }
            return i>=0 ? range1(i-1, divisor).concat(i / 256):[];
        }
        var greyscale = range1(256);

        this.scales.elevation = d3.scale.quantize();
        var elev = pointBucket.geometry.vertices.map(function(v) { return v.z; });
        this.scales.elevation.domain( [d3.min(elev), d3.max(elev)] );
        this.scales.elevation.range( colorbrewer.RdYlBu[9] );

        this.scales.height = d3.scale.quantile();
        this.scales.height.domain( elev );
        this.scales.height.range( greyscale );

        this.scales.intensity = d3.scale.quantile();
        this.scales.intensity.domain(pointBucket.intensities);
        this.scales.intensity.range(greyscale);

        this.scales.pcid = d3.scale.category20();
        this.scales.classification = d3.scale.category20();
    };

    this.pushColorsIntoPointBucket = function(pointBucket, values) {
        var elevationColor = new THREE.Color();
        var intensityColor = new THREE.Color();
        var pcidColor = new THREE.Color();
        var classificationColor = new THREE.Color();

        var elevationColorValue = this.scales.elevation(values.elevation);
        var intensityColorValue = this.scales.intensity(values.intensity);
        var pcidColorValue = this.scales.pcid(values.pcid);
        var classificationColorValue = this.scales.classification(values.classification);

        // d3.rgb provides hex value with leading #, we strip that and replace it with 0x
        var elevationColorHexValue = '0x' + (d3.rgb(elevationColorValue).toString()).substr(1);
        elevationColor.setHex(elevationColorHexValue);
        intensityColor.setRGB(intensityColorValue, intensityColorValue, intensityColorValue);
        this.setColorFromCssString(pcidColor, pcidColorValue);
        this.setColorFromCssString(classificationColor, classificationColorValue);

        pointBucket.colors.elevation.push(elevationColor);
        pointBucket.colors.intensity.push(intensityColor);
        pointBucket.colors.pcid.push(pcidColor);
        pointBucket.colors.classification.push(classificationColor);
    };

    this.colorizePointsBy = function(key) {
        this.selectedColors = key;
        for (var i = this.pointBuckets.length - 1; i >= 0; i--) {
            var bucket = this.pointBuckets[i];
            bucket.geometry.colors = bucket.colors[key];
            bucket.geometry.colorsNeedUpdate = true;
            this.pbox.attributes.customColor.value = bucket.geometry.colors;
            this.pbox.attributes.customColor.needsUpdate = true;
        }
        if (this.selectedColors === 'classification') {
            this.updateClassificationLegend();
            $( "#classificationLegend ").show();
        } else {
            $( "#classificationLegend" ).hide();
        }
    };

    this.updateClassificationLegend = function() {
        var value, color;
        var legend = $("<ul></ul>").attr('style', 'list-style: none')
            .append('<li><strong>Classification legend</strong></li>');
        for (var i = this.scales.classification.domain().length - 1; i >= 0; i--) {
            value = this.scales.classification.domain()[i];
            color = this.scales.classification(value);
            legend.append('<li><span class="grid-legendColor" ' +
                'style="height: 10px; width: 10px; display: inline-block; ' +
                'background-color: ' + color + '"></span> ' + value + '</li>');
        }
        $( "#classificationLegend" ).html(legend);
    };

    this.updatePointSize = function(value) {
        this.material.size = value;
        $( "#pointSizeText" ).html('Point size: ' + value);
        this.pbox.setSize( value );
    };

/*
    this.updatePointSizeWithKeys = function(event, that) {
        console.log( event.which );
        var size;
        switch (event.which) {
            case 107: // +
            case 187: // = +
                console.log( "=" );
                size = that.material.size < MAX_POINT_SIZE ? that.material.size + 1 : MAX_POINT_SIZE;
                that.updatePointSize(size);
                $( "#pointSizeSlider" ).slider({ value: size });
                break;
            case 109: // -
            case 189: // - _
                console.log( "-" );
                size = that.material.size > MIN_POINT_SIZE ? that.material.size - 1 : MIN_POINT_SIZE;
                that.updatePointSize(size);
                $( "#pointSizeSlider" ).slider({ value: size });
                break;
        }
    };
*/

    this.resizeWindow = function() {
        this.renderer.setSize(windowInnerWidth(), windowInnerHeight());
        this.camera.aspect = windowInnerWidth() / windowInnerHeight();
        this.camera.updateProjectionMatrix();
    };

    this.setColorFromCssString = function(color, cssColor) {
        color.setRGB(
            parseInt(cssColor.slice(1, 3), 16) / 256.0,
            parseInt(cssColor.slice(3, 5), 16) / 256.0,
            parseInt(cssColor.slice(5, 7), 16) / 256.0
        );
    };

    this.geometryToVector = function(geometry) {
        var coordinates = geometry.coordinates;
        return new THREE.Vector3(coordinates[0], coordinates[1], coordinates[2]);
    };

    function keydown( event ) {
    
//      window.removeEventListener( 'keydown', keydown );
      
      var size;
      
      switch (event.which) {
      
          case 221: // ]

              size = scope.material.size < MAX_POINT_SIZE ? scope.material.size + 1 : MAX_POINT_SIZE;
              scope.updatePointSize(size);
              $( "#pointSizeSlider" ).slider({ value: size });
              break;
        
          case 219: // [

              size = scope.material.size > MIN_POINT_SIZE ? scope.material.size - 1 : MIN_POINT_SIZE;
              scope.updatePointSize(size);
              $( "#pointSizeSlider" ).slider({ value: size });
              break;
      
          case 80: // p

            console.log(scope.pbox.isVisible());
      
            // user has requested to show/hide the profile box
            if ( scope.pbox.isVisible() ) {

              scope.pbox.setVisible( false );
              scope.scene.remove( scope.pbox.profileBox );

            } else {

              scope.pbox.setVisible( true );
              scope.scene.add( scope.pbox.profileBox );

            }
            break;
      }
    }

/*
    function keyup( event ) {
      
      window.addEventListener( 'keydown', keydown, false );

    }
*/
}.apply(Allover.viewer));