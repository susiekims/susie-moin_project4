// get user's current location
// get location user wants to travel to
// pass user location into Google maps geocoder to get lat and lng coords
// pass user desired location into Google geocoder to get lat and lng coords
// pass city info and call weather API and get current weather
// pass city info and call zomato API and get top 3 random restaurants 
// pass city info into 


// create empty object to store all methods
const app = {};
app.user = {};
app.destination = {};

// get user's current location
// most of the other APIs we are requesting data from accept location info in the form of lat lng coords
// so we pass user location into Google  geocoder to get lat and lng coords to use in other API requests


app.getInfo = (location, object) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'address': location
    },
    (results, status) => {
        if (status == google.maps.GeocoderStatus.OK) {
            const addressComponents = results[0].address_components.filter((component) => {
                return component.types[0] === 'country';
            });
            object.country = addressComponents[0].long_name;
            object.lat = results[0].geometry.location.lat();
            object.lng = results[0].geometry.location.lng();
            console.log(object.country);
            console.log(object.lat, object.lng);
            app.getCurrency(object.country, object);
            app.getWeather(object.lat, object.lng);
        } else {
            alert("Something went wrong." + status);
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
        console.log(res);
    });
}

app.getCurrency = (country, object) => {
    $.ajax({
        url: `https://restcountries.eu/rest/v2/name/${country}`,
        method: 'GET',
        dataType: 'json',
        data: {
            fullText: true
        }
    }).then((res) => {
        // console.log(res);
        object.currencyCode = res[0].currencies[0].code;
        object.currencySymbol = res[0].currencies[0].symbol;
        object.currencyName = res[0].currencies[0].name;
        // console.log(object.currency);
        app.convertCurrency(app.user.currencyCode, app.destination.currencyCode);
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
        console.log(res);
    });
}

app.getRestaurants = () => {

}

app.events = () => {
    $('form').on('submit', (e) => {
        e.preventDefault();
        const user = $('#user-location').val();
        const destination = $('#destination').val();
        app.getInfo(user, app.user);
        app.getInfo(destination, app.destination);
        console.log(app.user, app.destination);
    });
}

app.init = () => {
    app.events();
}

$(function() {
    console.log( "ready!" );
    app.init();
});