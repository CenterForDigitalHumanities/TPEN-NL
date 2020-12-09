/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


GEOLOCATOR = {}

GEOLOCATOR.mymap={}

GEOLOCATOR.init =  async function(view){
    let latlong = [12, 12] //default starting coords
    let historyWildcard = {"$exists":true, "$size":0}
    let geoWildcard = {"$exists":true}
    let geos = []
    document.getElementById("leafLat").oninput = GEOLOCATOR.updateGeometry
    document.getElementById("leafLong").oninput = GEOLOCATOR.updateGeometry
    //For my map demo app
    let call = "https://frp.carto.com:443/api/v2/sql?q=select * from public.frp_2016_01_25_arcmap10_3"
    let externalGeoJSON = await fetch(call)
    .then(response => response.json())
    .then(rawObject => {
        return rawObject.rows.map(data => {
            let title = data.title ? data.title : "Unknown"
            let city = data.city ? data.city : "Unknown"
            let region = data.region ? data.region : "Unknown"
            let identifier = data.identifier ? data.identifier : "Unknown"
            let x = data.x_long ? data.x_long : -1
            let y = data.y_lat ? data.y_lat : -1
            let geoJSON = {
                "type": "Feature",
                "properties": {
                  "label": title,
                  "city" : city,
                  "region": region,
                  "identifier" : identifier
                },
                "geometry": {
                  "type": "Point",
                  "coordinates": [
                    x,y
                  ]
                }
            }
            return geoJSON
        })
    })
    .catch(err => {
        console.error(err)
        return []
    })
    
    switch(view){
        case "leaflet":
            GEOLOCATOR.initializeLeaflet(latlong, externalGeoJSON)
        break
        
        case "mapML":
            GEOLOCATOR.initializeMapML(latlong, externalGeoJSON)
        break
            
        default:
            alert("boooooo")
    }
}
    
GEOLOCATOR.initializeLeaflet = async function(coords, geoMarkers){
    GEOLOCATOR.mymap = L.map('leafletInstanceContainer')   
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoidGhlaGFiZXMiLCJhIjoiY2pyaTdmNGUzMzQwdDQzcGRwd21ieHF3NCJ9.SSflgKbI8tLQOo2DuzEgRQ', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 19,
        id: 'mapbox.satellite', //mapbox.streets
        accessToken: 'pk.eyJ1IjoidGhlaGFiZXMiLCJhIjoiY2pyaTdmNGUzMzQwdDQzcGRwd21ieHF3NCJ9.SSflgKbI8tLQOo2DuzEgRQ'
    }).addTo(GEOLOCATOR.mymap);
    GEOLOCATOR.mymap.setView(coords,2);

    L.geoJSON(geoMarkers, {
        pointToLayer: function (feature, latlng) {
            let appColor = "#08c49c"
            return L.circleMarker(latlng, {
                radius: 8,
                fillColor: appColor,
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });
        },
        onEachFeature: GEOLOCATOR.pointEachFeature
    }).addTo(GEOLOCATOR.mymap)
    leafletInstanceContainer.style.backgroundImage = "none"
    loadingMessage.classList.add("is-hidden")
}

GEOLOCATOR.pointEachFeature = function (feature, layer) {
    //@id, label, description
    layer.hasMyPoints = true
    layer.isHiding = false
    let popupContent = ""
    if (feature.properties) {
        if(feature.properties.label) {
            popupContent += `<div class="featureInfo"><label>Label: </label>${feature.properties.label}</div>`
        }
        if(feature.properties.region) {
            popupContent += `<div class="featureInfo"><label>Region: </label>${feature.properties.region}</div>`
        }
        if(feature.properties.city) {
            popupContent += `<div class="featureInfo"><label>City: </label>${feature.properties.city}</div>`
        }
        
        if(feature.properties.identifier) {
            popupContent += `<div class="featureInfo"><label>Paleography ID: </label>${feature.properties.identifier}</div>`
        }
    }
    layer.bindPopup(popupContent);
}

GEOLOCATOR.goToCoords = function(event){
    if(leafLat.value && leafLong.value){
        let coords = [leafLat.value, leafLong.value]
        GEOLOCATOR.mymap.flyTo(coords,8)
        document.getElementById("currentCoords").innerHTML = "["+coords.toString()+"]"
        window.scrollTo(0, leafletInstanceContainer.offsetTop - 5)
    }
}
               
GEOLOCATOR.getURLVariable = function(variable)
    {
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i=0;i<vars.length;i++) {
                var pair = vars[i].split("=");
                if(pair[0] == variable){return pair[1];}
        }
        return(false);
    }






