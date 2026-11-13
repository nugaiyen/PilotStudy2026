
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
function updateBuildingPhoto(address) {

    const photo = document.getElementById("building-photo");
    const placeholder = document.getElementById("photo-placeholder");

    // Hide placeholder and show photograph
    placeholder.hidden = true;
    photo.style.display = "block";

    const location = address + ", Pierce County, WA";
    const url = new URL("https://maps.googleapis.com/maps/api/streetview");

    url.searchParams.set("size", "600x300");
    url.searchParams.set("location", location);
    url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

    photo.onerror = () => {
        photo.style.display = "none";
        placeholder.textContent = "Street View image unavailable for this property.";
        placeholder.hidden = false;
    };

    photo.src = url.toString();
}


// Select a parcel from the map or sidebar
// and just realize we need a reset button i will make it P

function selectParcel(parcelNumber) {

    const parcel = parcelLookup.get(parcelNumber);

    if (!parcel) {
        console.warn("Parcel not found:", parcelNumber);
        return;
    }

    // Zoom to the selected parcel
    map.fitBounds(parcel.bounds, {
        padding: 75,
        maxZoom: 17,
        duration: 850
    });

    // Highlight the selected parcel on the map
    map.setFilter("housing-selected", [
        "==",
        ["get", "Parcel Number"],
        parcelNumber
    ]);

    // Update building information
    document.getElementById("address").textContent =
        parcel.address;

    document.getElementById("selected-parcel-number").textContent =
        parcelNumber;

    document.getElementById("selected-hvac").textContent =
        parcel.hvac;

    document.getElementById("parcel-details").hidden = false;

    // Update Street View photograph
    updateBuildingPhoto(parcel.address);

    // Update Google Maps link
    const googleMapsLink =
        document.getElementById("google-maps-link");

    googleMapsLink.href =
        "https://www.google.com/maps/search/?api=1&query=" +
        encodeURIComponent(parcel.address + ", Pierce County, WA");

    googleMapsLink.hidden = false;

    // Highlight selected parcel in the sidebar
    document.querySelectorAll(".parcel-item").forEach(button => {

        const isSelected =
            button.dataset.parcel === parcelNumber;

        button.classList.toggle("selected", isSelected);

        if (isSelected) {
            const selectedGroup =
                button.closest(".property-group");

            if (selectedGroup) {
                // Expand only the selected property group
                document.querySelectorAll(".property-group").forEach(group => {
                    group.open = (group === selectedGroup);
                });
            }
        }
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


    // Highlight parcel markers when hovering over sidebar entries
    map.addLayer({
        id: "parcel-markers-hover",
        type: "circle",
        source: "parcel-markers",
        filter: [
            "==",
            ["get", "Parcel Number"],
            "__none__"
        ],
        paint: {
            "circle-color": "#FF2020",
            "circle-radius": 10,
            "circle-stroke-color": "#FFE600",
            "circle-stroke-width": 5,
            "circle-opacity": 1
        }
    });



    // Highlight specific parcels on the map
    function highlightParcelMarkers(parcelIds) {
        map.setFilter("parcel-markers-hover", [
            "in",
            ["get", "Parcel Number"],
            ["literal", parcelIds]
        ]);
    }

    // Remove hover highlight
    function clearParcelMarkerHover() {
        map.setFilter("parcel-markers-hover", [
            "==",
            ["get", "Parcel Number"],
            "__none__"
        ]);
    }




    // Click polygon or marker to select a parcel
    ["housing-polygon", "parcel-markers"].forEach(layer => {
        map.on("click", layer, event => {
            const id = String(
                event.features[0].properties["Parcel Number"]
            );

            selectParcel(id);
        });
    });

    //////////////// new popup & hover function //////////////////////
    const hoverPopup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12
    });

    // show parcel info when hovering
    ["housing-polygon", "parcel-markers"].forEach(layer => {
        map.on("mouseenter", layer, (e) => {
            // change the cursor to pointer
            map.getCanvas().style.cursor = "pointer";
        });

        map.on("mousemove", layer, (e) => {
            // get parcel number
            const parcelNumber = String(
                e.features[0].properties["Parcel Number"]
            );

            // find parcel info
            const parcel = parcelLookup.get(parcelNumber);
            if (!parcel) return;

            // display popup near cursor
            hoverPopup
                .setLngLat(e.lngLat)
                .setText(`${parcel.address} | Parcel ${parcelNumber}`)  // text shown in the popup
                .addTo(map);
        });

        map.on("mouseleave", layer, () => {
            // restore cursor
            map.getCanvas().style.cursor = "";
            //remove popup
            hoverPopup.remove();
        });
    });
    //////////////// end new popup & hover function //////////////////




    // Group parcels by their shared street address.
    function getGroupAddress(address) {
        return address.trim()
            .replace(/\s+/g, " ")
            .replace(/\s+UNIT\s+.*$/i, "");
    }

    const list = document.getElementById("parcel-list");
    list.replaceChildren();

    const propertyGroups = new Map();

    // Organize individual parcels into address groups.
    for (const [id, parcel] of parcelLookup.entries()) {
        const groupAddress = getGroupAddress(parcel.address);

        if (!propertyGroups.has(groupAddress)) {
            propertyGroups.set(groupAddress, []);
        }

        propertyGroups.get(groupAddress).push({ id, parcel });
    }

    // Sort property groups alphabetically by address.
    const sortedGroups = [...propertyGroups.entries()].sort(
        (a, b) => a[0].localeCompare(b[0], undefined, { numeric: true })
    );

    for (const [groupAddress, parcels] of sortedGroups) {

        // Each property group is an expandable card.
        const group = document.createElement("details");
        group.className = "property-group";
        group.name = "candidate-properties";

        const heading = document.createElement("summary");

        const title = document.createElement("span");
        title.className = "property-title";
        title.textContent = groupAddress;



        // Highlight this property's parcels when hovering
        heading.addEventListener("mouseenter", () => {
            const parcelIds = parcels.map(item => item.id);
            highlightParcelMarkers(parcelIds);
        });

        // Remove highlight when mouse leaves
        heading.addEventListener("mouseleave", () => {
            clearParcelMarkerHover();
        });




        const count = document.createElement("small");
        count.className = "property-count";
        count.textContent = parcels.length === 1
            ? "1 parcel"
            : `${parcels.length} parcels`;

        heading.append(title, count);
        group.append(heading);

        // Container for individual units/parcels.
        const unitList = document.createElement("div");
        unitList.className = "property-units";

        parcels.sort((a, b) =>
            a.parcel.address.localeCompare(
                b.parcel.address,
                undefined,
                { numeric: true }
            )
        );

        for (const { id, parcel } of parcels) {
            const button = document.createElement("button");

            button.type = "button";
            button.className = "parcel-item";
            button.dataset.parcel = id;

            // Display the unit identifier separately.
            const unitMatch = parcel.address.match(/\bUNIT\s+(.+)$/i);

            const unitLabel = document.createElement("strong");
            unitLabel.textContent = unitMatch
                ? `Unit ${unitMatch[1]}`
                : "View parcel";

            const parcelNumber = document.createElement("small");
            parcelNumber.textContent = `Parcel ${id}`;

            button.append(unitLabel, parcelNumber);

            // Preserve existing click-to-zoom functionality.
            button.addEventListener("click", () => {
                selectParcel(id);
            });



            // Highlight this specific unit when hovering
            button.addEventListener("mouseenter", () => {
                highlightParcelMarkers([id]);
            });

            button.addEventListener("mouseleave", () => {
                clearParcelMarkerHover();
            });


            unitList.append(button);
        }

        group.append(unitList);
        list.append(group);
    }

    document.getElementById("parcel-count").textContent =
        `${propertyGroups.size} address groups · ${parcelLookup.size} parcels`;


    } catch (error) {
        console.error("Error loading parcel data:", error);
    }

});
/////////////////// reset button here ///////////////////////////////////////



