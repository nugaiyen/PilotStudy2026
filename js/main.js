
mapboxgl.accessToken = "pk.eyJ1IjoicGFpc2xleXc4MjkiLCJhIjoiY21oZTY4Z3h6MGFpbzJsb2UzbWkxZjZybyJ9.qvAAm5rLQZPLPn8ltX2vLg";

// initialize the map
const map = new mapboxgl.Map({
    container: "map",  // connect to the html map container
    style: "mapbox://styles/mapbox/streets-v12",  // just default
    center: [-122.50, 47.22],  //pierce county
    zoom: 10
})


 // wait until the map finishes loading
 map.on("load", () => {

    // load the GeoJSON data
    map.addSource("housing", {
        type: "geojson",
        data: "assets/combinedNEW4326.geojson"
    });

    // create dots for each parcel
    // this part is just for testing data
    // dots are so seperate and tiny
    // will change it later
    map.addLayer({
        id: "housing-dots",
        type: "circle",
        source: "housing",
        paint: {
            "circle-radius": 5,
            "circle-color": "#FF0329"
        }
    });


    // add pierce county boundary
    map.addSource("pierce-county", {
        type: "geojson",
        data: "https://services2.arcgis.com/1UvBaQ5y1ubjUPmd/ArcGIS/rest/services/Pierce_County_Boundary_polygon/FeatureServer/0/query?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&f=geojson"
    });

    // colorfilled polygon (pierce county)
    map.addLayer({
        id: "county-fill",
        type: "fill",
        source: "pierce-county",
        paint: {
            "fill-color": "#5452BF",
            "fill-opacity": 0.2
        }
    });


});
