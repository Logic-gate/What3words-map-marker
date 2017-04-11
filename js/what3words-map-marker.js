var map;

function MyLocationControl(controlDiv, map) {

    // Set CSS for the control border.
    var controlUI = document.createElement('div');
    controlUI.style.cursor = 'pointer';
    controlUI.style.backgroundColor = '#fff';
    controlUI.style.margin = '0 10px 0 0';
    controlUI.style.borderRadius = '3px';
    controlUI.style.width = '30px';
    controlUI.style.height = '30px';
    controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    // controlUI.innerHTML =  
    controlUI.title = 'My location';
    controlDiv.appendChild(controlUI);

    // Setup the click event listeners: simply set the map to Riyadh.
    controlUI.addEventListener('click', function() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                initialLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
                map.setCenter(initialLocation);
            });
        }
    });

}


function initMap(ret) {
    if (ret != null) {
        var latlng = ret;
    } else {
        var locations = [
            ['شاي كرك', 24.711989, 46.671947, '1.png'],
            ['فطاير ام علي', 24.711989, 43.671516, '2.png'],
            ['جلسة هاشم', 24.711453, 41.671947, 'R.png']
        ];
        var latlng = [24.711989, 46.671947];


    }
    var map = new google.maps.Map(document.getElementById('map'), {
        center: new google.maps.LatLng(latlng[0], latlng[1]),
        zoom: 15,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        zoomControl: true,
        mapTypeControl: false,
        disableDoubleClickZoom: true,
        scaleControl: true,
        streetViewControl: true,
        styles: [{
            "featureType": "administrative",
            "elementType": "all",
            "stylers": [{
                "saturation": "-100"
            }]
        }, {
            "featureType": "administrative.province",
            "elementType": "all",
            "stylers": [{
                "visibility": "off"
            }]
        }, {
            "featureType": "landscape",
            "elementType": "all",
            "stylers": [{
                "saturation": -100
            }, {
                "lightness": 65
            }, {
                "visibility": "on"
            }]
        }, {
            "featureType": "poi",
            "elementType": "all",
            "stylers": [{
                "saturation": -100
            }, {
                "lightness": "50"
            }, {
                "visibility": "simplified"
            }]
        }, {
            "featureType": "road",
            "elementType": "all",
            "stylers": [{
                "saturation": "-100"
            }]
        }, {
            "featureType": "road.highway",
            "elementType": "all",
            "stylers": [{
                "visibility": "simplified"
            }]
        }, {
            "featureType": "road.arterial",
            "elementType": "all",
            "stylers": [{
                "lightness": "30"
            }]
        }, {
            "featureType": "road.local",
            "elementType": "all",
            "stylers": [{
                "lightness": "40"
            }]
        }, {
            "featureType": "transit",
            "elementType": "all",
            "stylers": [{
                "saturation": -100
            }, {
                "visibility": "simplified"
            }]
        }, {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{
                "hue": "#ffff00"
            }, {
                "lightness": -25
            }, {
                "saturation": -97
            }]
        }, {
            "featureType": "water",
            "elementType": "labels",
            "stylers": [{
                "lightness": -25
            }, {
                "saturation": -100
            }]
        }]
    });

    var trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(map);
    setMarkers(map, locations);




    var myLocationControlDiv = document.createElement('div');
    var myLocationControl = new MyLocationControl(myLocationControlDiv, map);

    myLocationControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(myLocationControlDiv);


    // Create the search box and link it to the UI element.
    var input = document.getElementById('pac-input');
    var searchBox = new google.maps.places.SearchBox(input);
    // map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    map.addListener('bounds_changed', function() {
        searchBox.setBounds(map.getBounds());
    });

    var myMarker = new google.maps.Marker({
        position: new google.maps.LatLng(latlng[0], latlng[1]),
        draggable: true,
        icon: 'images/map-marker-icon_move.png'
    });

    var markers = [];
    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.
    searchBox.addListener('places_changed', function() {
        var places = searchBox.getPlaces();

        if (places.length == 0) {
            return;
        }

        // Clear out the old markers.
        markers.forEach(function(marker) {
            marker.setMap(null);
        });
        markers = [];

        var bounds = new google.maps.LatLngBounds();
        place = places[0];

        if (place.geometry.viewport) {
            // Only geocodes have viewport.
            bounds.union(place.geometry.viewport);
        } else {
            bounds.extend(place.geometry.location);
        }

        map.fitBounds(bounds);
        myMarker.setPosition(place.geometry.location);

        what3WordsConvert(place.geometry.location.lat().toFixed(3), place.geometry.location.lng().toFixed(3));
    });

    if (ret != null) {
        setCurrentPosition(map, myMarker, ret);
    } else {
        setCurrentPosition(map, myMarker);
    }



    google.maps.event.addListener(myMarker, 'dragend', function(evt) {
        what3WordsConvert(evt.latLng.lat().toFixed(3), evt.latLng.lng().toFixed(3));
    });

    google.maps.event.addListener(myMarker, 'dragstart', function(evt) {
        document.getElementById('current').innerHTML = "<p>...جاري التحديد</p>";
    });

    //Add marker
    google.maps.event.addListener(map, "dblclick", function(evt) {
        var NewMarker = new google.maps.Marker({
            position: evt.latLng,
            icon: 'images/map-marker-icon-new.png',
            map: map
        });


        var modal = document.getElementById('myModal');

        var span = document.getElementsByClassName("close")[0];
        google.maps.event.addListener(NewMarker, "rightclick", function(event) {
            var lat = event.latLng.lat();
            var lng = event.latLng.lng();
            // populate yor box/field with lat, lng

            modal.style.display = "block";
    
            span.onclick = function() {
                modal.style.display = "none";
            }
            window.onclick = function(event) {
                if (event.target == modal) {
                    modal.style.display = "none";
                }
            }


            document.getElementById("buttonize").onclick = function() {
                if (document.getElementById("newMarkerInput").value.length === 0) {
                    document.getElementById("newMarkerInput").value = 'موقع بلا اسم';
                }
                locations.push([document.getElementById("newMarkerInput").value, evt.latLng.lat(), evt.latLng.lng(), '4.jpg']);
                setMarkers(map, locations);
                modal.style.display = "none";

            }

            document.getElementById("buttonize-cancel").onclick = function() {
                NewMarker = [].setMap(null);
                modal.style.display = "none";

            }



        });

    });




    var longpress = false;
    google.maps.event.addListener(map, 'click', function(evt) {
        (longpress) ? myMarker.setPosition(evt.latLng) & what3WordsConvert(evt.latLng.lat().toFixed(3), evt.latLng.lng().toFixed(3)): console.log("Short Press");


    });

    google.maps.event.addListener(map, 'mousedown', function(evt) {

        start = new Date().getTime();
    });

    google.maps.event.addListener(map, 'mouseup', function(evt) {

        end = new Date().getTime();
        longpress = (end - start < 500) ? false : true;


    });
    map.setCenter(myMarker.position);
    myMarker.setMap(map);


    var hideMarker = document.getElementById('marker-me');
 //   var hideInfo = document.getElementById('info-pannel');
    var w3wBlue = "#0A3049";
    hideMarker.style.backgroundColor = 'white';
