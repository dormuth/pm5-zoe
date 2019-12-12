var svgNS = "http://www.w3.org/2000/svg";
var clear = new Boolean(false);
var pm4 = {
    signals: {
    CHANGE: 'change', 
    MONTHCHANGE: 'monthChange',
    CIRCLECLICK: 'circleClick',
    CHECKBOX: 'checkBox'
    }
};

window.addEventListener('load', function () {
    var model = createModel(data); // model
    var controller = createController(model); // controller

var display = createDisplayView(data, model); // view
    var map = createMapView(data, model, display); // view
    var dropdown = createControlsView(model); // view
    

    map.register(controller.dispatch);
    dropdown.register(controller.dispatch);
    display.register(controller.dispatch);

    model.register(map.render);
    model.register(display.displayInfo);
    
    map.render();

});

var makeSignaller = function() {
    var _subscribers = []; // Private member

    // Return the object that's created
    return {
    // Register a function with the notification system
    add: function(handlerFunction) { _subscribers.push(handlerFunction); },

    // Loop through all registered function snad call them with passed
    // arguments
    notify: function(args) {
        for (var i = 0; i < _subscribers.length; i++) {
            _subscribers[i](args);
        }
    }
    };
}

var createModel = function(data) {
    var _observers = makeSignaller();

    var _months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var _monthInd = 0;
    var _parkIndex = 0;
    var _lat, _long;
    var _activityFiltered = [];

    return {
        // Allow views to register for model updates
        register: function(s) {
            _observers.add(s); // adds to subscriber array in MakeSignaller()
        },
        getMonthNames: function() { return _months; },
        changeMonth: function(month) {
            _monthInd = _months.indexOf(month);
            _observers.notify();
        },
        getMonthIndex: function() {
            return _monthInd; // integer i.e. 0 = "January"
        },
        getParkIndex: function() {
            return _parkIndex;
        },
        getActivities: function() {
            return _activityFiltered;
        },
        changeInfo: function(lat, lng) {
            _lat = lat;
            _long = lng;
            for (var i = 0; i < data.length; i++) {
                if (data[i].lat === _lat && data[i].long === _long) {
                    _parkIndex = i;
                }
            }
            _observers.notify();
        },
        changeActivities: function(arr) {
            _activityFiltered = arr;
            _observers.notify();
        }

    }
}

var createController = function(model) {
  // YOUR CODE HERE
  return {
    dispatch: function(evt) {
        switch(evt.type) {
            case(pm4.signals.MONTHCHANGE):
                model.changeMonth(evt.value);
                break;
            case(pm4.signals.CIRCLECLICK):
                model.changeInfo(evt.value1, evt.value2); // lat, lng
                break;
            case(pm4.signals.CHECKBOX):
                model.changeActivities(evt.value);
                break;
            default:
                console.log('Error: Unrecognized event.');
        }
    }
  }
}

var createControlsView = function(model) {
    var _observers = makeSignaller();

    var monthSelector = document.getElementById('month-select');

    for (var i = 0; i < model.getMonthNames().length; i++) {
        monthSelector.options[monthSelector.options.length] = new Option(model.getMonthNames()[i], i);
    }

    var monthVal = "January";

    monthSelector.addEventListener('change', function() {
        _observers.notify({
            type: pm4.signals.MONTHCHANGE, //signals.Xchange
            value: monthSelector.options[monthSelector.selectedIndex].text
        });
    })

    return {
        register: function(s) {
            _observers.add(s);
        }
    }
}

