#!/bin/bash
# Data source: donjon.bin.sh DM and reference tools
# Requires: curl, cut, node,

# Download the spell list from Donjon, or use donjon_spells.json if present.
# This appears as a Javascript file that sets a variable to a large JSON object.
# We don't care about the variable, so trim it.
SPELL_LIST_FILE='donjon_spells.json'
if [ ! -f $SPELL_LIST_FILE ]; then
  curl -s 'http://donjon.bin.sh/5e/spells/spell_data.js' | cut -c 18- | head -c -2 > $SPELL_LIST_FILE
fi

OUTPUT_SPELL_FILE='tome_spells.json'
node parser.js $SPELL_LIST_FILE > $OUTPUT_SPELL_FILE

# mongoimport --db tabletome --collection spells --file tome_spells.json --jsonArray

# jq '{Components: .Components, School: .School, Ritual: .Ritual, Range: .Range, Level: .Level, "Casting Time": ".Casting Time", Concentration: .Concentration, Duration: .Duration, Name: .Name, Source: .Source, Class: .Class, Description: .Description? }'
