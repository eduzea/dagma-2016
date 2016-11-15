//# sourceURL=../static/javascript/tablaDinamica.js
require(['dojo/request',"dijit/registry",'dojo/parser','dojo/dom','dojo/on','dojo/query',"dojo/dom-class","dojox/widget/Standby"], 
function(request,registry,parser,dom,on,query,domClass,Standby) {
	var sortAs = $.pivotUtilities.sortAs;
	var numberFormat = $.pivotUtilities.numberFormat;
	var config = {
		'banco': {
				rows : ['ciudad',"cliente"],
				vals : ["venta"],
				aggregatorName:'Suma'
		},
		'contratos':{
					rows: ['sucursal','tipo','bienoservicio',"proveedor"],
					vals: ['compra'],
					exclusions:{},
					hiddenAttributes:[],
					aggregatorName:'Suma'
		}
	};
	
	totals = query(".pvtTotal")
	totals.forEach(function(node){
		domClass.add(node,'hide');
	});
	
	var records = dagma.flatData[dagma.tree];
	$(function() {
		$("#" + "pivot").pivotUI(records, config[dagma.tree],false,'es');
	});


}); 