// reset the map
    document.getElementById("reset-map").addEventListener("click", () => {

        // Return to the original Pierce County view
        map.flyTo({
            center: [-122.50, 47.22],
            zoom: 10
        });

        // Remove selected parcel highlight
        map.setFilter("housing-selected", [
            "==",
            ["get", "Parcel Number"],
            ""
        ]);

        // Reset building information
        document.getElementById("address").textContent =
            "Select a building on the map or from the list to view its details.";

        document.getElementById("selected-parcel-number").textContent = "";
        document.getElementById("selected-hvac").textContent = "";
        document.getElementById("parcel-details").hidden = true;

        // Hide building photo
        document.getElementById("building-photo").style.display = "none";
        const placeholder = document.getElementById("photo-placeholder");
        placeholder.textContent = "";
        placeholder.innerHTML = `
            <span class="photo-icon">▧</span>
            <strong>Property Street View</strong>
            <p>Select a parcel on the map or from the list to view its photograph.</p>
        `;
        placeholder.hidden = false;


        // Hide Google Maps link
        document.getElementById("google-maps-link").hidden = true;

        // Clear all selected parcel buttons
        document.querySelectorAll(".parcel-item").forEach(button => {
            button.classList.remove("selected");
        });

        // Collapse all property groups
        document.querySelectorAll(".property-group").forEach(group => {
            group.open = false;
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