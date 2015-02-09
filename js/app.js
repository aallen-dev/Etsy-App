window.onload = app;

// runs when the DOM is loaded
function app(){
    "use strict";

    // load some scripts (uses promises :D)
    loader.load(
        //css
        {url: "./dist/style.css"},
        //js
        {url: "./bower_components/jquery/dist/jquery.min.js"} ,
        {url: "./bower_components/jquery/dist/jquery.swipe.min.js"} ,
        {url: "./bower_components/lodash/lodash.min.js"} ,
        {url: "./bower_components/backbone/backbone.js"} ,
        {url: "./js/etsyClient.js"}

    ).then(function(){

    "use strict";
        document.querySelector("html").style.opacity = 1;


        
        // alert($.swipeLeft)//(function(){alert()})

        $( "#search" ).submit(function( event ) {
            var filters = [
                $('#imageS').prop('checked') ? 'i':'' ,
                $('#weekS').prop('checked') ? 'w':'' 
            ].join('')
            BlazinEtsy.Router.navigate( 'search/'+escape($('#keywords').val()) + (filters?'/filters/'+filters:'') , {trigger: true});
            event.preventDefault();
        });

    })

}









































































































