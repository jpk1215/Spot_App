var request = require('superagent');

export.index = function(req,res) {
  request.post(proccess.env.GRAPHENEDB_URL + "/cypher".send({
    query: 'START n=node(0) RETURN n.name'
  }).end(function(neo4JRes) {
    res.send(neo4JRes.text)
  })
}