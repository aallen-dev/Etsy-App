;(function(){
    var etsyAPI = function() {
        "use strict";

        var self = this;
        
        this.preRequisites  = 0;
        this.onload         = [];
        this.templates      = {};
        this.isLoaded       = $.Deferred();

        self.preRequisites++;
        $.get('./templates/listing.tmpl').then(function(p) {

            self.templates.listing = _.template(p)
            self.preRequisites--;

            if (self.preRequisites === 0)
                self.isLoaded.resolve();

        });

        this.pagination = {
            
            perPage : 3 ,

            currentPage : 0 ,

            moveNext : function() {
                
                ++self.pagination.currentPage;

            } ,
            movePrev : function() {

                --self.pagination.currentPage;

            } ,

            getCurrent : function() {

                var pag = self.pagination;
                
                return '&offset=' + (pag.currentPage * pag.perPage) + '&limit=' + pag.perPage;

            } ,

            getNext : function() {
                
                var pag = self.pagination;

                ++pag.currentPage;

                return '&offset=' + (pag.currentPage * pag.perPage) + '&limit=' + pag.perPage;

            }
        };


        this.options   = {
            
            apiKey : '&api_key=5d36ikmuk8tmu1sybb75hw1k' ,
            
            active : 'active.js?includes=Images,Shop&callback=?' ,
            
            path    : {
                listings : 'https://openapi.etsy.com/v2/listings/'
            } 

            // range : function(from , to) {
                
            //     if (isNaN(from)||isNaN(to))
            //         throw new TypeError('Number is required in for range.');

            //     return '&offset=' + from + '&limit=' + (to - from);
            // }

        };

        this.active = [];

        this.currentListing = 0;

        this.toLoad = 0;
        this.loading = false;
        this.highest = 0

        this.Router = new (Backbone.Router.extend({
                    
            routes : {
                ''                                  : 'root'  ,
                'listing/:listing'                  : 'openListing' ,
                'listing/:listing/show'             : 'displayListing' ,
                'search/:keywords'                  : 'search' ,
                'search/:keywords/filters/:filters' : 'searchFiltered' ,
                '*default'                          : 'error'
            } ,

            root : function() {
                console.log(self)

                // self.more = true;
                self.addEvent('load' , function(){self.getActiveListing()})

            } ,
            
            openListing: function(id , show) {
                
                // self.more = true;
                
                var opt = self.options;
                var url = [opt.path.listings , id + '.js?includes=Images,Shop&callback=?' , opt.apiKey].join('');

                $('#quickView').html('<p></p>');

                $.getJSON(url).then(function(p) {
                    
                    var v = self.configureListing(p.results[0]);
                    if (v && v.node)
                        $('#quickView').append(v.node);
                    else 
                        $('#quickView').append('<p class="listing">listing ' + id + ' not found</p>');

                    // self.getActiveListing();
                    self.getActiveListing().then(function() {
                        if (show)
                            self.showDescription();
                    })

                });

            } ,
            displayListing : function(id) {

                this.openListing(id , true);
                return;

            } ,
            
            search: function(keywords) {
                
                // self.more           = false;
                self.currentListing = 0;
                self.active         = [];
                
                $('#quickView')
                    .css({left:'30%'})              // reset the view port , 
                    .html('<p></p><p>loading</p>'); // a message to bide our time as we do a large pull.

                var opt = self.options;
                var url = [opt.path.listings , opt.active , '&keywords='+keywords, opt.apiKey,'&limit=50'].join('');
                // this.more = false;

                $.getJSON(url).then(function(p) {

                    $('#quickView').html('<p></p>');

                    if (p.results.length<1)
                        $('#quickView').append('<p>no results found for ' + unescape(keywords) + '</p>');
                    
                    else
                        p.results.map(function(l) {

                            var v = self.configureListing(l);
                    
                            if (v && v.node)
                                $('#quickView')
                                    .append(v.node);
                        });
                    
                    self.reDraw();
                    self.createEvents();

                });

            } ,
            searchFiltered: function(keywords , filters) {
                
                self.filters = filters;
                this.search(keywords);
                
            } ,

            error : function() {

                $('body').css({margin:'50px 20% 0px 20% '}).html('<h1>404 Page Not Found</h1><h3>The address or link is no longer valid.</h3><h7>but between you and me... I don\'t think it ever was! I think you should track down the guy that sent you here and &#9629;&#9628;&#9622;&#9627;&#9629;&#9630;&#9618;&#9618;&#9618;&#9618;&#9618;&#9618;&#9618;&#9618;&#9617;&#9617;&#9617;&#9617;</h7><pre>Error: transmission timed out.</pre>');

            },
            initialize: function() {
                Backbone.history.start();
            }

        }))();

    };

    etsyAPI.prototype = {
        
        addEvent : function(e , callback) {
            
            var self = this;
            
            if (e==='load') {

                this.onload.push(callback)
                this.isLoaded.then(function() {

                    self.onload.forEach(function(cb){cb.call()});

                });

            }

        } ,
        configureListing : function(listing) {
            
            if (!listing)
                return null;
            
            listing.blazin = {
                img : [],
                created : new Date(listing.creation_tsz*1000),
                avatar:''
            }
            var aWeekAgo = new Date().getTime() - (7 * 24 * 60 * 60 * 1000);

            if ((this.filters&&this.filters.match(/w/) && listing.blazin.created<aWeekAgo)||
                (this.filters&&this.filters.match(/i/) && listing.Images.length<5)) {
                return null;
            }

            if (listing.error_messages && listing.error_messages.length>0) {
                console.log('error\r\n' , listing);
                return null;
            }

            listing.description = listing.description.replace(/\r/g,"<br>");
            
            if (listing.Images && listing.Images.length>0) {

                listing.blazin.img = listing.Images.map(function(obj) {
                    
                    var tmp = [];
                    
                    for (var i in obj)
                        if (i.match(/url/))
                            tmp.push(obj[i]);
                    
                    return tmp;

                });

                listing.blazin.avatar = listing.blazin.img[0][listing.blazin.img[0].length-1];
            }
            
            // create a DOM node from invoking the template in the context of listing (this should cash any images before adding to the page)
            listing.node = $(this.templates.listing(listing));
            var myIndex = (this.active.length)
            
            var self = this
            listing.node.click(function() {
                // console.log(this.className)
                if (this.className.match('showDescription')) {
                    return
                }
                if (this.className.match('center')) {
                    self.showDescription();
                    return
                }
                var oldListing = self.active[self.currentListing]
                $('#banner-' + oldListing.listing_id).attr('src' , oldListing.blazin.avatar);

                self.currentListing = myIndex
                self.reDraw()

                BlazinEtsy.Router.navigate( 'listing/' + listing.listing_id + '/show' , {trigger: false});

                if (self.currentListing+4 > self.active.length)
                    self.lazyLoad(1);

                $('.bannerFull').removeClass('bannerFull');
                
            })

            this.active.forEach(function(active) {
                
                if (!active || !listing)return; // I don't fucking know...
                
                if (active.listing_id==listing.listing_id)
                    listing = null;
            });
            if(!listing)
                return listing;

            this.active.push(listing);



            return listing;
        },
        getTopThree : function(){
            
            this.pagination.currentPage = 0;

            var self    = this ,
                opt     = this.options ,
                url     = [opt.path.listings ,opt.active ,opt.apiKey , this.pagination.getCurrent()].join('') ,
                promise = $.getJSON(url);

            promise.then(function(p) {
                p.results.forEach(function(l) {

                    var v = self.configureListing(l)  
                    if(v && v.node)
                        $('#quickView')
                            .append(v.node)
                    
                });
                self.pagination.perPage = 10
                
            });

            return promise;

        } ,
        getListingById : function(){

        } ,
        lazyLoad : function(qty) {
            console.log('load more')

            //if(!this.more)return; // I'm a bit confused about the pagination for cerain queries, and it's almost 4AM, this can wait for another day. just return for now
            // prepare the next pagnaton
            // as a scroll event occurs we want to signal that we need more info.
            // since we only pull 3 at a time per our pagination, we must throttle any requests
            // so that we don't exceed our limit of 5/second

            var self = this;
            var opt = self.options;
            var url = [opt.path.listings ,opt.active ,opt.apiKey , self.pagination.getNext()].join('');
            // var url = this.url.concat([self.pagination.getNext()]).join('')
            
            if (qty)
                this.toLoad += qty;

            $.getJSON(url).then(function(p) {
                
                p.results.map(function(l) {

                    var v = self.configureListing(l) ;

                    if( v && v.node) 
                        $('#quickView')
                            .append(v.node);

                });

                // self.reDraw()

            });

            // as our user approaches the end of the available listings more must be pulled
            // if the user is scanning very fast, we must pull more as soon as we return.
            --self.toLoad;
            if (this.toLoad>0)
                _.delay(function() {self.lazyLoad();} , 250);   // but not more than our per second limiter

            else
                this.noMoreLoad.resolve();

        },
        showDescription : function(){
            
            // modify the layout of the listing to allow a larger view and scrollability.
            $('.center').addClass('showDescription');

            // shift the thumbnails to the left so they can animate in, then make them visible.
            $('.thumb.' + $('.center').attr('listing')).addClass('thumbsLeft').show();
            
            _.delay(function() {
                
                var thumbs = $('.thumb.thumbsLeft');

                for (var i = 0 , len = thumbs.length ; i<len ; i++) { 

                    // create a function for each thumb with a slight offset
                    _.delay(function() {

                        // remove the left class from the right most first
                        $(thumbs[$('.thumb.thumbsLeft').length-1]).removeClass('thumbsLeft');   // can't use the cashed thumbs.length because it will change with each pass, we must get it's current value :(

                    } , 200 * i);
                }

            } , 500);

        } ,
        reDraw : function(dir) {
            
            var self = this;
            
            ///////////////
            //

            $('.thumb').hide().click(function() {
                
                // do a little cashing so we don't keep looking up this info.
                var thumb   = $(this) ,
                    listing = thumb.attr('listing');

                // add the "loading" class to stretch the thumb image while the large size loads
                $('#banner-' + listing)
                    .attr('src' , thumb.attr('src'))
                    .addClass('loading');

                // this is an optional banner that indicates the image is loading- so
                // the user doesn't think an error has occured if the large size takes forever.
                $('.message.' + listing ).addClass('loading');

                $('#banner-' + listing)
                    .attr('src' , thumb.attr('big')) // we will find the url for our large size tucked away as an attribute on the thumb
                    .on('load' , function() {

                        // once the large size is downloaded, clean up our temporary classes.
                        $('.message.' + listing ).removeClass('loading');
                        $(this).removeClass('loading');

                    });
            });

            //
            ///////////////


            $('#quickView').css({zIndex:0})
            this.active.forEach(function(obj , index) {

                var node = obj.node;
            
                ///////////////
                //
                $('#banner-' + node.attr('listing')).off().on('click' ,function(event) {

                    if (!this.parentNode.parentNode.className.match('showDescription'))//||
                        return

                    event.stopPropagation();

                    $('.bannerBack.' + node.attr('listing')).toggleClass('bannerFull');
                    $(this).toggleClass('bannerFull');
                });
                //
                ///////////////

                // hopefully only accessing only 11 cards at a time will reduce resource seepage (If I have a milkshake...)
                if ((index>self.currentListing && index-self.currentListing<=5) ||
                    (index<self.currentListing && self.currentListing-index<=5) ||
                    (index==self.currentListing))
                        node.removeClass('left right center showDescription')
                            .css({zIndex:0});

                if (index>self.currentListing && index-self.currentListing<=5) {

                    node.addClass('right')
                        .css({
                            zIndex:-index ,
                        })
                        .css({
                            opacity:1,
                            position:'absolute' ,
                            left: 70 - self.currentListing*10 + index*10 + '%'
                        });

                    // fade in one more if any less than 3 that are showing
                    if(index-self.currentListing>4)
                        node.css({opacity:0});
                }

                if (index<self.currentListing && self.currentListing-index<=5) {
                    
                    node.removeClass('left right center showDescription')
                        .css({zIndex:0});

                    // slide over
                    node.addClass('left')
                        .css({
                            opacity:1,
                            position:'absolute' ,
                            left: 45 - self.currentListing*10 + index*10 + '%'
                        });

                    // fade out the last one if any greater than 3 that are showing
                    if(self.currentListing-index>4)
                        node.css({opacity:0});
                        
                }

                if (index===self.currentListing) {
                    
                    node.removeClass('left right center showDescription')
                        .css({zIndex:0});

                    self.Router.navigate("listing/" + node.attr('listing') , {trigger: false});

                    node.addClass('center')
                        .css({
                            position:'absolute' ,
                            left:''
                        });
                }
            })

        } ,
        getActiveListing : function() {

            var self    = this ,
                promise = this.getTopThree();

            this.noMoreLoad = $.Deferred();
            
            promise.then(function(){
            
                self.reDraw();
                
                self.createEvents();
            });

            return promise;
        },
        createEvents : function(){
            
            $(function() {
                // Bind the swipeHandler callback function to the swipe event on div.box
                $( "*" )
                .on( "swipeleft", function( event ) {
                    event.preventDefault();
                    self.currentListing++;
                    self.reDraw();                    // $( event.target ).addClass( "swipe" );
                    if (self.currentListing+4 > self.active.length)
                        self.lazyLoad(1);
                })
                .on( "swiperight", function swipeHandler( event ){
                    event.preventDefault();
                    self.currentListing--;
                    self.reDraw();                    // $( event.target ).addClass( "swipe" );
                });
            });

            var self = this;
            
            $( '*' ).keydown(function() {
                if (event.which === 39||event.which === 37) 
                    event.preventDefault();
            });

            $( '*' ).keydown(_.throttle(function() {
                
                var listing = $('.center');
                
                // left - slide the displayed listings to the left
                if (event.which === 37) {

                    if(self.currentListing<1)
                        return;
                    self.currentListing--;
                    self.reDraw();

                    event.preventDefault();
                }

                // up - expand the current listinge; display thumbs, and description
                if (event.which === 38) {

                    self.showDescription();
                    BlazinEtsy.Router.navigate( 'listing/' + listing.attr('listing') + '/show' , {trigger: false});

                    event.preventDefault();
                }

                // right - slide the displayed listings to the right
                if (event.which === 39) {

                    self.currentListing++;
                    self.reDraw();

                    if (self.currentListing+4 > self.active.length)
                        self.lazyLoad(1);

                    event.preventDefault();
                }

                // down - close the current listing
                if (event.which === 40) {
                    
                    $('.showDescription').removeClass('showDescription');
                    $('.thumb').hide();
                    
                    BlazinEtsy.Router.navigate( 'listing/' + listing.attr('listing') , {trigger: false});
                    
                    event.preventDefault();
                }
                if (event.which === 37 || event.which === 39 || event.which === 40){
                    // reset banner in case it was changed while viewing thumbs
                    $('#banner-' + listing.attr('listing')).attr('src' , listing.attr('banner'));
                    $('.bannerFull').removeClass('bannerFull');

                }

            } , 200 , {trailing:false}));
        }

    }
    window.BlazinEtsy = new etsyAPI();

})();