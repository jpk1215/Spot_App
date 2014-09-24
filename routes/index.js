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

var artistObj = {};

function cleanTrackData(arr) {
  var outputArr = [];
  for (var i = 0; i < arr.length; i++) {
    if(arr[i].hasOwnProperty('name')) {
      delete arr[i].external_urls;
      arr[i].name = arr[i].name.replace(/[^A-Za-z0-9 ]/g, "");
      if(arr[i].artists.length > 1) {
        arr[i].artist_names = [];
        arr[i].artist_ids = [];
        for (var j = 0; j < arr[i].artists.length; j++) {
          arr[i].artist_names.push(arr[i].artists[j].name);
          arr[i].artist_ids.push(arr[i].artists[j].id);
          artistObj[arr[i].artists[0].name] = artistObj[arr[i].artists[0].name] || arr[i].artists[0].id;
        }
      } else {
        arr[i].artist_names = arr[i].artists[0].name;
        arr[i].artist_ids = arr[i].artists[0].id;
        artistObj[arr[i].artists[0].name] = artistObj[arr[i].artists[0].name] || arr[i].artists[0].id;
      }
      delete arr[i].artists;
      outputArr.push(arr[i]);
    }
  }
  return outputArr;
}


router.get('/kanye', function(req, res) {
  var offset = 0;
  var getData = function(artistId,makeRelations) {
    request.get({json:true,url:'https://api.spotify.com/v1/artists/'+artistId+'/albums?&market=US&limit=50&offset='+offset}, function (error, response, albumsObject) {
      var cleanAlbumsArray = cleanAlbumData(albumsObject.items);
      async.map(cleanAlbumsArray, function(album,complete) {
        request.get({json:true,url:'https://api.spotify.com/v1/albums/'+album.id+'/tracks?limit=50'}, function (error, response, tracksObjects) {
            complete(null, tracksObjects);
        })
      },function(err,tracksObjectArrays) {
          async.map(tracksObjectArrays,function(albumTracksArray,complete){
            async.map(albumTracksArray.items,function(track,complete) {
              var query = "MATCH (s:Song {id:'"+track.id+"'}) RETURN s";
              db.query(query, {}, function(err, results) {
                console.log(results.length)
                if(results.length === 0) {
                  complete(null,track);
                } else {
                  complete(null,{});
                }
              })
            },function(err,uniqueTracksArray){
                var cleanAlbumTracks = cleanTrackData(uniqueTracksArray);
                for (var j = 0; j < cleanAlbumTracks.length; j++) {
                  var query = "CREATE ("+cleanAlbumTracks[j].name.replace(/\s+/g, '')+":Song "+JSON.stringify(cleanAlbumTracks[j]).replace(/"(\w*)":/g, "$1:")+")";
                  db.query(query, {}, function(err, results) {});
                }
              })
            complete(null,{});
          },function (err) {
              if (albumsObject.total > 50 && (offset+50) < albumsObject.total) {
                console.log(albumsObject.total,offset);
                offset += 50;
                getData(artistId,makeRelations);
              } else {
                  console.log(artistObj);
                  offset = 0;
                  artistObj = {};
                  makeRelations(artistId);
              }
            })
        })
      })
    }

  getData('3nFkdlSjzX9mRTtwJOzDYB',function(id) {
    var query = "CREATE (JAYZ:Artist {id: '"+id+"', name: 'JAY Z', processed: 'true'})";
    db.query(query, {}, function(err, results) {
      var query2 = "MATCH (s:Song),(a:Artist) WHERE 'JAY Z' IN s.artist_names AND a.name = 'JAY Z' CREATE (a)-[:PERFORMED]->(s)";
      db.query(query2, {}, function(err, results) {
        console.log('done');
      });
    });
  });
})


// router.get('/create', function(req, res) {
//   var query = "CREATE (JeffIsAwesome:Movie {title:'Jeff Is Awesome', released:2014, tagline:'YOLO!'})";
//   db.query(query, {}, function(err, results) {});
// });

module.exports = router;

// MATCH (n) OPTIONAL MATCH (n)-[r]->() DELETE n,r

// MATCH (s:Song),(a:Artist) WHERE "Kanye West" IN s.artist_names AND a.name = "Kanye West" CREATE (a)-[:PERFORMED]->(s)

// MATCH (a:Artist)-[:PERFORMED]->(s:Song) WHERE a.name = 'Kanye West' RETURN a,s

















