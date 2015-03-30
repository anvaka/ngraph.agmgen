var createGraph = require('ngraph.graph');
var randomAPI = require('ngraph.random');

module.exports = agm;

function agm(affiliationGraph, random) {
  var graph = createGraph();
  random = random || randomAPI.random(42);

  ensureAffiliationWeightsInitialized(affiliationGraph);
  affiliationGraph.forEachNode(addMemberNodes);
  graph.forEachNode(addEdges);

  return graph;

  function addMemberNodes(node) {
    if (isCommunityNode(node.id)) {
      return; // visit only member nodes, skip community nodes
    }
    // all affiliation graph members are members of final graph:
    graph.addNode(node.id);
  }

  function addEdges(source) {
    var neighborsWeight = Object.create(null);
    var sourceWeightInCurrentCommunity;

    affiliationGraph.forEachLinkedNode(source.id, processCommunity, true);
    addEdgesMaybe();

    return;

    function addEdgesMaybe() {
      var neighbors = Object.keys(neighborsWeight);

      for (var i = 0; i < neighbors.length; ++i) {
        var neighborId = neighbors[i];
        var weight = neighborsWeight[neighborId];
        var probability = 1 - Math.pow(Math.E, -weight);
        if (random.nextDouble() <= probability) {
          graph.addLink(source.id, neighborId);
        }
      }
    }

    function processCommunity(communityNode, link) {
      sourceWeightInCurrentCommunity = link.data;
      affiliationGraph.forEachLinkedNode(communityNode.id, sumUpWeights);
    }

    function sumUpWeights(otherMember, memberCommunityEdge) {
      var otherId = otherMember.id;
      if (otherId === source.id) {
        return; // same node
      }
      // todo: this is painfully slow, update ngraph.graph to be faster.
      if (graph.hasLink(source.id, otherId) ||
          graph.hasLink(otherId, source.id)) {
        return; // edge already there
      }
      // Accumulate probability of an edge [source -> other]
      var communityLinkWeight = memberCommunityEdge.data * sourceWeightInCurrentCommunity;
      if (neighborsWeight[otherId]) {
        neighborsWeight[otherId] += communityLinkWeight;
      } else {
        neighborsWeight[otherId] = communityLinkWeight;
      }
    }
  }

  function isCommunityNode(nodeId) {
    // by construction in affiliation graph all edges always start from
    // a `member` node, and point towards `community` node. Thus if we have
    // at least one edge pointing towards nodeId we can guarantee it is
    // a community node
    var links = affiliationGraph.getLinks(nodeId);
    return links.length === 0 || links[0].toId === nodeId;
  }
}

function ensureAffiliationWeightsInitialized(graph) {
  graph.forEachLink(ensureLinkInitialized);

  function ensureLinkInitialized(link) {
    if (typeof link.data === 'number') return;

    var communityNodeId = link.toId;
    var membersCount = graph.getLinks(communityNodeId).length;
    // todo: let users configure scale and the coefficient
    link.data = Math.pow(membersCount, -0.6) * 1.3;
  }
}
