#!/usr/bin/python3

import ulvl
import sys

if len(sys.argv) < 2:
    print("usage:", sys.argv[0], "<infiles>")
    sys.exit(1)

screenwidth, screenheight = 10, 7

tilemapping = { 5: -1 }

print("var levels=[")
for filename in sys.argv[1:]:
    m = ulvl.TMX.load(filename)

    w = m.meta['width']
    h = m.meta['height']

    print('\t[', end='')
    for y in range(screenheight):
        for x in range(screenwidth):
            thing = m.layers[0].tiles[y * w + x] - 1
            print(tilemapping.get(thing, thing), end='')
            print(',', end='')
    print('],')
print("]")
