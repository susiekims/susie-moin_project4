(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

// create empty object to store all methods
var app = {};

// create empty objects/arrays on app object to store the information to be used later on
app.user = {};
app.destination = {};
app.weather = {};
app.currency = {};
app.POIs = [];
app.exchangeRate;
app.tours = [];
app.airport = {};
app.language = {};

// method to init Googlde Autocomplete;
// takes parameter of an id to target specific input tags
app.initAutocomplete = function (id) {
    new google.maps.places.Autocomplete(document.getElementById(id));
};

// most of the APIs we are requesting data from accept location info in the form of lat lng coords
// so we enter the user's input into Google geocoder to get lat and lng coords to use in other API requests
app.getDestinationInfo = function (location) {
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'address': location
    }, function (results, status) {
        // if there is no error, filter the result so that the component is a "country"
        if (status == google.maps.GeocoderStatus.OK) {
            var addressComponents = results[0].address_components.filter(function (component) {
                return component.types[0] === 'country';
            });
            // out of the results of the filter, get the info and populate the app.destination object
            app.destination.countryCode = addressComponents[0].short_name;
            app.destination.countryName = addressComponents[0].long_name;
            app.destination.lat = results[0].geometry.location.lat();
            app.destination.lng = results[0].geometry.location.lng();
            app.getWeather(app.destination.lat, app.destination.lng);
            app.getCurrency(app.destination.countryCode);
            app.getCityCode(app.destination.lat, app.destination.lng);
            app.getLanguage(app.destination.countryCode);
            app.getAirports(app.destination.lat, app.destination.lng);
        } else {
            alert("Something went wrong." + status);
        }
    });
};

// ajax call to get weather
// takes lat and lng coords as parameters
app.getWeather = function (latitude, longitude) {
    $.ajax({
        url: 'https://api.darksky.net/forecast/ea2f7a7bab3daacc9f54f177819fa1d3/' + latitude + ',' + longitude,
        method: 'GET',
        dataType: 'jsonp',
        data: {
            'units': 'auto'
        }
    }).then(function (res) {
        // take result and pull desired information into app.weather object
        app.weather.conditions = res.daily.summary;
        app.weather.currentTemp = Math.round(res.currently.temperature);
        app.weather.icon = res.daily.icon;
        app.displayWeather(app.weather);
    });
};

// i found that the points of interest and tours request works better with a city code instead of lat and lng coords
// method to get city code from lat and lng to use in other ajax requests
app.getCityCode = function (latitude, longitude) {
    $.ajax({
        url: 'https://api.sygictravelapi.com/1.0/en/places/detect-parents',
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'location': latitude + ',' + longitude
        }
    }).then(function (res) {
        console.log(res);
        var data = res.data.places[0];
        console.log(data);

        // we specifically want to target cities
        // if that result is a level smaller than a city, target the next parent ID
        if (data.level !== 'city') {
            var cityCode = data.parent_ids[0];
            console.log(data.parent_ids[0]);
            console.log(cityCode);
            app.getPOIs(cityCode);
            app.getTours(cityCode);
        } else {
            // if the result is a city, just use that id in the other rquests
            var _cityCode = data.id;
            app.getPOIs(_cityCode);
            app.getTours(_cityCode);
        }
    });
};

// method to get POIs (points of interest);
app.getPOIs = function (cityCode) {
    $.ajax({
        url: 'https://api.sygictravelapi.com/1.0/en/places/list',
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'tags_not': 'Airport',
            'parents': cityCode,
            'level': 'poi',
            'limit': 20
        }
    }).then(function (res) {
        var points = res.data.places;

        // we only want results that have an image and a descriptions (perex)
        var filteredPoints = points.filter(function (place) {
            return place.thumbnail_url && place.perex;
        });

        // if there are no results that have an image and a description, call the displayError function
        if (filteredPoints.length === 0) {
            app.displayError('poi', 'points of interest');
        } else {
            // take the first 3 items and push their properties onto the app.POIs object
            filteredPoints.forEach(function (point) {
                var place = {
                    'name': point.name,
                    'description': point.perex,
                    'photo': point.thumbnail_url
                };
                app.POIs.push(place);
            });
            app.displayPOIs(app.POIs);
        }
    });
};
//method to get closest airport
app.getAirports = function (lat, lng) {
    $.ajax({
        url: 'https://api.sygictravelapi.com/1.0/en/places/list',
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'location': lat + ',' + lng,
            'tags': 'Airport'
        }
    }).then(function (res) {
        // push the properties onto app.airport object
        app.airport.name = res.data.places[0].name;
        app.airport.description = res.data.places[0].perex;
        app.airport.photo = res.data.places[0].thumbnail_url;

        // call displayAirports using properties from ajax request
        app.displayAirports(app.airport);
    });
};

// method to get language
app.getLanguage = function (country) {
    $.ajax({
        url: 'https://restcountries.eu/rest/v2/name/' + country,
        method: 'GET',
        dataType: 'json',
        data: {
            fullText: true
        }
    }).then(function (res) {
        console.log(res);
        app.language.primary = res[0].languages[0].name;
        if (res[0].languages.length > 1) {
            app.language.secondary = res[0].languages[1].name;
        }
        app.displayLanguage(app.language);
    });
};

// 
app.getTours = function (cityCode) {
    $.ajax({
        url: 'https://api.sygictravelapi.com/1.0/en/tours/viator',
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'parent_place_id': cityCode
        }
    }).then(function (res) {
        console.log(res);
        var list = res.data.tours;
        console.log(tours);
        var tours = list.filter(function (place) {
            return place.photo_url && place.url;
        });
        if (tours.length === 0) {
            app.displayError('tours', 'tours');
        } else {
            for (var i = 0; i < tours.length; i++) {
                var tour = {
                    name: tours[i].title,
                    photo: tours[i].photo_url,
                    url: tours[i].url
                };
                app.tours.push(tour);
            }
            console.log(app.tours);
            app.displayTours(app.tours);
        }
    });
};

app.getCurrency = function (countryCode) {
    $.ajax({
        url: 'https://restcountries.eu/rest/v2/name/' + countryCode,
        method: 'GET',
        dataType: 'json',
        data: {
            fullText: true
        }
    }).then(function (res) {
        app.currency.code = res[0].currencies[0].code;
        app.currency.symbol = res[0].currencies[0].symbol;
        app.displayCurrency(app.currency);
    });
};

app.convertCurrency = function (userCurrency, destinationCurrency) {
    $.ajax({
        url: 'https://free.currencyconverterapi.com/api/v6/convert',
        method: 'GET',
        dataType: 'json',
        data: {
            q: userCurrency + '_' + destinationCurrency + ',' + destinationCurrency + '_' + userCurrency,
            compact: 'ultra'
        }
    }).then(function (res) {
        console.log(res);
        app.currency.exchangeRate = res[userCurrency + '_' + destinationCurrency];
        console.log(app.currency.exchangeRate);

        $('#currency').append('<h2>$1 ' + userCurrency + ' = ' + app.currency.symbol + ' ' + app.currency.exchangeRate.toFixed(2) + ' ' + destinationCurrency + '</h2>');
    });
};

app.displayError = function (divID, topic) {
    var title = '<h1>' + topic + '</h1>';
    console.log('error');
    $('#' + divID).append(title, '<h2>Sorry, we don\'t have detailed information about ' + topic + ' in this area. Try your search again in a nearby city or related area.</h2>');
};

app.displayCurrency = function (object) {
    var title = '<h3>Currency</h3>';
    var html = '<h2>The currency used is ' + object.symbol + ' ' + object.code + '</h2>';
    var input = '<form id="userCurrency"><input class="userCurrency  type="search" id="user" placeholder="Enter your location."></form>';
    $('#currency').append(title, html, input);
    app.getUserInfo();
};

app.getUserInfo = function () {
    app.initAutocomplete('user');
    $('#userCurrency').on('submit', function (e) {
        e.preventDefault();
        var userLocation = $('#user').val();
        app.getUserLocation(userLocation);
    });
};

app.getUserLocation = function (location) {
    new google.maps.places.Autocomplete(document.getElementById('user'));
    var geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'address': location
    }, function (results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            var addressComponents = results[0].address_components.filter(function (component) {
                return component.types[0] === 'country';
            });
            app.user.countryCode = addressComponents[0].short_name;
            console.log(app.user.countryCode);
        } else {
            alert('Sorry, something went wrong.' + status);
        }
        app.getUserCurrency(app.user.countryCode);
    });
};

app.getUserCurrency = function (countryCode) {
    $.ajax({
        url: 'https://restcountries.eu/rest/v2/name/' + countryCode,
        method: 'GET',
        dataType: 'json',
        data: {
            fullText: true
        }
    }).then(function (res) {
        app.user.code = res[0].currencies[0].code;
        console.log(app.user.code);
        app.convertCurrency(app.user.code, app.currency.code);
    });
};

