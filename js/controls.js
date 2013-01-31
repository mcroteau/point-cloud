/*! allover.js - vfa834c2 - 2013-01-25
* http://github.com/CRREL/allover.js
* Copyright (c) 2013 Pete Gadomski; Licensed MIT */

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

  var debug = false;

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