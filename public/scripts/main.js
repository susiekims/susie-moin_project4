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
app.sygicKey = 'MOmJoKEgCz2GyFIO9dOcS5scrkSq8CkB1lPYLHe8';

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
            console.log(app.destination.countryCode);
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
            'x-api-key': app.sygicKey
        },
        data: {
            'location': latitude + ',' + longitude
        }
    }).then(function (res) {
        var data = res.data.places[0];

        // we specifically want to target cities
        // if that result is a level smaller than a city, target the next parent ID
        if (data.level !== 'city') {
            var cityCode = data.parent_ids[0];
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
            'x-api-key': app.sygicKey
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
            'x-api-key': app.sygicKey
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
            'x-api-key': app.sygicKey
        },
        data: {
            'parent_place_id': cityCode
        }
    }).then(function (res) {
        var list = res.data.tours;
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
        app.currency.exchangeRate = res[userCurrency + '_' + destinationCurrency];

        $('#currency h2').text('$1 ' + userCurrency + ' = ' + app.currency.symbol + ' ' + app.currency.exchangeRate.toFixed(2) + ' ' + destinationCurrency);
    });
};

app.displayError = function (divID, topic) {
    $('#' + divID).find('i').toggle(false);
    var title = '<h3>' + topic + '</h3>';
    $('#' + divID).append(title, '<h2>Sorry, we don\'t have detailed information about ' + topic + ' in this area. Try your search again in a related city or nearby region.</h2>');
};

app.displayCurrency = function (object) {
    $('#currency').find('i').toggle(false);
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
        app.convertCurrency(app.user.code, app.currency.code);
    });
};

app.displayLanguage = function (object) {
    $('#language').find('i').toggle(false);
    var title = '<h3>Language</h3>';
    var primary = '<h2>Primary</h2><h4>' + object.primary + '</h4>';
    var secondary = '<h2>Secondary</h2><h4>' + object.secondary + '</h4>';
    $('#language').append(title, primary);
    if (object.secondary !== undefined) {
        $('#language').append(secondary);
    }
};

app.displayAirports = function (object) {
    $('#airport').find('i').toggle(false);
    var title = '<h3>Closest Airport</h3>';
    var name = '<h4>' + object.name + '</h4>';
    $('#airport').append(title, name);
};

// method to display tours
// i realized when there's a lot of results, it's not ideal for mobile users
// so i tried some simple "pagination" when the screen width is less than 600px
// create 2 variables, one to act as a "counter" and one to dictate results per page
// when user clicks 'load more', it appends the next three results, removes the button, and appends a new button at the end of the new results
app.displayTours = function (array) {
    $('#tours').find('i').toggle(false);
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
            counter += resultsPerPage;
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
    $('#poi').find('i').toggle(false);
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
    $('#weather').find('i').toggle(false);
    var degrees = '';
    var title = '<h3>Weather</h3>';
    var icon = '<canvas id="' + object.icon + '" width="80" height="80"></canvas>';
    if (app.destination.countryCode === 'US') {
        degrees = 'F';
    } else {
        degrees = 'C';
    }
    var html = '<h2>Currently:</h2> \n    <h4>' + object.currentTemp + '\xB0' + degrees + '</h4>\n        <p class="weatherText">' + object.conditions + '</p>';
    $('#weather').append(title, icon, html);
    app.loadIcons();
};

