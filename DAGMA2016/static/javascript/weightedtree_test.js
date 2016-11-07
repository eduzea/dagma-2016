//# sourceURL=weightedtree/weightedtree/weightedtree_test.js
/*
 Copyright (c) 2016, BrightPoint Consulting, Inc.

 MIT LICENSE:

 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 documentation files (the "Software"), to deal in the Software without restriction, including without limitation
 the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
 and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
 TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
 CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 IN THE SOFTWARE.
 */

// @version 1.1.20

//**************************************************************************************************************
//
//  This is a test/example file that shows you one way you could use a vizuly object.
//  We have tried to make these examples easy enough to follow, while still using some more advanced
//  techniques.  Vizuly does not rely on any libraries other than D3.  These examples do use jQuery and
//  materialize.css to simplify the examples and provide a decent UI framework.
//
//**************************************************************************************************************


// html element that holds the chart
var viz_container;

var viz;

// our theme
var theme;

// nested data
var data = {};

// stores the currently selected value field
var valueField = {banco:"PTTO ACTIVIDAD",contratos:'VALOR'};
var valueFields = {banco:["PTTO ACTIVIDAD","EJECUCION","CDP","DISPONIBLE","% EJECUCION"],contratos:['VALOR']};
var themes = {banco:vizuly.skin.WEIGHTED_TREE_TRAFFICLIGHT, contratos:'Contratos'}
var formatCurrency = function (d) { if (isNaN(d)) d = 0; return "$" + d3.format(",.0f")(d); };

function loadData() {
	var activeTree = dagma.tree;
	var dataPaths = {'banco':"../static/data/Banco-2016-Oct31.csv",'contratos':"../static/data/Contratos-Oct31-2016.csv"};
	dagma.data[activeTree]={};
	d3.csv(dataPaths[activeTree], function (csv) {
        dagma.data[activeTree].values=prepData(csv, activeTree);
        initialize();
    });

}

function prepData(csv, activeTree) {

    var values=[];
    csv.forEach(function (d,i) {
        var t = 0;
        for (var i = 0; i < valueFields[activeTree].length; i++) {
            t += Number(d[valueFields[activeTree][i]]);
        }
        if (t > 0) {
            values.push(d);
        }
    })

  //Make our data into a nested tree.  If you already have a nested structure you don't need to do this.
    var nest;
    if (activeTree == 'banco'){
    	nest = d3.nest()
        .key(function (d) {
            return d.AREA;
        })
        .key(function (d) {
            return d.NOMBRE_PROYECTO;
        })
        .key(function (d) {
            return d.ACTIVIDADES;
        })
        .entries(values);
    }else{
    	nest = d3.nest()
        .key(function (d) {
            return d.AREA;
        })
        .key(function (d) {
            return d.PROYECTO;
        })
        .key(function (d) {
            return d.MODALIDAD;
        })
        .key(function (d) {
            return d.CONTRATISTA;
        })
        .entries(values);
    }

    //This will be a viz.data function;
    vizuly.data.aggregateNest(nest, valueFields[activeTree], function (a, b) {
        return Number(a) + Number(b);
    });

    //Remove empty child nodes left at end of aggregation and add unqiue ids
    function removeEmptyNodes(node,parentId,childId) {
        if (!node) return;
        node.id=parentId + "_" + childId;
        if (node.values) {
            for(var i = node.values.length - 1; i >= 0; i--) {
                node.id=parentId + "_" + i;
                if(!node.values[i].key && !node.values[i].Level4) {
                    node.values.splice(i, 1);
                }
                else {
                    removeEmptyNodes(node.values[i],node.id,i)
                }
            }
        }
    }

    var node={};
    node.values = nest;
    removeEmptyNodes(node,"0","0");
    return nest;
}

function initialize() {

	var activeTree = dagma.tree;

    dagma.vizTrees[activeTree] = vizuly.viz.weighted_tree(document.getElementById("viz_container"+activeTree));

    //Here we create three vizuly themes for each radial progress component.
    //A theme manages the look and feel of the component output.  You can only have
    //one component active per theme, so we bind each theme to the corresponding component.
    theme = vizuly.theme.weighted_tree(dagma.vizTrees[activeTree]).skin(themes[activeTree]);

    //Like D3 and jQuery, vizuly uses a function chaining syntax to set component properties
    //Here we set some bases line properties for all three components.
    dagma.vizTrees[activeTree].data(dagma.data[activeTree])                                                      // Expects hierarchical array of objects.
        .width(600)                                                     // Width of component
        .height(600)                                                    // Height of component
        .children(function (d) { return d.values })                     // Denotes the property that holds child object array
        .key(function (d) { return d.id })                              // Unique key
        .value(function (d) {
            return Number(d["agg_" + valueField[activeTree]]) })                    // The property of the datum that will be used for the branch and node size
        .fixedSpan(-1)                                                  // fixedSpan > 0 will use this pixel value for horizontal spread versus auto size based on viz width
        .label(function (d) {                                           // returns label for each node.
            return trimLabel(d.key || (d['Level' + d.depth]))})
        .on("measure",onMeasure)                                        // Make any measurement changes
        .on("mouseover",onMouseOver)                                    // mouseover callback - all viz components issue these events
        .on("mouseout",onMouseOut)                                      // mouseout callback - all viz components issue these events
        .on("click",onClick);                                           // mouseout callback - all viz components issue these events


    //We use this function to size the components based on the selected value from the RadiaLProgressTest.html page.
    changeSize("1082,750",activeTree);

}


function trimLabel(label) {
   return (String(label).length > 20) ? String(label).substr(0, 17) + "..." : label;
}

