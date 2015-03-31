# ngraph.agmgen [![Build Status](https://travis-ci.org/anvaka/ngraph.agmgen.svg)](https://travis-ci.org/anvaka/ngraph.agmgen)

Based on affiliation graph constructs a social graph.

See also [Overlapping Community Detection at Scale](http://cs.stanford.edu/people/jure/pubs/bigclam-wsdm13.pdf)
for more details.

# what?

`AGM` is a very interesting graph generator model, which can generate many different
kinds of graphs.

AGM uses `affiliation graph` as its input and produces a "social" graph as its
output. `Affiliation graph` consists of two kinds of nodes:

* Community node - this node represents a community (e.g. a mailing list, a news group, etc.)
* Member node - a person who is part of a community.

Each edge in this graph points from a member node to a community node. If there
is an edge between node `A` and `B` it means that person `A` belongs to community `B`.

A social graph is just a regular graph, which includes all member nodes from
affiliation graph. Each edge between nodes in social graph is created at
random and is driven by number of shared communities. The more shared communities
two nodes have, the more likely they will receive an edge in "social" graph.

# usage

``` js
// First we need to construct affiliation graph. Let's assume this is
// our graph:
var affiliationGraph = require('ngraph.fromdot')([
  // first group:
  "'user 0' -> 'group 1'",
  "'user 1' -> 'group 1'",
  "'user 2' -> 'group 1'",

  // second group:
  "'user 1' -> 'group 2'",
  "'user 2' -> 'group 2'",
  "'user 3' -> 'group 2'"
].join('\n'));

// now let's generate social graph:
var agm = require('ngraph.agmgen');
var graph = agm(affiliationGraph);
```

The final `graph` instance will include all users as members, and some links.
Since links are determined at random, different seeds can have different results.

In this particular case the default seed `42` was used and resulted in the following
social graph:

```
digraph G {
  "user 0" -> "user 1"
  "user 0" -> "user 2"
  "user 2" -> "user 3"
}
```

If you want to pass different seed you can use optional second argument:

``` js
var seed = 1;
var graph = agm(affiliationGraph, { random: seed });
```

Now results will be:

```
digraph G {
  "user 0" -> "user 1"
  "user 1" -> "user 2"
  "user 2" -> "user 0"
  "user 2" -> "user 3"
}
```

## advanced usage

In the AGM, you can also explicitly specify the strength of a membership. That
is how strongly a given member belongs to a community. The higher the strength
the more likely it is for a member to have connections with other members of
the community. By default `ngraph.agmgen` does not require you to specify strength
for the affiliation graph. If you do not specify the strength, it is assumed
that strength is equally distributed among community members, and its value will
be:

```
strength = Math.pow(numberOfCommunityMembers, -coefficient) * scale;
```

Here `coefficient` and `scale` can be passed in options as a second argument,
and by default are having values `0.6` and `scale`:

``` js
var graph = agm(affiliationGraph, {
  coefficient: 0.6,
  scale: 1.3
});
```

Alternatively, if you want to have precise control over weights, you can pass
them when creating affiliation graph:

``` js
var affiliationGraph = require('ngraph.graph')();
// last argument is community weight:
var heavyWeight = 10;
affiliationGraph.addLink('user A', 'community B', heavyWeight);
var noWeight = 0;
affiliationGraph.addLink('user B', 'community B', noWeight);
```

Note: setting weight to 0 will prohibit AGM from building connections for this
user within current community. It's same as just not including user into the
community.

install
=======

With [npm](http://npmjs.org) do:

```
npm install ngraph.agmgen
```

# license

MIT
