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