var datatip={};
datatip['banco']='<div class="tooltip" style="width: 250px; background-opacity:.5">' +
	'<div class="header3">ACTIVIDAD</div> ' +
	'<div class="header-rule"></div>' +
	'<div class="header-rule"></div>' +
	'<div class="header1">PRESUPUESTO: VAL_PRESUPUESTO</div> ' +
	'<div class="header-rule"></div>' +
	'<div class="header1">EJECUTADO: VAL_EJECUTADO</div>' +
	'<div class="header-rule"></div>' +
	'<div class="header1">CDP: VAL_CDP</div>' +
	'<div class="header-rule"></div>' +
	'<div class="header1">DISPONIBLE: VAL_DISPONIBLE</div>' +
	'<div class="header-rule"></div>' +
	'<div class="header1">% EJECUCION: VAL_% EJECUCION</div>' +
	'</div>';

datatip['contratos-branch'] = '<div class="tooltip" style="width: 250px; background-opacity:.5">' +
								'<div class="header3">ACTIVIDAD</div> ' +
								'<div class="header-rule"></div>' +
								'<div class="header-rule"></div>' +
								'<div class="header1">VALOR: VAL_VALOR</div>'  +
							'</div>'
datatip['contratos-leaf'] =
	'<div class="tooltip" style="width: 500px; background-opacity:.5">' +
		'<div class="header3">ACTIVIDAD</div> ' +
		'<div class="header-rule"></div>' +
		'<div class="header-rule"></div>' +
		'<div class="header1">VALOR: VAL_VALOR</div>'  +
		'<div class="header-rule"></div>' +
		'<div class="header1">OBJETO: VAL_OBJETO</div>' +
		'<div class="header-rule"></div>' +
		'<div class="header1">CONTRATISTA: VAL_CONTRATISTA</div>' +
		'<div class="header-rule"></div>' +
		'<div class="header1">FECHA: VAL_FECHA</div>' +
		'<div class="header-rule"></div>' +
		'<div class="header1">PLAZO: VAL_PLAZO</div>'
	'</div>'

var toolTipHTML = function(d, activeTree){
	var html =''
	if(activeTree == 'banco'){
		html = datatip[activeTree].replace("ACTIVIDAD", d.key);
	    html = html.replace("VAL_PRESUPUESTO", formatCurrency(d["agg_" + "PTTO ACTIVIDAD"]));
	    html = html.replace("VAL_EJECUTADO", formatCurrency(d["agg_" + "EJECUCION"]));
	    html = html.replace("VAL_CDP", formatCurrency(d["agg_" + "CDP"]));
	    html = html.replace("VAL_DISPONIBLE", formatCurrency(d["agg_" + "DISPONIBLE"]));
	    html = html.replace("VAL_EJECUTADO", formatCurrency(d["agg_" + "EJECUTADO"]));
	    html = html.replace("VAL_% EJECUCION", Math.round(100.0 * d["agg_" + "EJECUCION"] / d["agg_" + "PTTO ACTIVIDAD"]) + "%");		
	}else{
		if (d.depth == 4){
			html = datatip['contratos-leaf'].replace("ACTIVIDAD", d.key);
			html = html.replace("VAL_VALOR", formatCurrency(d["agg_" + "VALOR"]));
			html = html.replace("VAL_OBJETO", d["childProp_" + "OBJETO"]);
			html = html.replace("VAL_CONTRATISTA", d["childProp_" + "CONTRATISTA"]);
			html = html.replace("VAL_FECHA", d["childProp_" + "FECHA"]);
			html = html.replace("VAL_PLAZO", d["childProp_" + "PLAZO"]);
		}else{
			html = datatip['contratos-branch'].replace("ACTIVIDAD", d.key);
			html = html.replace("VAL_VALOR", formatCurrency(d["agg_" + "VALOR"]));			
		}
	}
	return html;
}

// This function uses the above html template to replace values and then creates a new <div> that it appends to the
// document.body.  This is just one way you could implement a data tip.
function createDataTip(x,y,d) {

	var html = toolTipHTML(d,dagma.tree);
    d3.select("body")
        .append("div")
        .attr("class", "vz-weighted_tree-tip")
        .style("position", "absolute")
        .style("top", y + "px")
        .style("left", (x - 125) + "px")
        .style("opacity",0)
        .html(html)
        .transition().style("opacity",1);
}

function onMeasure() {
   // Allows you to manually override vertical spacing
   // viz.tree().nodeSize([100,0]);
}

function onMouseOver(e,d,i) {
    if (d == data) return;
    var rect = e.getBoundingClientRect();
    if (d.target) d = d.target; //This if for link elements
    createDataTip(rect.left, rect.top, d);


}

function onMouseOut(e,d,i) {
    d3.selectAll(".vz-weighted_tree-tip").remove();
}



//We can capture click events and respond to them
function onClick(g,d,i) {
	var activeTree = dagma.tree;
    dagma.vizTrees[activeTree].toggleNode(d);
}



//This function is called when the user selects a different skin.
function changeSkin(val) {
    if (val == "None") {
        theme.release();
    }
    else {
        theme.viz(viz);
        theme.skin(val);
    }

    viz().update();  //We could use theme.apply() here, but we want to trigger the tween.
}

//This changes the size of the component by adjusting the radius and width/height;
function changeSize(val, activeTree) {
    var s = String(val).split(",");
    viz_container.transition().duration(300).style('width', s[0] + 'px').style('height', s[1] + 'px');
    dagma.vizTrees[activeTree].width(s[0]).height(s[1]*.8).update();
}

//This sets the same value for each radial progress
function changeData(val) {
    valueField=valueFields[Number(val)];
    viz.update();
}






