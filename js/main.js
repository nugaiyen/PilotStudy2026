
mapboxgl.accessToken = "pk.eyJ1IjoicGFpc2xleXc4MjkiLCJhIjoiY21oZTY4Z3h6MGFpbzJsb2UzbWkxZjZybyJ9.qvAAm5rLQZPLPn8ltX2vLg";

// initialize the map
const map = new mapboxgl.Map({
    container: "map",  // connect to the html map container
    style: "mapbox://styles/mapbox/streets-v12",  // just default
    center: [-122.515704, 47.230103],  //pierce county
    zoom: 10
})

map.on("load", () => {
    // load the combinedNEW4326.geojson
    map.addSource("buildings", {
        type: "geojson",
        data: "assets/combinedNEW4326.geojson"
    });

    // building polygons
    map.addLayer({
        id: "buildings-fill",
        type: "fill",
        source: "buildings",
        paint: {
            "fill-color": "#0077cc",
            "fill-opacity": 0.6
        }
    });

    // add outlines
    map.addLayer({
        id: "building-outline",
        type: "line",
        source: "buildings",
        paint: {
            "line-color": "#ffffff",
            "line-width": 1
        }
    });
});