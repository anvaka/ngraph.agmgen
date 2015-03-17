var test = require('tap').test;
var createGraph = require('ngraph.graph');
var agm  = require('../');

test('it can generate a graph', function(t) {
  var affiliationGraph = createGraph();

  var firstGroup = 'group 1';
  affiliationGraph.addLink('user 0', firstGroup);
  affiliationGraph.addLink('user 1', firstGroup);
  affiliationGraph.addLink('user 2', firstGroup);

  var secondGroup = 'group 2';
  affiliationGraph.addLink('user 1', secondGroup);
  affiliationGraph.addLink('user 2', secondGroup);
  affiliationGraph.addLink('user 3', secondGroup);

  var graph = agm(affiliationGraph);
  t.equals(graph.getNodesCount(), 4, 'Graph has all members of communites');
  t.ok(graph.getLinksCount() > 0, 'Graph has some links');
  t.end();
});

test('it respects weigths in the affiliation graph', function(t) {
  var affiliationGraph = createGraph();

  var firstGroup = 'group 1';
  affiliationGraph.addLink('user 0', firstGroup, 0);
  affiliationGraph.addLink('user 1', firstGroup, 0);
  affiliationGraph.addLink('user 2', firstGroup, 0);

  var secondGroup = 'group 2';
  affiliationGraph.addLink('user 1', secondGroup, 0);
  affiliationGraph.addLink('user 2', secondGroup, 0);
  affiliationGraph.addLink('user 3', secondGroup, 0);

  var graph = agm(affiliationGraph);
  t.equals(graph.getNodesCount(), 4, 'Graph has all members of communites');
  t.ok(graph.getLinksCount() === 0, 'Weight of each membership is 0, thus no links are possible');
  t.end();
});
