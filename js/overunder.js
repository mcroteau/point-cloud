/*! allover.js - ve06e593-dirty - 2012-11-29
* http://github.com/CRREL/allover.js
* Copyright (c) 2012 Pete Gadomski; Licensed MIT */


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
		this.loadPointsFromData();
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

        this.createSidebar( options, that );
        this.refreshCache = options.refreshCache;

        if (options.loadingImgSrc) {
            this.loadingImg = $('<img src="' + options.loadingImgSrc + '"></img>');
            this.loadingImg.appendTo(this.container)
                .attr('style', 'position: absolute; top: ' +
                    windowInnerHeight() / 2 + 'px; left:' +
                    windowInnerWidth() / 2 + 'px;');
        }

        window.addEventListener( 'keydown', keydown, false );
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
        if (this.progressBar !== null) {
          this.progressBar.element.show();
          this.progressBar.coloredBar.attr('style', 'width: ' + loadPercent + '%');
        }
        
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
		console.log(pointBucket)
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
        if (this.progressBar !== null) {
          this.progressBar.element.hide();
          this.progressBar.statusText.html("Getting next slice");
        }

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

        // Set up the scene's dimensions
        var xLineMat = new THREE.LineBasicMaterial({
            color: 0x0087F7, opacity: 0.8, linewidth: 1
        });
        var xLineGeom = new THREE.Geometry();
        xLineGeom.vertices.push(new THREE.Vector3(minx, midy, 0));
        xLineGeom.vertices.push(new THREE.Vector3(maxx, midy, 0));

        var yLineMat = new THREE.LineBasicMaterial({
            color: 0xFFAF00, opacity: 0.8, linewidth: 1
        });
        var yLineGeom = new THREE.Geometry();
        yLineGeom.vertices.push(new THREE.Vector3(midx, miny, 0));
        yLineGeom.vertices.push(new THREE.Vector3(midx, maxy, 0));

        var zLineMat = new THREE.LineBasicMaterial({
            color: 0xFE2232, opacity: 0.8, linewidth: 1
        });
        var zLineGeom = new THREE.Geometry();
        zLineGeom.vertices.push(new THREE.Vector3(midx, midy, Math.min(0, minz)));
        zLineGeom.vertices.push(new THREE.Vector3(midx, midy, Math.max(0, maxz)));

        var xLine = new THREE.Line(xLineGeom, xLineMat);
        var yLine = new THREE.Line(yLineGeom, yLineMat);
        var zLine = new THREE.Line(zLineGeom, zLineMat);

        this.scene.add(xLine);
        this.scene.add(yLine);
        this.scene.add(zLine);

        this.firstLoad = false;
    };


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
        //$( "#pointSizeText" ).html('Point size: ' + value);
        this.pbox.setSize( value );
    };

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
	
		console.log('over under keydown');
		
		var size;
		var CLOSE_BRACKET = 221, //]
		    OPEN_BRACKET = 219, //[
		    PLACE_PROFILE_BOX = 80; //p
		  
		switch (event.which) {
			
			case CLOSE_BRACKET : // ]
			
			    size = scope.material.size < MAX_POINT_SIZE ? scope.material.size + 1 : MAX_POINT_SIZE;
			    scope.updatePointSize(size);
			    //$( "#pointSizeSlider" ).slider({ value: size });
			    break;
			
			case OPEN_BRACKET : // [
			
			    size = scope.material.size > MIN_POINT_SIZE ? scope.material.size - 1 : MIN_POINT_SIZE;
			    scope.updatePointSize(size);
			    //$( "#pointSizeSlider" ).slider({ value: size });
			    break;
			
			case PLACE_PROFILE_BOX : // p
				
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
	

}.apply(Allover.viewer));