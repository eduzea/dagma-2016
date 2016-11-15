require([ "d3/d3", "dojo/store/Memory", "dijit/tree/ObjectStoreModel",
		"dijit/Tree", 'dojo/dom', "dijit/registry", "dojo/ready", "dojo/dom-construct",
		"dojo/domReady!" ], function(d3, Memory, Model, Tree, dom, registry, ready, domConstruct) {
	ready(function() {
		
		var formatCurrency = function (d) { if (isNaN(d)) d = 0; return "$" + d3.format(",.0f")(d); };
		
		// Set up Dagma level globals
		dagma = {};//dagma especific namespace. Global.
		dagma.flatData={};
		dagma.nestedData={};
		dagma.vizTrees={}
		dagma.treeLists={}
		dagma.tree = 'banco';//DEBUG
		//Banco Treelist
		d3.csv("../static/data/Banco-2016-Oct31.csv", function(csv) {
			dagma.nestedData['banco'] = prepData(csv,'banco')
			dagma.treeLists['banco'] = buildTree(dagma.nestedData['banco'],'banco')
			dagma.treeLists['banco'].placeAt(dom.byId('tree'));
			dagma.treeLists['banco'].startup();
			registry.byId('layout').resize();

		});
		
		//Contratos Treelist
		d3.csv("../static/data/Contratos-Oct31-2016.csv", function(csv) {
			dagma.nestedData['contratos'] = prepData(csv,'contratos')
			dagma.treeLists['contratos'] = buildTree(dagma.nestedData['contratos'],'contratos');
			dagma.treeLists['contratos'].startup();
		});
		
		var valueFields={};
		valueFields['banco'] = [ "PTTO ACTIVIDAD", "EJECUCION", "CDP", "DISPONIBLE","% EJECUCION" ];
		valueFields['contratos'] = ['VALOR'];
		
		
		var levels = {};
		levels['banco']=['AREA','NOMBRE_PROYECTO','ACTIVIDADES'];
		levels['contratos']=[ "AREA", "PROYECTO", "MODALIDAD", "CONTRATISTA"];
		
		var formatNode = function(node, parent, isLeaf) {
			return {
				id : node.id, //default to a simple node string
				name : node.key,
				parent : parent,
				clickable : true,
				leaf:isLeaf
			}
		}

		var createNode = function(node, parent, nodes) {
			if (node.values.length > 0) {
				nodes.push(formatNode(node, parent, false))
				parent = node.id;
				node.values.forEach(function(n) {
					createNode(n, parent, nodes)
				})
			} else {
				nodes.push(formatNode(node, parent, true));
				return;
			}
		};

		var buildTree = function(data, activeTree) {
			var nodeData = [ {
				id : 'root',
				name : 'root'
			} ]
			data.forEach(function(node) {
				createNode(node, 'root', nodeData)
			});

			var myStore = new Memory({
				data : nodeData,
				getChildren : function(object) {
					return this.query({
						parent : object.id
					});
				}
			});
			// Create the model
			var myModel = new Model({
				store : myStore,
				query : {
					id : 'root'
				}
			});
			// Create the Tree.
			var tree = new Tree({
				id : 'rootTree'+activeTree,
				model : myModel,
				showRoot : false
			});

			tree.onOpen = function(item, node) {
				registry.byId('layout').resize();
			};

			tree.onClick = function(item, node, evt) {
				if (!item.clickable)
					return;
				var indices = item.id.split("_");
				var theNode = dagma.nestedData[dagma.tree];
				for (var i = 1; i < indices.length-1; i++) {//0 is the root node
					theNode = theNode.values[indices[i]];
				}
				tab = registry.byId('detalle');
				if (tab.activeTree == dagma.tree){
					updateDetalle(item,theNode);
				}else{
					tab.set("onDownloadEnd", function() {
						dom.byId('header').innerHTML = theNode.key;
						if (dagma.tree == 'banco'){
							dom.byId('presupuesto').innerHTML = formatCurrency(theNode['agg_PTTO ACTIVIDAD']);
							dom.byId('ejecutado').innerHTML = formatCurrency(theNode['agg_EJECUCION']);
							dom.byId('cdp').innerHTML = formatCurrency(theNode['agg_CDP']);
							dom.byId('disponible').innerHTML = formatCurrency(theNode['agg_DISPONIBLE']);
							dom.byId('pctejecucion').innerHTML = d3.format(",.0f")(100*(theNode['agg_EJECUCION'] / theNode['agg_PTTO ACTIVIDAD'])) + "%";					
						}else{
							dom.byId('valor').innerHTML = formatCurrency(theNode['agg_VALOR']);
							if (item.leaf){
								dom.byId('objeto').innerHTML = theNode['childProp_OBJETO'];
								dom.byId('fecha').innerHTML = theNode['childProp_FECHA'];
								dom.byId('plazo').innerHTML = theNode['childProp_PLAZO'];						
							}
						}

					});
					
				}
				tabs = registry.byId('tabs');
				tabs.selectChild('detalle');
			};			
			return tree;
		}

		var updateDetalle = function(item,theNode) {
			dom.byId('header').innerHTML = theNode.key;
			if (dagma.tree == 'banco'){
				dom.byId('presupuesto').innerHTML = formatCurrency(theNode['agg_PTTO ACTIVIDAD']);
				dom.byId('ejecutado').innerHTML = formatCurrency(theNode['agg_EJECUCION']);
				dom.byId('cdp').innerHTML = formatCurrency(theNode['agg_CDP']);
				dom.byId('disponible').innerHTML = formatCurrency(theNode['agg_DISPONIBLE']);
				dom.byId('pctejecucion').innerHTML = d3.format(",.0f")(100*(theNode['agg_EJECUCION'] / theNode['agg_PTTO ACTIVIDAD'])) + "%";					
			}else{
				dom.byId('valor').innerHTML = formatCurrency(theNode['agg_VALOR']);
				if (item.leaf){
					dom.byId('objeto').innerHTML = theNode['childProp_OBJETO'];
					dom.byId('fecha').innerHTML = theNode['childProp_FECHA'];
					dom.byId('plazo').innerHTML = theNode['childProp_PLAZO'];						
				}
			}

		};
		
		var prepData = function(csv, activeTree) {
			var values = [];
			//Remove all rows where all values are zero or no labels
			csv.forEach(function(d, i) {
				var t = 0;
				for (var i = 0; i < valueFields[activeTree].length; i++) {
					t += Number(d[valueFields[activeTree][i]]);
				}
				if (t > 0) {
					values.push(d);
				}
			})
			dagma.flatData[activeTree] = values;
			
			var makeNest = function(values,activeTree){
				var nest=d3.nest();
				levels[activeTree].forEach(function(level){
					nest = nest.key(function(d){
						return d[level];
					}); 
				});
				nest = nest.entries(values);
				return nest;
			};
			
			var nest = makeNest(values,activeTree);

			//Remove empty child nodes left at end of aggregation and add unqiue ids
			function removeEmptyNodes(node, parentId, childId) {
				if (!node)
					return;
				node.id = parentId + "_" + childId;
				if (node.values) {
					for (var i = node.values.length - 1; i >= 0; i--) {
						node.id = parentId + "_" + i;
						if (!node.values[i].key && !node.values[i].Level4) {
							node.values.splice(i, 1);
						} else {
							removeEmptyNodes(node.values[i], node.id, i)
						}
					}
				}
			}
			var node = {};
			node.values = nest;
			removeEmptyNodes(node, "0", "0");
			dagma.nestedData[activeTree]=nest;
			return nest;
		};

		tabsContainer = registry.byId('tabs');
		tabsContainer.watch("selectedChildWidget", function(name, oval, nval){
		    if (nval.id == 'detalle'){
		    	var cp = registry.byId('detalle');
		    	if (dagma.tree == 'banco'){
		    		if (cp.href != '../static/detalleBanco.html'){
		    			cp.set('href','../static/detalleBanco.html');
		    			cp.activeTree = 'banco';
		    		}
		    	}else{
		    		if (cp.href != '../static/detalleContratos.html'){
		    			cp.set('href','../static/detalleContratos.html')
		    			cp.activeTree = 'contratos';
		    		}
		    	}
		    	registry.byId('leadingPane');
		    }else if(nval.id != 'pivot'){
				dagma.tree = nval.id;
			    domConstruct.empty("leadingPane");
				registry.byId('leadingPane').addChild(dagma.treeLists[nval.id]);
				registry.byId('layout').resize();		    	
		    }
		});
		tabsContainer.getChildren().forEach(function(tab){
			if (tab.id != 'detalle'){
				tab.set("onDownloadEnd", function() {
					//This hacky approach is necessary beacause refreshOnShow not working. 
					//It prevents the content pane from reloading.
					tab.href='';
				});				
			}
		})
	});
});
