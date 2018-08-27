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

        $('#currency h2').text('$1 ' + userCurrency + ' = ' + app.currency.symbol + ' ' + app.currency.exchangeRate.toFixed(2) + ' ' + destinationCurrency);
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
    var input = '<form id="userCurrency"><input class="userCurrency  type="search" id="user" placeholder="Enter your location."><button class="submit">Convert</button></form>';
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
    var html = '<h2>Currently:</h2> \n    <h4>' + object.currentTemp + '\xB0C</h4>\n        <p class="weatherText">' + object.conditions + '</p>';
    $('#weather').append(title, icon, html);
    app.loadIcons();
};

app.randomHero = function () {
    var i = Math.floor(Math.random() * 5) + 1;
    console.log(i);
    $('.splashPage').css({
        'background': 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("public/assets/hero' + i + '.jpg")',
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
        var destination = $('#destination').val();
        if (destination.length > 0) {
            $('.contentSearchForm').toggle(false);
            $('#destinationName').toggle(true);
            $('#splashPage').toggle(false);
            $('#contentPage').toggle(true);
            $('form').removeClass('splashSearchForm');
            $('#destination').removeClass('splashSearchBar');
            $('#submitButton').removeClass('splashSearchButton');
            $('#submitButton').addClass('contentSearchButton');
            $('form').addClass('contentSearchForm');
            $('#destination').addClass('contentSearchBar');
            e.preventDefault();
            $('div').empty();
            $('#destinationName').text(destination);
            app.getDestinationInfo(destination);
        }
        app.destination = {};
        app.weather = {};
        app.currency = {};
        app.POIs = [];
        app.exchangeRate;
        app.tours = [];
        app.airport = {};
        app.languages = {};
        $('#destination').val('');
    });

    $('#searchMenu').on('click', function () {
        $('.contentSearchForm').toggle();
        $('#destinationName').toggle();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYvc2NyaXB0cy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNBQTtBQUNBLElBQU0sTUFBTSxFQUFaOztBQUVBO0FBQ0EsSUFBSSxJQUFKLEdBQVcsRUFBWDtBQUNBLElBQUksV0FBSixHQUFrQixFQUFsQjtBQUNBLElBQUksT0FBSixHQUFjLEVBQWQ7QUFDQSxJQUFJLFFBQUosR0FBYyxFQUFkO0FBQ0EsSUFBSSxJQUFKLEdBQVcsRUFBWDtBQUNBLElBQUksWUFBSjtBQUNBLElBQUksS0FBSixHQUFZLEVBQVo7QUFDQSxJQUFJLE9BQUosR0FBYyxFQUFkO0FBQ0EsSUFBSSxRQUFKLEdBQWUsRUFBZjs7QUFHQTtBQUNBO0FBQ0EsSUFBSSxnQkFBSixHQUF1QixVQUFDLEVBQUQsRUFBUTtBQUMzQixRQUFJLE9BQU8sSUFBUCxDQUFZLE1BQVosQ0FBbUIsWUFBdkIsQ0FBb0MsU0FBUyxjQUFULENBQXdCLEVBQXhCLENBQXBDO0FBQ0gsQ0FGRDs7QUFJQTtBQUNBO0FBQ0EsSUFBSSxrQkFBSixHQUF5QixVQUFDLFFBQUQsRUFBYztBQUNuQyxRQUFNLFdBQVcsSUFBSSxPQUFPLElBQVAsQ0FBWSxRQUFoQixFQUFqQjtBQUNBLGFBQVMsT0FBVCxDQUFpQjtBQUNiLG1CQUFXO0FBREUsS0FBakIsRUFFRyxVQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO0FBQ3BCO0FBQ0EsWUFBSSxVQUFVLE9BQU8sSUFBUCxDQUFZLGNBQVosQ0FBMkIsRUFBekMsRUFBNkM7QUFDekMsZ0JBQU0sb0JBQW9CLFFBQVEsQ0FBUixFQUFXLGtCQUFYLENBQThCLE1BQTlCLENBQXFDLFVBQUMsU0FBRCxFQUFlO0FBQzFFLHVCQUFPLFVBQVUsS0FBVixDQUFnQixDQUFoQixNQUF1QixTQUE5QjtBQUNILGFBRnlCLENBQTFCO0FBR0E7QUFDQSxnQkFBSSxXQUFKLENBQWdCLFdBQWhCLEdB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QVYsQ0FBbUIsbUJBQW5CO0FBQ0EsY0FBRSxjQUFGLEVBQWtCLFFBQWxCLENBQTJCLGtCQUEzQjtBQUNBLGNBQUUsY0FBRjtBQUNBLGNBQUUsS0FBRixFQUFTLEtBQVQ7QUFDQSxjQUFFLGtCQUFGLEVBQXNCLElBQXRCLENBQTJCLFdBQTNCO0FBQ0EsZ0JBQUksa0JBQUosQ0FBdUIsV0FBdkI7QUFDSDtBQUNELFlBQUksV0FBSixHQUFrQixFQUFsQjtBQUNBLFlBQUksT0FBSixHQUFjLEVBQWQ7QUFDQSxZQUFJLFFBQUosR0FBYyxFQUFkO0FBQ0EsWUFBSSxJQUFKLEdBQVcsRUFBWDtBQUNBLFlBQUksWUFBSjtBQUNBLFlBQUksS0FBSixHQUFZLEVBQVo7QUFDQSxZQUFJLE9BQUosR0FBYyxFQUFkO0FBQ0EsWUFBSSxTQUFKLEdBQWdCLEVBQWhCO0FBQ0EsVUFBRSxjQUFGLEVBQWtCLEdBQWxCLENBQXNCLEVBQXRCO0FBQ0gsS0EzQkQ7O0FBNkJBLE1BQUUsYUFBRixFQUFpQixFQUFqQixDQUFvQixPQUFwQixFQUE2QixZQUFXO0FBQ3BDLFVBQUUsb0JBQUYsRUFBd0IsTUFBeEI7QUFDQSxVQUFFLGtCQUFGLEVBQXNCLE1BQXRCO0FBQ0gsS0FIRDtBQUlILENBcENEOztBQXNDQSxJQUFJLElBQUosR0FBVyxZQUFNO0FBQ2IsUUFBSSxVQUFKO0FBQ0EsUUFBSSxnQkFBSixDQUFxQixhQUFyQjtBQUNBLE1BQUUsY0FBRixFQUFrQixNQUFsQixDQUF5QixLQUF6QjtBQUNBLFFBQUksTUFBSjtBQUNILENBTEQ7O0FBT0EsRUFBRSxZQUFZO0FBQ1YsWUFBUSxHQUFSLENBQVksUUFBWjtBQUNBLFFBQUksSUFBSjtBQUNILENBSEQiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvLyBjcmVhdGUgZW1wdHkgb2JqZWN0IHRvIHN0b3JlIGFsbCBtZXRob2RzXG5jb25zdCBhcHAgPSB7fTtcblxuLy8gY3JlYXRlIGVtcHR5IG9iamVjdHMvYXJyYXlzIG9uIGFwcCBvYmplY3QgdG8gc3RvcmUgdGhlIGluZm9ybWF0aW9uIHRvIGJlIHVzZWQgbGF0ZXIgb25cbmFwcC51c2VyID0ge307XG5hcHAuZGVzdGluYXRpb24gPSB7fTtcbmFwcC53ZWF0aGVyID0ge307XG5hcHAuY3VycmVuY3k9IHt9O1xuYXBwLlBPSXMgPSBbXTtcbmFwcC5leGNoYW5nZVJhdGU7XG5hcHAudG91cnMgPSBbXTtcbmFwcC5haXJwb3J0ID0ge307XG5hcHAubGFuZ3VhZ2UgPSB7fTtcblxuXG4vLyBtZXRob2QgdG8gaW5pdCBHb29nbGRlIEF1dG9jb21wbGV0ZTtcbi8vIHRha2VzIHBhcmFtZXRlciBvZiBhbiBpZCB0byB0YXJnZXQgc3BlY2lmaWMgaW5wdXQgdGFnc1xuYXBwLmluaXRBdXRvY29tcGxldGUgPSAoaWQpID0+IHtcbiAgICBuZXcgZ29vZ2xlLm1hcHMucGxhY2VzLkF1dG9jb21wbGV0ZShkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCkpO1xufVxuXG4vLyBtb3N0IG9mIHRoZSBBUElzIHdlIGFyZSByZXF1ZXN0aW5nIGRhdGEgZnJvbSBhY2NlcHQgbG9jYXRpb24gaW5mbyBpbiB0aGUgZm9ybSBvZiBsYXQgbG5nIGNvb3Jkc1xuLy8gc28gd2UgZW50ZXIgdGhlIHVzZXIncyBpbnB1dCBpbnRvIEdvb2dsZSBnZW9jb2RlciB0byBnZXQgbGF0IGFuZCBsbmcgY29vcmRzIHRvIHVzZSBpbiBvdGhlciBBUEkgcmVxdWVzdHNcbmFwcC5nZXREZXN0aW5hdGlvbkluZm8gPSAobG9jYXRpb24pID0+IHtcbiAgICBjb25zdCBnZW9jb2RlciA9IG5ldyBnb29nbGUubWFwcy5HZW9jb2RlcigpO1xuICAgIGdlb2NvZGVyLmdlb2NvZGUoe1xuICAgICAgICAnYWRkcmVzcyc6IGxvY2F0aW9uXG4gICAgfSwgKHJlc3VsdHMsIHN0YXR1cykgPT4ge1xuICAgICAgICAvLyBpZiB0aGVyZSBpcyBubyBlcnJvciwgZmlsdGVyIHRoZSByZXN1bHQgc28gdGhhdCB0aGUgY29tcG9uZW50IGlzIGEgXCJjb3VudHJ5XCJcbiAgICAgICAgaWYgKHN0YXR1cyA9PSBnb29nbGUubWFwcy5HZW9jb2RlclN0YXR1cy5PSykge1xuICAgICAgICAgICAgY29uc3QgYWRkcmVzc0NvbXBvbmVudHMgPSByZXN1bHRzWzBdLmFkZHJlc3NfY29tcG9uZW50cy5maWx0ZXIoKGNvbXBvbmVudCkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiBjb21wb25lbnQudHlwZXNbMF0gPT09ICdjb3VudHJ5JztcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gb3V0IG9mIHRoZSByZXN1bHRzIG9mIHRoZSBmaWx0ZXIsIGdldCB0aGUgaW5mbyBhbmQgcG9wdWxhdGUgdGhlIGFwcC5kZXN0aW5hdGlvbiBvYmplY3RcbiAgICAgICAgICAgIGFwcC5kZXN0aW5hdGlvbi5jb3VudHJ5Q29kZSA9IGFkZHJlc3NDb21wb25lbnRzWzBdLnNob3J0X25hbWU7XG4gICAgICAgICAgICBhcHAuZGVzdGluYXRpb24uY291bnRyeU5hbWUgPSBhZGRyZXNzQ29tcG9uZW50c1swXS5sb25nX25hbWU7XG4gICAgICAgICAgICBhcHAuZGVzdGluYXRpb24ubGF0ID0gcmVzdWx0c1swXS5nZW9tZXRyeS5sb2NhdGlvbi5sYXQoKTtcbiAgICAgICAgICAgIGFwcC5kZXN0aW5hdGlvbi5sbmcgPSByZXN1bHRzWzBdLmdlb21ldHJ5LmxvY2F0aW9uLmxuZygpO1xuICAgICAgICAgICAgYXBwLmdldFdlYXRoZXIoYXBwLmRlc3RpbmF0aW9uLmxhdCwgYXBwLmRlc3RpbmF0aW9uLmxuZyk7XG4gICAgICAgICAgICBhcHAuZ2V0Q3VycmVuY3koYXBwLmRlc3RpbmF0aW9uLmNvdW50cnlDb2RlKTtcbiAgICAgICAgICAgIGFwcC5nZXRDaXR5Q29kZShhcHAuZGVzdGluYXRpb24ubGF0LCBhcHAuZGVzdGluYXRpb24ubG5nKTtcbiAgICAgICAgICAgIGFwcC5nZXRMYW5ndWFnZShhcHAuZGVzdGluYXRpb24uY291bnRyeUNvZGUpO1xuICAgICAgICAgICAgYXBwLmdldEFpcnBvcnRzKGFwcC5kZXN0aW5hdGlvbi5sYXQsIGFwcC5kZXN0aW5hdGlvbi5sbmcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWxlcnQoXCJTb21ldGhpbmcgd2VudCB3cm9uZy5cIiArIHN0YXR1cyk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuXG4vLyBhamF4IGNhbGwgdG8gZ2V0IHdlYXRoZXJcbi8vIHRha2VzIGxhdCBhbmQgbG5nIGNvb3JkcyBhcyBwYXJhbWV0ZXJzXG5hcHAuZ2V0V2VhdGhlciA9IChsYXRpdHVkZSwgbG9uZ2l0dWRlKSA9PiB7XG4gICAgJC5hamF4KHtcbiAgICAgICAgdXJsOiBgaHR0cHM6Ly9hcGkuZGFya3NreS5uZXQvZm9yZWNhc3QvZWEyZjdhN2JhYjNkYWFjYzlmNTRmMTc3ODE5ZmExZDMvJHtsYXRpdHVkZX0sJHtsb25naXR1ZGV9YCxcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgZGF0YVR5cGU6ICdqc29ucCcsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICd1bml0cyc6ICdhdXRvJ1xuICAgICAgICB9XG4gICAgfSlcbiAgICAudGhlbigocmVzKSA9PiB7XG4gICAgICAgIC8vIHRha2UgcmVzdWx0IGFuZCBwdWxsIGRlc2lyZWQgaW5mb3JtYXRpb24gaW50byBhcHAud2VhdGhlciBvYmplY3RcbiAgICAgICAgYXBwLndlYXRoZXIuY29uZGl0aW9ucyA9IHJlcy5kYWlseS5zdW1tYXJ5O1xuICAgICAgICBhcHAud2VhdGhlci5jdXJyZW50VGVtcCA9IE1hdGgucm91bmQocmVzLmN1cnJlbnRseS50ZW1wZXJhdHVyZSk7XG4gICAgICAgIGFwcC53ZWF0aGVyLmljb24gPSByZXMuZGFpbHkuaWNvbjtcbiAgICAgICAgYXBwLmRpc3BsYXlXZWF0aGVyKGFwcC53ZWF0aGVyKTtcbiAgICAgICAgXG4gICAgfSk7XG59XG5cbi8vIGkgZm91bmQgdGhhdCB0aGUgcG9pbnRzIG9mIGludGVyZXN0IGFuZCB0b3VycyByZXF1ZXN0IHdvcmtzIGJldHRlciB3aXRoIGEgY2l0eSBjb2RlIGluc3RlYWQgb2YgbGF0IGFuZCBsbmcgY29vcmRzXG4vLyBtZXRob2QgdG8gZ2V0IGNpdHkgY29kZSBmcm9tIGxhdCBhbmQgbG5nIHRvIHVzZSBpbiBvdGhlciBhamF4IHJlcXVlc3RzXG5hcHAuZ2V0Q2l0eUNvZGUgPSAobGF0aXR1ZGUsIGxvbmdpdHVkZSkgPT4ge1xuICAgICQuYWpheCh7XG4gICAgICAgIHVybDogYGh0dHBzOi8vYXBpLnN5Z2ljdHJhdmVsYXBpLmNvbS8xLjAvZW4vcGxhY2VzL2RldGVjdC1wYXJlbnRzYCxcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgJ3gtYXBpLWtleSc6ICd6emlKWWNqbG1FOExiV0hkdlU1dkM4VWNTRnZLRVBzQzNua0FsN2VLJ1xuICAgICAgICB9LFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAnbG9jYXRpb24nOiBgJHtsYXRpdHVkZX0sJHtsb25naXR1ZGV9YFxuICAgICAgICB9XG4gICAgfSlcbiAgICAudGhlbigocmVzKSA9PiB7XG4gICAgICAgIGNvbnNvbGUubG9nKHJlcyk7XG4gICAgICAgIGNvbnN0IGRhdGEgPSByZXMuZGF0YS5wbGFjZXNbMF07XG4gICAgICAgIGNvbnNvbGUubG9nKGRhdGEpO1xuXG4gICAgICAgIC8vIHdlIHNwZWNpZmljYWxseSB3YW50IHRvIHRhcmdldCBjaXRpZXNcbiAgICAgICAgLy8gaWYgdGhhdCByZXN1bHQgaXMgYSBsZXZlbCBzbWFsbGVyIHRoYW4gYSBjaXR5LCB0YXJnZXQgdGhlIG5leHQgcGFyZW50IElEXG4gICAgICAgIGlmIChkYXRhLmxldmVsICE9PSAnY2l0eScpIHtcbiAgICAgICAgICAgIGNvbnN0IGNpdHlDb2RlID0gZGF0YS5wYXJlbnRfaWRzWzBdO1xuICAgICAgICAgICAgY29uc29sZS5sb2coZGF0YS5wYXJlbnRfaWRzWzBdKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGNpdHlDb2RlKTtcbiAgICAgICAgICAgIGFwcC5nZXRQT0lzKGNpdHlDb2RlKTtcbiAgICAgICAgICAgIGFwcC5nZXRUb3VycyhjaXR5Q29kZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGlmIHRoZSByZXN1bHQgaXMgYSBjaXR5LCBqdXN0IHVzZSB0aGF0IGlkIGluIHRoZSBvdGhlciBycXVlc3RzXG4gICAgICAgICAgICBjb25zdCBjaXR5Q29kZSA9IGRhdGEuaWQ7ICBcbiAgICAgICAgICAgIGFwcC5nZXRQT0lzKGNpdHlDb2RlKTtcbiAgICAgICAgICAgIGFwcC5nZXRUb3VycyhjaXR5Q29kZSk7XG4gICAgICAgIH0gXG4gICAgfSk7XG59XG5cbi8vIG1ldGhvZCB0byBnZXQgUE9JcyAocG9pbnRzIG9mIGludGVyZXN0KTtcbmFwcC5nZXRQT0lzID0gKGNpdHlDb2RlKSA9PiB7XG4gICAgJC5hamF4KHtcbiAgICAgICAgdXJsOiBgaHR0cHM6Ly9hcGkuc3lnaWN0cmF2ZWxhcGkuY29tLzEuMC9lbi9wbGFjZXMvbGlzdGAsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICd4LWFwaS1rZXknOiAnenppSlljamxtRThMYldIZHZVNXZDOFVjU0Z2S0VQc0MzbmtBbDdlSydcbiAgICAgICAgfSxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgJ3RhZ3Nfbm90JzogJ0FpcnBvcnQnLFxuICAgICAgICAgICAgJ3BhcmVudHMnOiBjaXR5Q29kZSxcbiAgICAgICAgICAgICdsZXZlbCc6ICdwb2knLFxuICAgICAgICAgICAgJ2xpbWl0JzogMjAsXG4gICAgICAgIH1cbiAgICB9KS50aGVuKChyZXMpPT4ge1xuICAgICAgICBjb25zdCBwb2ludHMgPSByZXMuZGF0YS5wbGFjZXM7XG5cbiAgICAgICAgLy8gd2Ugb25seSB3YW50IHJlc3VsdHMgdGhhdCBoYXZlIGFuIGltYWdlIGFuZCBhIGRlc2NyaXB0aW9ucyAocGVyZXgpXG4gICAgICAgIGNvbnN0IGZpbHRlcmVkUG9pbnRzID0gcG9pbnRzLmZpbHRlcigocGxhY2UpPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHBsYWNlLnRodW1ibmFpbF91cmwgJiYgcGxhY2UucGVyZXhcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gaWYgdGhlcmUgYXJlIG5vIHJlc3VsdHMgdGhhdCBoYXZlIGFuIGltYWdlIGFuZCBhIGRlc2NyaXB0aW9uLCBjYWxsIHRoZSBkaXNwbGF5RXJyb3IgZnVuY3Rpb25cbiAgICAgICAgaWYgKGZpbHRlcmVkUG9pbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgYXBwLmRpc3BsYXlFcnJvcigncG9pJywgJ3BvaW50cyBvZiBpbnRlcmVzdCcpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gdGFrZSB0aGUgZmlyc3QgMyBpdGVtcyBhbmQgcHVzaCB0aGVpciBwcm9wZXJ0aWVzIG9udG8gdGhlIGFwcC5QT0lzIG9iamVjdFxuICAgICAgICAgICAgZmlsdGVyZWRQb2ludHMuZm9yRWFjaCgocG9pbnQpPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBsYWNlID0ge1xuICAgICAgICAgICAgICAgICAgICAnbmFtZSc6IHBvaW50Lm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICdkZXNjcmlwdGlvbic6IHBvaW50LnBlcmV4LFxuICAgICAgICAgICAgICAgICAgICAncGhvdG8nOiBwb2ludC50aHVtYm5haWxfdXJsLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgYXBwLlBPSXMucHVzaChwbGFjZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGFwcC5kaXNwbGF5UE9JcyhhcHAuUE9Jcyk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cbi8vbWV0aG9kIHRvIGdldCBjbG9zZXN0IGFpcnBvcnRcbmFwcC5nZXRBaXJwb3J0cyA9IChsYXQsIGxuZykgPT4ge1xuICAgICQuYWpheCh7XG4gICAgICAgIHVybDogYGh0dHBzOi8vYXBpLnN5Z2ljdHJhdmVsYXBpLmNvbS8xLjAvZW4vcGxhY2VzL2xpc3RgLFxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAneC1hcGkta2V5JzogJ3p6aUpZY2psbUU4TGJXSGR2VTV2QzhVY1NGdktFUHNDM25rQWw3ZUsnXG4gICAgICAgIH0sXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICdsb2NhdGlvbic6IGAke2xhdH0sJHtsbmd9YCxcbiAgICAgICAgICAgICd0YWdzJzogJ0FpcnBvcnQnLFxuICAgICAgICB9XG4gICAgfSkgLnRoZW4gKChyZXMpID0+IHtcbiAgICAgICAgLy8gcHVzaCB0aGUgcHJvcGVydGllcyBvbnRvIGFwcC5haXJwb3J0IG9iamVjdFxuICAgICAgICBhcHAuYWlycG9ydC5uYW1lID0gcmVzLmRhdGEucGxhY2VzWzBdLm5hbWU7XG4gICAgICAgIGFwcC5haXJwb3J0LmRlc2NyaXB0aW9uID0gcmVzLmRhdGEucGxhY2VzWzBdLnBlcmV4O1xuICAgICAgICBhcHAuYWlycG9ydC5waG90byA9IHJlcy5kYXRhLnBsYWNlc1swXS50aHVtYm5haWxfdXJsO1xuXG4gICAgICAgIC8vIGNhbGwgZGlzcGxheUFpcnBvcnRzIHVzaW5nIHByb3BlcnRpZXMgZnJvbSBhamF4IHJlcXVlc3RcbiAgICAgICAgYXBwLmRpc3BsYXlBaXJwb3J0cyhhcHAuYWlycG9ydCk7XG4gICAgfSk7XG59XG5cbi8vIG1ldGhvZCB0byBnZXQgbGFuZ3VhZ2VcbmFwcC5nZXRMYW5ndWFnZSA9IChjb3VudHJ5KSA9PiB7XG4gICAgJC5hamF4KHtcbiAgICAgICAgdXJsOiBgaHR0cHM6Ly9yZXN0Y291bnRyaWVzLmV1L3Jlc3QvdjIvbmFtZS8ke2NvdW50cnl9YCxcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgZnVsbFRleHQ6IHRydWVcbiAgICAgICAgfVxuICAgIH0pIC50aGVuKChyZXMpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2cocmVzKTtcbiAgICAgICAgYXBwLmxhbmd1YWdlLnByaW1hcnkgPSByZXNbMF0ubGFuZ3VhZ2VzWzBdLm5hbWU7XG4gICAgICAgIGlmIChyZXNbMF0ubGFuZ3VhZ2VzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIGFwcC5sYW5ndWFnZS5zZWNvbmRhcnkgPSByZXNbMF0ubGFuZ3VhZ2VzWzFdLm5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgYXBwLmRpc3BsYXlMYW5ndWFnZShhcHAubGFuZ3VhZ2UpO1xuICAgIH0pO1xuXG59XG5cbi8vIFxuYXBwLmdldFRvdXJzID0gKGNpdHlDb2RlKSA9PiB7XG4gICAgJC5hamF4KHtcbiAgICAgICAgdXJsOiBgaHR0cHM6Ly9hcGkuc3lnaWN0cmF2ZWxhcGkuY29tLzEuMC9lbi90b3Vycy92aWF0b3JgLFxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAneC1hcGkta2V5JzogJ3p6aUpZY2psbUU4TGJXSGR2VTV2QzhVY1NGdktFUHNDM25rQWw3ZUsnXG4gICAgICAgIH0sXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICdwYXJlbnRfcGxhY2VfaWQnOiBjaXR5Q29kZVxuICAgICAgICB9XG4gICB9KS50aGVuKChyZXMpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2cocmVzKTtcbiAgICAgICAgY29uc3QgbGlzdCA9IHJlcy5kYXRhLnRvdXJzO1xuICAgICAgICBjb25zb2xlLmxvZyh0b3Vycyk7XG4gICAgICAgIGNvbnN0IHRvdXJzID0gbGlzdC5maWx0ZXIoKHBsYWNlKT0+IHtcbiAgICAgICAgICAgIHJldHVybiBwbGFjZS5waG90b191cmwgJiYgcGxhY2UudXJsXG4gICAgICAgIH0pO1xuICAgICAgICBpZiAodG91cnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBhcHAuZGlzcGxheUVycm9yKCd0b3VycycsICd0b3VycycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0b3Vycy5sZW5ndGg7IGkgKyspIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0b3VyID0ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiB0b3Vyc1tpXS50aXRsZSxcbiAgICAgICAgICAgICAgICAgICAgcGhvdG86IHRvdXJzW2ldLnBob3RvX3VybCxcbiAgICAgICAgICAgICAgICAgICAgdXJsOiB0b3Vyc1tpXS51cmxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGFwcC50b3Vycy5wdXNoKHRvdXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc29sZS5sb2coYXBwLnRvdXJzKTtcbiAgICAgICAgICAgIGFwcC5kaXNwbGF5VG91cnMoYXBwLnRvdXJzKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5hcHAuZ2V0Q3VycmVuY3kgPSAoY291bnRyeUNvZGUpID0+IHtcbiAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6IGBodHRwczovL3Jlc3Rjb3VudHJpZXMuZXUvcmVzdC92Mi9uYW1lLyR7Y291bnRyeUNvZGV9YCxcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgZnVsbFRleHQ6IHRydWVcbiAgICAgICAgfVxuICAgIH0pLnRoZW4oKHJlcykgPT4ge1xuICAgICAgICBhcHAuY3VycmVuY3kuY29kZSA9IHJlc1swXS5jdXJyZW5jaWVzWzBdLmNvZGU7XG4gICAgICAgIGFwcC5jdXJyZW5jeS5zeW1ib2wgPSByZXNbMF0uY3VycmVuY2llc1swXS5zeW1ib2w7XG4gICAgICAgIGFwcC5kaXNwbGF5Q3VycmVuY3koYXBwLmN1cnJlbmN5KTtcbiAgICB9KTtcbn0gICAgXG5cbmFwcC5jb252ZXJ0Q3VycmVuY3kgPSAodXNlckN1cnJlbmN5LCBkZXN0aW5hdGlvbkN1cnJlbmN5KSA9PiB7XG4gICAgJC5hamF4KHtcbiAgICAgICAgdXJsOiBgaHR0cHM6Ly9mcmVlLmN1cnJlbmN5Y29udmVydGVyYXBpLmNvbS9hcGkvdjYvY29udmVydGAsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIHE6IGAke3VzZXJDdXJyZW5jeX1fJHtkZXN0aW5hdGlvbkN1cnJlbmN5fSwke2Rlc3RpbmF0aW9uQ3VycmVuY3l9XyR7dXNlckN1cnJlbmN5fWAsXG4gICAgICAgICAgICBjb21wYWN0OiAndWx0cmEnXG4gICAgICAgIH1cbiAgICB9KS50aGVuKChyZXMpID0+IHtcbiAgICAgICAgY29uc29sZS5sb2cocmVzKTtcbiAgICAgICAgYXBwLmN1cnJlbmN5LmV4Y2hhbmdlUmF0ZSA9IHJlc1tgJHt1c2VyQ3VycmVuY3l9XyR7ZGVzdGluYXRpb25DdXJyZW5jeX1gXTtcbiAgICAgICAgY29uc29sZS5sb2coYXBwLmN1cnJlbmN5LmV4Y2hhbmdlUmF0ZSk7XG5cbiAgICAgICAgJCgnI2N1cnJlbmN5IGgyJykudGV4dChgJDEgJHt1c2VyQ3VycmVuY3l9ID0gJHthcHAuY3VycmVuY3kuc3ltYm9sfSAke2FwcC5jdXJyZW5jeS5leGNoYW5nZVJhdGUudG9GaXhlZCgyKX0gJHtkZXN0aW5hdGlvbkN1cnJlbmN5fWApXG5cbiAgICB9KTtcbn1cblxuYXBwLmRpc3BsYXlFcnJvciA9IChkaXZJRCwgdG9waWMpID0+IHtcbiAgICBjb25zdCB0aXRsZSA9IGA8aDE+JHt0b3BpY308L2gxPmA7XG4gICAgY29uc29sZS5sb2coJ2Vycm9yJyk7XG4gICAgJChgIyR7ZGl2SUR9YCkuYXBwZW5kKHRpdGxlLCBgPGgyPlNvcnJ5LCB3ZSBkb24ndCBoYXZlIGRldGFpbGVkIGluZm9ybWF0aW9uIGFib3V0ICR7dG9waWN9IGluIHRoaXMgYXJlYS4gVHJ5IHlvdXIgc2VhcmNoIGFnYWluIGluIGEgbmVhcmJ5IGNpdHkgb3IgcmVsYXRlZCBhcmVhLjwvaDI+YCk7XG59XG5cblxuYXBwLmRpc3BsYXlDdXJyZW5jeSA9IChvYmplY3QpID0+IHtcbiAgICBjb25zdCB0aXRsZSA9IGA8aDM+Q3VycmVuY3k8L2gzPmA7XG4gICAgY29uc3QgaHRtbCA9IGA8aDI+VGhlIGN1cnJlbmN5IHVzZWQgaXMgJHtvYmplY3Quc3ltYm9sfSAke29iamVjdC5jb2RlfTwvaDI+YDtcbiAgICBjb25zdCBpbnB1dCA9IGA8Zm9ybSBpZD1cInVzZXJDdXJyZW5jeVwiPjxpbnB1dCBjbGFzcz1cInVzZXJDdXJyZW5jeSAgdHlwZT1cInNlYXJjaFwiIGlkPVwidXNlclwiIHBsYWNlaG9sZGVyPVwiRW50ZXIgeW91ciBsb2NhdGlvbi5cIj48YnV0dG9uIGNsYXNzPVwic3VibWl0XCI+Q29udmVydDwvYnV0dG9uPjwvZm9ybT5gO1xuICAgICQoJyNjdXJyZW5jeScpLmFwcGVuZCh0aXRsZSxodG1sLCBpbnB1dCk7XG4gICAgYXBwLmdldFVzZXJJbmZvKCk7XG59XG5cbmFwcC5nZXRVc2VySW5mbyA9ICgpID0+IHtcbiAgICBhcHAuaW5pdEF1dG9jb21wbGV0ZSgndXNlcicpO1xuICAgICQoJyN1c2VyQ3VycmVuY3knKS5vbignc3VibWl0JywgZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0IHVzZXJMb2NhdGlvbiA9ICQoJyN1c2VyJykudmFsKCk7XG4gICAgICAgIGFwcC5nZXRVc2VyTG9jYXRpb24odXNlckxvY2F0aW9uKTtcbiAgICB9KTtcbn1cblxuYXBwLmdldFVzZXJMb2NhdGlvbiA9IChsb2NhdGlvbikgPT4ge1xuICAgIG5ldyBnb29nbGUubWFwcy5wbGFjZXMuQXV0b2NvbXBsZXRlKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd1c2VyJykpO1xuICAgIGNvbnN0IGdlb2NvZGVyID0gbmV3IGdvb2dsZS5tYXBzLkdlb2NvZGVyKCk7XG4gICAgZ2VvY29kZXIuZ2VvY29kZSh7XG4gICAgICAgICdhZGRyZXNzJzogbG9jYXRpb25cbiAgICB9LCAocmVzdWx0cywgc3RhdHVzKSA9PiB7XG4gICAgICAgIGlmIChzdGF0dXMgPT0gZ29vZ2xlLm1hcHMuR2VvY29kZXJTdGF0dXMuT0spIHtcbiAgICAgICAgICAgIGNvbnN0IGFkZHJlc3NDb21wb25lbnRzID0gcmVzdWx0c1swXS5hZGRyZXNzX2NvbXBvbmVudHMuZmlsdGVyKChjb21wb25lbnQpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29tcG9uZW50LnR5cGVzWzBdID09PSAnY291bnRyeSc7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGFwcC51c2VyLmNvdW50cnlDb2RlID0gYWRkcmVzc0NvbXBvbmVudHNbMF0uc2hvcnRfbmFtZTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGFwcC51c2VyLmNvdW50cnlDb2RlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFsZXJ0KCdTb3JyeSwgc29tZXRoaW5nIHdlbnQgd3JvbmcuJyArIHN0YXR1cylcbiAgICAgICAgfVxuICAgIGFwcC5nZXRVc2VyQ3VycmVuY3koYXBwLnVzZXIuY291bnRyeUNvZGUpO1xuICAgIH0pOyAgICBcbn1cblxuYXBwLmdldFVzZXJDdXJyZW5jeSA9IChjb3VudHJ5Q29kZSkgPT4ge1xuICAgICQuYWpheCh7XG4gICAgICAgIHVybDogYGh0dHBzOi8vcmVzdGNvdW50cmllcy5ldS9yZXN0L3YyL25hbWUvJHtjb3VudHJ5Q29kZX1gLFxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBmdWxsVGV4dDogdHJ1ZVxuICAgICAgICB9XG4gICAgfSkudGhlbigocmVzKSA9PiB7XG4gICAgICAgIGFwcC51c2VyLmNvZGUgPSByZXNbMF0uY3VycmVuY2llc1swXS5jb2RlO1xuICAgICAgICBjb25zb2xlLmxvZyhhcHAudXNlci5jb2RlKTtcbiAgICAgICAgYXBwLmNvbnZlcnRDdXJyZW5jeShhcHAudXNlci5jb2RlLCBhcHAuY3VycmVuY3kuY29kZSk7XG4gICAgfSk7XG59XG5cblxuYXBwLmRpc3BsYXlMYW5ndWFnZSA9IChvYmplY3QpID0+IHtcbiAgICBjb25zb2xlLmxvZyhvYmplY3QubmFtZSwgb2JqZWN0Lm5hdGl2ZU5hbWUpO1xuICAgIGNvbnN0IHRpdGxlID0gYDxoMz5MYW5ndWFnZTwvaDM+YDtcbiAgICBjb25zdCBwcmltYXJ5ID0gYDxoMj5QcmltYXJ5PC9oMj48aDQ+JHtvYmplY3QucHJpbWFyeX08L2g0PmA7XG4gICAgY29uc3Qgc2Vjb25kYXJ5ID0gYDxoMj5TZWNvbmRhcnk8L2gyPjxoND4ke29iamVjdC5zZWNvbmRhcnl9PC9oND5gO1xuICAgICQoJyNsYW5ndWFnZScpLmFwcGVuZCh0aXRsZSwgcHJpbWFyeSlcbiAgICBpZiAob2JqZWN0LnNlY29uZGFyeSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICQoJyNsYW5ndWFnZScpLmFwcGVuZChzZWNvbmRhcnkpO1xuICAgIH0gXG59XG5cbmFwcC5kaXNwbGF5QWlycG9ydHMgPSAob2JqZWN0KSA9PiB7XG4gICAgY29uc3QgdGl0bGUgPSBgPGgzPkNsb3Nlc3QgQWlycG9ydDwvaDM+YDtcbiAgICBjb25zdCBuYW1lID0gYDxoND4ke29iamVjdC5uYW1lfTwvaDQ+YDtcbiAgICAvLyBjb25zdCBkZXNjID0gYDxwPiR7b2JqZWN0LmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgIC8vIGNvbnN0IHBob3RvID0gYDxpbWcgc3JjPVwiJHtvYmplY3QucGhvdG99XCIvPmA7XG4gICAgJCgnI2FpcnBvcnQnKS5hcHBlbmQodGl0bGUsIG5hbWUpO1xufVxuXG4vLyBtZXRob2QgdG8gZGlzcGxheSB0b3Vyc1xuLy8gaSByZWFsaXplZCB3aGVuIHRoZXJlJ3MgYSBsb3Qgb2YgcmVzdWx0cywgaXQncyBub3QgaWRlYWwgZm9yIG1vYmlsZSB1c2Vyc1xuLy8gc28gaSB0cmllZCBzb21lIHNpbXBsZSBcInBhZ2luYXRpb25cIiB3aGVuIHRoZSBzY3JlZW4gd2lkdGggaXMgbGVzcyB0aGFuIDYwMHB4XG4vLyBjcmVhdGUgMiB2YXJpYWJsZXMsIG9uZSB0byBhY3QgYXMgYSBcImNvdW50ZXJcIiBhbmQgb25lIHRvIGRpY3RhdGUgcmVzdWx0cyBwZXIgcGFnZVxuLy8gd2hlbiB1c2VyIGNsaWNrcyAnbG9hZCBtb3JlJywgaXQgYXBwZW5kcyB0aGUgbmV4dCB0aHJlZSByZXN1bHRzLCByZW1vdmVzIHRoZSBidXR0b24sIGFuZCBhcHBlbmRzIGEgbmV3IGJ1dHRvbiBhdCB0aGUgZW5kIG9mIHRoZSBuZXcgcmVzdWx0c1xuYXBwLmRpc3BsYXlUb3VycyA9IChhcnJheSkgPT4ge1xuICAgIGNvbnN0IHRpdGxlID0gYDxoMz5Ub3AgVG91cnM8L2gzPmA7XG4gICAgJCgnI3RvdXJzJykuYXBwZW5kKHRpdGxlKTtcbiAgICBcbiAgICBpZiAoJCh3aW5kb3cpLndpZHRoKCkgPD0gNjAwKSB7XHRcbiAgICAgICAgbGV0IGNvdW50ZXIgPSAwO1xuICAgICAgICBsZXQgcmVzdWx0c1BlclBhZ2UgPSAzO1xuICAgICAgICBmb3IgKGxldCBpID0gY291bnRlcjsgaSA8IHJlc3VsdHNQZXJQYWdlOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGRpdiA9ICQoJzxkaXYgY2xhc3M9XCJjbGVhcmZpeCBodnItc2hhZG93XCI+Jyk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gYDxoMj4ke2FycmF5W2ldLm5hbWV9PGgyPmBcbiAgICAgICAgICAgIGNvbnN0IHBob3RvID0gYDxpbWcgY2xhc3M9XCJodnItZ3Jvdy1zaGFkb3dcIiBzcmM9XCIke2FycmF5W2ldLnBob3RvfVwiPmA7XG4gICAgICAgICAgICBjb25zdCBsaW5rID0gYDxhIGNsYXNzPVwiaHZyLXVuZGVybGluZS1mcm9tLWNlbnRlclwiIGhyZWY9XCIke2FycmF5LnVybH1cIj5Cb29rIE5vdzwvYT5gO1xuXG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gJChgPGRpdj5gKS5hcHBlbmQobmFtZSwgbGluayk7XG4gICAgICAgICAgICBkaXYuYXBwZW5kKHBob3RvLCB0ZXh0KTtcbiAgICAgICAgICAgICQoJyN0b3VycycpLmFwcGVuZChkaXYpO1xuICAgICAgICB9ICAgIFxuXG4gICAgICAgIGNvbnN0IGxvYWRNb3JlID0gYDxidXR0b24gY2xhc3M9XCJsb2FkTW9yZSBodnItZ3Jvdy1zaGFkb3dcIj5Mb2FkIE1vcmU8L2J1dHRvbj5gO1xuICAgICAgICAkKCcjdG91cnMnKS5hcHBlbmQobG9hZE1vcmUpO1xuICAgICAgICAkKCcjdG91cnMnKS5vbignY2xpY2snLCAnLmxvYWRNb3JlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB0aGlzLnJlbW92ZSgpO1xuICAgICAgICAgICAgY291bnRlcis9MztcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSBjb3VudGVyOyBpIDwgKGNvdW50ZXIgKyByZXN1bHRzUGVyUGFnZSk7IGkrKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpdiA9ICQoJzxkaXYgY2xhc3M9XCJjbGVhcmZpeCBodnItc2hhZG93XCI+Jyk7XG4gICAgICAgICAgICAgICAgY29uc3QgbmFtZSA9IGA8aDI+JHthcnJheVtpXS5uYW1lfTxoMj5gXG4gICAgICAgICAgICAgICAgY29uc3QgcGhvdG8gPSBgPGltZyBjbGFzcz1cImh2ci1ncm93LXNoYWRvd1wiICBzcmM9XCIke2FycmF5W2ldLnBob3RvfVwiPmA7XG4gICAgICAgICAgICAgICAgY29uc3QgbGluayA9IGA8YSBjbGFzcz1cImh2ci11bmRlcmxpbmUtZnJvbS1jZW50ZXJcIiBocmVmPVwiJHthcnJheS51cmx9XCI+Qm9vayBOb3c8L2E+YDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gJChgPGRpdj5gKS5hcHBlbmQobmFtZSwgbGluayk7XG4gICAgICAgICAgICAgICAgZGl2LmFwcGVuZChwaG90bywgdGV4dCk7XG4gICAgICAgICAgICAgICAgJCgnI3RvdXJzJykuYXBwZW5kKGRpdik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkKCcjdG91cnMnKS5hcHBlbmQobG9hZE1vcmUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBpZiBzY3JlZW4gd2lkdGggaXMgbm90IGxlc3MgdGhhbiA2MDBweCwgYXBwZW5kIGVsZW1lbnRzIG5vcm1hbGx5XG5cdH0gZWxzZSB7XG4gICAgICAgIGFycmF5LmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRpdiA9ICQoJzxkaXYgY2xhc3M9XCJjbGVhcmZpeCBodnItc2hhZG93XCI+Jyk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gYDxoMj4ke2l0ZW0ubmFtZX08aDI+YDtcbiAgICAgICAgICAgIGNvbnN0IHBob3RvID0gYDxpbWcgY2xhc3M9XCJodnItZ3Jvdy1zaGFkb3dcIiBzcmM9XCIke2l0ZW0ucGhvdG99XCI+YDtcbiAgICAgICAgICAgIGNvbnN0IGxpbmsgPSBgPGEgY2xhc3M9XCJodnItdW5kZXJsaW5lLWZyb20tY2VudGVyXCIgaHJlZj1cIiR7aXRlbS51cmx9XCI+Qm9vayBOb3c8L2E+YDtcbiAgICAgICAgICAgIGNvbnN0IHRleHQgPSAkKCc8ZGl2PicpLmFwcGVuZChuYW1lLCBsaW5rKTtcbiAgICAgICAgICAgIGRpdi5hcHBlbmQocGhvdG8sIHRleHQpO1xuICAgICAgICAgICAgJCgnI3RvdXJzJykuYXBwZW5kKGRpdik7XG4gICAgICAgIH0pO1xuICAgIH1cbn1cblxuLy8gbWV0aG9kIHRvIGRpc3BsYXkgcG9pbnRzIG9mIGludGVyZXN0XG4vLyBzYW1lIFwicGFnaW5hdGlvblwiIHN5c3RlbSBhcyB0b3Vyc1xuYXBwLmRpc3BsYXlQT0lzID0gKGFycmF5KSA9PiB7XG4gICAgY29uc3QgdGl0bGUgPSBgPGgzPlBvaW50cyBvZiBJbnRlcmVzdDwvaDM+YDtcbiAgICAkKCcjcG9pJykuYXBwZW5kKHRpdGxlKTtcbiAgICBpZiAoJCh3aW5kb3cpLndpZHRoKCkgPD0gNjAwKSB7XHRcbiAgICAgICAgbGV0IGNvdW50ZXIgPSAwO1xuICAgICAgICBsZXQgcmVzdWx0c1BlclBhZ2UgPSAzO1xuICAgICAgICBmb3IgKGxldCBpID0gY291bnRlcjsgaSA8IHJlc3VsdHNQZXJQYWdlOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGRpdiA9ICQoYDxkaXYgY2xhc3M9XCJjbGVhcmZpeCBodnItc2hhZG93XCI+YCk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gYDxoMj4ke2FycmF5W2ldLm5hbWV9PGgyPmA7XG4gICAgICAgICAgICBjb25zdCBkZXNjID0gYDxwPiR7YXJyYXlbaV0uZGVzY3JpcHRpb259PC9wPmA7XG4gICAgICAgICAgICBjb25zdCBwaG90byA9IGA8aW1nIGNsYXNzPVwiaHZyLWdyb3ctc2hhZG93XCIgc3JjPVwiJHthcnJheVtpXS5waG90b31cIj5gO1xuICAgICAgICAgICAgY29uc3QgdGV4dCA9ICQoJzxkaXY+JykuYXBwZW5kKG5hbWUsIGRlc2MpO1xuXG4gICAgICAgICAgICBkaXYuYXBwZW5kKHBob3RvLCB0ZXh0KTtcbiAgICAgICAgICAgICQoJyNwb2knKS5hcHBlbmQoZGl2KTtcbiAgICAgICAgfSAgICBcblxuICAgICAgICBjb25zdCBsb2FkTW9yZSA9IGA8YnV0dG9uIGNsYXNzPVwibG9hZE1vcmUgaHZyLWdyb3ctc2hhZG93XCI+TG9hZCBNb3JlPC9idXR0b24+YDtcbiAgICAgICAgJCgnI3BvaScpLmFwcGVuZChsb2FkTW9yZSk7XG5cbiAgICAgICAgJCgnI3BvaScpLm9uKCdjbGljaycsICcubG9hZE1vcmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgICAgICAgICBjb3VudGVyKz0zO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGNvdW50ZXI7IGkgPCAoY291bnRlciArIHJlc3VsdHNQZXJQYWdlKTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGl2ID0gJChgPGRpdiBjbGFzcz1cImNsZWFyZml4IGh2ci1zaGFkb3dcIj5gKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gYDxoMj4ke2FycmF5W2ldLm5hbWV9PGgyPmA7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVzYyA9IGA8cD4ke2FycmF5W2ldLmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBob3RvID0gYDxpbWcgY2xhc3M9XCJodnItZ3Jvdy1zaGFkb3dcIiBzcmM9XCIke2FycmF5W2ldLnBob3RvfVwiPmA7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9ICQoJzxkaXY+JykuYXBwZW5kKG5hbWUsIGRlc2MpO1xuICAgIFxuICAgICAgICAgICAgICAgIGRpdi5hcHBlbmQocGhvdG8sIHRleHQpO1xuICAgICAgICAgICAgICAgICQoJyNwb2knKS5hcHBlbmQoZGl2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQoJyNwb2knKS5hcHBlbmQobG9hZE1vcmUpO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gZWxzZSBqdXN0IGFwcGVuZCBhbGwgdGhlIHJlc3VsdHMgbm9ybWFsbHlcblx0fSBlbHNlIHsgICAgXG4gICAgICAgIGFycmF5LmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRpdiA9ICQoYDxkaXYgY2xhc3M9XCJjbGVhcmZpeCBodnItc2hhZG93XCI+YCk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gYDxoMj4ke2l0ZW0ubmFtZX08aDI+YDtcbiAgICAgICAgICAgIGNvbnN0IGRlc2MgPSBgPHA+JHtpdGVtLmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgICAgICAgICAgY29uc3QgcGhvdG8gPSBgPGltZyBjbGFzcz1cImh2ci1ncm93LXNoYWRvd1wiIHNyYz1cIiR7aXRlbS5waG90b31cIj5gO1xuICAgICAgICAgICAgY29uc3QgdGV4dCA9ICQoJzxkaXY+JykuYXBwZW5kKG5hbWUsIGRlc2MpO1xuICAgICAgICAgICAgZGl2LmFwcGVuZChwaG90bywgdGV4dCk7XG4gICAgICAgICAgICAkKCcjcG9pJykuYXBwZW5kKGRpdik7XG4gICAgICAgIH0pO1xuICAgIH0gICAgXG59XG5cbmFwcC5kaXNwbGF5V2VhdGhlciA9IChvYmplY3QpID0+IHtcbiAgICBjb25zdCB0aXRsZSA9IGA8aDM+V2VhdGhlcjwvaDM+YDtcbiAgICBjb25zdCBpY29uID0gYDxjYW52YXMgaWQ9XCIke29iamVjdC5pY29ufVwiIHdpZHRoPVwiODBcIiBoZWlnaHQ9XCI4MFwiPjwvY2FudmFzPmA7XG4gICAgY29uc3QgaHRtbCA9IGA8aDI+Q3VycmVudGx5OjwvaDI+IFxuICAgIDxoND4ke29iamVjdC5jdXJyZW50VGVtcH3CsEM8L2g0PlxuICAgICAgICA8cCBjbGFzcz1cIndlYXRoZXJUZXh0XCI+JHtvYmplY3QuY29uZGl0aW9uc308L3A+YFxuICAgICQoJyN3ZWF0aGVyJykuYXBwZW5kKHRpdGxlLCBpY29uLCBodG1sKTtcbiAgICBhcHAubG9hZEljb25zKCk7XG59XG5cbmFwcC5yYW5kb21IZXJvID0gKCkgPT4ge1xuICAgIGxldCBpID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogNSkgKyAxXG4gICAgY29uc29sZS5sb2coaSk7XG4gICAgJCgnLnNwbGFzaFBhZ2UnKS5jc3Moe1xuICAgICAgICAnYmFja2dyb3VuZCc6IGBsaW5lYXItZ3JhZGllbnQocmdiYSgwLDAsMCwwLjUpLCByZ2JhKDAsMCwwLDAuNSkpLCB1cmwoXCJwdWJsaWMvYXNzZXRzL2hlcm8ke2l9LmpwZ1wiKWAsXG4gICAgICAgICdiYWNrZ3JvdW5kLXBvc2l0aW9uJzogJ2NlbnRlcicsXG5cdCAgICAnYmFja2dyb3VuZC1zaXplJzogJ2NvdmVyJ1x0XG4gICAgfSk7XG59XG5cbmFwcC5sb2FkSWNvbnMgPSAoKSA9PiB7XG4gICAgdmFyIGljb25zID0gbmV3IFNreWNvbnMoe1wiY29sb3JcIjogXCJibGFja1wifSk7XG4gICAgaWNvbnMuc2V0KFwiY2xlYXItZGF5XCIsIFNreWNvbnMuQ0xFQVJfREFZKTtcbiAgICBpY29ucy5zZXQoXCJjbGVhci1uaWdodFwiLCBTa3ljb25zLkNMRUFSX05JR0hUKTtcbiAgICBpY29ucy5zZXQoXCJwYXJ0bHktY2xvdWR5LWRheVwiLCBTa3ljb25zLlBBUlRMWV9DTE9VRFlfREFZKTtcbiAgICBpY29ucy5zZXQoXCJwYXJ0bHktY2xvdWR5LW5pZ2h0XCIsIFNreWNvbnMuUEFSVExZX0NMT1VEWV9OSUdIVCk7XG4gICAgaWNvbnMuc2V0KFwiY2xvdWR5XCIsIFNreWNvbnMuQ0xPVURZKTtcbiAgICBpY29ucy5zZXQoXCJyYWluXCIsIFNreWNvbnMuUkFJTik7XG4gICAgaWNvbnMuc2V0KFwic2xlZXRcIiwgU2t5Y29ucy5TTEVFVCk7XG4gICAgaWNvbnMuc2V0KFwic25vd1wiLCBTa3ljb25zLlNOT1cpO1xuICAgIGljb25zLnNldChcIndpbmRcIiwgU2t5Y29ucy5XSU5EKTtcbiAgICBpY29ucy5zZXQoXCJmb2dcIiwgU2t5Y29ucy5GT0cpO1xuICAgIGljb25zLnBsYXkoKTtcbn1cblxuYXBwLmV2ZW50cyA9ICgpID0+IHtcbiAgICBhcHAuaW5pdEF1dG9jb21wbGV0ZSgnZGVzdGluYXRpb24nKTtcbiAgIFxuICAgICQoJ2Zvcm0nKS5vbignc3VibWl0JywgKGUpID0+IHtcbiAgICAgICAgY29uc3QgZGVzdGluYXRpb24gPSAkKCcjZGVzdGluYXRpb24nKS52YWwoKTtcbiAgICAgICAgaWYgKGRlc3RpbmF0aW9uLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICQoJy5jb250ZW50U2VhcmNoRm9ybScpLnRvZ2dsZShmYWxzZSk7XG4gICAgICAgICAgICAkKCcjZGVzdGluYXRpb25OYW1lJykudG9nZ2xlKHRydWUpO1xuICAgICAgICAgICAgJCgnI3NwbGFzaFBhZ2UnKS50b2dnbGUoZmFsc2UpO1xuICAgICAgICAgICAgJCgnI2NvbnRlbnRQYWdlJykudG9nZ2xlKHRydWUpO1xuICAgICAgICAgICAgJCgnZm9ybScpLnJlbW92ZUNsYXNzKCdzcGxhc2hTZWFyY2hGb3JtJyk7XG4gICAgICAgICAgICAkKCcjZGVzdGluYXRpb24nKS5yZW1vdmVDbGFzcygnc3BsYXNoU2VhcmNoQmFyJyk7XG4gICAgICAgICAgICAkKCcjc3VibWl0QnV0dG9uJykucmVtb3ZlQ2xhc3MoJ3NwbGFzaFNlYXJjaEJ1dHRvbicpO1xuICAgICAgICAgICAgJCgnI3N1Ym1pdEJ1dHRvbicpLmFkZENsYXNzKCdjb250ZW50U2VhcmNoQnV0dG9uJyk7XG4gICAgICAgICAgICAkKCdmb3JtJykuYWRkQ2xhc3MoJ2NvbnRlbnRTZWFyY2hGb3JtJyk7XG4gICAgICAgICAgICAkKCcjZGVzdGluYXRpb24nKS5hZGRDbGFzcygnY29udGVudFNlYXJjaEJhcicpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgJCgnZGl2JykuZW1wdHkoKTtcbiAgICAgICAgICAgICQoJyNkZXN0aW5hdGlvbk5hbWUnKS50ZXh0KGRlc3RpbmF0aW9uKTtcbiAgICAgICAgICAgIGFwcC5nZXREZXN0aW5hdGlvbkluZm8oZGVzdGluYXRpb24pO1xuICAgICAgICB9XG4gICAgICAgIGFwcC5kZXN0aW5hdGlvbiA9IHt9O1xuICAgICAgICBhcHAud2VhdGhlciA9IHt9O1xuICAgICAgICBhcHAuY3VycmVuY3k9IHt9O1xuICAgICAgICBhcHAuUE9JcyA9IFtdO1xuICAgICAgICBhcHAuZXhjaGFuZ2VSYXRlO1xuICAgICAgICBhcHAudG91cnMgPSBbXTtcbiAgICAgICAgYXBwLmFpcnBvcnQgPSB7fTtcbiAgICAgICAgYXBwLmxhbmd1YWdlcyA9IHt9O1xuICAgICAgICAkKCcjZGVzdGluYXRpb24nKS52YWwoJycpO1xuICAgIH0pO1xuXG4gICAgJCgnI3NlYXJjaE1lbnUnKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgJCgnLmNvbnRlbnRTZWFyY2hGb3JtJykudG9nZ2xlKCk7XG4gICAgICAgICQoJyNkZXN0aW5hdGlvbk5hbWUnKS50b2dnbGUoKTtcbiAgICB9KTtcbn1cblxuYXBwLmluaXQgPSAoKSA9PiB7XG4gICAgYXBwLnJhbmRvbUhlcm8oKTtcbiAgICBhcHAuaW5pdEF1dG9jb21wbGV0ZSgnZGVzdGluYXRpb24nKTtcbiAgICAkKCcjY29udGVudFBhZ2UnKS50b2dnbGUoZmFsc2UpO1xuICAgIGFwcC5ldmVudHMoKTtcbn1cblxuJChmdW5jdGlvbiAoKSB7XG4gICAgY29uc29sZS5sb2coXCJyZWFkeSFcIik7XG4gICAgYXBwLmluaXQoKTtcbn0pOyJdfQ==
