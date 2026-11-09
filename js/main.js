
mapboxgl.accessToken = "pk.eyJ1IjoicGFpc2xleXc4MjkiLCJhIjoiY21oZTY4Z3h6MGFpbzJsb2UzbWkxZjZybyJ9.qvAAm5rLQZPLPn8ltX2vLg";

// initialize the map
const map = new mapboxgl.Map({
    container: "map",  // connect to the html map container
    style: "mapbox://styles/mapbox/streets-v12",  // just default
    center: [-122.50, 47.22],  //pierce county
    zoom: 10
})
