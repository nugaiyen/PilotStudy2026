
mapboxgl.accessToken = "pk.eyJ1IjoicGFpc2xleXc4MjkiLCJhIjoiY21oZTY4Z3h6MGFpbzJsb2UzbWkxZjZybyJ9.qvAAm5rLQZPLPn8ltX2vLg";

const GOOGLE_MAPS_API_KEY = "AIzaSyC2bKWmJ_Dl1bnwRzrA_CwDoK3XUZLUm_o";  // seceret api key DO NOT SHARE

// initialize the map
const map = new mapboxgl.Map({
    container: "map",  // connect to the html map container
    style: "mapbox://styles/mapbox/streets-v12",  // just default
    center: [-122.50, 47.22],  //pierce county
    zoom: 10
});


const parcelLookup = new Map();

// Collecting boundaries of every polygon belonging to a parcel
function extendBounds(bounds, coords) {
    if (typeof coords[0] === 'number') {
        bounds.extend(coords);
    } else {
        coords.forEach(part => extendBounds(bounds, part));
    }
}

// building photo on the side bar using google street view
function updateBuildingPhoto(address){
    // show the photo when parcel is selected
    document.getElementById("building-photo").style.display = "block";

    const photo = document.getElementById("building-photo");
    const location = address + ", Pierce County, WA";
    const url = new URL("https://maps.googleapis.com/maps/api/streetview");

    url.searchParams.set("size", "600x300");
    url.searchParams.set("location", location);
    url.searchParams.set("key", GOOGLE_MAPS_API_KEY)
    photo.src = url.toString();
}

