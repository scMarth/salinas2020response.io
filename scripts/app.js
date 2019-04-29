require([
   "esri/views/MapView",
   "esri/Map",
   "esri/layers/FeatureLayer",
   "esri/geometry/Point",
   "esri/widgets/Legend",
   "esri/renderers/SimpleRenderer",
   "esri/symbols/SimpleMarkerSymbol",
   "esri/widgets/LayerList",
   "esri/tasks/Locator",
   "esri/Graphic",
   "esri/request",
   "dojo/domReady!"
   ], function(MapView, Map, FeatureLayer, Point, Legend, SimpleRenderer, SimpleMarkerSymbol, LayerList, Locator, Graphic, esriRequest) {
      var legend;

      // Layers
      var completeLyr, incompleteLyr, snapped_completeLyr, snapped_incompleteLyr;
      /**************************************************
      * Define the specification for each field to create
      * in the layer
      **************************************************/

      var fields = [
      {
         name: "ObjectID",
         alias: "ObjectID",
         type: "oid"
      }, {
         name: "name",
         alias: "Name",
         type: "string"
      }, {
         name: "address",
         alias: "Address",
         type: "string"
      }, {
         name: "phone",
         alias: "Phone",
         type: "string"
      },
      {
         name: "email",
         alias: "Email",
         type: "string"
      },
      {
         name: "type",
         alias: "type",
         type: "string"
      }];

      var pTemplate = {
         content: [{
            type: "fields",
            fieldInfos: [
               {
                  fieldName: "address",
                  label: "Address",
                  visible: true
               }
            ]
         }]
      };
      /**************************************************
      * Create the map and view
      **************************************************/
      var map = new Map({
         //basemap: "streets-night-vector", // roads seem misaligned with google GPS locations
         basemap: "osm",
         //basemap: "dark-gray-vector" // roads seem misaligned with google GPS locations
         //basemap: "dark-gray" // slightly better, but pixelated when zoom in
         //basemap: "streets", // still not as good as osm
         //basemap: "hybrid", // looks pretty nice
         //basemap: "streets-navigation-vector" // same as dark-gray-vector
         //ground: "world-elevation"
      });

      // Create MapView
      var view = new MapView({
         container: "viewDiv",
         map: map,
         center: [-121.6555013,36.6777372],
         zoom: 13
      });

      /**************************************************
      * Define the renderers
      **************************************************/
      var redPointsRenderer = new SimpleRenderer({
         symbol: {
            type: "picture-marker",  // autocasts as new PictureMarkerSymbol()
            url: "./images/location-markers/transparent-markers/red.png",
            width: "30px",
            height: "30px"
         }
      });
      var orangePointsRenderer = new SimpleRenderer({
         symbol: {
            type: "picture-marker",  // autocasts as new PictureMarkerSymbol()
            url: "./images/location-markers/transparent-markers/orange.png",
            width: "30px",
            height: "30px"
         }
      });
      var tealPointsRenderer = new SimpleRenderer({
         symbol: {
            type: "picture-marker",  // autocasts as new PictureMarkerSymbol()
            url: "./images/location-markers/transparent-markers/teal.png",
            width: "30px",
            height: "30px"
         }
      });
      var bluePointsRenderer = new SimpleRenderer({
         symbol: {
            type: "picture-marker",  // autocasts as new PictureMarkerSymbol()
            url: "./images/location-markers/transparent-markers/blue.png",
            width: "30px",
            height: "30px"
         }
      });

      view.when(function() {
         // Request the data from ./data/data.json when the view resolves
         getData()
         .then(geocodeAddresses)
         .then(processGeocodedAddresses)
         .catch(errback);
      });

      /**************************************************
      * Create json data from ./data/data.json
      **************************************************/
      function getData() {
         var url = "./data/data.json";
         return esriRequest(url, {
            responseType: "json"
         });
      }

      /**************************************************
      * Define layers and json variables
      **************************************************/
      var geoJson;
      var bLayer = createLayer([], bluePointsRenderer, "Blue Layer");
      var gLayer = createLayer([], tealPointsRenderer, "Green Layer");
      var rLayer = createLayer([], redPointsRenderer, "Red Layer");

      /**************************************************
      * Start the geocoding for each record in the json data
      **************************************************/
      function geocodeAddresses(response){
         geoJson = response.data;

         geolocations = []; // stores all the geolocations
         locatorPromises = []; // stores all the promises

         for (var i=0; i<geoJson.length; i++){
            var addr = geoJson[i].address;
            // console.log(addr);

            locator = new Locator("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer");

            address = {
               SingleLine: addr
            };

            options = {
               address: address,
               outFields: ['*']
            }

            promise = locator.addressToLocations(options);
            locatorPromises.push(promise);
         }

         // // wait for all promises to complete
         // return Promise.all(locatorPromises).then(function(promiseResults){
         //    return(promiseResults);
         // });

         // return a promise to complete all locator geocoding
         return Promise.all(locatorPromises);
      }

      /**************************************************
      * Process the results after the geocoding has completed
      **************************************************/
      function processGeocodedAddresses(addresses){
         // console.log(addresses);
         for (var i=0; i<addresses.length; i++){
            var loc = addresses[i][0];
            // console.log(loc);

            var x = loc.attributes.X;
            var y = loc.attributes.Y;
            var address = loc.address;

            // console.log(x);
            // console.log(y);

            var type = geoJson[i].type;
            if (type === "red"){
               addPointToLayer(rLayer, x, y, address);
            }else if (type === "blue"){
               addPointToLayer(bLayer, x, y, address);
            }else{
               addPointToLayer(gLayer, x, y, address);
            }
         }
         return;
      }

      /**************************************************
      * Add a point to the layer using applyEdits
      **************************************************/
      function addPointToLayer(layer, pointX, pointY, address){
         point = new Point({
            x: pointX,
            y: pointY
         });

         editFeature = new Graphic({
            geometry: point,
            attributes: {
               address: address
            }
         });

         edits = {
            addFeatures: [editFeature]
         };

         layer.applyEdits(edits);
      }

      /**************************************************
      * Create a FeatureLayer with the array of graphics
      **************************************************/
      function createLayer(graphics, layerRenderer, layerTitle) {
         lyr = new FeatureLayer({
            source: graphics, // autocast as an array of esri/Graphic
            // create an instance of esri/layers/support/Field for each field object
            fields: fields, // This is required when creating a layer from Graphics
            objectIdField: "ObjectID", // This must be defined when creating a layer from Graphics
            renderer: layerRenderer, // set the visualization on the layer
            spatialReference: {
               wkid: 4326
            },
            geometryType: "point", // Must be set when creating a layer from Graphics
            title: layerTitle,
            popupTemplate: pTemplate
         });
         map.add(lyr);
         return lyr;
      }

      /**************************************************
      * Executes if data retrieval was unsuccessful.
      **************************************************/
      function errback(error) {
         console.error("Creating legend failed. ", error);
      }

      /**************************************************
      * Create a LayerList that can toggle layers
      **************************************************/
      const layerList = new LayerList({
         view: view,
         listItemCreatedFunction: function(event){
            const item = event.item;
            item.panel = {
               content: "legend",
               open: true
            };
         }
      });
      view.ui.add(layerList, "top-right");
   }
);