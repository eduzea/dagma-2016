require([ "d3/d3", "dojo/store/Memory", "dijit/tree/ObjectStoreModel",
		"dijit/Tree", 'dojo/dom', "dijit/registry", "dojo/ready",
		"dojo/domReady!" ], function(d3, Memory, Model, Tree, dom, registry,
		ready) {
	ready(function() {
		dagma = {};//dagma especific namespace
		var valueFields = [ "PTTO ACTIVIDAD", "EJECUCION", "CDP", "DISPONIBLE",
				"% EJECUCION" ];
		var data = {};
		d3.csv("weightedtree/weightedtree/data/Banco-2016-Oct31.csv", function(
				csv) {
			data = prepData(csv)
			buildTree(data)
		});

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

		var buildTree = function(data) {

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
				id : 'rootTree',
				model : myModel,
				showRoot : false
			});
			tree.placeAt(dom.byId('tree'));
			tree.startup();
			registry.byId('layout').resize();

			tree.onOpen = function(item, node) {
				registry.byId('layout').resize();
			};

			tree.onClick = function(item, node, evt) {
				if (!item.clickable)
					return;
				var indices = item.id.split("_")
				var theNode = dagma.data;
				for (var i = 1; i < indices.length; i++) {//0 is the root node
					theNode = theNode.values[indices[i]];
					viz.toggleNode(theNode);
				}
				viz.toggleNode(theNode);
			};

		}

		var prepData = function(csv) {
			var values = [];
			//Remove all rows where all values are zero or no labels
			csv.forEach(function(d, i) {
				var t = 0;
				for (var i = 0; i < valueFields.length; i++) {
					t += Number(d[valueFields[i]]);
				}
				if (t > 0) {
					values.push(d);
				}
			})
			//Make our data into a nested tree.  If you already have a nested structure you don't need to do this.
			var nest = d3.nest().key(function(d) {
				return d.AREA;
			}).key(function(d) {
				return d.NOMBRE_AREA_FUNCIONAL;
			}).key(function(d) {
				return d.NOMBRE_PROYECTO;
			}).key(function(d) {
				return d.ACTIVIDADES;
			}).entries(values);
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
		contentPane = registry.byId('banco');
		contentPane.set("onDownloadEnd", function() {
			//This hacky approach is necessary beacuese refreshOnShow not working. 
			//It prevents the content pane from reloading.
			contentPane.href='';
		});


	});
});
