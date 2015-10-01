/**
 * Based on affiliation graph constructs a social graph. Affiliation graph
 * consists of two kinds of nodes:
 *  - Community node - this could be a mailing list, a news group, etc.
 *  - Member node - a person who is part of a community.
 *
 * Each edge in this graph is assumed to point from a member node to a community
 * node. If there is an edge between node `A` and `B` it means that person `A`
 * belongs to community `B`.
 *
 * A social graph is just a regular graph, which includes all member nodes from
 * affiliation graph. Each edge between nodes in social graph is created at
 * random and is driven by number of shared communities.
 */
var createGraph = require('ngraph.graph');
var randomAPI = require('ngraph.random');

module.exports = agm;

/**
 * @param {ngraph.graph} affiliationGraph - initial model.
 * @param {Object+} options - configuration of the algorithm, with possible keys:
 *  options.random - seeded random number generator, `ngraph.random` is used by default
 *  options.coefficient - power law coefficient for weights distribution. 0.6 by default
 *  options.scale - power law scale coefficient for weights distribution. 1.3 by default
 */
function agm(affiliationGraph, options) {
  /**
   * In nutshell our code here implements the following algorithm:
   * 1. Add all member nodes from affiliation graph into social graph.
   * 2. For each member of the final graph build edges. Probability of a node
   * `u` forming edge with node `v` is calculated by:
   *   p(u, v) = 1 - Math.pow(Math.E, -weight);
   * where `weight` is calculated based on total number of shared communities.
   */
  options = options || {};
  var graph = createGraph(); // The final graph that we are trying to construct.
  var random = randomAPI.random(typeof options.random === 'number' ? options.random : 42);

  // Each edge in the affiliation graph needs to have a "weight". It denotes
  // how strongly a given member belongs to a community. The higher its weight
  // the more probable its connection with other members.
  //
  // If client has passed weights, we will use them; Otherwise we would just
  // assume power law weights distribution inside a community
  ensureAffiliationWeightsInitialized(affiliationGraph, options);

  // Now let's add all members into final graph:
  affiliationGraph.forEachNode(addMemberNodes);

  // The easy step is done, let's try to build edges, following our model:
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
    // For each other member with whom `source` member shares communities, lets
    // compute their total weight (Fu * Fv)
    // neighborsWeight is a hash map, where key is other member id, and value
    // is total weight.
    var neighborsWeight = Object.create(null);
    // we will be processing all communities of the `source` member, and to
    // simplify computation of the `Fu * Fv` we will remember weight of the
    // source node in the community that is currently being processed:
    var sourceWeightInCurrentCommunity;

    // now we visit each community one by one to compute Fu * Fv:
    affiliationGraph.forEachLinkedNode(source.id, processCommunity, true);

    // The neighborsWeight is ready, we can visit every neighbor and consider
    // linking it with the current `source` node
    addEdgesMaybe();

    // At this moment we are done processing `source` member.
    return;

    function processCommunity(communityNode, link) {
      sourceWeightInCurrentCommunity = link.data;
      affiliationGraph.forEachLinkedNode(communityNode.id, sumUpWeights);
    }

    function sumUpWeights(otherMember, memberCommunityEdge) {
      var otherId = otherMember.id;
      if (otherId === source.id) {
        return; // same node
      }

      // todo: this is painfully slow, since ngraph.graph performs linear search
      // on `hasLink`. Update ngraph.graph to be faster.
      if (graph.hasLink(source.id, otherId) ||
          graph.hasLink(otherId, source.id)) {
        return; // edge already there
      }

      // Accumulate probability of an edge [source -> other]. Remember,
      // sourceWeightInCurrentCommunity every time when we visit new community:
      var communityLinkWeight = memberCommunityEdge.data * sourceWeightInCurrentCommunity;
      if (neighborsWeight[otherId]) {
        neighborsWeight[otherId] += communityLinkWeight;
      } else {
        neighborsWeight[otherId] = communityLinkWeight;
      }
    }

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
  }

  function isCommunityNode(nodeId) {
    // by construction in affiliation graph all edges always start from
    // a `member` node, and point towards `community` node. Thus if we have
    // at least one edge pointing towards nodeId we can guarantee it is
    // a community node
    var links = affiliationGraph.getLinks(nodeId);
    return !links || links.length === 0 || links[0].toId === nodeId;
  }
}

function ensureAffiliationWeightsInitialized(graph, options) {
  var scale = typeof options.scale === 'number' ? options.scale : 1.3;
  var coefficient = typeof options.coefficient === 'number' ? options.coefficient : 0.6;

  graph.forEachLink(ensureLinkInitialized);

  function ensureLinkInitialized(link) {
    if (typeof link.data === 'number') return;

    var communityNodeId = link.toId;
    var links = graph.getLinks(communityNodeId);
    var membersCount = 0;
    if (links) {
      membersCount = links.length;
    }
    link.data = Math.pow(membersCount, -coefficient) * scale;
  }
}
