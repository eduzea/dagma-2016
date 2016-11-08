require([ "d3/d3", "dojo/store/Memory", "dijit/tree/ObjectStoreModel",
		"dijit/Tree", 'dojo/dom', "dijit/registry", "dojo/ready", "dojo/dom-construct",
		"dojo/domReady!" ], function(d3, Memory, Model, Tree, dom, registry, ready, domConstruct) {
	ready(function() {
		
		// Set up Dagma level globals
		dagma = {};//dagma especific namespace. Global.
		dagma.data={};
		dagma.vizTrees={}
		dagma.treeLists={}

		//Banco Treelist
		d3.csv("../static/data/Banco-2016-Oct31.csv", function(csv) {
			dagma.data['banco'] = prepData(csv,'banco')
			dagma.treeLists['banco'] = buildTree(dagma.data['banco'],'banco')
			dagma.treeLists['banco'].placeAt(dom.byId('tree'));
			dagma.treeLists['banco'].startup();
			registry.byId('layout').resize();

		});
		
		//Contratos Treelist
		d3.csv("../static/data/Contratos-Oct31-2016.csv", function(csv) {
			dagma.data['contratos'] = prepData(csv,'contratos')
			dagma.treeLists['contratos'] = buildTree(dagma.data['contratos'],'contratos');
			dagma.treeLists['contratos'].startup();
		});
		
		var valueFields={};
		valueFields['banco'] = [ "PTTO ACTIVIDAD", "EJECUCION", "CDP", "DISPONIBLE","% EJECUCION" ];
		valueFields['contratos'] = ['VALOR'];
		
		
		var levels = {};
		levels['banco']=['AREA','PROYECTO','ACTIVIDADES'];
		levels['contratos']=[ "AREA", "PROYECTO", "MODALIDAD", "CONTRATISTA"];
		
		var formatNode = function(node, parent, isLeaf) {
			return {
				id : node.id, //default to a simple node string
				name : node.key,
				parent : parent,
				clickable : true
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
				var indices = item.id.split("_")
				var theNode = dagma.data[dagma.tree];
				for (var i = 1; i < indices.length; i++) {//0 is the root node
					theNode = theNode.values[indices[i]];
					dagma.vizTrees[dagma.tree].toggleNode(theNode);
				}
				dagma.vizTrees[dagma.tree].toggleNode(theNode);
			};
			
			return tree;
		}

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
			
			var makeNest = function(values,activeTree){
				var nest=d3.nest();
				levels[activeTree].forEach(function(level){
					nest = nest.key(function(d){
						if(d[level]==null){
							console.log(d);
						} 
						return d[level];
					}); 
				});
				nest = nest.entries(values);
				return nest;
			};
			
			var nest = makeNest(values,'banco');

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
			return nest;
		};

		tabsContainer = registry.byId('tabs');
		tabsContainer.watch("selectedChildWidget", function(name, oval, nval){
		    dagma.tree = nval.id;
		    domConstruct.empty("leadingPane");
			registry.byId('leadingPane').addChild(dagma.treeLists[nval.id]);
			registry.byId('layout').resize();

		});
		tabsContainer.getChildren().forEach(function(tab){
			tab.set("onDownloadEnd", function() {
				//This hacky approach is necessary beacause refreshOnShow not working. 
				//It prevents the content pane from reloading.
				tab.href='';
			});
		})
	});
});
