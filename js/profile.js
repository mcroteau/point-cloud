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


  	var size;
	var CLOSE_BRACKET = 221, //]
		OPEN_BRACKET = 219, //[
		PLACE_PROFILE_BOX = 80,//p
		LEFT_ARROW = 37,
		RIGHT_ARROW = 39,
		UP_ARROW = 38,
		DOWN_ARROW = 40,
		PAGE_UP = 33,
		PAGE_DOWN = 34,
		CROP_BOX = 67, //c
		ROTATE_LEFT = 81, //q
		ROTATE_RIGHT = 69, //e
		DECREASE = 0,
		INCREASE = 0;


  function keydown( event ) {
    
    event.preventDefault();

	console.log('profile key down');
	
    switch ( event.keyCode ) {
   
      case LEFT_ARROW: // left arrow

        if ( event.shiftKey ) {

          that.profileBox.scale.x += 0.1;
          that.updateBounds();
 
        } else {

          that.profileBox.position.x += 10;
          that.setCenterX( that.profileBox.position.x );
          that.updateBounds();

        }
 
        break;

      case RIGHT_ARROW: // right arrow

        if ( event.shiftKey ) {

          that.profileBox.scale.x -= 0.1;
          that.updateBounds();

        } else {

          that.profileBox.position.x -= 10;
          that.setCenterX( that.profileBox.position.x );
          that.updateBounds();

        }

        break;

      case UP_ARROW: // up arrow

        if ( event.shiftKey ) {

          that.profileBox.scale.y += 0.1;
          that.updateBounds();
 
        } else {

          that.profileBox.position.y -= 10;
          that.setCenterY( that.profileBox.position.y );
          that.updateBounds();

        }

        break;

      case DOWN_ARROW: // down arrow

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

  window.addEventListener( 'keydown', keydown, false );

};
