var request = require('request');
var fs = require('fs');

/*
Converts the Donjon API json object to a Tome friendly object. This largely
involves changing names and leaving out some fields we don't need.
*/
function donjon_to_tome(donjonObj) {
  // All Donjon values are stored as strings, but Tome uses some numbers/bools
  // They need to be converted correctly

  // Save name in a var (for logging/warnings)
  var tomeName = donjonObj.Name;

  // Level: convert from "Cantrip" or "1st", "2nd", ..., "9th"
  // to a number 0-9
  var tomeLevel = 0;
  var firstCharNum = parseInt(donjonObj.Level[0]);
  if(!isNaN(firstCharNum)) {
    tomeLevel = firstCharNum;
  }

  // Source: convert from "phb|ee <num>" to an object with the long form name
  // and page number as an int.
  // TODO: Elemental Evil
  var donjonSource = donjonObj["Source"];
  var tomeSource = { name: "", page: 0 };
  if(donjonSource.indexOf("phb") < 0 ) {
    if(donjonSource.indexOf("ee") < 0) {
      log('WARNING: Spell ' + tomeName + " has nonstandard source " + donjonSource);
    }
    else {
      tomeSource = {
        name: "elemental evil",
        page: parseInt(donjonSource.substring(3))
      };
    }
  }
  else {
    tomeSource = {
      name: "player's handbook",
      page: parseInt(donjonSource.substring(4))
    };
  }

  var tomeClasses = [];
  for(var i=0; i<donjonObj["Class"].length; ++i) {
    tomeClasses.push(donjonObj["Class"][i].toLowerCase());
  }

  // Description: reduce all whitespace clusters to a single space, but keep
  // '\n\n' in place of any whitespace string with a double newline in it.
  var donjonDesc = donjonObj["Description"];
  var tomeDesc = "TODO Description was unavailable";

  if(donjonDesc === undefined) {
    log("WARNING: Could not get description for " + tomeName);
  }
  else {
    // Replace single newlines with spaces.
    tomeDesc = donjonDesc.replace(/([^\n])\n([^\n])/g, "$1 $2");
    // Remove any spaces before or after newlines.
    tomeDesc = tomeDesc.replace(/ *\n */g, '\n');
    // Remove any remaining multiple spaces.
    tomeDesc = tomeDesc.replace(/ +/, ' ');
  }

  var tomeObj = {
    source: tomeSource,
    name: tomeName,
    level: tomeLevel,
    school: donjonObj["School"].toLowerCase(),
    // ritual is converted to a bool
    ritual: (donjonObj["Ritual"] == 'yes'),
    classes: tomeClasses,
    castingTime: donjonObj["Casting Time"].toLowerCase(),
    range: donjonObj["Range"].toLowerCase(),
    duration: donjonObj["Duration"].toLowerCase(),
    // concentration is converted to a bool
    concentration: (donjonObj["Concentration"] == "yes"),
    // NOTE that Donjon does NOT have data for the list of materials. Spells
    // that require materials are merely marked M, and any spells that require
    // materials will get a big TODO string in the output.
    components: {
      verbal: (donjonObj["Components"].indexOf("V") > 0),
      somatic: (donjonObj["Components"].indexOf("S") > 0),
      material: {
        has: (donjonObj["Components"].indexOf("M") > 0),
        items: (donjonObj["Components"].indexOf("M") > 0 ?
                "TODO: ITEMS NOT AVAILABLE" :
                "")
      }
    },
    description: tomeDesc
  };

  log('Successfully parsed '+ tomeName);
  return tomeObj;
}

// Given a spell name, retrieve a Donjon JSON spell description and return it
// formatted for Table Tome (as the sole argument to a callback function).
function get_spell_and_parse(name, callback) {
  var uri = "http://donjon.bin.sh/5e/spells/rpc.cgi?name=" + name.replace(' ', '+');
   request(uri, function(error, response, body) {
    if(error) {
      log(error);
    }
    else if(response.statusCode == 200) {
      callback(donjon_to_tome(JSON.parse(response.body)));
    }
    else {
      log("ERROR: request returned code "+response.statusCode);
    }
  });
}

// Log a message to stderr. (so stdout redirection won't include it)
function log(str) {
  process.stderr.write(str+'\n')
}

// Get name of the spell file (first argument).
var spellFile = process.argv[2];
if(spellFile === undefined) {
  log("ERROR: need to pass this script a spell JSON file");
  process.exit(1);
}

// Open the spell file and read it in.
fs.readFile(spellFile, 'utf8', function(error, data) {
  if(error) {
    log(error);
    return;
  }
  var spells = JSON.parse(data);

  //crude semaphore
  var waiting = Object.keys(spells).length;

  // lots of closures and callbacks needed to ensure tomeList only gets printed
  // once and when all requests and functions are completed
  (function(callback) {
    var tomeList = [];
    for(spellName in spells) {
      //console.log(spellName);
      get_spell_and_parse(spellName, function(jso) {
        //add to tomeList
        tomeList.push(jso);
        // if there is nothing left, do the callback
        if(--waiting == 0) {
          callback(tomeList);
        }
      });
    }
  })(function(tomeList) {console.log(JSON.stringify(tomeList, null, ' '));});
});