// Select a parcel from the map or sidebar
// and just realize we need a reset button i will make it P
function selectParcel(parcelNumber) {
    const parcel = parcelLookup.get(parcelNumber);
    if (!parcel) return;

    // Zoom to the selected parcel
    map.fitBounds(parcel.bounds, {
        padding: 75,
        maxZoom: 17,
        duration: 850
    });

    // Highlight polygons with this parcel number
    map.setFilter("housing-selected", [
        "==",
        ["get", "Parcel Number"],
        parcelNumber
    ]);

    // Update building information
    document.getElementById("address").textContent = parcel.address;
    updateBuildingPhoto(parcel.address);  // show the selected property's street view photo
    document.getElementById("selected-parcel-number").textContent = parcelNumber;
    document.getElementById("parcel-details").hidden = false;
    document.getElementById("selected-hvac").textContent = parcel.hvac;

    // Update Google Maps Link
    const googleMapsLink = document.getElementById("google-maps-link");

    googleMapsLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parcel.address + ", Pierce County, WA")}`;

    // Highlight the selected parcel in the sidebar
    document.querySelectorAll(".parcel-item").forEach(button => {
        button.classList.toggle(
            "selected",
            button.getAttribute("data-parcel") === parcelNumber
        );
    });
}
   
/////////////////////////////////////////////////////////
 // wait until the map finishes loading
 map.on("load", async () => {

    try {
        // Fetch GeoJSON so that JS can access its features
        const response = await fetch("assets/combinedNEW4326.geojson");

        if(!response.ok) {
            throw new Error("Unable to load GeoJSON");
        }

        const geojson = await response.json();


    // load the GeoJSON data
    map.addSource("housing", {
        type: "geojson",
        data: "assets/combinedNEW4326.geojson"
    });



        // Group repeated polygons by their unique parcel number
        for (const feature of geojson.features) {
            const id = String(
                feature.properties["Parcel Number"] ?? ""
            ).trim();

            if (!id || !feature.geometry) continue;

            if (!parcelLookup.has(id)) {
                parcelLookup.set(id, {
                    address: feature.properties.Site_Addre ||
                        "Address unavailable",
                        hvac: feature.properties["HVAC Description"] ||
                        "Unknown",
                        bounds: new mapboxgl.LngLatBounds()
                });
            }

        extendBounds(
        parcelLookup.get(id).bounds,
        feature.geometry.coordinates
        );
    }



    // create dots for each parcel
    // this part is just for testing data
    // dots are so seperate and tiny
    // will change it later
   //map.addLayer({
     //   id: "housing-dots",
     //   type: "circle",
     //   source: "housing",
     //   paint: {
        //    "circle-radius": 5,
        //    "circle-color": "#FF0329"
    //    }
    //});

    // trying color-filled polygon
    // do not edit this part yet
    map.addLayer({
        id: "housing-polygon",
        type: "fill",
        source: "housing",
        paint: {
            "fill-color": "#FF2020",
            "fill-opacity": 1
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
            "fill-color": "#3440bc",
            "fill-opacity": 0.2
        }
    });


    // Red parcel outlines
    map.addLayer({
        id: "housing-outline",
        type: "line",
        source: "housing",
        paint: {
            "line-color": "#CC0000",
            "line-width": 3
        }
    });


    // Highlight selected parcels in yellow
    map.addLayer({
        id: "housing-selected",
        type: "line",
        source: "housing",
        filter: ["==", ["get", "Parcel Number"], ""],
        paint: {
            "line-color": "#FFE600",
            "line-width": 5
        }
    });

    // One marker per unique parcel
    const markers = {
        type: "FeatureCollection",
        features: [...parcelLookup].map(([id, parcel]) => {
            const center = parcel.bounds.getCenter();

            return {
                type: "Feature",
                properties: {
                    "Parcel Number": id,
                },
                geometry: {
                    type: "Point",
                    coordinates: [center.lng, center.lat]
                }
            };
        })
    };

    map.addSource("parcel-markers", {
        type: "geojson",
        data: markers
    });

    // Visible markers are lower zoom levels
    map.addLayer({
        id: "parcel-markers",
        type: "circle",
        source: "parcel-markers",
        maxzoom: 14,
        paint: {
            "circle-color": "#FF2020",
            "circle-radius": 7,
            "circle-stroke-color": "#FFFFFF",
            "circle-stroke-width": 2
        }
    });

    // Click polygon or marker to select a parcel
    ["housing-polygon", "parcel-markers"].forEach(layer => {
        map.on("click", layer, event => {
            const id = String(
                event.features[0].properties["Parcel Number"]
            );

            selectParcel(id);
        });
    });

        // Create clickable list in left sidebar
        const list = document.getElementById("parcel-list");

        const sortedParcels = [...parcelLookup.entries()].sort(
            (a, b) => a[1].address.localeCompare(b[1].address)
        );

        for (const [id, parcel] of sortedParcels) {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "parcel-item";
            button.dataset.parcel = id;

            const address = document.createElement("strong");
            address.textContent = parcel.address;

            const number = document.createElement("small");
            number.textContent = "Parcel " + id;

            button.append(address, number);

            button.addEventListener("click", () => {
                selectParcel(id);
            });

            list.append(button);
        }

        document.getElementById("parcel-count").textContent =
            parcelLookup.size + " unique parcels";

    } catch (error) {
        console.error("Error loading parcel data:", error);
    }

});
/////////////////// reset button here ///////////////////////////////////////
// reset the map
document.getElementById("reset-map").addEventListener("click", () => {

    // return to the original pierce county view
    map.flyTo({
        center: [-122.50, 47.22],
        zoom: 10
    });

    // remove selected parcel hightlight
    map.setFilter("housing-selected", [
        "==",
        ["get", "Parcel Number"],
        ""
    ]);

    // reset building info
    document.getElementById("selected-parcel-number").textContent = "";
    document.getElementById("parcel-details").hidden = true;

    // restore the default photo or no i dont know what should we put back there
    document.getElementById("building-photo").style.display = "none";

    // clear the selected parcel in the sidebar
    document.querySelectorAll(".parcel-item").forEach(button => {
        button.classList.remove("selected");
    });
});
/////////////////// end reset button here ////////////////////////////////////

/////////////////// resize sidebar here //////////////////////////////////////
// resize sidebar by dragging its right edge
const sidebar = document.getElementById("sidebar");
const resizer = document.getElementById("sidebar-resizer");

let isResizing = false;

// start resizing when user press the edge
resizer.addEventListener("pointerdown", (e) => {
    isResizing = true;
    resizer.setPointerCapture(e.pointerId);
    document.body.style.userSelect = "none";
});

// lindsay buying crackers
// no chile limon
// change sidebar width (on drag ..?)
resizer.addEventListener("pointermove", (e) => {
    if (!isResizing) return;

    // in the range 220px to 600px maybe no
    // to 500? no still 600
    const left = sidebar.getBoundingClientRect().left;
    const width = Math.max(220, Math.min(600, e.clientX - left));

    sidebar.style.width = width + "px";

    // tell mapbox its container changed size
    map.resize();
});

// stop resize
function stopResizing() {
    isResizing = false;
    document.body.style.userSelect = "";
    map.resize();
}

resizer.addEventListener("pointerup", stopResizing);
resizer.addEventListener("pointercancel", stopResizing);
/////////////////// end resize sidebar here ///////////////////////////////////