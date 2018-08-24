// get user's current location
// get location user wants to travel to
// pass user location into Google maps geocoder to get lat and lng coords
// pass user desired location into Google geocoder to get lat and lng coords
// pass city info and call weather API and get current weather
// pass city info and call zomato API and get top 3 random restaurants 
// pass city info into 


// create empty object to store all methods
const app = {};

//user info
app.user = {};

// display info
app.destination = {};
app.weather = {};
app.currency= {};
app.POIs = [];
app.exchangeRate;
// app.restaurants = [];
app.tours = [];
app.airport = {};
app.language = {};


app.weatherIcons = [
    'clear-day', 'clear-night', 'rain', 'snow', 'sleet', 'wind', 'fog', 'cloudy', 'partly-cloudy-day','partly-cloudy-night'
]


// get user's current location
// most of the other APIs we are requesting data from accept location info in the form of lat lng coords
// so we pass user location into Google  geocoder to get lat and lng coords to use in other API requests
app.initAutocomplete = (id) => {
    new google.maps.places.Autocomplete(document.getElementById(id));
}

app.getDestinationInfo = (location) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'address': location
    }, (results, status) => {
        if (status == google.maps.GeocoderStatus.OK) {
            const addressComponents = results[0].address_components.filter((component) => {
                return component.types[0] === 'country';
            });
            app.destination.countryCode = addressComponents[0].short_name;
            app.destination.countryName = addressComponents[0].long_name;
            app.destination.lat = results[0].geometry.location.lat();
            app.destination.lng = results[0].geometry.location.lng();
            app.getWeather(app.destination.lat, app.destination.lng);
            app.getCurrency(app.destination.countryCode);

            if (location === 'Hong Kong') {
                app.getPOIs('city:389');
                app.getRestaurants('city:389');
            } 
            else {
                app.getCityCode(app.destination.lat, app.destination.lng);
            }
            app.getLanguage(app.destination.countryCode);
            // app.getRestaurants(app.destination.lat, app.destination.lng);
            app.getAirports(app.destination.lat, app.destination.lng);
        } else {
            alert("Something went wrong." + status);
        }
    });
}

app.getCoordinates = (location) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'address': location
    }, (res, err) => {
        if (err == google.maps.GeocoderStatus.OK) {
            let latitude = res[0].geometry.location.lat();
            let longitude = res[0].geometry.location.lng();
            console.log(latitude, longitude);
        } else {
            alert("Something went wrong." + err);
        }
    });
}

app.getWeather = (latitude, longitude) => {
    $.ajax({
        url: `https://api.darksky.net/forecast/ea2f7a7bab3daacc9f54f177819fa1d3/${latitude},${longitude}`,
        method: 'GET',
        dataType: 'jsonp',
        data: {
            'units': 'auto'
        }
    })
    .then((res) => {
        // console.log(res);
        app.weather.conditions = res.daily.summary;
        app.weather.currentTemp = Math.round(res.currently.temperature);
        app.weather.icon = res.daily.icon;

        // console.log(object.currentTemp);
        // console.log(object.weatherConditions);
        app.displayWeather(app.weather);
        
    });
}

app.getCityCode = (latitude, longitude) => {
    $.ajax({
        url: `https://api.sygictravelapi.com/1.0/en/places/detect-parents`,
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'location': `${latitude},${longitude}`
        }
    })
    .then((res) => {
        console.log(res);
        const data = res.data.places[0];
        console.log(data);

        if (data.level !== 'city' ) {
            const cityCode = data.parent_ids[0];
            console.log(data.parent_ids[0]);
            console.log(cityCode);
            app.getPOIs(cityCode);
            app.getTours(cityCode);
        } else {
            const cityCode = data.id;  
            // app.getPOIs(app.destination.cityCode);
            // app.getRestaurants(app.destination.cityCode);
            app.getPOIs(cityCode);
            app.getTours(cityCode);
        } 

        // console.log(app.destination.cityCode);
        // app.destination.cityCode = data.id;  
        // app.getPOIs(app.destination.cityCode);
        // app.getRestaurants(app.destination.cityCode);
    });
}

app.getPOIs = (cityCode) => {
    $.ajax({
        url: `https://api.sygictravelapi.com/1.0/en/places/list`,
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'parents': cityCode,
            'level': 'poi',
            'limit': 20,
        }
    }).then((res)=> {
        const points = res.data.places;

        const filteredPoints = points.filter((place)=> {
            return place.thumbnail_url && place.perex
        });

        const theFour= filteredPoints.slice(0,3);
        console.log(theFour);
    
        theFour.forEach((point)=> {
            const place = {
                'name': point.name,
                'description': point.perex,
                'photo': point.thumbnail_url,
            };
            app.POIs.push(place);
        });
        app.displayPOIs(app.POIs);

    });
}