var createMapView = function(data, model, display) {
    var _observers = makeSignaller();

    var map = L.map('map', {
        center: [39.823456, -98.560674], // starting with center of US map (including AL and HI)
        zoom: 2,
        minZoom: 3 // cannot zoom out more than US --> can still drag out of important view --> need to change
    }); 

    var myScale = d3.scaleLinear()
        .domain([0, 1000000])
        .range([5000, 200000]);

    var fillScale = d3.scaleSequential(d3.interpolateGreens)
        .domain([2000000, 0]);

    var opacityScale = d3.scaleLinear()
        .domain([1100000, 0])
        .range([0.3, 1]);

    // map "shape" file
    L.tileLayer('https://api.maptiler.com/maps/basic/{z}/{x}/{y}.png?key=emR4tLv9oTbKvvsnx6GD', {
        attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
    }).addTo(map);

    return {
        render: function() {
            _monthInd = model.getMonthIndex();

            var _acts = model.getActivities(); // selected activities

            var clickCircle;
            var group1 = L.featureGroup();

            // Add all points to map
            for (var i in data) {
                var latlng = L.latLng({ lat: data[i].lat, lng: data[i].long });

                // check if should include point
                var actStr = data[i].activities; //
                var actArr = actStr.split(", "); // all actvities in selected park i

                var col = fillScale(data[i].temporal_data[_monthInd].num_visitors);
                var fill = fillScale(data[i].temporal_data[_monthInd].num_visitors);
                var rad = myScale(data[i].temporal_data[_monthInd].num_visitors)

                for (var j = 0; j < _acts.length; j++) {
                    for (var k = 0; k < actArr.length; k++) {
                        if (_acts[j] === actArr[k]) {
                            col = 'black';
                            fill = 'yellow';
                            opacity = 1;
                        }
                    }
                }

                clickCircle = L.circle( latlng, {
                    weight: 1,
                    color: col,
                    fillColor: fill,
                    fillOpacity: opacityScale(data[i].temporal_data[_monthInd].num_visitors),
                    radius: rad
                } ).addTo(group1); // https://gis.stackexchange.com/questions/195422/create-map-using-leaflet-and-json

                map.addLayer(group1);

                clickCircle.bindPopup(data[i].name + ": " + data[i].description);
                clickCircle.on('click', function (e) {
                    this.openPopup();
                    clear = false;
                    // call function createDisplayView with index passed in
                    _observers.notify({
                        type: pm4.signals.CIRCLECLICK,
                        value1: e['sourceTarget']['_latlng'].lat,
                        value2: e['sourceTarget']['_latlng'].lng

                    })
                    display.displayInfo();
                });
            }

            function onMapClick(e) {
                if (group1 != undefined) {
                    map.removeLayer(group1);
                };

                // Removes previous selected park's data from Display View
                d3.selectAll("text").remove();
                clear = true;
            }

            map.on('click', onMapClick);

            var checkBox = d3.selectAll(".filter-check");
            checkBox.on("change", function() {
                var choices = [];
                var checkboxes = document.querySelectorAll('input[type=checkbox]:checked');
                for (var i = 0; i < checkboxes.length; i++) {
                    choices.push(checkboxes[i].name)
                }

                _observers.notify({
                    type: pm4.signals.CHECKBOX,
                    value: choices
                })
            })
        },
        register: function(s) {
            _observers.add(s);
        }
    }
};

var createDisplayView = function(data, model) {
    // find out which National Park to display --> on click
    var _svg = d3.selectAll('#park');
    var _observers = makeSignaller();

    var _text = _svg.append('g')
        .attr("class", "text")

    // function found from https://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    return {
        displayInfo: function() {
            var index = model.getParkIndex();
            var _monthInd = model.getMonthIndex();

            d3.selectAll("text").remove()

            if (!clear) {

            _text.append('text')
                .attr('x', 10)
                .attr('y', 15)
                .text("National Park: " + data[index].name )

            _text.append('text')
                .attr('x', 10)
                .attr('y', 30)
                .text("Number of Visitors: " + numberWithCommas(data[index].temporal_data[_monthInd].num_visitors)) 

            _text.append('text')
                .attr('x', 10)
                .attr('y', 45)
                .text("Cost (per person/day): $" + data[index].cost)

            _text.append('text')
                .attr('x', 10)
                .attr('y', 60)
                .text("Time of Year: " + data[index].temporal_data[_monthInd].Month) // Should be busiest time of year

            _text.append('text')
                .attr('x', 10)
                .attr('y', 75)
                .text("High (F): " + data[index].temporal_data[_monthInd].High + "  Low (F): " + data[index].temporal_data[_monthInd].Low) // Should be busiest time of year

            _text.append('text')
                .attr('x', 10)
                .attr('y', 90)
                .text("Activities: " + data[index].activities ) // Should be busiest time of year
            }
            
        },
        register: function(s) {
            _observers.add(s);
        }
    }
}



