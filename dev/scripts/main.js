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
app.destination = {};

// display info
app.currency= {};
app.POIs = [];
app.exchangeRate;


// get user's current location
// most of the other APIs we are requesting data from accept location info in the form of lat lng coords
// so we pass user location into Google  geocoder to get lat and lng coords to use in other API requests
app.initAutocomplete = (id) => {
    new google.maps.places.Autocomplete(document.getElementById(id));
}

app.getUserInfo = (location, location2) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'address': location
    },
    (results, status) => {
        if (status == google.maps.GeocoderStatus.OK) {
            const addressComponents = results[0].address_components.filter((component) => {
                return component.types[0] === 'country';
            });
            app.user.countryCode = addressComponents[0].short_name;
            app.user.countryName = addressComponents[0].long_name;
            app.user.lat = results[0].geometry.location.lat();
            app.user.lng = results[0].geometry.location.lng();
            // console.log(object.country);
            // console.log(object.lat, object.lng);
            // app.getCurrency(app.user.countryCode);
            // app.getWeather(app.user.lat, app.user.lng, app.user);
            app.getDestinationInfo(location2);

        } else {
            alert("Something went wrong." + status);
        }
    });
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
            // console.log(addressComponents);
            app.destination.countryCode = addressComponents[0].short_name;
            app.destination.countryName = addressComponents[0].long_name;
            app.destination.lat = results[0].geometry.location.lat();
            app.destination.lng = results[0].geometry.location.lng();
            // console.log(app.user.countryCode);
            app.getWeather(app.destination.lat, app.destination.lng, app.destination);
            app.getCurrencies(app.user.countryCode, app.destination.countryCode);
            app.getCityCode(app.destination.lat, app.destination.lng);
            app.getRestaurants(app.destination.lat, app.destination.lng);
        } else {
            alert("Something went wrong." + status);
        }
    });
}

app.getWeather = (latitude, longitude, object) => {
    $.ajax({
        url: `https://api.darksky.net/forecast/ea2f7a7bab3daacc9f54f177819fa1d3/${latitude},${longitude}`,
        method: 'GET',
        dataType: 'jsonp',
        data: {
            'units': 'auto'
        }
    })
    .then((res) => {
        object.weatherConditions = res.daily.summary;
        object.currentTemp = res.currently.temperature;
        // console.log(object.currentTemp);
        // console.log(object.weatherConditions);
        app.displayWeather(object);
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
        console.log(res.data);
        const data = res.data.places[0];
        const id = data.id;
        console.log(data);
        console.log(id);
        app.getPOIs(id);
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
            'limit': 3,
        }
    }).then((res)=> {
        const points = res.data.places;
        // console.log(res.data.places);
        points.forEach((point)=> {
            const place = {
                'name': point.name,
                'description': point.perex
            };
            app.POIs.push(place);
        });
        app.displayPOIs(app.POIs);

    });
}

app.getRestaurants = (lat, lng) => {
    $.ajax({
        url: `https://api.sygictravelapi.com/1.0/en/places/list`,
        method: 'GET',
        dataType: 'json',
        headers: {
            'x-api-key': 'zziJYcjlmE8LbWHdvU5vC8UcSFvKEPsC3nkAl7eK'
        },
        data: {
            'categories': 'restaurants',
            'categories_not': 'discovering|hiking|playing|relaxing|shopping|sightseeing|sleeping|doing_sports|traveling',
            'location': `${lat},${lng}`
        }
    }).then((res) => {
        console.log(res.data.places);
    });
}    

app.getCurrencies = (country1, country2) => {
     $.ajax({
        url: `https://restcountries.eu/rest/v2/name/${country1}`,
        method: 'GET',
        dataType: 'json',
        data: {
            fullText: true
        }
    }).then((res1) => {
        
        $.ajax({
            url: `https://restcountries.eu/rest/v2/name/${country2}`,
            method: 'GET',
            dataType: 'json',
            data: {
                fullText: true
            }
        }).then((res2)=> {

            // console.log(res1, res2)
            app.currency.userCurr = res1[0].currencies[0].code;
            app.currency.destCurr = res2[0].currencies[0].code;
            // return res1[0].currencies.code;
        // console.log(res.currencies);
        app.convertCurrency(app.currency.userCurr, app.currency.destCurr);
        })
   // console.log(res1);
    });    
}

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
        // console.log(res);
        app.currency.exchangeRate = res[`${userCurrency}_${destinationCurrency}`];
        console.log(app.currency.exchangeRate);
        app.displayCurrency(app.currency);
    });
}

app.displayRestaurants = () => {

}

app.displayCurrency = (object) => {
    const title = `<h1>Currency</h1>`;
    const html = `<h2>The exchange rate from ${object.userCurr} to ${object.destCurr} is ${object.exchangeRate}</h2>`;
    $('#currency').append(title,html);
}

app.displayPOIs = (array) => {
    const title = `<h1>Points of Interest</h1>`;
    $('#POI').append(title);
    array.forEach((item) => {
        const name = `<h2>${item.name}<h2>`;
        const desc = `<p>${item.description}</p>`;
        $('#POI').append(name, desc);
    });
}

app.displayWeather = (object) => {
    const title = `<h1>Weather</h1>`;
    const html = `<h2>Current temp: ${object.currentTemp}</h2>
        <p>${object.weatherConditions}</p>`
    $('#weather').append(title, html);
}

app.events = () => {
    app.initAutocomplete('user');
    app.initAutocomplete('destination');
    $('form').on('submit', (e) => {
        e.preventDefault();
        $('div').empty();
        app.user = {};
        app.destination = {};
        app.currency= {};
        app.POIs = [];
        app.exchangeRate;
        const user = $('#user').val();
        const destination = $('#destination').val();
        if (user.length > 0 && destination.length > 0) {
            app.getUserInfo(user, destination);
            setTimeout(()=> {
                console.log('userinfo', app.user);
                console.log('destinationinfo', app.destination);
                console.log('points of interest', app.POIs);
                console.log('exchange-rate', app.exchangeRate);
            }, 500);
        }
        $('#user').val('');
        $('#destination').val('');
    });
}

app.init = () => {
    app.events();
}

$(function () {
    console.log("ready!");
    app.init();
});