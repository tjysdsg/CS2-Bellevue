// Create a square polygon centered on the point
// Distance is 6500 meters (6.5km) to each side, totaling 13km width/height
var center = ee.Geometry.Point([-122.16440, 47.63263]);
var bellevue = center.buffer(13083 / 2).bounds();
Map.centerObject(bellevue, 12);

///////////////////////////// Heightmap (DEM) Export /////////////////////////////

// 1. Select the USGS 3DEP 10m DEM
var dem = ee.ImageCollection("USGS/3DEP/10m_collection").select('elevation').mosaic();
var clippedDem = dem.clip(bellevue);

// 2. Calculate min and max elevation values within the region for accurate visualization
// We use the DEM's native resolution (10m) for this calculation.
var minMax = clippedDem.reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: bellevue,
  scale: 10,
  bestEffort: true,
});

// Get the individual min and max values (still ee.ComputedNumber objects initially)
var minElevationEE = minMax.get('elevation_min');
var maxElevationEE = minMax.get('elevation_max');

// Use evaluate() to get the actual client-side numbers before proceeding
// This ensures visParams uses concrete numbers.
ee.List([minElevationEE, maxElevationEE]).evaluate(function(list) {
  var minElevation = list[0];
  var maxElevation = list[1];

  // Print the values to the Earth Engine console
  print('Heightmap Minimum Elevation (meters):', minElevation);
  print('Heightmap Maximum Elevation (meters):', maxElevation);

  // Define visualization parameters for grayscale heightmap for map display
  // These parameters are *only* for how it looks in the Earth Engine viewer.
  // The GeoTIFF export will contain raw elevation values.
  var visParamsHeightmapDisplay = {
    min: minElevation,
    max: maxElevation,
    palette: ['black', 'white']
  };

  // Visualize the Heightmap on the map (optional - this uses the display visParams)
  Map.addLayer(clippedDem, visParamsHeightmapDisplay, 'Bellevue Heightmap Display');

  // 3. Export the Heightmap as GeoTIFF to Google Drive
  // The exported image (clippedDem) contains the raw elevation values.
  Export.image.toDrive({
    image: clippedDem, // Exporting the raw DEM image
    description: 'Bellevue_Heightmap',
    scale: 10, // Export at the native 10-meter resolution of the 3DEP DEM
    region: bellevue,
    crs: 'EPSG:3857',
    maxPixels: 1e12,
    fileFormat: 'GeoTIFF' // Specify GeoTIFF format
  });
});


///////////////////////////// Satellite Image (NAIP) Export /////////////////////////////

// 1. Select NAIP (National Agriculture Imagery Program) Image Collection
// Filter for recent NAIP imagery over your region. NAIP is typically 0.6m or 1m resolution.
var naip = ee.ImageCollection('USDA/NAIP/DOQQ')
    .filterDate('2020-01-01', '2025-02-01') // Adjust dates to find available recent imagery for Bellevue, WA
    .filterBounds(bellevue)
    .mosaic(); // Mosaic to combine multiple NAIP tiles that cover the region

// 2. Define visualization parameters for NAIP (Natural Color RGB) for map display
// NAIP bands are typically 'R', 'G', 'B' for natural color.
var visParamsNAIPDisplay = {
  bands: ['R', 'G', 'B'],
  min: 0,
  max: 255 // NAIP imagery is usually 8-bit (0-255)
};

// 3. Visualize the NAIP satellite image on the map (optional - using display visParams)
Map.addLayer(naip, visParamsNAIPDisplay, 'Bellevue NAIP Satellite Image Display');

// 4. Export the NAIP Satellite Image as GeoTIFF to Google Drive
// The exported image (naip) contains the raw R, G, B values.
Export.image.toDrive({
  image: naip, // Exporting the raw NAIP image
  description: 'Bellevue_NAIP_Satellite_Image',
  scale: 1, // Export at 1-meter resolution (or 0.6 for native NAIP resolution)
  region: bellevue,
  crs: 'EPSG:3857',
  maxPixels: 1e12,
  fileFormat: 'GeoTIFF' // Specify GeoTIFF format
});