app.getAirports = (lat, lng) => {
    $.ajax({
        url: `https://api.sygictravelapi.com/1.0/en/places/list`,
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'location': `${lat},${lng}`,
            'tags': 'Airport',
        }
    }) .then ((res) => {
        app.airport.name = res.data.places[0].name;
        app.airport.description = res.data.places[0].perex;
        app.airport.photo = res.data.places[0].thumbnail_url;
        app.displayAirports(app.airport);
    });
}

app.getLanguage = (country) => {
    $.ajax({
        url: `https://restcountries.eu/rest/v2/name/${country}`,
        method: 'GET',
        dataType: 'json',
        data: {
            fullText: true
        }
    }) .then((res) => {
        console.log(res);
        app.language.name = res[0].languages[0].name;
        app.language.nativeName = res[0].languages[0].nativeName;
        console.log(app.language.name, app.language.nativeName);
        app.displayLanguage(app.language);
    });

}

app.getTours = (cityCode) => {
    $.ajax({
        url: `https://api.sygictravelapi.com/1.0/en/tours/viator`,
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            // 'categories': 'restaurants',
            // 'tags': 'restaurants',
            // 'categories_not': 'discovering|hiking|playing|relaxing|shopping|sightseeing|sleeping|doing_sports|traveling',
            // 'parents': cityCode,
            // 'limit': 20,
            // 'levels': 'poi'
            'parent_place_id': cityCode
        }
   }).then((res) => {
        console.log(res);
        const tours = res.data.tours;
        console.log(tours);

        for (let i = 0; i < 3; i ++) {
            const tour = {
                name: tours[i].title,
                photo: tours[i].photo_url,
                url: tours[i].url
            };
            app.tours.push(tour);
        }
        console.log(app.tours);
        app.displayTours(app.tours);
    });
}


app.getRestaurants = (cityCode) => {
  $.ajax({
        url: `https://api.sygictravelapi.com/1.0/en/places/list`,
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'categories': 'restaurants',
            'tags': 'restaurants',
            'categories_not': 'discovering|hiking|playing|relaxing|shopping|sightseeing|sleeping|doing_sports|traveling',
            'parents': cityCode,
            'limit': 20,
            'levels': 'poi'
        }
   }).then((res) => {
        const restaurantList = res.data.places;
        console.log(restaurantList);
        const filteredRestaurants = restaurantList.filter((place)=> {
            return place.thumbnail_url && place.perex
        });

        console.log(filteredRestaurants);

        if (filteredRestaurants.length === 0) {
            app.displayError('restaurants', 'places to eat');
        } else {
            const theFour = filteredRestaurants.slice(0,3);
            // console.log(theFour);
    
            // if there are no restautanrs that have image and desc,
            // tell user 'sorry, we ont have a lot of info, but check out these restaurants:
            theFour.forEach((restaurant) => {
                const item = {
                    'name': restaurant.name,
                    'description': restaurant.perex,
                    'photo': restaurant.thumbnail_url
                }
                app.restaurants.push(item);
            });
            console.log(app.restaurants);
            app.displayRestaurants(app.restaurants);
        }
        // console.log(filteredRestaurants);
    });
}    

app.getCurrency = (countryCode) => {
    $.ajax({
        url: `https://restcountries.eu/rest/v2/name/${countryCode}`,
        method: 'GET',
        dataType: 'json',
        data: {
            fullText: true
        }
    }).then((res) => {
        app.currency.code = res[0].currencies[0].code;
        app.currency.symbol = res[0].currencies[0].symbol;
        app.displayCurrency(app.currency);

    });
}    

// app.getCurrencies = (country1, country2) => {
//      $.ajax({
//         url: `https://restcountries.eu/rest/v2/name/${country1}`,
//         method: 'GET',
//         dataType: 'json',
//         data: {
//             fullText: true
//         }
//     }).then((res1) => {
//         $.ajax({
//             url: `https://restcountries.eu/rest/v2/name/${country2}`,
//             method: 'GET',
//             dataType: 'json',
//             data: {
//                 fullText: true
//             }
//         }).then((res2)=> {

//             // console.log(res1, res2)
//             app.currency.userCurr = res1[0].currencies[0].code;
//             app.currency.destCurr = res2[0].currencies[0].code;
//             // return res1[0].currencies.code;
//         // console.log(res.currencies);
//         app.convertCurrency(app.currency.userCurr, app.currency.destCurr);
//         })
//    // console.log(res1);
//     });    
// }

app.convertCurrency = (userCurrency, destinationCurrency) => {
    $.ajax({
        url: `https://free.currencyconverterapi.com/api/v6/convert`,
        method: 'GET',
        dataType: 'json',
        data: {
            q: `${userCurrency}_${destinationCurrency},${destinationCurrency}_${userCurrency}`,
            compact: 'ultra'
        }
    }).then((res) => {
        console.log(res);
        app.currency.exchangeRate = res[`${userCurrency}_${destinationCurrency}`];
        console.log(app.currency.exchangeRate);

        $('#currency').append(`<h2>The conversion rate is ${app.currency.exchangeRate.toFixed(2)}</h2>`)

    });
}



