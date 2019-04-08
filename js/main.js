/* Sheet by Clara Margaret Flood, 2019 */


(function(){
    
    //pseudo-global variables
    var attrArray = ["Mean Household Income", "% Without Health Insurance", "% Unemployed", "% Without High School Degree", "% Without Bachelor's Degree", "% With Disability"];
    var expressed = attrArray[0]; //initial attribute
    
    //context map dimensions
    var conMargin = {top: 12, left: 10, bottom: 12, right: 10},
        conHeight = window.innerHeight,
        conHeight = conHeight - conMargin.top - conMargin.bottom,
        conWidth = window.innerWidth * .25;
    
    //map dimensions
    var margin = {top: 12, left: 10, bottom: 14, right: 10},
        height = window.innerHeight,
        height = height - margin.top - margin.bottom,
        width = window.innerWidth * .4;
    
    //chart dimensions
    var chartWidth = window.innerWidth *.3,
        chartHeight = window.innerHeight,
        chartHeight = chartHeight - margin.top - margin.bottom,
        leftPadding = 7,
        rightPadding = 10,
        topPadding = 5,
        topBottomPadding = 5,
        bottomPadding = 65,
        chartInnerWidth = chartWidth - rightPadding - leftPadding,
        chartInnerHeight = chartHeight - topPadding - bottomPadding,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")",
        charttranslate = "translate(" + leftPadding + "," + (chartInnerHeight - 10) + ")";

    //create a scale to size bars proportionally to frame
    var xScale = d3.scale.linear()
        .range([chartInnerWidth, 0])
        .domain([0, 139016]);
    
    window.onload = setContext(conWidth, conHeight);
    window.onload = setMap(width, height);

    function numberWithCommas(x) {
       return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    
    //set up choropleth map
    function setContext(width, height){

        //create new svg container for the map
        var conmap = d3.select("body")
            .append("svg")
            .attr("class", "conmap")
            .attr("width", width)
            .attr("height", height);

        //create Albers equal area conic projection centered on Ohio
        var projection = d3.geoAlbers()
            .center([0, 41.29])
            .rotate([82.2, 0])
            .parallels([43, 62])
            .scale(width*8)
            .translate([width / 1.8, height / 1.4]);

        var path = d3.geoPath()
            .projection(projection);

        //use queue to parallelize asynchronous data loading
        d3.queue()
            .defer(d3.json, "data/LorainCo.topojson") //load choropleth spatial data
            .defer(d3.json, "data/OhioState.topojson")
            .await(callback);

        function callback(error, lorainc, ohio){
            
            //translate TopoJSON
            var lorainCounty = topojson.feature(lorainc, lorainc.objects.LorainCo);
            
            var ohioOutline = topojson.feature(ohio, ohio.objects.OhioState);
            
            //add ohio outline to map
            var outlines = conmap.append("path")
                .datum(ohioOutline)
                .attr("class", "outlines")
                .attr("d", path);
            
            var lorainOutlines = conmap.append("path")
                .datum(lorainCounty)
                .attr("class", "lorainOutlines")
                .attr("d", path);
            
            var conTitle = conmap.append("text")
                .attr("x", (width/2.2))
                .attr("y", (height/1.27))
                .attr("class", "conTitle");
            
            var ohioTitle = d3.select(".conTitle")
                .text("Ohio"); 
        };
    };
    
    //set up choropleth map
    function setMap(width, height){

        //create new svg container for the map
        var map = d3.select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height)
            .call(d3.behavior.zoom().on("zoom", function () {
                map.attr("transform", "translate(" + d3.event.translate + ")" + " scale(" + d3.event.scale + ")")
            }))
            .append("g");

        //create Albers equal area conic projection centered on lorain
        var projection = d3.geoAlbers()
            .center([0, 41.29])
            .rotate([82.2, 0])
            .parallels([43, 62])
            .scale(width*125)
            .translate([width / 2.9, height / 2]);

        var path = d3.geoPath()
            .projection(projection);
        
       var zoomTitle = map.append("text")
                .attr("x", (width/2.2))
                .attr("y", (height/1.01))
                .attr ("width", width)
                .attr("class", "zoomTitle");
            
        var zoomWords = d3.select(".zoomTitle")
                .text("Use your scroll wheel or track pad to zoom in!"); 
        
        //use queue to parallelize asynchronous data loading
        d3.queue()
            .defer(d3.csv, "data/loraindemo.csv") //load attributes from csv
            .defer(d3.json, "data/lorain.topojson") //load choropleth spatial data
            .defer(d3.json, "data/LorainCoCities.topojson") //load city spatial data
            .await(callback);

        function callback(error, csvData, loraint, cities){
            //translate lorain TopoJSON
            var lorainTracts = topojson.feature(loraint, loraint.objects.lorain).features;
            var lorainCities = topojson.feature(cities, cities.objects.LorainCoCities).features;
            //join csv data to GeoJSON enumeration units
            lorainTracts = joinData(lorainTracts, csvData)
            
            var colorScale = makeColorScale(csvData);
            //add enumeration units to the map
            setEnumerationUnits(lorainTracts, map, path, colorScale);
            setCities(lorainCities, map, path);
            //add coordinated visualization to the map
            setChart(csvData, colorScale);
            
            createDropdown(csvData);
        };
    };
    
    //function to create color scale generator
    function makeColorScale(data){
        var colorClasses = [
            "#ABFAFA",
            "#68C3C3",
            "#2C8484",
            "#004E4E",
            "#002F2F"
        ];

        //create color scale generator
        var colorScale = d3.scale.quantile()
            .range(colorClasses);

        //build two-value array of minimum and maximum expressed attribute values
        var minmax = [
            d3.min(data, function(d) { return parseFloat(d[expressed]); }),
            d3.max(data, function(d) { return parseFloat(d[expressed]); })
        ];
        //assign two-value array as scale domain
        colorScale.domain(minmax);

        return colorScale;
    };
    
    function choropleth(props, colorScale){
        //make sure attribute value is a number
        var val = parseFloat(props[expressed]);
        //if attribute value exists, assign a color; otherwise assign gray
        if (typeof val == 'number' && !isNaN(val)){
            return colorScale(val);
        } else {
            return "#CCC";
        };
    };

    function joinData(lorainTracts, csvData){
    //loop through csv to assign each set of csv attribute values to geojson region
        for (var i=0; i<csvData.length; i++){
            var csvTract = csvData[i]; //the current region
            var csvKey = csvTract.GEOID10; //the CSV primary key
            //loop through geojson regions to find correct region
            for (var a=0; a<lorainTracts.length; a++){
                var geojsonProps = lorainTracts[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.GEOID10; //the geojson primary key
                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey){
                    //assign all attributes and values
                    attrArray.forEach(function(attr){
                        var val = parseFloat(csvTract[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };
        return lorainTracts;
    };
    
    function setEnumerationUnits(lorainTracts, map, path, colorScale){
        var tracts = map.selectAll(".tracts")
        .data(lorainTracts)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "tracts " + d.properties.GEOID10;
        })
        .attr("d", path)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale);
        })
        .on("mouseover", function(d){
            highlight(d.properties);
        })
        
        .on("mouseout", function(d){
            dehighlight(d.properties);
        })
        .on("mousemove", moveLabel);
        
        var desc = tracts.append("desc")
            .text('{"stroke": "rgba(0, 0, 0, 0.3)", "stroke-width": "0.8px"}');
    };
    
    function setCities(cities, map, path){
        var loCities = map.selectAll(".loCities")
        .data(cities)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "loCities " + d.properties.CityName;
        })
        .attr("d", path)
        .attr( "visibility", "hidden")
        .on("mouseover", function(d){
            highlightCity(d.properties);
        })
        .on("mouseout", function(d){
            dehighlightCity(d.properties);
        })
        .on("mousemove", moveLabel);
        
        var desc2 = loCities.append("desc2")
            .text('{"stroke": "#000", "stroke-width": "1px"}');
        
        //grabs toggle button
        var cityCheckbox = document.querySelector('input[id="cityToggle"]');
        
        cityCheckbox.onchange = function() {
          if(this.checked) {
            d3.selectAll(".loCities").attr("visibility", "visible");
          } else {
            d3.selectAll(".loCities").attr("visibility", "hidden");
          }
        };
    };
    
    //function to create coordinated bar chart
    function setChart(csvData, colorScale){
        
        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");
        
        //create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);;

        //set bars for each tract
        var bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return a[expressed]-b[expressed]
            })
            .attr("class", function(d){
                return "bars " + d.GEOID10;
            })
        
            .attr("height", chartInnerHeight / csvData.length - 1)
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveLabel);
            var desc = bars.append("desc")
                .text('{"stroke": "none", "stroke-width": "0px"}');
            
        //create text element for chart title
        var chartTitle = chart.append("text")
            .attr("x", (chartWidth/6.9))
            .attr("y", (chartHeight/1.01))
            .attr("class", "chartTitle");
        
                    
        var xAxis = d3.svg.axis()
            .scale(xScale);
        
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", charttranslate) //change the 10 in order to change how far down the axis is. 
            .call(xAxis)
            
        //set bar positions, heights, and colors
        updateChart(bars, csvData.length, colorScale);
    };
    
    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData){
        //add select element
        var dropdown = d3.select("#menuHolder")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Population");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };
    
    //dropdown change listener handler
    function changeAttribute(attribute, csvData){
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var tracts = d3.selectAll(".tracts")
            .transition()
            .duration(1000)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale)
            });
        
        var max = d3.max(csvData, function(d){
            return + parseFloat(d[expressed])
        });
        
        xScale = d3.scale.linear()
            .range([chartInnerWidth, 0])
            .domain([0, max]);

        //re-sort, resize, and recolor bars
        var bars = d3.selectAll(".bars")
            //re-sort bars
            .sort(function(a, b){
                return a[expressed] - b[expressed];
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 10
            })
            .duration(400);

        updateChart(bars, csvData.length, colorScale);
    };
    
    function updateChart(bars, n, colorScale){
        //position bars
        bars.attr("y", function(d, i){
                return i * ((chartInnerHeight - topPadding - 20) / n) + topPadding; //subtract something from chartInnerHeight to move bottom of chart up
            })
            //resize bars
            .attr("width", function(d, i){
                    return chartInnerWidth - xScale(parseFloat(d[expressed]));
            })
            .attr("x", function(d, i){
                return xScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //recolor bars
            .style("fill", function(d){
                return choropleth(d, colorScale);
            });
        
        var chartTitle = d3.select(".chartTitle")
            .text(expressed + " by Census Tract");
        
        
        var xAxis = d3.svg.axis()
            .scale(xScale);

        d3.selectAll("g.axis")
            .attr("transform", charttranslate)
            .call(xAxis)
            .selectAll("text")	
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", ".15em")
                .attr("transform", function(d) {
                    return "rotate(-65)" 
                    });
    };
    
    function highlight(props){
        //change stroke
        var selected = d3.selectAll("." + props.GEOID10)
            .style("stroke", "#50326E") //change highlight color here, current purple, optional orange B84704
            .style("stroke-width", "4");
        
        setLabel(props);
    };
    
    function dehighlight(props){
        var selected = d3.selectAll("." + props.GEOID10)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });

        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc")
                .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        };
        d3.select(".infolabel")
            .remove();
    };
    
    //function to create dynamic label
    function setLabel(props){
        //label content
        var labelAttribute = expressed + ": " + numberWithCommas(props[expressed]);

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.GEOID10 + "_label")
            .html(labelAttribute);       
    };
    
    //function to move info label with mouse
    function moveLabel(){
        //get width of label
        var labelWidth = d3.select(".infolabel,.infolabelcity")
            .node()
            .getBoundingClientRect()
            .width;

        //use coordinates of mousemove event to set label coordinates
        var x1 = d3.event.clientX + 10,
            y1 = d3.event.clientY - 35,
            x2 = d3.event.clientX - labelWidth - 10,
            y2 = d3.event.clientY + 25;

        //horizontal label coordinate, testing for overflow
        var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
        //vertical label coordinate, testing for overflow
        var y = d3.event.clientY < 75 ? y2 : y1; 

        d3.select(".infolabel,.infolabelcity")
            .style("left", x + "px")
            .style("top", y + "px");
    };
    
    function highlightCity(props){
        //change stroke
        var selected = d3.selectAll("." + props.CityName)
            .style("stroke", "#50326E") //change highlight color here B84704
            .style("stroke-width", "4");
        
        setCityLabel(props);
    };
    
    function dehighlightCity(props){
        var selected = d3.selectAll("." + props.CityName)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
            });

        function getStyle(element, styleName){
            var styleText = d3.select(element)
                .select("desc2")
                .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        };
        d3.select(".infolabelcity")
            .remove();
    };
    
    function setCityLabel(props){
        //label content
        var labelAttribute = props.CityName;

        //create info label div
        var infolabelcity = d3.select("body")
            .append("div")
            .attr("class", "infolabelcity")
            .attr("id", props.CityName + "_label")
            .html(labelAttribute);
    };
    
})();

$(document).ready(function() {
    $(function(){
      
      $('#popup1').css("visibility", "visible"); 
       $('#popup1').css("opacity", 1); 
      
       });
  
  $( ".close" ).click(function() {
    
       $('#popup1').css("visibility", "hidden"); 
       $('#popup1').css("opacity", 0);
    });
});