//    hideInfo.style.backgroundColor = w3wBlue;
//    hideInfo.style.color = "white";
    hideMarker.addEventListener('click', function() {
        if (hideMarker.style.backgroundColor === "white") {
            myMarker.setMap(null);
            document.getElementById('current').style.visibility = "hidden";
            hideMarker.style.backgroundColor = "#E11F26";
        } else {
            myMarker.setMap(map);
            document.getElementById('current').style.visibility = "visible";
            hideMarker.style.backgroundColor = 'white';

        }
    });

//    hideInfo.addEventListener('click', function() {
//        if (this.style.color === "white") {
//            document.getElementById('current').style.visibility = "hidden";
//            this.style.color = "#E11F26";
//        } else {
//            document.getElementById('current').style.visibility = "visible";
//            this.style.color = "white";

//        }
//    });




}

var what3WordsConvert = function(lat, lng) {
    what3words.positionToWords([lat, lng], function(ret) {
        document.getElementById('current').innerHTML = "<p>" + ret.join('.') + "</p>";
        document.getElementById('pac-input').value = ret.join('.');

    });
}

var convertwords = function(words) {
    what3words.wordsToPosition([words], function(ret) {
        //For preview
        document.getElementById('test').innerHTML = ret;
        initMap(ret);

    });
}

var setCurrentPosition = function(map, marker, ret, set3word) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            if (ret) {
                initialLocation = new google.maps.LatLng(ret[0], ret[1]);
                what3WordsConvert(ret[0], ret[1]);
            } else {
                initialLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            }
            map.setCenter(initialLocation);
            marker.setPosition(initialLocation);
            if (set3word) {
                what3WordsConvert(position.coords.latitude.toFixed(3), position.coords.longitude.toFixed(3));
            }
        });
    }
}

function setMarkers(map, locations) {


    var marker, i

    for (i = 0; i < locations.length; i++) {

        var name = locations[i][0]
        var lat = locations[i][1]
        var lang = locations[i][2]
        var image = locations[i][3]



        latlngset = new google.maps.LatLng(lat, lang);
        var marker = new google.maps.Marker({
            map: map,
            title: name,
            position: latlngset,
            icon: 'images/map-marker-icon.png'
        });
        map.setCenter(marker.getPosition());



        changetowords(name, lat, lang, image, marker)


    }
}


function changetowords(name, lat, lang, image, marker) {
    what3words.positionToWords([lat, lang], function(ret) {
        var content = name + '</br>' + ret.join('.') + '</br><br><img class="img-info" src="images/' + image + '"/>'



        google.maps.event.addListener(marker, 'click', (function(marker, content) {
            return function() {
                var modal = document.getElementById('myModal-info');

        var span = document.getElementsByClassName("close-info")[0];

            // populate yor box/field with lat, lng

            modal.style.display = "block";
            document.getElementById('current').style.visibility = "hidden";
    
            span.onclick = function() {
                modal.style.display = "none";
                document.getElementById('current').style.visibility = "visible";
            }
            window.onclick = function(event) {
                if (event.target == modal) {
                    modal.style.display = "none";
                    document.getElementById('current').style.visibility = "visible";
                }
            }
                document.getElementById('info-p').innerHTML = content;
            };
        })(marker, content));
    });

}


function placeMarker(location) {
    var marker = new google.maps.Marker({
        position: location,
        icon: 'images/map-marker-icon.png',
        map: map
    });
}