app.randomHero = function () {
    var i = Math.floor(Math.random() * 10) + 1;
    $('.splashPage').css({
        'background': 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url("public/assets/hero' + i + '.jpg")',
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
        $('.content').empty();
        $('.content').each(function () {
            $(this).append('<i class="fas fa-plane hvr-icon loader"></i>');
        });
        var destination = $('#destination').val();
        if (destination.length > 0) {
            $('#splashPage').toggle(false);
            $('#contentPage').toggle(true);
            $('form').removeClass('splashSearchForm');
            $('#destination').removeClass('splashSearchBar');
            $('#submitButton').removeClass('splashSearchButton');
            $('#submitButton').addClass('contentSearchButton');
            $('form').addClass('contentSearchForm');
            $('#destination').addClass('contentSearchBar');
            e.preventDefault();
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
    });
};

app.init = function () {
    app.randomHero();
    app.initAutocomplete('destination');
    $('#contentPage').toggle(false);
    app.events();
};

$(function () {
    app.init();
});

var searchAdrress = '${address.components[0].longname}, ';

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYvc2NyaXB0cy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNBQTtBQUNBLElBQU0sTUFBTSxFQUFaOztBQUVBO0FBQ0EsSUFBSSxJQUFKLEdBQVcsRUFBWDtBQUNBLElBQUksV0FBSixHQUFrQixFQUFsQjtBQUNBLElBQUksT0FBSixHQUFjLEVBQWQ7QUFDQSxJQUFJLFFBQUosR0FBYyxFQUFkO0FBQ0EsSUFBSSxJQUFKLEdBQVcsRUFBWDtBQUNBLElBQUksWUFBSjtBQUNBLElBQUksS0FBSixHQUFZLEVBQVo7QUFDQSxJQUFJLE9BQUosR0FBYyxFQUFkO0FBQ0EsSUFBSSxRQUFKLEdBQWUsRUFBZjtBQUNBLElBQUksUUFBSixHQUFlLDBDQUFmOztBQUVBO0FBQ0E7QUFDQSxJQUFJLGdCQUFKLEdBQXVCLFVBQUMsRUFBRCxFQUFRO0FBQzNCLFFBQUksT0FBTyxJQUFQLENBQVksTUFBWixDQUFtQixZQUF2QixDQUFvQyxTQUFTLGNBQVQsQ0FBd0IsRUFBeEIsQ0FBcEM7QUFDSCxDQUZEOztBQUlBO0FBQ0E7QUFDQSxJQUFJLGtCQUFKLEdBQXlCLFVBQUMsUUFBRCxFQUFjO0FBQ25DLFFBQU0sV0FBVyxJQUFJLE9BQU8sSUFBUCxDQUFZLFFBQWhCLEVBQWpCO0FBQ0EsYUFBUyxPQUFULENBQWlCO0FBQ2IsbUJBQVc7QUFERSxLQUFqQixFQUVHLFVBQUMsT0FBRCxFQUFVLE1BQVYsRUFBcUI7QUFDcEI7QUFDQSxZQUFJLFVBQVUsT0FBTyxJQUFQLENBQVksY0FBWixDQUEyQixFQUF6QyxFQUE2QztBQUN6QyxnQkFBTSxvQkFBb0IsUUFBUSxDQUFSLEVBQVcsa0JBQVgsQ0FBOEIsTUFBOUIsQ0FBcUMsVUFBQyxTQUFELEVBQWU7QUFDMUUsdUJBQU8sVUFBVSxLQUFWLENBQWdCLENBQWhCLE1BQXVCLFNBQTlCO0FBQ0gsYUFGeUIsQ0FBMUI7QUFHQTtBQUNB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dXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvLyBjcmVhdGUgZW1wdHkgb2JqZWN0IHRvIHN0b3JlIGFsbCBtZXRob2RzXG5jb25zdCBhcHAgPSB7fTtcblxuLy8gY3JlYXRlIGVtcHR5IG9iamVjdHMvYXJyYXlzIG9uIGFwcCBvYmplY3QgdG8gc3RvcmUgdGhlIGluZm9ybWF0aW9uIHRvIGJlIHVzZWQgbGF0ZXIgb25cbmFwcC51c2VyID0ge307XG5hcHAuZGVzdGluYXRpb24gPSB7fTtcbmFwcC53ZWF0aGVyID0ge307XG5hcHAuY3VycmVuY3k9IHt9O1xuYXBwLlBPSXMgPSBbXTtcbmFwcC5leGNoYW5nZVJhdGU7XG5hcHAudG91cnMgPSBbXTtcbmFwcC5haXJwb3J0ID0ge307XG5hcHAubGFuZ3VhZ2UgPSB7fTtcbmFwcC5zeWdpY0tleSA9ICdNT21Kb0tFZ0N6Mkd5RklPOWRPY1M1c2Nya1NxOENrQjFsUFlMSGU4JztcblxuLy8gbWV0aG9kIHRvIGluaXQgR29vZ2xkZSBBdXRvY29tcGxldGU7XG4vLyB0YWtlcyBwYXJhbWV0ZXIgb2YgYW4gaWQgdG8gdGFyZ2V0IHNwZWNpZmljIGlucHV0IHRhZ3NcbmFwcC5pbml0QXV0b2NvbXBsZXRlID0gKGlkKSA9PiB7XG4gICAgbmV3IGdvb2dsZS5tYXBzLnBsYWNlcy5BdXRvY29tcGxldGUoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpKTtcbn1cblxuLy8gbW9zdCBvZiB0aGUgQVBJcyB3ZSBhcmUgcmVxdWVzdGluZyBkYXRhIGZyb20gYWNjZXB0IGxvY2F0aW9uIGluZm8gaW4gdGhlIGZvcm0gb2YgbGF0IGxuZyBjb29yZHNcbi8vIHNvIHdlIGVudGVyIHRoZSB1c2VyJ3MgaW5wdXQgaW50byBHb29nbGUgZ2VvY29kZXIgdG8gZ2V0IGxhdCBhbmQgbG5nIGNvb3JkcyB0byB1c2UgaW4gb3RoZXIgQVBJIHJlcXVlc3RzXG5hcHAuZ2V0RGVzdGluYXRpb25JbmZvID0gKGxvY2F0aW9uKSA9PiB7XG4gICAgY29uc3QgZ2VvY29kZXIgPSBuZXcgZ29vZ2xlLm1hcHMuR2VvY29kZXIoKTtcbiAgICBnZW9jb2Rlci5nZW9jb2RlKHtcbiAgICAgICAgJ2FkZHJlc3MnOiBsb2NhdGlvblxuICAgIH0sIChyZXN1bHRzLCBzdGF0dXMpID0+IHtcbiAgICAgICAgLy8gaWYgdGhlcmUgaXMgbm8gZXJyb3IsIGZpbHRlciB0aGUgcmVzdWx0IHNvIHRoYXQgdGhlIGNvbXBvbmVudCBpcyBhIFwiY291bnRyeVwiXG4gICAgICAgIGlmIChzdGF0dXMgPT0gZ29vZ2xlLm1hcHMuR2VvY29kZXJTdGF0dXMuT0spIHtcbiAgICAgICAgICAgIGNvbnN0IGFkZHJlc3NDb21wb25lbnRzID0gcmVzdWx0c1swXS5hZGRyZXNzX2NvbXBvbmVudHMuZmlsdGVyKChjb21wb25lbnQpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29tcG9uZW50LnR5cGVzWzBdID09PSAnY291bnRyeSc7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIC8vIG91dCBvZiB0aGUgcmVzdWx0cyBvZiB0aGUgZmlsdGVyLCBnZXQgdGhlIGluZm8gYW5kIHBvcHVsYXRlIHRoZSBhcHAuZGVzdGluYXRpb24gb2JqZWN0XG4gICAgICAgICAgICBhcHAuZGVzdGluYXRpb24uY291bnRyeUNvZGUgPSBhZGRyZXNzQ29tcG9uZW50c1swXS5zaG9ydF9uYW1lO1xuICAgICAgICAgICAgYXBwLmRlc3RpbmF0aW9uLmNvdW50cnlOYW1lID0gYWRkcmVzc0NvbXBvbmVudHNbMF0ubG9uZ19uYW1lO1xuICAgICAgICAgICAgYXBwLmRlc3RpbmF0aW9uLmxhdCA9IHJlc3VsdHNbMF0uZ2VvbWV0cnkubG9jYXRpb24ubGF0KCk7XG4gICAgICAgICAgICBhcHAuZGVzdGluYXRpb24ubG5nID0gcmVzdWx0c1swXS5nZW9tZXRyeS5sb2NhdGlvbi5sbmcoKTtcbiAgICAgICAgICAgIGFwcC5nZXRXZWF0aGVyKGFwcC5kZXN0aW5hdGlvbi5sYXQsIGFwcC5kZXN0aW5hdGlvbi5sbmcpO1xuICAgICAgICAgICAgYXBwLmdldEN1cnJlbmN5KGFwcC5kZXN0aW5hdGlvbi5jb3VudHJ5Q29kZSk7XG4gICAgICAgICAgICBhcHAuZ2V0Q2l0eUNvZGUoYXBwLmRlc3RpbmF0aW9uLmxhdCwgYXBwLmRlc3RpbmF0aW9uLmxuZyk7XG4gICAgICAgICAgICBhcHAuZ2V0TGFuZ3VhZ2UoYXBwLmRlc3RpbmF0aW9uLmNvdW50cnlDb2RlKTtcbiAgICAgICAgICAgIGFwcC5nZXRBaXJwb3J0cyhhcHAuZGVzdGluYXRpb24ubGF0LCBhcHAuZGVzdGluYXRpb24ubG5nKTtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGFwcC5kZXN0aW5hdGlvbi5jb3VudHJ5Q29kZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhbGVydChcIlNvbWV0aGluZyB3ZW50IHdyb25nLlwiICsgc3RhdHVzKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5cbi8vIGFqYXggY2FsbCB0byBnZXQgd2VhdGhlclxuLy8gdGFrZXMgbGF0IGFuZCBsbmcgY29vcmRzIGFzIHBhcmFtZXRlcnNcbmFwcC5nZXRXZWF0aGVyID0gKGxhdGl0dWRlLCBsb25naXR1ZGUpID0+IHtcbiAgICAkLmFqYXgoe1xuICAgICAgICB1cmw6IGBodHRwczovL2FwaS5kYXJrc2t5Lm5ldC9mb3JlY2FzdC9lYTJmN2E3YmFiM2RhYWNjOWY1NGYxNzc4MTlmYTFkMy8ke2xhdGl0dWRlfSwke2xvbmdpdHVkZX1gLFxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBkYXRhVHlwZTogJ2pzb25wJyxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgJ3VuaXRzJzogJ2F1dG8nXG4gICAgICAgIH1cbiAgICB9KVxuICAgIC50aGVuKChyZXMpID0+IHtcbiAgICAgICAgLy8gdGFrZSByZXN1bHQgYW5kIHB1bGwgZGVzaXJlZCBpbmZvcm1hdGlvbiBpbnRvIGFwcC53ZWF0aGVyIG9iamVjdFxuICAgICAgICBhcHAud2VhdGhlci5jb25kaXRpb25zID0gcmVzLmRhaWx5LnN1bW1hcnk7XG4gICAgICAgIGFwcC53ZWF0aGVyLmN1cnJlbnRUZW1wID0gTWF0aC5yb3VuZChyZXMuY3VycmVudGx5LnRlbXBlcmF0dXJlKTtcbiAgICAgICAgYXBwLndlYXRoZXIuaWNvbiA9IHJlcy5kYWlseS5pY29uO1xuICAgICAgICBhcHAuZGlzcGxheVdlYXRoZXIoYXBwLndlYXRoZXIpO1xuICAgICAgICBcbiAgICB9KTtcbn1cblxuLy8gaSBmb3VuZCB0aGF0IHRoZSBwb2ludHMgb2YgaW50ZXJlc3QgYW5kIHRvdXJzIHJlcXVlc3Qgd29ya3MgYmV0dGVyIHdpdGggYSBjaXR5IGNvZGUgaW5zdGVhZCBvZiBsYXQgYW5kIGxuZyBjb29yZHNcbi8vIG1ldGhvZCB0byBnZXQgY2l0eSBjb2RlIGZyb20gbGF0IGFuZCBsbmcgdG8gdXNlIGluIG90aGVyIGFqYXggcmVxdWVzdHNcbmFwcC5nZXRDaXR5Q29kZSA9IChsYXRpdHVkZSwgbG9uZ2l0dWRlKSA9PiB7XG4gICAgJC5hamF4KHtcbiAgICAgICAgdXJsOiBgaHR0cHM6Ly9hcGkuc3lnaWN0cmF2ZWxhcGkuY29tLzEuMC9lbi9wbGFjZXMvZGV0ZWN0LXBhcmVudHNgLFxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAneC1hcGkta2V5JzogYXBwLnN5Z2ljS2V5LFxuICAgICAgICB9LFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAnbG9jYXRpb24nOiBgJHtsYXRpdHVkZX0sJHtsb25naXR1ZGV9YFxuICAgICAgICB9XG4gICAgfSlcbiAgICAudGhlbigocmVzKSA9PiB7XG4gICAgICAgIGNvbnN0IGRhdGEgPSByZXMuZGF0YS5wbGFjZXNbMF07XG5cbiAgICAgICAgLy8gd2Ugc3BlY2lmaWNhbGx5IHdhbnQgdG8gdGFyZ2V0IGNpdGllc1xuICAgICAgICAvLyBpZiB0aGF0IHJlc3VsdCBpcyBhIGxldmVsIHNtYWxsZXIgdGhhbiBhIGNpdHksIHRhcmdldCB0aGUgbmV4dCBwYXJlbnQgSURcbiAgICAgICAgaWYgKGRhdGEubGV2ZWwgIT09ICdjaXR5Jykge1xuICAgICAgICAgICAgY29uc3QgY2l0eUNvZGUgPSBkYXRhLnBhcmVudF9pZHNbMF07XG4gICAgICAgICAgICBhcHAuZ2V0UE9JcyhjaXR5Q29kZSk7XG4gICAgICAgICAgICBhcHAuZ2V0VG91cnMoY2l0eUNvZGUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpZiB0aGUgcmVzdWx0IGlzIGEgY2l0eSwganVzdCB1c2UgdGhhdCBpZCBpbiB0aGUgb3RoZXIgcnF1ZXN0c1xuICAgICAgICAgICAgY29uc3QgY2l0eUNvZGUgPSBkYXRhLmlkOyAgXG4gICAgICAgICAgICBhcHAuZ2V0UE9JcyhjaXR5Q29kZSk7XG4gICAgICAgICAgICBhcHAuZ2V0VG91cnMoY2l0eUNvZGUpO1xuICAgICAgICB9IFxuICAgIH0pO1xufVxuXG4vLyBtZXRob2QgdG8gZ2V0IFBPSXMgKHBvaW50cyBvZiBpbnRlcmVzdCk7XG5hcHAuZ2V0UE9JcyA9IChjaXR5Q29kZSkgPT4ge1xuICAgICQuYWpheCh7XG4gICAgICAgIHVybDogYGh0dHBzOi8vYXBpLnN5Z2ljdHJhdmVsYXBpLmNvbS8xLjAvZW4vcGxhY2VzL2xpc3RgLFxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAneC1hcGkta2V5JzogYXBwLnN5Z2ljS2V5LFxuICAgICAgICB9LFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAndGFnc19ub3QnOiAnQWlycG9ydCcsXG4gICAgICAgICAgICAncGFyZW50cyc6IGNpdHlDb2RlLFxuICAgICAgICAgICAgJ2xldmVsJzogJ3BvaScsXG4gICAgICAgICAgICAnbGltaXQnOiAyMCxcbiAgICAgICAgfVxuICAgIH0pLnRoZW4oKHJlcyk9PiB7XG4gICAgICAgIGNvbnN0IHBvaW50cyA9IHJlcy5kYXRhLnBsYWNlcztcblxuICAgICAgICAvLyB3ZSBvbmx5IHdhbnQgcmVzdWx0cyB0aGF0IGhhdmUgYW4gaW1hZ2UgYW5kIGEgZGVzY3JpcHRpb25zIChwZXJleClcbiAgICAgICAgY29uc3QgZmlsdGVyZWRQb2ludHMgPSBwb2ludHMuZmlsdGVyKChwbGFjZSk9PiB7XG4gICAgICAgICAgICByZXR1cm4gcGxhY2UudGh1bWJuYWlsX3VybCAmJiBwbGFjZS5wZXJleFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBpZiB0aGVyZSBhcmUgbm8gcmVzdWx0cyB0aGF0IGhhdmUgYW4gaW1hZ2UgYW5kIGEgZGVzY3JpcHRpb24sIGNhbGwgdGhlIGRpc3BsYXlFcnJvciBmdW5jdGlvblxuICAgICAgICBpZiAoZmlsdGVyZWRQb2ludHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBhcHAuZGlzcGxheUVycm9yKCdwb2knLCAncG9pbnRzIG9mIGludGVyZXN0Jyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyB0YWtlIHRoZSBmaXJzdCAzIGl0ZW1zIGFuZCBwdXNoIHRoZWlyIHByb3BlcnRpZXMgb250byB0aGUgYXBwLlBPSXMgb2JqZWN0XG4gICAgICAgICAgICBmaWx0ZXJlZFBvaW50cy5mb3JFYWNoKChwb2ludCk9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgcGxhY2UgPSB7XG4gICAgICAgICAgICAgICAgICAgICduYW1lJzogcG9pbnQubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgJ2Rlc2NyaXB0aW9uJzogcG9pbnQucGVyZXgsXG4gICAgICAgICAgICAgICAgICAgICdwaG90byc6IHBvaW50LnRodW1ibmFpbF91cmwsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBhcHAuUE9Jcy5wdXNoKHBsYWNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYXBwLmRpc3BsYXlQT0lzKGFwcC5QT0lzKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuLy9tZXRob2QgdG8gZ2V0IGNsb3Nlc3QgYWlycG9ydFxuYXBwLmdldEFpcnBvcnRzID0gKGxhdCwgbG5nKSA9PiB7XG4gICAgJC5hamF4KHtcbiAgICAgICAgdXJsOiBgaHR0cHM6Ly9hcGkuc3lnaWN0cmF2ZWxhcGkuY29tLzEuMC9lbi9wbGFjZXMvbGlzdGAsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICd4LWFwaS1rZXknOiBhcHAuc3lnaWNLZXksXG4gICAgICAgIH0sXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICdsb2NhdGlvbic6IGAke2xhdH0sJHtsbmd9YCxcbiAgICAgICAgICAgICd0YWdzJzogJ0FpcnBvcnQnLFxuICAgICAgICB9XG4gICAgfSkgLnRoZW4gKChyZXMpID0+IHtcbiAgICAgICAgLy8gcHVzaCB0aGUgcHJvcGVydGllcyBvbnRvIGFwcC5haXJwb3J0IG9iamVjdFxuICAgICAgICBhcHAuYWlycG9ydC5uYW1lID0gcmVzLmRhdGEucGxhY2VzWzBdLm5hbWU7XG4gICAgICAgIGFwcC5haXJwb3J0LmRlc2NyaXB0aW9uID0gcmVzLmRhdGEucGxhY2VzWzBdLnBlcmV4O1xuICAgICAgICBhcHAuYWlycG9ydC5waG90byA9IHJlcy5kYXRhLnBsYWNlc1swXS50aHVtYm5haWxfdXJsO1xuXG4gICAgICAgIC8vIGNhbGwgZGlzcGxheUFpcnBvcnRzIHVzaW5nIHByb3BlcnRpZXMgZnJvbSBhamF4IHJlcXVlc3RcbiAgICAgICAgYXBwLmRpc3BsYXlBaXJwb3J0cyhhcHAuYWlycG9ydCk7XG4gICAgfSk7XG59XG5cbi8vIG1ldGhvZCB0byBnZXQgbGFuZ3VhZ2VcbmFwcC5nZXRMYW5ndWFnZSA9IChjb3VudHJ5KSA9PiB7XG4gICAgJC5hamF4KHtcbiAgICAgICAgdXJsOiBgaHR0cHM6Ly9yZXN0Y291bnRyaWVzLmV1L3Jlc3QvdjIvbmFtZS8ke2NvdW50cnl9YCxcbiAgICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgICAgZGF0YVR5cGU6ICdqc29uJyxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgZnVsbFRleHQ6IHRydWVcbiAgICAgICAgfVxuICAgIH0pIC50aGVuKChyZXMpID0+IHtcbiAgICAgICAgYXBwLmxhbmd1YWdlLnByaW1hcnkgPSByZXNbMF0ubGFuZ3VhZ2VzWzBdLm5hbWU7XG4gICAgICAgIGlmIChyZXNbMF0ubGFuZ3VhZ2VzLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIGFwcC5sYW5ndWFnZS5zZWNvbmRhcnkgPSByZXNbMF0ubGFuZ3VhZ2VzWzFdLm5hbWU7XG4gICAgICAgIH1cbiAgICAgICAgYXBwLmRpc3BsYXlMYW5ndWFnZShhcHAubGFuZ3VhZ2UpO1xuICAgIH0pO1xuXG59XG5cbi8vIFxuYXBwLmdldFRvdXJzID0gKGNpdHlDb2RlKSA9PiB7XG4gICAgJC5hamF4KHtcbiAgICAgICAgdXJsOiBgaHR0cHM6Ly9hcGkuc3lnaWN0cmF2ZWxhcGkuY29tLzEuMC9lbi90b3Vycy92aWF0b3JgLFxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAneC1hcGkta2V5JzogYXBwLnN5Z2ljS2V5LFxuICAgICAgICB9LFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAncGFyZW50X3BsYWNlX2lkJzogY2l0eUNvZGVcbiAgICAgICAgfVxuICAgfSkudGhlbigocmVzKSA9PiB7XG4gICAgICAgIGNvbnN0IGxpc3QgPSByZXMuZGF0YS50b3VycztcbiAgICAgICAgY29uc3QgdG91cnMgPSBsaXN0LmZpbHRlcigocGxhY2UpPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHBsYWNlLnBob3RvX3VybCAmJiBwbGFjZS51cmxcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICh0b3Vycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGFwcC5kaXNwbGF5RXJyb3IoJ3RvdXJzJywgJ3RvdXJzJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRvdXJzLmxlbmd0aDsgaSArKykge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvdXIgPSB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IHRvdXJzW2ldLnRpdGxlLFxuICAgICAgICAgICAgICAgICAgICBwaG90bzogdG91cnNbaV0ucGhvdG9fdXJsLFxuICAgICAgICAgICAgICAgICAgICB1cmw6IHRvdXJzW2ldLnVybFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgYXBwLnRvdXJzLnB1c2godG91cik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBhcHAuZGlzcGxheVRvdXJzKGFwcC50b3Vycyk7XG4gICAgICAgIH1cbiAgICB9KTtcbn1cblxuYXBwLmdldEN1cnJlbmN5ID0gKGNvdW50cnlDb2RlKSA9PiB7XG4gICAgJC5hamF4KHtcbiAgICAgICAgdXJsOiBgaHR0cHM6Ly9yZXN0Y291bnRyaWVzLmV1L3Jlc3QvdjIvbmFtZS8ke2NvdW50cnlDb2RlfWAsXG4gICAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGZ1bGxUZXh0OiB0cnVlXG4gICAgICAgIH1cbiAgICB9KS50aGVuKChyZXMpID0+IHtcbiAgICAgICAgYXBwLmN1cnJlbmN5LmNvZGUgPSByZXNbMF0uY3VycmVuY2llc1swXS5jb2RlO1xuICAgICAgICBhcHAuY3VycmVuY3kuc3ltYm9sID0gcmVzWzBdLmN1cnJlbmNpZXNbMF0uc3ltYm9sO1xuICAgICAgICBhcHAuZGlzcGxheUN1cnJlbmN5KGFwcC5jdXJyZW5jeSk7XG4gICAgfSk7XG59ICAgIFxuXG5hcHAuY29udmVydEN1cnJlbmN5ID0gKHVzZXJDdXJyZW5jeSwgZGVzdGluYXRpb25DdXJyZW5jeSkgPT4ge1xuICAgICQuYWpheCh7XG4gICAgICAgIHVybDogYGh0dHBzOi8vZnJlZS5jdXJyZW5jeWNvbnZlcnRlcmFwaS5jb20vYXBpL3Y2L2NvbnZlcnRgLFxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBxOiBgJHt1c2VyQ3VycmVuY3l9XyR7ZGVzdGluYXRpb25DdXJyZW5jeX0sJHtkZXN0aW5hdGlvbkN1cnJlbmN5fV8ke3VzZXJDdXJyZW5jeX1gLFxuICAgICAgICAgICAgY29tcGFjdDogJ3VsdHJhJ1xuICAgICAgICB9XG4gICAgfSkudGhlbigocmVzKSA9PiB7XG4gICAgICAgIGFwcC5jdXJyZW5jeS5leGNoYW5nZVJhdGUgPSByZXNbYCR7dXNlckN1cnJlbmN5fV8ke2Rlc3RpbmF0aW9uQ3VycmVuY3l9YF07XG5cbiAgICAgICAgJCgnI2N1cnJlbmN5IGgyJykudGV4dChgJDEgJHt1c2VyQ3VycmVuY3l9ID0gJHthcHAuY3VycmVuY3kuc3ltYm9sfSAke2FwcC5jdXJyZW5jeS5leGNoYW5nZVJhdGUudG9GaXhlZCgyKX0gJHtkZXN0aW5hdGlvbkN1cnJlbmN5fWApXG5cbiAgICB9KTtcbn1cblxuYXBwLmRpc3BsYXlFcnJvciA9IChkaXZJRCwgdG9waWMpID0+IHtcbiAgICAkKGAjJHtkaXZJRH1gKS5maW5kKCdpJykudG9nZ2xlKGZhbHNlKTtcbiAgICBjb25zdCB0aXRsZSA9IGA8aDM+JHt0b3BpY308L2gzPmA7XG4gICAgJChgIyR7ZGl2SUR9YCkuYXBwZW5kKHRpdGxlLCBgPGgyPlNvcnJ5LCB3ZSBkb24ndCBoYXZlIGRldGFpbGVkIGluZm9ybWF0aW9uIGFib3V0ICR7dG9waWN9IGluIHRoaXMgYXJlYS4gVHJ5IHlvdXIgc2VhcmNoIGFnYWluIGluIGEgcmVsYXRlZCBjaXR5IG9yIG5lYXJieSByZWdpb24uPC9oMj5gKTtcbn1cblxuYXBwLmRpc3BsYXlDdXJyZW5jeSA9IChvYmplY3QpID0+IHtcbiAgICAkKCcjY3VycmVuY3knKS5maW5kKCdpJykudG9nZ2xlKGZhbHNlKTtcbiAgICBjb25zdCB0aXRsZSA9IGA8aDM+Q3VycmVuY3k8L2gzPmA7XG4gICAgY29uc3QgaHRtbCA9IGA8aDI+VGhlIGN1cnJlbmN5IHVzZWQgaXMgJHtvYmplY3Quc3ltYm9sfSAke29iamVjdC5jb2RlfTwvaDI+YDtcbiAgICBjb25zdCBpbnB1dCA9IGA8Zm9ybSBpZD1cInVzZXJDdXJyZW5jeVwiPjxpbnB1dCBjbGFzcz1cInVzZXJDdXJyZW5jeSAgdHlwZT1cInNlYXJjaFwiIGlkPVwidXNlclwiIHBsYWNlaG9sZGVyPVwiRW50ZXIgeW91ciBsb2NhdGlvbi5cIj48YnV0dG9uIGNsYXNzPVwic3VibWl0XCI+Q29udmVydDwvYnV0dG9uPjwvZm9ybT5gO1xuICAgICQoJyNjdXJyZW5jeScpLmFwcGVuZCh0aXRsZSxodG1sLCBpbnB1dCk7XG4gICAgYXBwLmdldFVzZXJJbmZvKCk7XG59XG5cbmFwcC5nZXRVc2VySW5mbyA9ICgpID0+IHtcbiAgICBhcHAuaW5pdEF1dG9jb21wbGV0ZSgndXNlcicpO1xuICAgICQoJyN1c2VyQ3VycmVuY3knKS5vbignc3VibWl0JywgZnVuY3Rpb24oZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0IHVzZXJMb2NhdGlvbiA9ICQoJyN1c2VyJykudmFsKCk7XG4gICAgICAgIGFwcC5nZXRVc2VyTG9jYXRpb24odXNlckxvY2F0aW9uKTtcbiAgICB9KTtcbn1cblxuYXBwLmdldFVzZXJMb2NhdGlvbiA9IChsb2NhdGlvbikgPT4ge1xuICAgIG5ldyBnb29nbGUubWFwcy5wbGFjZXMuQXV0b2NvbXBsZXRlKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd1c2VyJykpO1xuICAgIGNvbnN0IGdlb2NvZGVyID0gbmV3IGdvb2dsZS5tYXBzLkdlb2NvZGVyKCk7XG4gICAgZ2VvY29kZXIuZ2VvY29kZSh7XG4gICAgICAgICdhZGRyZXNzJzogbG9jYXRpb25cbiAgICB9LCAocmVzdWx0cywgc3RhdHVzKSA9PiB7XG4gICAgICAgIGlmIChzdGF0dXMgPT0gZ29vZ2xlLm1hcHMuR2VvY29kZXJTdGF0dXMuT0spIHtcbiAgICAgICAgICAgIGNvbnN0IGFkZHJlc3NDb21wb25lbnRzID0gcmVzdWx0c1swXS5hZGRyZXNzX2NvbXBvbmVudHMuZmlsdGVyKChjb21wb25lbnQpID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY29tcG9uZW50LnR5cGVzWzBdID09PSAnY291bnRyeSc7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGFwcC51c2VyLmNvdW50cnlDb2RlID0gYWRkcmVzc0NvbXBvbmVudHNbMF0uc2hvcnRfbmFtZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFsZXJ0KCdTb3JyeSwgc29tZXRoaW5nIHdlbnQgd3JvbmcuJyArIHN0YXR1cylcbiAgICAgICAgfVxuICAgIGFwcC5nZXRVc2VyQ3VycmVuY3koYXBwLnVzZXIuY291bnRyeUNvZGUpO1xuICAgIH0pOyAgICBcbn1cblxuYXBwLmdldFVzZXJDdXJyZW5jeSA9IChjb3VudHJ5Q29kZSkgPT4ge1xuICAgICQuYWpheCh7XG4gICAgICAgIHVybDogYGh0dHBzOi8vcmVzdGNvdW50cmllcy5ldS9yZXN0L3YyL25hbWUvJHtjb3VudHJ5Q29kZX1gLFxuICAgICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgICBkYXRhVHlwZTogJ2pzb24nLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICBmdWxsVGV4dDogdHJ1ZVxuICAgICAgICB9XG4gICAgfSkudGhlbigocmVzKSA9PiB7XG4gICAgICAgIGFwcC51c2VyLmNvZGUgPSByZXNbMF0uY3VycmVuY2llc1swXS5jb2RlO1xuICAgICAgICBhcHAuY29udmVydEN1cnJlbmN5KGFwcC51c2VyLmNvZGUsIGFwcC5jdXJyZW5jeS5jb2RlKTtcbiAgICB9KTtcbn1cblxuXG5hcHAuZGlzcGxheUxhbmd1YWdlID0gKG9iamVjdCkgPT4ge1xuICAgICQoJyNsYW5ndWFnZScpLmZpbmQoJ2knKS50b2dnbGUoZmFsc2UpO1xuICAgIGNvbnN0IHRpdGxlID0gYDxoMz5MYW5ndWFnZTwvaDM+YDtcbiAgICBjb25zdCBwcmltYXJ5ID0gYDxoMj5QcmltYXJ5PC9oMj48aDQ+JHtvYmplY3QucHJpbWFyeX08L2g0PmA7XG4gICAgY29uc3Qgc2Vjb25kYXJ5ID0gYDxoMj5TZWNvbmRhcnk8L2gyPjxoND4ke29iamVjdC5zZWNvbmRhcnl9PC9oND5gO1xuICAgICQoJyNsYW5ndWFnZScpLmFwcGVuZCh0aXRsZSwgcHJpbWFyeSlcbiAgICBpZiAob2JqZWN0LnNlY29uZGFyeSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICQoJyNsYW5ndWFnZScpLmFwcGVuZChzZWNvbmRhcnkpO1xuICAgIH0gXG59XG5cbmFwcC5kaXNwbGF5QWlycG9ydHMgPSAob2JqZWN0KSA9PiB7XG4gICAgJCgnI2FpcnBvcnQnKS5maW5kKCdpJykudG9nZ2xlKGZhbHNlKTtcbiAgICBjb25zdCB0aXRsZSA9IGA8aDM+Q2xvc2VzdCBBaXJwb3J0PC9oMz5gO1xuICAgIGNvbnN0IG5hbWUgPSBgPGg0PiR7b2JqZWN0Lm5hbWV9PC9oND5gO1xuICAgICQoJyNhaXJwb3J0JykuYXBwZW5kKHRpdGxlLCBuYW1lKTtcbn1cblxuLy8gbWV0aG9kIHRvIGRpc3BsYXkgdG91cnNcbi8vIGkgcmVhbGl6ZWQgd2hlbiB0aGVyZSdzIGEgbG90IG9mIHJlc3VsdHMsIGl0J3Mgbm90IGlkZWFsIGZvciBtb2JpbGUgdXNlcnNcbi8vIHNvIGkgdHJpZWQgc29tZSBzaW1wbGUgXCJwYWdpbmF0aW9uXCIgd2hlbiB0aGUgc2NyZWVuIHdpZHRoIGlzIGxlc3MgdGhhbiA2MDBweFxuLy8gY3JlYXRlIDIgdmFyaWFibGVzLCBvbmUgdG8gYWN0IGFzIGEgXCJjb3VudGVyXCIgYW5kIG9uZSB0byBkaWN0YXRlIHJlc3VsdHMgcGVyIHBhZ2Vcbi8vIHdoZW4gdXNlciBjbGlja3MgJ2xvYWQgbW9yZScsIGl0IGFwcGVuZHMgdGhlIG5leHQgdGhyZWUgcmVzdWx0cywgcmVtb3ZlcyB0aGUgYnV0dG9uLCBhbmQgYXBwZW5kcyBhIG5ldyBidXR0b24gYXQgdGhlIGVuZCBvZiB0aGUgbmV3IHJlc3VsdHNcbmFwcC5kaXNwbGF5VG91cnMgPSAoYXJyYXkpID0+IHtcbiAgICAkKCcjdG91cnMnKS5maW5kKCdpJykudG9nZ2xlKGZhbHNlKTtcbiAgICBjb25zdCB0aXRsZSA9IGA8aDM+VG9wIFRvdXJzPC9oMz5gO1xuICAgICQoJyN0b3VycycpLmFwcGVuZCh0aXRsZSk7XG4gICAgXG4gICAgaWYgKCQod2luZG93KS53aWR0aCgpIDw9IDYwMCkge1x0XG4gICAgICAgIGxldCBjb3VudGVyID0gMDtcbiAgICAgICAgbGV0IHJlc3VsdHNQZXJQYWdlID0gMztcbiAgICAgICAgZm9yIChsZXQgaSA9IGNvdW50ZXI7IGkgPCByZXN1bHRzUGVyUGFnZTsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBkaXYgPSAkKCc8ZGl2IGNsYXNzPVwiY2xlYXJmaXggaHZyLXNoYWRvd1wiPicpO1xuICAgICAgICAgICAgY29uc3QgbmFtZSA9IGA8aDI+JHthcnJheVtpXS5uYW1lfTxoMj5gXG4gICAgICAgICAgICBjb25zdCBwaG90byA9IGA8aW1nIGNsYXNzPVwiaHZyLWdyb3ctc2hhZG93XCIgc3JjPVwiJHthcnJheVtpXS5waG90b31cIj5gO1xuICAgICAgICAgICAgY29uc3QgbGluayA9IGA8YSBjbGFzcz1cImh2ci11bmRlcmxpbmUtZnJvbS1jZW50ZXJcIiBocmVmPVwiJHthcnJheS51cmx9XCI+Qm9vayBOb3c8L2E+YDtcblxuICAgICAgICAgICAgY29uc3QgdGV4dCA9ICQoYDxkaXY+YCkuYXBwZW5kKG5hbWUsIGxpbmspO1xuICAgICAgICAgICAgZGl2LmFwcGVuZChwaG90bywgdGV4dCk7XG4gICAgICAgICAgICAkKCcjdG91cnMnKS5hcHBlbmQoZGl2KTtcbiAgICAgICAgfSAgICBcblxuICAgICAgICBjb25zdCBsb2FkTW9yZSA9IGA8YnV0dG9uIGNsYXNzPVwibG9hZE1vcmUgaHZyLWdyb3ctc2hhZG93XCI+TG9hZCBNb3JlPC9idXR0b24+YDtcbiAgICAgICAgJCgnI3RvdXJzJykuYXBwZW5kKGxvYWRNb3JlKTtcbiAgICAgICAgJCgnI3RvdXJzJykub24oJ2NsaWNrJywgJy5sb2FkTW9yZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdGhpcy5yZW1vdmUoKTtcbiAgICAgICAgICAgIGNvdW50ZXIrPXJlc3VsdHNQZXJQYWdlO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGNvdW50ZXI7IGkgPCAoY291bnRlciArIHJlc3VsdHNQZXJQYWdlKTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGl2ID0gJCgnPGRpdiBjbGFzcz1cImNsZWFyZml4IGh2ci1zaGFkb3dcIj4nKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gYDxoMj4ke2FycmF5W2ldLm5hbWV9PGgyPmBcbiAgICAgICAgICAgICAgICBjb25zdCBwaG90byA9IGA8aW1nIGNsYXNzPVwiaHZyLWdyb3ctc2hhZG93XCIgIHNyYz1cIiR7YXJyYXlbaV0ucGhvdG99XCI+YDtcbiAgICAgICAgICAgICAgICBjb25zdCBsaW5rID0gYDxhIGNsYXNzPVwiaHZyLXVuZGVybGluZS1mcm9tLWNlbnRlclwiIGhyZWY9XCIke2FycmF5LnVybH1cIj5Cb29rIE5vdzwvYT5gO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSAkKGA8ZGl2PmApLmFwcGVuZChuYW1lLCBsaW5rKTtcbiAgICAgICAgICAgICAgICBkaXYuYXBwZW5kKHBob3RvLCB0ZXh0KTtcbiAgICAgICAgICAgICAgICAkKCcjdG91cnMnKS5hcHBlbmQoZGl2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQoJyN0b3VycycpLmFwcGVuZChsb2FkTW9yZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIGlmIHNjcmVlbiB3aWR0aCBpcyBub3QgbGVzcyB0aGFuIDYwMHB4LCBhcHBlbmQgZWxlbWVudHMgbm9ybWFsbHlcblx0fSBlbHNlIHtcbiAgICAgICAgYXJyYXkuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZGl2ID0gJCgnPGRpdiBjbGFzcz1cImNsZWFyZml4IGh2ci1zaGFkb3dcIj4nKTtcbiAgICAgICAgICAgIGNvbnN0IG5hbWUgPSBgPGgyPiR7aXRlbS5uYW1lfTxoMj5gO1xuICAgICAgICAgICAgY29uc3QgcGhvdG8gPSBgPGltZyBjbGFzcz1cImh2ci1ncm93LXNoYWRvd1wiIHNyYz1cIiR7aXRlbS5waG90b31cIj5gO1xuICAgICAgICAgICAgY29uc3QgbGluayA9IGA8YSBjbGFzcz1cImh2ci11bmRlcmxpbmUtZnJvbS1jZW50ZXJcIiBocmVmPVwiJHtpdGVtLnVybH1cIj5Cb29rIE5vdzwvYT5gO1xuICAgICAgICAgICAgY29uc3QgdGV4dCA9ICQoJzxkaXY+JykuYXBwZW5kKG5hbWUsIGxpbmspO1xuICAgICAgICAgICAgZGl2LmFwcGVuZChwaG90bywgdGV4dCk7XG4gICAgICAgICAgICAkKCcjdG91cnMnKS5hcHBlbmQoZGl2KTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG4vLyBtZXRob2QgdG8gZGlzcGxheSBwb2ludHMgb2YgaW50ZXJlc3Rcbi8vIHNhbWUgXCJwYWdpbmF0aW9uXCIgc3lzdGVtIGFzIHRvdXJzXG5hcHAuZGlzcGxheVBPSXMgPSAoYXJyYXkpID0+IHtcbiAgICAkKCcjcG9pJykuZmluZCgnaScpLnRvZ2dsZShmYWxzZSk7XG4gICAgY29uc3QgdGl0bGUgPSBgPGgzPlBvaW50cyBvZiBJbnRlcmVzdDwvaDM+YDtcbiAgICAkKCcjcG9pJykuYXBwZW5kKHRpdGxlKTtcbiAgICBpZiAoJCh3aW5kb3cpLndpZHRoKCkgPD0gNjAwKSB7XHRcbiAgICAgICAgbGV0IGNvdW50ZXIgPSAwO1xuICAgICAgICBsZXQgcmVzdWx0c1BlclBhZ2UgPSAzO1xuICAgICAgICBmb3IgKGxldCBpID0gY291bnRlcjsgaSA8IHJlc3VsdHNQZXJQYWdlOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGRpdiA9ICQoYDxkaXYgY2xhc3M9XCJjbGVhcmZpeCBodnItc2hhZG93XCI+YCk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gYDxoMj4ke2FycmF5W2ldLm5hbWV9PGgyPmA7XG4gICAgICAgICAgICBjb25zdCBkZXNjID0gYDxwPiR7YXJyYXlbaV0uZGVzY3JpcHRpb259PC9wPmA7XG4gICAgICAgICAgICBjb25zdCBwaG90byA9IGA8aW1nIGNsYXNzPVwiaHZyLWdyb3ctc2hhZG93XCIgc3JjPVwiJHthcnJheVtpXS5waG90b31cIj5gO1xuICAgICAgICAgICAgY29uc3QgdGV4dCA9ICQoJzxkaXY+JykuYXBwZW5kKG5hbWUsIGRlc2MpO1xuXG4gICAgICAgICAgICBkaXYuYXBwZW5kKHBob3RvLCB0ZXh0KTtcbiAgICAgICAgICAgICQoJyNwb2knKS5hcHBlbmQoZGl2KTtcbiAgICAgICAgfSAgICBcblxuICAgICAgICBjb25zdCBsb2FkTW9yZSA9IGA8YnV0dG9uIGNsYXNzPVwibG9hZE1vcmUgaHZyLWdyb3ctc2hhZG93XCI+TG9hZCBNb3JlPC9idXR0b24+YDtcbiAgICAgICAgJCgnI3BvaScpLmFwcGVuZChsb2FkTW9yZSk7XG5cbiAgICAgICAgJCgnI3BvaScpLm9uKCdjbGljaycsICcubG9hZE1vcmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHRoaXMucmVtb3ZlKCk7XG4gICAgICAgICAgICBjb3VudGVyKz0zO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IGNvdW50ZXI7IGkgPCAoY291bnRlciArIHJlc3VsdHNQZXJQYWdlKTsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGl2ID0gJChgPGRpdiBjbGFzcz1cImNsZWFyZml4IGh2ci1zaGFkb3dcIj5gKTtcbiAgICAgICAgICAgICAgICBjb25zdCBuYW1lID0gYDxoMj4ke2FycmF5W2ldLm5hbWV9PGgyPmA7XG4gICAgICAgICAgICAgICAgY29uc3QgZGVzYyA9IGA8cD4ke2FycmF5W2ldLmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgICAgICAgICAgICAgIGNvbnN0IHBob3RvID0gYDxpbWcgY2xhc3M9XCJodnItZ3Jvdy1zaGFkb3dcIiBzcmM9XCIke2FycmF5W2ldLnBob3RvfVwiPmA7XG4gICAgICAgICAgICAgICAgY29uc3QgdGV4dCA9ICQoJzxkaXY+JykuYXBwZW5kKG5hbWUsIGRlc2MpO1xuICAgIFxuICAgICAgICAgICAgICAgIGRpdi5hcHBlbmQocGhvdG8sIHRleHQpO1xuICAgICAgICAgICAgICAgICQoJyNwb2knKS5hcHBlbmQoZGl2KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICQoJyNwb2knKS5hcHBlbmQobG9hZE1vcmUpO1xuICAgICAgICB9KTtcbiAgICAgICAgLy8gZWxzZSBqdXN0IGFwcGVuZCBhbGwgdGhlIHJlc3VsdHMgbm9ybWFsbHlcblx0fSBlbHNlIHsgICAgXG4gICAgICAgIGFycmF5LmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGRpdiA9ICQoYDxkaXYgY2xhc3M9XCJjbGVhcmZpeCBodnItc2hhZG93XCI+YCk7XG4gICAgICAgICAgICBjb25zdCBuYW1lID0gYDxoMj4ke2l0ZW0ubmFtZX08aDI+YDtcbiAgICAgICAgICAgIGNvbnN0IGRlc2MgPSBgPHA+JHtpdGVtLmRlc2NyaXB0aW9ufTwvcD5gO1xuICAgICAgICAgICAgY29uc3QgcGhvdG8gPSBgPGltZyBjbGFzcz1cImh2ci1ncm93LXNoYWRvd1wiIHNyYz1cIiR7aXRlbS5waG90b31cIj5gO1xuICAgICAgICAgICAgY29uc3QgdGV4dCA9ICQoJzxkaXY+JykuYXBwZW5kKG5hbWUsIGRlc2MpO1xuICAgICAgICAgICAgZGl2LmFwcGVuZChwaG90bywgdGV4dCk7XG4gICAgICAgICAgICAkKCcjcG9pJykuYXBwZW5kKGRpdik7XG4gICAgICAgIH0pO1xuICAgIH0gICAgXG59XG5cbmFwcC5kaXNwbGF5V2VhdGhlciA9IChvYmplY3QpID0+IHtcbiAgICAkKCcjd2VhdGhlcicpLmZpbmQoJ2knKS50b2dnbGUoZmFsc2UpO1xuICAgIGxldCBkZWdyZWVzID0gJyc7XG4gICAgY29uc3QgdGl0bGUgPSBgPGgzPldlYXRoZXI8L2gzPmA7XG4gICAgY29uc3QgaWNvbiA9IGA8Y2FudmFzIGlkPVwiJHtvYmplY3QuaWNvbn1cIiB3aWR0aD1cIjgwXCIgaGVpZ2h0PVwiODBcIj48L2NhbnZhcz5gO1xuICAgIGlmIChhcHAuZGVzdGluYXRpb24uY291bnRyeUNvZGUgPT09ICdVUycpIHtcbiAgICAgICAgZGVncmVlcyA9ICdGJztcbiAgICB9IGVsc2Uge1xuICAgICAgICBkZWdyZWVzID0gJ0MnO1xuICAgIH1cbiAgICBjb25zdCBodG1sID0gYDxoMj5DdXJyZW50bHk6PC9oMj4gXG4gICAgPGg0PiR7b2JqZWN0LmN1cnJlbnRUZW1wfcKwJHtkZWdyZWVzfTwvaDQ+XG4gICAgICAgIDxwIGNsYXNzPVwid2VhdGhlclRleHRcIj4ke29iamVjdC5jb25kaXRpb25zfTwvcD5gXG4gICAgJCgnI3dlYXRoZXInKS5hcHBlbmQodGl0bGUsIGljb24sIGh0bWwpO1xuICAgIGFwcC5sb2FkSWNvbnMoKTtcbn1cblxuYXBwLnJhbmRvbUhlcm8gPSAoKSA9PiB7XG4gICAgbGV0IGkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMCkgKyAxXG4gICAgJCgnLnNwbGFzaFBhZ2UnKS5jc3Moe1xuICAgICAgICAnYmFja2dyb3VuZCc6IGBsaW5lYXItZ3JhZGllbnQocmdiYSgwLDAsMCwwLjMpLCByZ2JhKDAsMCwwLDAuMykpLCB1cmwoXCJwdWJsaWMvYXNzZXRzL2hlcm8ke2l9LmpwZ1wiKWAsXG4gICAgICAgICdiYWNrZ3JvdW5kLXBvc2l0aW9uJzogJ2NlbnRlcicsXG5cdCAgICAnYmFja2dyb3VuZC1zaXplJzogJ2NvdmVyJ1x0XG4gICAgfSk7XG59XG5cbmFwcC5sb2FkSWNvbnMgPSAoKSA9PiB7XG4gICAgdmFyIGljb25zID0gbmV3IFNreWNvbnMoe1wiY29sb3JcIjogXCJibGFja1wifSk7XG4gICAgaWNvbnMuc2V0KFwiY2xlYXItZGF5XCIsIFNreWNvbnMuQ0xFQVJfREFZKTtcbiAgICBpY29ucy5zZXQoXCJjbGVhci1uaWdodFwiLCBTa3ljb25zLkNMRUFSX05JR0hUKTtcbiAgICBpY29ucy5zZXQoXCJwYXJ0bHktY2xvdWR5LWRheVwiLCBTa3ljb25zLlBBUlRMWV9DTE9VRFlfREFZKTtcbiAgICBpY29ucy5zZXQoXCJwYXJ0bHktY2xvdWR5LW5pZ2h0XCIsIFNreWNvbnMuUEFSVExZX0NMT1VEWV9OSUdIVCk7XG4gICAgaWNvbnMuc2V0KFwiY2xvdWR5XCIsIFNreWNvbnMuQ0xPVURZKTtcbiAgICBpY29ucy5zZXQoXCJyYWluXCIsIFNreWNvbnMuUkFJTik7XG4gICAgaWNvbnMuc2V0KFwic2xlZXRcIiwgU2t5Y29ucy5TTEVFVCk7XG4gICAgaWNvbnMuc2V0KFwic25vd1wiLCBTa3ljb25zLlNOT1cpO1xuICAgIGljb25zLnNldChcIndpbmRcIiwgU2t5Y29ucy5XSU5EKTtcbiAgICBpY29ucy5zZXQoXCJmb2dcIiwgU2t5Y29ucy5GT0cpO1xuICAgIGljb25zLnBsYXkoKTtcbn1cblxuYXBwLmV2ZW50cyA9ICgpID0+IHtcbiAgICBhcHAuaW5pdEF1dG9jb21wbGV0ZSgnZGVzdGluYXRpb24nKTtcbiAgIFxuICAgICQoJ2Zvcm0nKS5vbignc3VibWl0JywgKGUpID0+IHtcbiAgICAgICAgJCgnLmNvbnRlbnQnKS5lbXB0eSgpO1xuICAgICAgICAkKCcuY29udGVudCcpLmVhY2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKHRoaXMpLmFwcGVuZChgPGkgY2xhc3M9XCJmYXMgZmEtcGxhbmUgaHZyLWljb24gbG9hZGVyXCI+PC9pPmApO1xuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgZGVzdGluYXRpb24gPSAkKCcjZGVzdGluYXRpb24nKS52YWwoKTtcbiAgICAgICAgaWYgKGRlc3RpbmF0aW9uLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICQoJyNzcGxhc2hQYWdlJykudG9nZ2xlKGZhbHNlKTtcbiAgICAgICAgICAgICQoJyNjb250ZW50UGFnZScpLnRvZ2dsZSh0cnVlKTtcbiAgICAgICAgICAgICQoJ2Zvcm0nKS5yZW1vdmVDbGFzcygnc3BsYXNoU2VhcmNoRm9ybScpO1xuICAgICAgICAgICAgJCgnI2Rlc3RpbmF0aW9uJykucmVtb3ZlQ2xhc3MoJ3NwbGFzaFNlYXJjaEJhcicpO1xuICAgICAgICAgICAgJCgnI3N1Ym1pdEJ1dHRvbicpLnJlbW92ZUNsYXNzKCdzcGxhc2hTZWFyY2hCdXR0b24nKTtcbiAgICAgICAgICAgICQoJyNzdWJtaXRCdXR0b24nKS5hZGRDbGFzcygnY29udGVudFNlYXJjaEJ1dHRvbicpO1xuICAgICAgICAgICAgJCgnZm9ybScpLmFkZENsYXNzKCdjb250ZW50U2VhcmNoRm9ybScpO1xuICAgICAgICAgICAgJCgnI2Rlc3RpbmF0aW9uJykuYWRkQ2xhc3MoJ2NvbnRlbnRTZWFyY2hCYXInKTtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoJyNkZXN0aW5hdGlvbk5hbWUnKS50ZXh0KGRlc3RpbmF0aW9uKTtcbiAgICAgICAgICAgIGFwcC5nZXREZXN0aW5hdGlvbkluZm8oZGVzdGluYXRpb24pO1xuICAgICAgICB9XG4gICAgICAgIGFwcC5kZXN0aW5hdGlvbiA9IHt9O1xuICAgICAgICBhcHAud2VhdGhlciA9IHt9O1xuICAgICAgICBhcHAuY3VycmVuY3k9IHt9O1xuICAgICAgICBhcHAuUE9JcyA9IFtdO1xuICAgICAgICBhcHAuZXhjaGFuZ2VSYXRlO1xuICAgICAgICBhcHAudG91cnMgPSBbXTtcbiAgICAgICAgYXBwLmFpcnBvcnQgPSB7fTtcbiAgICAgICAgYXBwLmxhbmd1YWdlcyA9IHt9O1xuICAgICAgICAkKCcjZGVzdGluYXRpb24nKS52YWwoJycpO1xuICAgIH0pO1xuXG4gICAgJCgnI3NlYXJjaE1lbnUnKS5vbignY2xpY2snLCBmdW5jdGlvbigpIHtcbiAgICAgICAgJCgnLmNvbnRlbnRTZWFyY2hGb3JtJykudG9nZ2xlKCk7XG4gICAgfSk7XG59XG5cbmFwcC5pbml0ID0gKCkgPT4ge1xuICAgIGFwcC5yYW5kb21IZXJvKCk7XG4gICAgYXBwLmluaXRBdXRvY29tcGxldGUoJ2Rlc3RpbmF0aW9uJyk7XG4gICAgJCgnI2NvbnRlbnRQYWdlJykudG9nZ2xlKGZhbHNlKTtcbiAgICBhcHAuZXZlbnRzKCk7XG59XG5cbiQoZnVuY3Rpb24gKCkge1xuICAgIGFwcC5pbml0KCk7XG59KTtcblxuXG5jb25zdCBzZWFyY2hBZHJyZXNzID0gJyR7YWRkcmVzcy5jb21wb25lbnRzWzBdLmxvbmduYW1lfSwgJyJdfQ==
