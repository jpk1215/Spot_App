var express = require('express');
var router = express.Router();
var neo4j = require('neo4j');
var async = require('async');
var request = require('request');
var db = new neo4j.GraphDatabase("http://localhost:7474");

// router.get('/', function(req, res) {
//   var query = "MATCH (n) RETURN n";
//   db.query(query, {}, function(err, results) {
//     res.json(results);
//   });
// });

function cleanAlbumData(arr) {
  var albumNames = [];
  var outputArr = [];
  for (var i = 0; i < arr.length; i++) {
    if(albumNames.indexOf(arr[i].name) === -1) {
      albumNames.push(arr[i].name);
      arr[i].name = arr[i].name.replace(/[^A-Za-z0-9 ]/g, "");
      delete arr[i].external_urls;
      if(arr[i].images.length > 0) {
        var img = arr[i].images[0].url;
        delete arr[i].images;
        arr[i].image = img;
      }
      outputArr.push(arr[i]);
    }
  }
  return outputArr;
}

function cleanTrackData(arr) {
  var outputArr = [];
  for (var i = 0; i < arr.length; i++) {
    delete arr[i].external_urls;
    arr[i].name = arr[i].name.replace(/[^A-Za-z0-9 ]/g, "");
    if(arr[i].artists.length > 1) {
      arr[i].artist_names = [];
      arr[i].artist_ids = [];
      for (var j = 0; j < arr[i].artists.length; j++) {
        arr[i].artist_names.push(arr[i].artists[j].name);
        arr[i].artist_ids.push(arr[i].artists[j].id)
      }
    } else {
      arr[i].artist_names = arr[i].artists[0].name;
      arr[i].artist_ids = arr[i].artists[0].id;
    }
    delete arr[i].artists;
    outputArr.push(arr[i]);
  }
  return outputArr;
}


router.get('/kanye', function(req, res) {
  var offset = 0;
  // album_type=single,album
  var getData = function(func) {
    request.get({json:true,url:'https://api.spotify.com/v1/artists/5K4W6rqBFWDnAN6FQUkS6x/albums?&market=US&limit=50&offset='+offset}, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var albumsArr = cleanAlbumData(body.items);
        async.map(albumsArr, function(item,complete) {
          request.get({json:true,url:'https://api.spotify.com/v1/albums/'+item.id+'/tracks?limit=50'}, function (error, response, body2) {
            if (!error && response.statusCode == 200) {
              complete(null, body2);
            }
          });
        },function(err,arrayOfAlbumTracks) {
          for (var i = 0; i < arrayOfAlbumTracks.length; i++) {
          var albumTracks = cleanTrackData(arrayOfAlbumTracks[i].items)
            for (var j = 0; j < albumTracks.length; j++) {
              var query = "CREATE ("+albumTracks[j].name.replace(/\s+/g, '')+":Song "+JSON.stringify(albumTracks[j]).replace(/"(\w*)":/g, "$1:")+")";
              db.query(query, {}, function(err, results) {});
            };
          }
          if (body.total > 50 && (offset+50) < body.total) {
            console.log(body.total,offset);
            offset += 50;
            getData(func);
          } else {
            console.log("I'm done");
            func();
          }
        })
      }
    })
  }
  getData(function() {
    var query = "MATCH (s:Song) WHERE 'Kanye West' IN s.artist_names CREATE (KanyeWest:Artist {id: '5K4W6rqBFWDnAN6FQUkS6x', name: 'Kanye West'}) CREATE (KanyeWest)-[:PERFORMED]->(s)";
    db.query(query, {}, function(err, results) {});
    console.log('kanye created');
  });
})


// router.get('/create', function(req, res) {
//   var query = "CREATE (JeffIsAwesome:Movie {title:'Jeff Is Awesome', released:2014, tagline:'YOLO!'})";
//   db.query(query, {}, function(err, results) {});
// });

module.exports = router;

// MATCH (n) OPTIONAL MATCH (n)-[r]->() DELETE n,r

// MATCH (s:Song),(a:Artist) WHERE "Kanye West" IN s.artist_names AND a.name = "Kanye West" CREATE (a)-[:PERFORMED]->(s)

