app.displayLanguage = function (object) {
    console.log(object.name, object.nativeName);
    var title = '<h3>Language</h3>';
    var primary = '<h2>Primary</h2><h4>' + object.primary + '</h4>';
    var secondary = '<h2>Secondary</h2><h4>' + object.secondary + '</h4>';
    $('#language').append(title, primary);
    if (object.secondary !== undefined) {
        $('#language').append(secondary);
    }
};

app.displayAirports = function (object) {
    var title = '<h3>Closest Airport</h3>';
    var name = '<h4>' + object.name + '</h4>';
    // const desc = `<p>${object.description}</p>`;
    // const photo = `<img src="${object.photo}"/>`;
    $('#airport').append(title, name);
};

// method to display tours
// i realized when there's a lot of results, it's not ideal for mobile users
// so i tried some simple "pagination" when the screen width is less than 600px
// create 2 variables, one to act as a "counter" and one to dictate results per page
// when user clicks 'load more', it appends the next three results, removes the button, and appends a new button at the end of the new results
app.displayTours = function (array) {
    var title = '<h3>Top Tours</h3>';
    $('#tours').append(title);

    if ($(window).width() <= 600) {
        var counter = 0;
        var resultsPerPage = 3;
        for (var i = counter; i < resultsPerPage; i++) {
            var div = $('<div class="clearfix hvr-shadow">');
            var name = '<h2>' + array[i].name + '<h2>';
            var photo = '<img class="hvr-grow-shadow" src="' + array[i].photo + '">';
            var link = '<a class="hvr-underline-from-center" href="' + array.url + '">Book Now</a>';

            var text = $('<div>').append(name, link);
            div.append(photo, text);
            $('#tours').append(div);
        }

        var loadMore = '<button class="loadMore hvr-grow-shadow">Load More</button>';
        $('#tours').append(loadMore);
        $('#tours').on('click', '.loadMore', function () {
            this.remove();
            counter += 3;
            for (var _i = counter; _i < counter + resultsPerPage; _i++) {
                var _div = $('<div class="clearfix hvr-shadow">');
                var _name = '<h2>' + array[_i].name + '<h2>';
                var _photo = '<img class="hvr-grow-shadow"  src="' + array[_i].photo + '">';
                var _link = '<a class="hvr-underline-from-center" href="' + array.url + '">Book Now</a>';

                var _text = $('<div>').append(_name, _link);
                _div.append(_photo, _text);
                $('#tours').append(_div);
            }
            $('#tours').append(loadMore);
        });

        // if screen width is not less than 600px, append elements normally
    } else {
        array.forEach(function (item) {
            var div = $('<div class="clearfix hvr-shadow">');
            var name = '<h2>' + item.name + '<h2>';
            var photo = '<img class="hvr-grow-shadow" src="' + item.photo + '">';
            var link = '<a class="hvr-underline-from-center" href="' + item.url + '">Book Now</a>';
            var text = $('<div>').append(name, link);
            div.append(photo, text);
            $('#tours').append(div);
        });
    }
};

// method to display points of interest
// same "pagination" system as tours
app.displayPOIs = function (array) {
    var title = '<h3>Points of Interest</h3>';
    $('#poi').append(title);
    if ($(window).width() <= 600) {
        var counter = 0;
        var resultsPerPage = 3;
        for (var i = counter; i < resultsPerPage; i++) {
            var div = $('<div class="clearfix hvr-shadow">');
            var name = '<h2>' + array[i].name + '<h2>';
            var desc = '<p>' + array[i].description + '</p>';
            var photo = '<img class="hvr-grow-shadow" src="' + array[i].photo + '">';
            var text = $('<div>').append(name, desc);

            div.append(photo, text);
            $('#poi').append(div);
        }

        var loadMore = '<button class="loadMore hvr-grow-shadow">Load More</button>';
        $('#poi').append(loadMore);

        $('#poi').on('click', '.loadMore', function () {
            this.remove();
            counter += 3;
            for (var _i2 = counter; _i2 < counter + resultsPerPage; _i2++) {
                var _div2 = $('<div class="clearfix hvr-shadow">');
                var _name2 = '<h2>' + array[_i2].name + '<h2>';
                var _desc = '<p>' + array[_i2].description + '</p>';
                var _photo2 = '<img class="hvr-grow-shadow" src="' + array[_i2].photo + '">';
                var _text2 = $('<div>').append(_name2, _desc);

                _div2.append(_photo2, _text2);
                $('#poi').append(_div2);
            }
            $('#poi').append(loadMore);
        });
        // else just append all the results normally
    } else {
        array.forEach(function (item) {
            var div = $('<div class="clearfix hvr-shadow">');
            var name = '<h2>' + item.name + '<h2>';
            var desc = '<p>' + item.description + '</p>';
            var photo = '<img class="hvr-grow-shadow" src="' + item.photo + '">';
            var text = $('<div>').append(name, desc);
            div.append(photo, text);
            $('#poi').append(div);
        });
    }
};

app.displayWeather = function (object) {
    var title = '<h3>Weather</h3>';
    var icon = '<canvas id="' + object.icon + '" width="80" height="80"></canvas>';
    var html = '<h2>Currently:</h2> \n    <h4>' + object.currentTemp + '</h4>\n        <p class="weatherText">' + object.conditions + '</p>';
    $('#weather').append(title, icon, html);
    app.loadIcons();
};

app.randomHero = function () {
    var i = Math.floor(Math.random() * 5) + 1;
    console.log(i);
    $('.splashPage').css({
        'background': 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("../../public/assets/hero' + i + '.jpg")',
        'background-position': 'center',
        'background-size': 'cover'
    });
};

app.loadIcons = function () {
    var icons = new Skycons({ "color": "black" });
    icons.set("clear-day", Skycons.CLEAR_DAY);
    icons.set("clear-night", Skycons.CLEAR_NIGHT);
    icons.set("partly-cloudy-day", Skycons.PARTLY_CLOUDY_DAY);
    icons.set("partly-cloudy-night", Skycons.PARTLY_CLOUDY_NIGHT);
    icons.set("cloudy", Skycons.CLOUDY);
    icons.set("rain", Skycons.RAIN);
    icons.set("sleet", Skycons.SLEET);
    icons.set("snow", Skycons.SNOW);
    icons.set("wind", Skycons.WIND);
    icons.set("fog", Skycons.FOG);
    icons.play();
};

app.events = function () {
    app.initAutocomplete('destination');
    $('form').on('submit', function (e) {
        $('#splashPage').toggle(false);
        $('#contentPage').toggle(true);
        $('form').removeClass('splashSearchForm');
        $('#destination').removeClass('splashSearchBar');
        $('form').addClass('contentSearchForm');
        $('#destination').addClass('contentSearchBar');
        e.preventDefault();
        $('div').empty();
        var destination = $('#destination').val();
        if (destination.length > 0) {
            $('#destinationName').text(destination);
            app.getDestinationInfo(destination);
        }
        $('#destination').val('');
        app.destination = {};
        app.weather = {};
        app.currency = {};
        app.POIs = [];
        app.exchangeRate;
        app.tours = [];
        app.airport = {};
        app.languages = {};
    });
};

app.init = function () {
    app.randomHero();
    app.initAutocomplete('destination');
    $('#contentPage').toggle(false);
    app.events();
};

