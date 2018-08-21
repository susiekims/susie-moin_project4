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
        } else {
            alert("Something went wrong." + status);
        }
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
        console.log(res);
        object.currencyCode = res[0].currencies[0].code;
        console.log(object.currencyCode);
        // app.convertCurrency('CAD', currencyCode);
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
        // const destination = $('#destination').val();
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