app.displayError = (divID, topic) => {
    const title = `<h1>${topic}</h1>`;
    console.log('error');
    $(`#${divID}`).append(title, `<h2>Sorry, we don't have detailed information about ${topic} in this area. Try your search again in a nearby city or related area.</h2>`);
}

app.displayLanguage = (object) => {
    console.log(object.name, object.nativeName);
    const title = `<h1>Primary Language</h1>`;
    const name = `<h2>${object.name}</h2>`;
    const nativeName = `<h2>${object.nativeName}</h2>`;
    $('#language').append(title, name, nativeName)
}

app.displayAirports = (object) => {
    const title = `<h1>Closest Airport</h1>`;
    const name = `<h2>${object.name}</h2>`;
    const desc = `<p>${object.description}</p>`;
    const photo = `<img src="${object.photo}"/>`;
    $('#airport').append(title, name, photo, desc);
}

app.displayRestaurants = (array) => {
    const title = `<h1>Restaurants</h1>`;
    $('#restaurants').append(title);
    array.forEach((item) => {
        const name = `<h2>${item.name}<h2>`;
        const desc = `<p>${item.description}</p>`;
        const photo = `<img src="${item.photo}">`;
        $('#restaurants').append(name, photo, desc);
    });
}

app.displayTours = (array) => {
    const title = `<h1>Top Tours</h1>`;
    $('#tours').append(title);
    array.forEach((item) => {
        const name = `<h2>${item.name}<h2>`;
        const photo = `<img src="${item.photo}">`;
        const link = `<a href="${item.url}">Book Now</a>`;
        $('#tours').append(name, photo, link);
    });
}

app.displayCurrency = (object) => {
    const title = `<h1>Currency</h1>`;
    const html = `<h2>The currency used is ${object.symbol} ${object.code}</h2>`;
    const input = `<form id="userCurrency"><input type="text" id="user" placeholder="Enter your location to convert."><input type="submit"></form>`;
    $('#currency').append(title,html, input);
    app.getUserInfo();
}

app.getUserInfo = () => {
    app.initAutocomplete('user');
    $('#userCurrency').on('submit', function(e) {
        e.preventDefault();
        const userLocation = $('#user').val();
        app.getUserLocation(userLocation);
    });
}

app.getUserLocation = (location) => {
    new google.maps.places.Autocomplete(document.getElementById('user'));
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'address': location
    }, (results, status) => {
        if (status == google.maps.GeocoderStatus.OK) {
            const addressComponents = results[0].address_components.filter((component) => {
                return component.types[0] === 'country';
            });
            app.user.countryCode = addressComponents[0].short_name;
            console.log(app.user.countryCode);
        } else {
            alert('Sorry, something went wrong.' + status)
        }
    app.getUserCurrency(app.user.countryCode);
    });    
}

app.getUserCurrency = (countryCode) => {
    $.ajax({
        url: `https://restcountries.eu/rest/v2/name/${countryCode}`,
        method: 'GET',
        dataType: 'json',
        data: {
            fullText: true
        }
    }).then((res) => {
        app.user.code = res[0].currencies[0].code;
        // app.user.symbol = res[0].currencies[0].symbol;
        console.log(app.user.code);
        app.convertCurrency(app.user.code, app.currency.code);
    });
}

app.displayPOIs = (array) => {
    const title = `<h1>Points of Interest</h1>`;
    $('#POI').append(title);
    array.forEach((item) => {
        const name = `<h2>${item.name}<h2>`;
        const desc = `<p>${item.description}</p>`;
        const photo = `<img src="${item.photo}">`;
        $('#POI').append(name, photo, desc);
    });
}

app.displayWeather = (object) => {
    const title = `<h1>Weather</h1>`;
    const icon = `<canvas id="${object.icon}" width="128" height="128"></canvas>`;
    const html = `<h2>Current temp: ${object.currentTemp}</h2>
        <p>${object.conditions}</p>`
    $('#weather').append(title, icon, html);
    app.loadIcons();
}

app.loadIcons = () => {
    var icons = new Skycons({"color": "black"});
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
}

app.events = () => {
    // app.initAutocomplete('user');
    app.initAutocomplete('destination');
    $('form').on('submit', (e) => {
        e.preventDefault();
        $('div').empty();
        // const user = $('#user').val();
        const destination = $('#destination').val();
        if (destination.length > 0) {
            app.getDestinationInfo(destination);
            // setTimeout(()=> {
            //     console.log('userinfo', app.user);
            //     console.log('destinationinfo', app.destination);
            //     console.log('points of interest', app.POIs);
            //     console.log('exchange-rate', app.exchangeRate);
            // }, 500);
        }
        // $('#user').val('');
        $('#destination').val('');
        // app.user = {};
        app.destination = {};
        
        // display info
        app.weather = {};
        app.currency= {};
        app.POIs = [];
        app.exchangeRate;
        app.restaurants = [];
        app.airport = {};
        app.languages = {};
    });
}

app.init = () => {
    app.events();
}

$(function () {
    console.log("ready!");
    app.init();
});