$(function () {
    console.log("ready!");
    app.init();
});

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYvc2NyaXB0cy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNBQTtBQUNBLElBQU0sTUFBTSxFQUFaOztBQUVBO0FBQ0EsSUFBSSxJQUFKLEdBQVcsRUFBWDtBQUNBLElBQUksV0FBSixHQUFrQixFQUFsQjtBQUNBLElBQUksT0FBSixHQUFjLEVBQWQ7QUFDQSxJQUFJLFFBQUosR0FBYyxFQUFkO0FBQ0EsSUFBSSxJQUFKLEdBQVcsRUFBWDtBQUNBLElBQUksWUFBSjtBQUNBLElBQUksS0FBSixHQUFZLEVBQVo7QUFDQSxJQUFJLE9BQUosR0FBYyxFQUFkO0FBQ0EsSUFBSSxRQUFKLEdBQWUsRUFBZjs7QUFHQTtBQUNBO0FBQ0EsSUFBSSxnQkFBSixHQUF1QixVQUFDLEVBQUQsRUFBUTtBQUMzQixRQUFJLE9BQU8sSUFBUCxDQUFZLE1BQVosQ0FBbUIsWUFBdkIsQ0FBb0MsU0FBUyxjQUFULENBQXdCLEVBQXhCLENBQXBDO0FBQ0gsQ0FGRDs7QUFJQTtBQUNBO0FBQ0EsSUFBSSxrQkFBSixHQUF5QixVQUFDLFFBQUQsRUFBYztBQUNuQyxRQUFNLFdBQVcsSUFBSSxPQUFPLElBQVAsQ0FBWSxRQUFoQixFQUFqQjtBQUNBLGFBQVMsT0FBVCxDQUFpQjtBQUNiLG1CQUFXO0FBREUsS0FBakIsRUFFRyxVQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO0FBQ3BCO0FBQ0EsWUFBSSxVQUFVLE9BQU8sSUFBUCxDQUFZLGNBQVosQ0FBMkIsRUFBekMsRUFBNkM7QUFDekMsZ0JBQU0sb0JBQW9CLFFBQVEsQ0FBUixFQUFXLGtCQUFYLENBQThCLE1BQTlCLENBQXFDLFVBQUMsU0FBRCxFQUFlO0FBQzFFLHVCQUFPLFVBQVUsS0FBVixDQUFnQixDQUFoQixNQUF1QixTQUE5QjtBQUNILGFBRnlCLENBQTFCO0FBR0E7QUFDQSxnQkFBSSxXQUFKLENBQWdCLFdBQWhCLEdB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QjtBQUNIO0FBQ0QsVUFBRSxjQUFGLEVBQWtCLEdBQWxCLENBQXNCLEVBQXRCO0FBQ0EsWUFBSSxXQUFKLEdBQWtCLEVBQWxCO0FBQ0EsWUFBSSxPQUFKLEdBQWMsRUFBZDtBQUNBLFlBQUksUUFBSixHQUFjLEVBQWQ7QUFDQSxZQUFJLElBQUosR0FBVyxFQUFYO0FBQ0EsWUFBSSxZQUFKO0FBQ0EsWUFBSSxLQUFKLEdBQVksRUFBWjtBQUNBLFlBQUksT0FBSixHQUFjLEVBQWQ7QUFDQSxZQUFJLFNBQUosR0FBZ0IsRUFBaEI7QUFDSCxLQXZCRDtBQXdCSCxDQTFCRDs7QUE0QkEsSUFBSSxJQUFKLEdBQVcsWUFBTTtBQUNiLFFBQUksVUFBSjtBQUNBLFFBQUksZ0JBQUosQ0FBcUIsYUFBckI7QUFDQSxNQUFFLGNBQUYsRUFBa0IsTUFBbEIsQ0FBeUIsS0FBekI7QUFDQSxRQUFJLE1BQUo7QUFDSCxDQUxEOztBQU9BLEVBQUUsWUFBWTtBQUNWLFlBQVEsR0FBUixDQUFZLFFBQVo7QUFDQSxRQUFJLElBQUo7QUFDSCxDQUhEIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiLy8gY3JlYXRlIGVtcHR5IG9iamVjdCB0byBzdG9yZSBhbGwgbWV0aG9kc1xuY29uc3QgYXBwID0ge307XG5cbi8vIGNyZWF0ZSBlbXB0eSBvYmplY3RzL2FycmF5cyBvbiBhcHAgb2JqZWN0IHRvIHN0b3JlIHRoZSBpbmZvcm1hdGlvbiB0byBiZSB1c2VkIGxhdGVyIG9uXG5hcHAudXNlciA9IHt9O1xuYXBwLmRlc3RpbmF0aW9uID0ge307XG5hcHAud2VhdGhlciA9IHt9O1xuYXBwLmN1cnJlbmN5PSB7fTtcbmFwcC5QT0lzID0gW107XG5hcHAuZXhjaGFuZ2VSYXRlO1xuYXBwLnRvdXJzID0gW107XG5hcHAuYWlycG9ydCA9IHt9O1xuYXBwLmxhbmd1YWdlID0ge307XG5cblxuLy8gbWV0aG9kIHRvIGluaXQgR29vZ2xkZSBBdXRvY29tcGxldGU7XG4vLyB0YWtlcyBwYXJhbWV0ZXIgb2YgYW4gaWQgdG8gdGFyZ2V0IHNwZWNpZmljIGlucHV0IHRhZ3NcbmFwcC5pbml0QXV0b2NvbXBsZXRlID0gKGlkKSA9PiB7XG4gICAgbmV3IGdvb2dsZS5tYXBzLnBsYWNlcy5BdXRvY29tcGxldGUoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpKTtcbn1cblxuLy8gbW9zdCBvZiB0aGUgQVBJcyB3ZSBhcmUgcmVxdWVzdGluZyBkYXRhIGZyb20gYWNjZXB0IGxvY2F0aW9uIGluZm8gaW4gdGhlIGZvcm0gb2YgbGF0IGxuZyBjb29yZHNcbi8vIHNvIHdlIGVudGVyIHRoZSB1c2VyJ3MgaW5wdXQgaW50byBHb29nbGUgZ2VvY29kZXIgdG8gZ2V0IGxhdCBhbmQgbG5nIGNvb3JkcyB0byB1c2UgaW4gb3RoZXIgQVBJIHJlcXVlc3RzXG5hcHAuZ2V0RGVzdGluYXRpb25JbmZvID0gKGxvY2F0aW9uKSA9PiB7XG4gICAgY29uc3QgZ2VvY29kZXIgPSBuZXcgZ29vZ2xlLm1hcHMuR2VvY29kZXIoKTtcbiAgICBnZW9jb2Rlci5nZW9jb2RlKHtcbiAgICAgICAgJ2FkZHJlc3MnOiBsb2NhdGlvblxuICAgIH0sIChyZXN1bHRzLCBzdGF0dXMpID0+IHtcbiAgICAgICAgLy8gaWYgdGhlcmUgaXMgbm8gZXJyb3IsIGZpbHRlciB0aGUgcmVzdWx0IHNvIHRoYXQgdGhlIGNvbXBvbmVudCBpcyBhIFwiY291bnRyeVwiXG4gICAgICAgIGlmIChzdGF0dXMgPT0gZ29vZ2xlLm1hcHMuR2VvY29kZXJTdGF0dXMuT0spIHtcbiAgICAgICAgICAgIGNvbnN0IGFkZHJlc3NDb21wb25lbnRzID0gcmVzdWx0c1swXS5hZGRyZXNzX2NvbXBvbmVudHMuZmlsdGVyKChjb21wb25lbnQpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29tcG9uZW50LnR5cGVzWzBdID09PSAnY291bnRyeSc7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vIG91dCBvZiB0aGUgcmVzdWx0cyBvZiB0aGUgZmlsdGVyLCBnZXQgdGhlIGluZm8gYW5kIHBvcHVsYXRlIHRoZSBhcHAuZGVzdGluYXRpb24gb2JqZWN0XG4gICAgICAgICAgICBhcHAuZGVzdGluYXRpb24uY291bnRyeUNvZGUgPSBhZGRyZXNzQ29tcG9uZW50c1swXS5zaG9ydF9uYW1lO1xuICAgICAgICAgICAgYXBwLmRlc3RpbmF0aW9uLmNvdW50cnlOYW1lID0gYWRkcmVzc0NvbXBvbmVudHNbMF0ubG9uZ19uYW1lO1xuICAgICAgICAgICAgYXBwLmRlc3RpbmF0aW9uLmxhdCA9IHJlc3VsdHNbMF0uZ2VvbWV0cnkubG9jYXRpb24ubGF0KCk7XG4gICAgICAgICAgICBhcHAuZGVzdGluYXRpb24ubG5nID0gcmVzdWx0c1swXS5nZW9tZXRyeS5sb2NhdGlvbi5sbmcoKTtcbiAgICAgICAgICAgIGFwcC5nZXRXZWF0aGVyKGFwcC5kZXN0aW5hdGlvbi5sYXQsIGFwcC5kZXN0aW5hdGlvbi5sbmcpO1xuICAgICAgICAgICAgYXBwLmdldEN1cnJlbmN5KGFwcC5kZXN0aW5hdGlvbi5jb3VudHJ5Q29kZSk7XG4gICAgICAgICAgICBhcHAuZ2V0Q2l0eUNvZGUoYXBwLmRlc3RpbmF0aW9uLmxhdCwgYXBwLmRlc3RpbmF0aW9uLmxuZyk7XG4gICAgICAgICAgICBhcHAuZ2V0TGFuZ3VhZ2UoYXBwLmRlc3RpbmF0aW9uLmNvdW50cnlDb2RlKTtcbiAgICAgICAgICAgIGFwcC5nZXRBaXJwb3J0cyhhcHAuZGVzdGluYXRpb24ubGF0LCBhcHAuZGVzdGluYXRpb24ubG5nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFsZXJ0KFwiU29tZXRoaW5nIHdlbnQgd3JvbmcuXCIgKyBzdGF0dXMpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cblxuLy8gYWpheCBjYWxsIHRvIGdldCB3ZWF0aGVyXG4vLyB0YWtlcyBsYXQgYW5kIGxuZyBjb29yZHMgYXMgcGFyYW1ldGVyc1xuYXBwLmdldFdlYXRoZXIgPSAobGF0aXR1ZGUsIGxvbmdpdHVkZSkgPT4ge1xuICAgICQuYWpheCh7XG4gICAgICAgIHVybDogYGh0dHBzOi8vYXBpLmRhcmtza3kubmV0L2ZvcmVjYXN0L2VhMmY3YTdiYWIzZGFhY2M5ZjU0ZjE3NzgxOWZhMWQzLyR7bGF0aXR1ZGV9LCR7bG9uZ2l0dWRlfWAsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbnAnLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAndW5pdHMnOiAnYXV0bydcbiAgICAgICAgfVxuICAgIH0pXG4gICAgLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICAvLyB0YWtlIHJlc3VsdCBhbmQgcHVsbCBkZXNpcmVkIGluZm9ybWF0aW9uIGludG8gYXBwLndlYXRoZXIgb2JqZWN0XG4gICAgICAgIGFwcC53ZWF0aGVyLmNvbmRpdGlvbnMgPSByZXMuZGFpbHkuc3VtbWFyeTtcbiAgICAgICAgYXBwLndlYXRoZXIuY3VycmVudFRlbXAgPSBNYXRoLnJvdW5kKHJlcy5jdXJyZW50bHkudGVtcGVyYXR1cmUpO1xuICAgICAgICBhcHAud2VhdGhlci5pY29uID0gcmVzLmRhaWx5Lmljb247XG4gICAgICAgIGFwcC5kaXNwbGF5V2VhdGhlcihhcHAud2VhdGhlcik7XG4gICAgICAgIFxuICAgIH0pO1xufVxuXG4vLyBpIGZvdW5kIHRoYXQgdGhlIHBvaW50cyBvZiBpbnRlcmVzdCBhbmQgdG91cnMgcmVxdWVzdCB3b3JrcyBiZXR0ZXIgd2l0aCBhIGNpdHkgY29kZSBpbnN0ZWFkIG9mIGxhdCBhbmQgbG5nIGNvb3Jkc1xuLy8gbWV0aG9kIHRvIGdldCBjaXR5IGNvZGUgZnJvbSBsYXQgYW5kIGxuZyB0byB1c2UgaW4gb3RoZXIgYWpheCByZXF1ZXN0c1xuYXBwLmdldENpdHlDb2RlID0gKGxhdGl0dWRlLCBsb25naXR1ZGUpID0+IHtcbiAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6IGBodHRwczovL2FwaS5zeWdpY3RyYXZlbGFwaS5jb20vMS4wL2VuL3BsYWNlcy9kZXRlY3QtcGFyZW50c2AsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICd4LWFwaS1rZXknOiAnenppSlljamxtRThMYldIZHZVNXZDOFVjU0Z2S0VQc0MzbmtBbDdlSydcbiAgICAgICAgfSxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgJ2xvY2F0aW9uJzogYCR7bGF0aXR1ZGV9LCR7bG9uZ2l0dWRlfWBcbiAgICAgICAgfVxuICAgIH0pXG4gICAgLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICBjb25zb2xlLmxvZyhyZXMpO1xuICAgICAgICBjb25zdCBkYXRhID0gcmVzLmRhdGEucGxhY2VzWzBdO1xuICAgICAgICBjb25zb2xlLmxvZyhkYXRhKTtcblxuICAgICAgICAvLyB3ZSBzcGVjaWZpY2FsbHkgd2FudCB0byB0YXJnZXQgY2l0aWVzXG4gICAgICAgIC8vIGlmIHRoYXQgcmVzdWx0IGlzIGEgbGV2ZWwgc21hbGxlciB0aGFuIGEgY2l0eSwgdGFyZ2V0IHRoZSBuZXh0IHBhcmVudCBJRFxuICAgICAgICBpZiAoZGF0YS5sZXZlbCAhPT0gJ2NpdHknKSB7XG4gICAgICAgICAgICBjb25zdCBjaXR5Q29kZSA9IGRhdGEucGFyZW50X2lkc1swXTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGRhdGEucGFyZW50X2lkc1swXSk7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhjaXR5Q29kZSk7XG4gICAgICAgICAgICBhcHAuZ2V0UE9JcyhjaXR5Q29kZSk7XG4gICAgICAgICAgICBhcHAuZ2V0VG91cnMoY2l0eUNvZGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpZiB0aGUgcmVzdWx0IGlzIGEgY2l0eSwganVzdCB1c2UgdGhhdCBpZCBpbiB0aGUgb3RoZXIgcnF1ZXN0c1xuICAgICAgICAgICAgY29uc3QgY2l0eUNvZGUgPSBkYXRhLmlkOyAgXG4gICAgICAgICAgICBhcHAuZ2V0UE9JcyhjaXR5Q29kZSk7XG4gICAgICAgICAgICBhcHAuZ2V0VG91cnMoY2l0eUNvZGUpO1xuICAgICAgICB9IFxuICAgIH0pO1xufVxuXG4vLyBtZXRob2QgdG8gZ2V0IFBPSXMgKHBvaW50cyBvZiBpbnRlcmVzdCk7XG5hcHAuZ2V0UE9JcyA9IChjaXR5Q29kZSkgPT4ge1xuICAgICQuYWpheCh7XG4gICAgICAgIHVybDogYGh0dHBzOi8vYXBpLnN5Z2ljdHJhdmVsYXBpLmNvbS8xLjAvZW4vcGxhY2VzL2xpc3RgLFxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAneC1hcGkta2V5JzogJ3p6aUpZY2psbUU4TGJXSGR2VTV2QzhVY1NGdktFUHNDM25rQWw3ZUsnXG4gICAgICAgIH0sXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICd0YWdzX25vdCc6ICdBaXJwb3J0JyxcbiAgICAgICAgICAgICdwYXJlbnRzJzogY2l0eUNvZGUsXG4gICAgICAgICAgICAnbGV2ZWwnOiAncG9pJyxcbiAgICAgICAgICAgICdsaW1pdCc6IDIwLFxuICAgICAgICB9XG4gICAgfSkudGhlbigocmVzKT0+IHtcbiAgICAgICAgY29uc3QgcG9pbnRzID0gcmVzLmRhdGEucGxhY2VzO1xuXG4gICAgICAgIC8vIHdlIG9ubHkgd2FudCByZXN1bHRzIHRoYXQgaGF2ZSBhbiBpbWFnZSBhbmQgYSBkZXNjcmlwdGlvbnMgKHBlcmV4KVxuICAgICAgICBjb25zdCBmaWx0ZXJlZFBvaW50cyA9IHBvaW50cy5maWx0ZXIoKHBsYWNlKT0+IHtcbiAgICAgICAgICAgIHJldHVybiBwbGFjZS50aHVtYm5haWxfdXJsICYmIHBsYWNlLnBlcmV4XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIGlmIHRoZXJlIGFyZSBubyByZXN1bHRzIHRoYXQgaGF2ZSBhbiBpbWFnZSBhbmQgYSBkZXNjcmlwdGlvbiwgY2FsbCB0aGUgZGlzcGxheUVycm9yIGZ1bmN0aW9uXG4gICAgICAgIGlmIChmaWx0ZXJlZFBvaW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGFwcC5kaXNwbGF5RXJyb3IoJ3BvaScsICdwb2ludHMgb2YgaW50ZXJlc3QnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHRha2UgdGhlIGZpcnN0IDMgaXRlbXMgYW5kIHB1c2ggdGhlaXIgcHJvcGVydGllcyBvbnRvIHRoZSBhcHAuUE9JcyBvYmplY3RcbiAgICAgICAgICAgIGZpbHRlcmVkUG9pbnRzLmZvckVhY2goKHBvaW50KT0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBwbGFjZSA9IHtcbiAgICAgICAgICAgICAgICAgICAgJ25hbWUnOiBwb2ludC5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAnZGVzY3JpcHRpb24nOiBwb2ludC5wZXJleCxcbiAgICAgICAgICAgICAgICAgICAgJ3Bob3RvJzogcG9pbnQudGh1bWJuYWlsX3VybCxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGFwcC5QT0lzLnB1c2gocGxhY2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhcHAuZGlzcGxheVBPSXMoYXBwLlBPSXMpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG4vL21ldGhvZCB0byBnZXQgY2xvc2VzdCBhaXJwb3J0XG5hcHAuZ2V0QWlycG9ydHMgPSAobGF0LCBsbmcpID0+IHtcbiAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6IGBodHRwczovL2FwaS5zeWdpY3RyYXZlbGFwaS5jb20vMS4wL2VuL3BsYWNlcy9saXN0YCxcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgJ3gtYXBpLWtleSc6ICd6emlKWWNqbG1FOExiV0hkdlU1dkM4VWNTRnZLRVBzQzNua0FsN2VLJ1xuICAgICAgICB9LFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAnbG9jYXRpb24nOiBgJHtsYXR9LCR7bG5nfWAsXG4gICAgICAgICAgICAndGFncyc6ICdBaXJwb3J0JyxcbiAgICAgICAgfVxuICAgIH0pIC50aGVuICgocmVzKSA9PiB7XG4gICAgICAgIC8vIHB1c2ggdGhlIHByb3BlcnRpZXMgb250byBhcHAuYWlycG9ydCBvYmplY3RcbiAgICAgICAgYXBwLmFpcnBvcnQubmFtZSA9IHJlcy5kYXRhLnBsYWNlc1swXS5uYW1lO1xuICAgICAgICBhcHAuYWlycG9ydC5kZXNjcmlwdGlvbiA9IHJlcy5kYXRhLnBsYWNlc1swXS5wZXJleDtcbiAgICAgICAgYXBwLmFpcnBvcnQucGhvdG8gPSByZXMuZGF0YS5wbGFjZXNbMF0udGh1bWJuYWlsX3VybDtcblxuICAgICAgICAvLyBjYWxsIGRpc3BsYXlBaXJwb3J0cyB1c2luZyBwcm9wZXJ0aWVzIGZyb20gYWpheCByZXF1ZXN0XG4gICAgICAgIGFwcC5kaXNwbGF5QWlycG9ydHMoYXBwLmFpcnBvcnQpO1xuICAgIH0pO1xufVxuXG4vLyBtZXRob2QgdG8gZ2V0IGxhbmd1YWdlXG5hcHAuZ2V0TGFuZ3VhZ2UgPSAoY291bnRyeSkgPT4ge1xuICAgICQuYWpheCh7XG4gICAgICAgIHVybDogYGh0dHBzOi8vcmVzdGNvdW50cmllcy5ldS9yZXN0L3YyL25hbWUvJHtjb3VudHJ5fWAsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGZ1bGxUZXh0OiB0cnVlXG4gICAgICAgIH1cbiAgICB9KSAudGhlbigocmVzKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKHJlcyk7XG4gICAgICAgIGFwcC5sYW5ndWFnZS5wcmltYXJ5ID0gcmVzWzBdLmxhbmd1YWdlc1swXS5uYW1lO1xuICAgICAgICBpZiAocmVzWzBdLmxhbmd1YWdlcy5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICBhcHAubGFuZ3VhZ2Uuc2Vjb25kYXJ5ID0gcmVzWzBdLmxhbmd1YWdlc1sxXS5uYW1lO1xuICAgICAgICB9XG4gICAgICAgIGFwcC5kaXNwbGF5TGFuZ3VhZ2UoYXBwLmxhbmd1YWdlKTtcbiAgICB9KTtcblxufVxuXG4vLyBcbmFwcC5nZXRUb3VycyA9IChjaXR5Q29kZSkgPT4ge1xuICAgICQuYWpheCh7XG4gICAgICAgIHVybDogYGh0dHBzOi8vYXBpLnN5Z2ljdHJhdmVsYXBpLmNvbS8xLjAvZW4vdG91cnMvdmlhdG9yYCxcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgJ3gtYXBpLWtleSc6ICd6emlKWWNqbG1FOExiV0hkdlU1dkM4VWNTRnZLRVBzQzNua0FsN2VLJ1xuICAgICAgICB9LFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAncGFyZW50X3BsYWNlX2lkJzogY2l0eUNvZGVcbiAgICAgICAgfVxuICAgfSkudGhlbigocmVzKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKHJlcyk7XG4gICAgICAgIGNvbnN0IGxpc3QgPSByZXMuZGF0YS50b3VycztcbiAgICAgICAgY29uc29sZS5sb2codG91cnMpO1xuICAgICAgICBjb25zdCB0b3VycyA9IGxpc3QuZmlsdGVyKChwbGFjZSk9PiB7XG4gICAgICAgICAgICByZXR1cm4gcGxhY2UucGhvdG9fdXJsICYmIHBsYWNlLnVybFxuICAgICAgICB9KTtcbiAgICAgICAgaWYgKHRvdXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgYXBwLmRpc3BsYXlFcnJvcigndG91cnMnLCAndG91cnMnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdG91cnMubGVuZ3RoOyBpICsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdG91ciA9IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogdG91cnNbaV0udGl0bGUsXG4gICAgICAgICAgICAgICAgICAgIHBob3RvOiB0b3Vyc1tpXS5waG90b191cmwsXG4gICAgICAgICAgICAgICAgICAgIHVybDogdG91cnNbaV0udXJsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBhcHAudG91cnMucHVzaCh0b3VyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGFwcC50b3Vycyk7XG4gICAgICAgICAgICBhcHAuZGlzcGxheVRvdXJzKGFwcC50b3Vycyk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuYXBwLmdldEN1cnJlbmN5ID0gKGNvdW50cnlDb2RlKSA9PiB7XG4gICAgJC5hamF4KHtcbiAgICAgICAgdXJsOiBgaHR0cHM6Ly9yZXN0Y291bnRyaWVzLmV1L3Jlc3QvdjIvbmFtZS8ke2NvdW50cnlDb2RlfWAsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGZ1bGxUZXh0OiB0cnVlXG4gICAgICAgIH1cbiAgICB9KS50aGVuKChyZXMpID0+IHtcbiAgICAgICAgYXBwLmN1cnJlbmN5LmNvZGUgPSByZXNbMF0uY3VycmVuY2llc1swXS5jb2RlO1xuICAgICAgICBhcHAuY3VycmVuY3kuc3ltYm9sID0gcmVzWzBdLmN1cnJlbmNpZXNbMF0uc3ltYm9sO1xuICAgICAgICBhcHAuZGlzcGxheUN1cnJlbmN5KGFwcC5jdXJyZW5jeSk7XG4gICAgfSk7XG59ICAgIFxuXG5hcHAuY29udmVydEN1cnJlbmN5ID0gKHVzZXJDdXJyZW5jeSwgZGVzdGluYXRpb25DdXJyZW5jeSkgPT4ge1xuICAgICQuYWpheCh7XG4gICAgICAgIHVybDogYGh0dHBzOi8vZnJlZS5jdXJyZW5jeWNvbnZlcnRlcmFwaS5jb20vYXBpL3Y2L2NvbnZlcnRgLFxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBxOiBgJHt1c2VyQ3VycmVuY3l9XyR7ZGVzdGluYXRpb25DdXJyZW5jeX0sJHtkZXN0aW5hdGlvbkN1cnJlbmN5fV8ke3VzZXJDdXJyZW5jeX1gLFxuICAgICAgICAgICAgY29tcGFjdDogJ3VsdHJhJ1xuICAgICAgICB9XG4gICAgfSkudGhlbigocmVzKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKHJlcyk7XG4gICAgICAgIGFwcC5jdXJyZW5jeS5leGNoYW5nZVJhdGUgPSByZXNbYCR7dXNlckN1cnJlbmN5fV8ke2Rlc3RpbmF0aW9uQ3VycmVuY3l9YF07XG4gICAgICAgIGNvbnNvbGUubG9nKGFwcC5jdXJyZW5jeS5leGNoYW5nZVJhdGUpO1xuXG4gICAgICAgICQoJyNjdXJyZW5jeScpLmFwcGVuZChgPGgyPiQxICR7dXNlckN1cnJlbmN5fSA9ICR7YXBwLmN1cnJlbmN5LnN5bWJvbH0gJHthcHAuY3VycmVuY3kuZXhjaGFuZ2VSYXRlLnRvRml4ZWQoMil9ICR7ZGVzdGluYXRpb25DdXJyZW5jeX08L2gyPmApXG5cbiAgICB9KTtcbn1cblxuYXBwLmRpc3BsYXlFcnJvciA9IChkaXZJRCwgdG9waWMpID0+IHtcbiAgICBjb25zdCB0aXRsZSA9IGA8aDE+JHt0b3BpY308L2gxPmA7XG4gICAgY29uc29sZS5sb2coJ2Vycm9yJyk7XG4gICAgJChgIyR7ZGl2SUR9YCkuYXBwZW5kKHRpdGxlLCBgPGgyPlNvcnJ5LCB3ZSBkb24ndCBoYXZlIGRldGFpbGVkIGluZm9ybWF0aW9uIGFib3V0ICR7dG9waWN9IGluIHRoaXMgYXJlYS4gVHJ5IHlvdXIgc2VhcmNoIGFnYWluIGluIGEgbmVhcmJ5IGNpdHkgb3IgcmVsYXRlZCBhcmVhLjwvaDI+YCk7XG59XG5cblxuYXBwLmRpc3BsYXlDdXJyZW5jeSA9IChvYmplY3QpID0+IHtcbiAgICBjb25zdCB0aXRsZSA9IGA8aDM+Q3VycmVuY3k8L2gzPmA7XG4gICAgY29uc3QgaHRtbCA9IGA8aDI+VGhlIGN1cnJlbmN5IHVzZWQgaXMgJHtvYmplY3Quc3ltYm9sfSAke29iamVjdC5jb2RlfTwvaDI+YDtcbiAgICBjb25zdCBpbnB1dCA9IGA8Zm9ybSBpZD1cInVzZXJDdXJyZW5jeVwiPjxpbnB1dCBjbGFzcz1cInVzZXJDdXJyZW5jeSAgdHlwZT1cInNlYXJjaFwiIGlkPVwidXNlclwiIHBsYWNlaG9sZGVyPVwiRW50ZXIgeW91ciBsb2NhdGlvbi5cIj48L2Zvcm0+YDtcbiAgICAkKCcjY3VycmVuY3knKS5hcHBlbmQodGl0bGUsaHRtbCwgaW5wdXQpO1xuICAgIGFwcC5nZXRVc2VySW5mbygpO1xufVxuXG5hcHAuZ2V0VXNlckluZm8gPSAoKSA9PiB7XG4gICAgYXBwLmluaXRBdXRvY29tcGxldGUoJ3VzZXInKTtcbiAgICAkKCcjdXNlckN1cnJlbmN5Jykub24oJ3N1Ym1pdCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCB1c2VyTG9jYXRpb24gPSAkKCcjdXNlcicpLnZhbCgpO1xuICAgICAgICBhcHAuZ2V0VXNlckxvY2F0aW9uKHVzZXJMb2NhdGlvbik7XG4gICAgfSk7XG59XG5cbmFwcC5nZXRVc2VyTG9jYXRpb24gPSAobG9jYXRpb24pID0+IHtcbiAgICBuZXcgZ29vZ2xlLm1hcHMucGxhY2VzLkF1dG9jb21wbGV0ZShkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndXNlcicpKTtcbiAgICBjb25zdCBnZW9jb2RlciA9IG5ldyBnb29nbGUubWFwcy5HZW9jb2RlcigpO1xuICAgIGdlb2NvZGVyLmdlb2NvZGUoe1xuICAgICAgICAnYWRkcmVzcyc6IGxvY2F0aW9uXG4gICAgfSwgKHJlc3VsdHMsIHN0YXR1cykgPT4ge1xuICAgICAgICBpZiAoc3RhdHVzID09IGdvb2dsZS5tYXBzLkdlb2NvZGVyU3RhdHVzLk9LKSB7XG4gICAgICAgICAgICBjb25zdCBhZGRyZXNzQ29tcG9uZW50cyA9IHJlc3VsdHNbMF0uYWRkcmVzc19jb21wb25lbnRzLmZpbHRlcigoY29tcG9uZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvbXBvbmVudC50eXBlc1swXSA9PT0gJ2NvdW50cnknO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBhcHAudXNlci5jb3VudHJ5Q29kZSA9IGFkZHJlc3NDb21wb25lbnRzWzBdLnNob3J0X25hbWU7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhhcHAudXNlci5jb3VudHJ5Q29kZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhbGVydCgnU29ycnksIHNvbWV0aGluZyB3ZW50IHdyb25nLicgKyBzdGF0dXMpXG4gICAgICAgIH1cbiAgICBhcHAuZ2V0VXNlckN1cnJlbmN5KGFwcC51c2VyLmNvdW50cnlDb2RlKTtcbiAgICB9KTsgICAgXG59XG5cbmFwcC5nZXRVc2VyQ3VycmVuY3kgPSAoY291bnRyeUNvZGUpID0+IHtcbiAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6IGBodHRwczovL3Jlc3Rjb3VudHJpZXMuZXUvcmVzdC92Mi9uYW1lLyR7Y291bnRyeUNvZGV9YCxcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgZnVsbFRleHQ6IHRydWVcbiAgICAgICAgfVxuICAgIH0pLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICBhcHAudXNlci5jb2RlID0gcmVzWzBdLmN1cnJlbmNpZXNbMF0uY29kZTtcbiAgICAgICAgY29uc29sZS5sb2coYXBwLnVzZXIuY29kZSk7XG4gICAgICAgIGFwcC5jb252ZXJ0Q3VycmVuY3koYXBwLnVzZXIuY29kZSwgYXBwLmN1cnJlbmN5LmNvZGUpO1xuICAgIH0pO1xufVxuXG5cbmFwcC5kaXNwbGF5TGFuZ3VhZ2UgPSAob2JqZWN0KSA9PiB7XG4gICAgY29uc29sZS5sb2cob2JqZWN0Lm5hbWUsIG9iamVjdC5uYXRpdmVOYW1lKTtcbiAgICBjb25zdCB0aXRsZSA9IGA8aDM+TGFuZ3VhZ2U8L2gzPmA7XG4gICAgY29uc3QgcHJpbWFyeSA9IGA8aDI+UHJpbWFyeTwvaDI+PGg0PiR7b2JqZWN0LnByaW1hcnl9PC9oND5gO1xuICAgIGNvbnN0IHNlY29uZGFyeSA9IGA8aDI+U2Vjb25kYXJ5PC9oMj48aDQ+JHtvYmplY3Quc2Vjb25kYXJ5fTwvaDQ+YDtcbiAgICAkKCcjbGFuZ3VhZ2UnKS5hcHBlbmQodGl0bGUsIHByaW1hcnkpXG4gICAgaWYgKG9iamVjdC5zZWNvbmRhcnkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAkKCcjbGFuZ3VhZ2UnKS5hcHBlbmQoc2Vjb25kYXJ5KTtcbiAgICB9IFxufVxuXG5hcHAuZGlzcGxheUFpcnBvcnRzID0gKG9iamVjdCkgPT4ge1xuICAgIGNvbnN0IHRpdGxlID0gYDxoMz5DbG9zZXN0IEFpcnBvcnQ8L2gzPmA7XG4gICAgY29uc3QgbmFtZSA9IGA8aDQ+JHtvYmplY3QubmFtZX08L2g0PmA7XG4gICAgLy8gY29uc3QgZGVzYyA9IGA8cD4ke29iamVjdC5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAvLyBjb25zdCBwaG90byA9IGA8aW1nIHNyYz1cIiR7b2JqZWN0LnBob3RvfVwiLz5gO1xuICAgICQoJyNhaXJwb3J0JykuYXBwZW5kKHRpdGxlLCBuYW1lKTtcbn1cblxuLy8gbWV0aG9kIHRvIGRpc3BsYXkgdG91cnNcbi8vIGkgcmVhbGl6ZWQgd2hlbiB0aGVyZSdzIGEgbG90IG9mIHJlc3VsdHMsIGl0J3Mgbm90IGlkZWFsIGZvciBtb2JpbGUgdXNlcnNcbi8vIHNvIGkgdHJpZWQgc29tZSBzaW1wbGUgXCJwYWdpbmF0aW9uXCIgd2hlbiB0aGUgc2NyZWVuIHdpZHRoIGlzIGxlc3MgdGhhbiA2MDBweFxuLy8gY3JlYXRlIDIgdmFyaWFibGVzLCBvbmUgdG8gYWN0IGFzIGEgXCJjb3VudGVyXCIgYW5kIG9uZSB0byBkaWN0YXRlIHJlc3VsdHMgcGVyIHBhZ2Vcbi8vIHdoZW4gdXNlciBjbGlja3MgJ2xvYWQgbW9yZScsIGl0IGFwcGVuZHMgdGhlIG5leHQgdGhyZWUgcmVzdWx0cywgcmVtb3ZlcyB0aGUgYnV0dG9uLCBhbmQgYXBwZW5kcyBhIG5ldyBidXR0b24gYXQgdGhlIGVuZCBvZiB0aGUgbmV3IHJlc3VsdHNcbmFwcC5kaXNwbGF5VG91cnMgPSAoYXJyYXkpID0+IHtcbiAgICBjb25zdCB0aXRsZSA9IGA8aDM+VG9wIFRvdXJzPC9oMz5gO1xuICAgICQoJyN0b3VycycpLmFwcGVuZCh0aXRsZSk7XG4gICAgXG4gICAgaWYgKCQod2luZG93KS53aWR0aCgpIDw9IDYwMCkge1x0XG4gICAgICAgIGxldCBjb3VudGVyID0gMDtcbiAgICAgICAgbGV0IHJlc3VsdHNQZXJQYWdlID0gMztcbiAgICAgICAgZm9yIChsZXQgaSA9IGNvdW50ZXI7IGkgPCByZXN1bHRzUGVyUGFnZTsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBkaXYgPSAkKCc8ZGl2IGNsYXNzPVwiY2xlYXJmaXggaHZyLXNoYWRvd1wiPicpO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGA8aDI+JHthcnJheVtpXS5uYW1lfTxoMj5gXG4gICAgICAgICAgICBjb25zdCBwaG90byA9IGA8aW1nIGNsYXNzPVwiaHZyLWdyb3ctc2hhZG93XCIgc3JjPVwiJHthcnJheVtpXS5waG90b31cIj5gO1xuICAgICAgICAgICAgY29uc3QgbGluayA9IGA8YSBjbGFzcz1cImh2ci11bmRlcmxpbmUtZnJvbS1jZW50ZXJcIiBocmVmPVwiJHthcnJheS51cmx9XCI+Qm9vayBOb3c8L2E+YDtcblxuICAgICAgICAgICAgY29uc3QgdGV4dCA9ICQoYDxkaXY+YCkuYXBwZW5kKG5hbWUsIGxpbmspO1xuICAgICAgICAgICAgZGl2LmFwcGVuZChwaG90bywgdGV4dCk7XG4gICAgICAgICAgICAkKCcjdG91cnMnKS5hcHBlbmQoZGl2KTtcbiAgICAgICAgfSAgICBcblxuICAgICAgICBjb25zdCBsb2FkTW9yZSA9IGA8YnV0dG9uIGNsYXNzPVwibG9hZE1vcmUgaHZyLWdyb3ctc2hhZG93XCI+TG9hZCBNb3JlPC9idXR0b24+YDtcbiAgICAgICAgJCgnI3RvdXJzJykuYXBwZW5kKGxvYWRNb3JlKTtcbiAgICAgICAgJCgnI3RvdXJzJykub24oJ2NsaWNrJywgJy5sb2FkTW9yZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmUoKTtcbiAgICAgICAgICAgIGNvdW50ZXIrPTM7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gY291bnRlcjsgaSA8IChjb3VudGVyICsgcmVzdWx0c1BlclBhZ2UpOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkaXYgPSAkKCc8ZGl2IGNsYXNzPVwiY2xlYXJmaXggaHZyLXNoYWRvd1wiPicpO1xuICAgICAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBgPGgyPiR7YXJyYXlbaV0ubmFtZX08aDI+YFxuICAgICAgICAgICAgICAgIGNvbnN0IHBob3RvID0gYDxpbWcgY2xhc3M9XCJodnItZ3Jvdy1zaGFkb3dcIiAgc3JjPVwiJHthcnJheVtpXS5waG90b31cIj5gO1xuICAgICAgICAgICAgICAgIGNvbnN0IGxpbmsgPSBgPGEgY2xhc3M9XCJodnItdW5kZXJsaW5lLWZyb20tY2VudGVyXCIgaHJlZj1cIiR7YXJyYXkudXJsfVwiPkJvb2sgTm93PC9hPmA7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9ICQoYDxkaXY+YCkuYXBwZW5kKG5hbWUsIGxpbmspO1xuICAgICAgICAgICAgICAgIGRpdi5hcHBlbmQocGhvdG8sIHRleHQpO1xuICAgICAgICAgICAgICAgICQoJyN0b3VycycpLmFwcGVuZChkaXYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJCgnI3RvdXJzJykuYXBwZW5kKGxvYWRNb3JlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gaWYgc2NyZWVuIHdpZHRoIGlzIG5vdCBsZXNzIHRoYW4gNjAwcHgsIGFwcGVuZCBlbGVtZW50cyBub3JtYWxseVxuXHR9IGVsc2Uge1xuICAgICAgICBhcnJheS5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBkaXYgPSAkKCc8ZGl2IGNsYXNzPVwiY2xlYXJmaXggaHZyLXNoYWRvd1wiPicpO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGA8aDI+JHtpdGVtLm5hbWV9PGgyPmA7XG4gICAgICAgICAgICBjb25zdCBwaG90byA9IGA8aW1nIGNsYXNzPVwiaHZyLWdyb3ctc2hhZG93XCIgc3JjPVwiJHtpdGVtLnBob3RvfVwiPmA7XG4gICAgICAgICAgICBjb25zdCBsaW5rID0gYDxhIGNsYXNzPVwiaHZyLXVuZGVybGluZS1mcm9tLWNlbnRlclwiIGhyZWY9XCIke2l0ZW0udXJsfVwiPkJvb2sgTm93PC9hPmA7XG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gJCgnPGRpdj4nKS5hcHBlbmQobmFtZSwgbGluayk7XG4gICAgICAgICAgICBkaXYuYXBwZW5kKHBob3RvLCB0ZXh0KTtcbiAgICAgICAgICAgICQoJyN0b3VycycpLmFwcGVuZChkaXYpO1xuICAgICAgICB9KTtcbiAgICB9XG59XG5cbi8vIG1ldGhvZCB0byBkaXNwbGF5IHBvaW50cyBvZiBpbnRlcmVzdFxuLy8gc2FtZSBcInBhZ2luYXRpb25cIiBzeXN0ZW0gYXMgdG91cnNcbmFwcC5kaXNwbGF5UE9JcyA9IChhcnJheSkgPT4ge1xuICAgIGNvbnN0IHRpdGxlID0gYDxoMz5Qb2ludHMgb2YgSW50ZXJlc3Q8L2gzPmA7XG4gICAgJCgnI3BvaScpLmFwcGVuZCh0aXRsZSk7XG4gICAgaWYgKCQod2luZG93KS53aWR0aCgpIDw9IDYwMCkge1x0XG4gICAgICAgIGxldCBjb3VudGVyID0gMDtcbiAgICAgICAgbGV0IHJlc3VsdHNQZXJQYWdlID0gMztcbiAgICAgICAgZm9yIChsZXQgaSA9IGNvdW50ZXI7IGkgPCByZXN1bHRzUGVyUGFnZTsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBkaXYgPSAkKGA8ZGl2IGNsYXNzPVwiY2xlYXJmaXggaHZyLXNoYWRvd1wiPmApO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGA8aDI+JHthcnJheVtpXS5uYW1lfTxoMj5gO1xuICAgICAgICAgICAgY29uc3QgZGVzYyA9IGA8cD4ke2FycmF5W2ldLmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgICAgICAgICAgY29uc3QgcGhvdG8gPSBgPGltZyBjbGFzcz1cImh2ci1ncm93LXNoYWRvd1wiIHNyYz1cIiR7YXJyYXlbaV0ucGhvdG99XCI+YDtcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSAkKCc8ZGl2PicpLmFwcGVuZChuYW1lLCBkZXNjKTtcblxuICAgICAgICAgICAgZGl2LmFwcGVuZChwaG90bywgdGV4dCk7XG4gICAgICAgICAgICAkKCcjcG9pJykuYXBwZW5kKGRpdik7XG4gICAgICAgIH0gICAgXG5cbiAgICAgICAgY29uc3QgbG9hZE1vcmUgPSBgPGJ1dHRvbiBjbGFzcz1cImxvYWRNb3JlIGh2ci1ncm93LXNoYWRvd1wiPkxvYWQgTW9yZTwvYnV0dG9uPmA7XG4gICAgICAgICQoJyNwb2knKS5hcHBlbmQobG9hZE1vcmUpO1xuXG4gICAgICAgICQoJyNwb2knKS5vbignY2xpY2snLCAnLmxvYWRNb3JlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZSgpO1xuICAgICAgICAgICAgY291bnRlcis9MztcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBjb3VudGVyOyBpIDwgKGNvdW50ZXIgKyByZXN1bHRzUGVyUGFnZSk7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpdiA9ICQoYDxkaXYgY2xhc3M9XCJjbGVhcmZpeCBodnItc2hhZG93XCI+YCk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9IGA8aDI+JHthcnJheVtpXS5uYW1lfTxoMj5gO1xuICAgICAgICAgICAgICAgIGNvbnN0IGRlc2MgPSBgPHA+JHthcnJheVtpXS5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgICAgICAgICBjb25zdCBwaG90byA9IGA8aW1nIGNsYXNzPVwiaHZyLWdyb3ctc2hhZG93XCIgc3JjPVwiJHthcnJheVtpXS5waG90b31cIj5gO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSAkKCc8ZGl2PicpLmFwcGVuZChuYW1lLCBkZXNjKTtcbiAgICBcbiAgICAgICAgICAgICAgICBkaXYuYXBwZW5kKHBob3RvLCB0ZXh0KTtcbiAgICAgICAgICAgICAgICAkKCcjcG9pJykuYXBwZW5kKGRpdik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkKCcjcG9pJykuYXBwZW5kKGxvYWRNb3JlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGVsc2UganVzdCBhcHBlbmQgYWxsIHRoZSByZXN1bHRzIG5vcm1hbGx5XG5cdH0gZWxzZSB7ICAgIFxuICAgICAgICBhcnJheS5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBkaXYgPSAkKGA8ZGl2IGNsYXNzPVwiY2xlYXJmaXggaHZyLXNoYWRvd1wiPmApO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGA8aDI+JHtpdGVtLm5hbWV9PGgyPmA7XG4gICAgICAgICAgICBjb25zdCBkZXNjID0gYDxwPiR7aXRlbS5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgICAgIGNvbnN0IHBob3RvID0gYDxpbWcgY2xhc3M9XCJodnItZ3Jvdy1zaGFkb3dcIiBzcmM9XCIke2l0ZW0ucGhvdG99XCI+YDtcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSAkKCc8ZGl2PicpLmFwcGVuZChuYW1lLCBkZXNjKTtcbiAgICAgICAgICAgIGRpdi5hcHBlbmQocGhvdG8sIHRleHQpO1xuICAgICAgICAgICAgJCgnI3BvaScpLmFwcGVuZChkaXYpO1xuICAgICAgICB9KTtcbiAgICB9ICAgIFxufVxuXG5hcHAuZGlzcGxheVdlYXRoZXIgPSAob2JqZWN0KSA9PiB7XG4gICAgY29uc3QgdGl0bGUgPSBgPGgzPldlYXRoZXI8L2gzPmA7XG4gICAgY29uc3QgaWNvbiA9IGA8Y2FudmFzIGlkPVwiJHtvYmplY3QuaWNvbn1cIiB3aWR0aD1cIjgwXCIgaGVpZ2h0PVwiODBcIj48L2NhbnZhcz5gO1xuICAgIGNvbnN0IGh0bWwgPSBgPGgyPkN1cnJlbnRseTo8L2gyPiBcbiAgICA8aDQ+JHtvYmplY3QuY3VycmVudFRlbXB9PC9oND5cbiAgICAgICAgPHAgY2xhc3M9XCJ3ZWF0aGVyVGV4dFwiPiR7b2JqZWN0LmNvbmRpdGlvbnN9PC9wPmBcbiAgICAkKCcjd2VhdGhlcicpLmFwcGVuZCh0aXRsZSwgaWNvbiwgaHRtbCk7XG4gICAgYXBwLmxvYWRJY29ucygpO1xufVxuXG5hcHAucmFuZG9tSGVybyA9ICgpID0+IHtcbiAgICBsZXQgaSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDUpICsgMVxuICAgIGNvbnNvbGUubG9nKGkpO1xuICAgICQoJy5zcGxhc2hQYWdlJykuY3NzKHtcbiAgICAgICAgJ2JhY2tncm91bmQnOiBgbGluZWFyLWdyYWRpZW50KHJnYmEoMCwwLDAsMC41KSwgcmdiYSgwLDAsMCwwLjUpKSwgdXJsKFwiLi4vLi4vcHVibGljL2Fzc2V0cy9oZXJvJHtpfS5qcGdcIilgLFxuICAgICAgICAnYmFja2dyb3VuZC1wb3NpdGlvbic6ICdjZW50ZXInLFxuXHQgICAgJ2JhY2tncm91bmQtc2l6ZSc6ICdjb3ZlcidcdFxuICAgIH0pO1xufVxuXG5hcHAubG9hZEljb25zID0gKCkgPT4ge1xuICAgIHZhciBpY29ucyA9IG5ldyBTa3ljb25zKHtcImNvbG9yXCI6IFwiYmxhY2tcIn0pO1xuICAgIGljb25zLnNldChcImNsZWFyLWRheVwiLCBTa3ljb25zLkNMRUFSX0RBWSk7XG4gICAgaWNvbnMuc2V0KFwiY2xlYXItbmlnaHRcIiwgU2t5Y29ucy5DTEVBUl9OSUdIVCk7XG4gICAgaWNvbnMuc2V0KFwicGFydGx5LWNsb3VkeS1kYXlcIiwgU2t5Y29ucy5QQVJUTFlfQ0xPVURZX0RBWSk7XG4gICAgaWNvbnMuc2V0KFwicGFydGx5LWNsb3VkeS1uaWdodFwiLCBTa3ljb25zLlBBUlRMWV9DTE9VRFlfTklHSFQpO1xuICAgIGljb25zLnNldChcImNsb3VkeVwiLCBTa3ljb25zLkNMT1VEWSk7XG4gICAgaWNvbnMuc2V0KFwicmFpblwiLCBTa3ljb25zLlJBSU4pO1xuICAgIGljb25zLnNldChcInNsZWV0XCIsIFNreWNvbnMuU0xFRVQpO1xuICAgIGljb25zLnNldChcInNub3dcIiwgU2t5Y29ucy5TTk9XKTtcbiAgICBpY29ucy5zZXQoXCJ3aW5kXCIsIFNreWNvbnMuV0lORCk7XG4gICAgaWNvbnMuc2V0KFwiZm9nXCIsIFNreWNvbnMuRk9HKTtcbiAgICBpY29ucy5wbGF5KCk7XG59XG5cbmFwcC5ldmVudHMgPSAoKSA9PiB7XG4gICAgYXBwLmluaXRBdXRvY29tcGxldGUoJ2Rlc3RpbmF0aW9uJyk7XG4gICAgJCgnZm9ybScpLm9uKCdzdWJtaXQnLCAoZSkgPT4ge1xuICAgICAgICAkKCcjc3BsYXNoUGFnZScpLnRvZ2dsZShmYWxzZSk7XG4gICAgICAgICQoJyNjb250ZW50UGFnZScpLnRvZ2dsZSh0cnVlKTtcbiAgICAgICAgJCgnZm9ybScpLnJlbW92ZUNsYXNzKCdzcGxhc2hTZWFyY2hGb3JtJyk7XG4gICAgICAgICQoJyNkZXN0aW5hdGlvbicpLnJlbW92ZUNsYXNzKCdzcGxhc2hTZWFyY2hCYXInKTtcbiAgICAgICAgJCgnZm9ybScpLmFkZENsYXNzKCdjb250ZW50U2VhcmNoRm9ybScpO1xuICAgICAgICAkKCcjZGVzdGluYXRpb24nKS5hZGRDbGFzcygnY29udGVudFNlYXJjaEJhcicpO1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICQoJ2RpdicpLmVtcHR5KCk7XG4gICAgICAgIGNvbnN0IGRlc3RpbmF0aW9uID0gJCgnI2Rlc3RpbmF0aW9uJykudmFsKCk7XG4gICAgICAgIGlmIChkZXN0aW5hdGlvbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAkKCcjZGVzdGluYXRpb25OYW1lJykudGV4dChkZXN0aW5hdGlvbik7XG4gICAgICAgICAgICBhcHAuZ2V0RGVzdGluYXRpb25JbmZvKGRlc3RpbmF0aW9uKTtcbiAgICAgICAgfVxuICAgICAgICAkKCcjZGVzdGluYXRpb24nKS52YWwoJycpO1xuICAgICAgICBhcHAuZGVzdGluYXRpb24gPSB7fTtcbiAgICAgICAgYXBwLndlYXRoZXIgPSB7fTtcbiAgICAgICAgYXBwLmN1cnJlbmN5PSB7fTtcbiAgICAgICAgYXBwLlBPSXMgPSBbXTtcbiAgICAgICAgYXBwLmV4Y2hhbmdlUmF0ZTtcbiAgICAgICAgYXBwLnRvdXJzID0gW107XG4gICAgICAgIGFwcC5haXJwb3J0ID0ge307XG4gICAgICAgIGFwcC5sYW5ndWFnZXMgPSB7fTtcbiAgICB9KTtcbn1cblxuYXBwLmluaXQgPSAoKSA9PiB7XG4gICAgYXBwLnJhbmRvbUhlcm8oKTtcbiAgICBhcHAuaW5pdEF1dG9jb21wbGV0ZSgnZGVzdGluYXRpb24nKTtcbiAgICAkKCcjY29udGVudFBhZ2UnKS50b2dnbGUoZmFsc2UpO1xuICAgIGFwcC5ldmVudHMoKTtcbn1cblxuJChmdW5jdGlvbiAoKSB7XG4gICAgY29uc29sZS5sb2coXCJyZWFkeSFcIik7XG4gICAgYXBwLmluaXQoKTtcbn0pOyJdfQ==
