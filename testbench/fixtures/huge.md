## Huge test

A reply over 10,000 characters, with one block over 10,000 on its own. Claude Code caps a `Markdown` element at 10,000 characters, and Synaptik draws each block as one.

The route table, one code block of about 11k characters:

```ts
export const routes = [
  { path: '/api/v1/resource/001', method: 'GET', handler: 'handleResource001', auth: true },
  { path: '/api/v1/resource/002', method: 'GET', handler: 'handleResource002', auth: true },
  { path: '/api/v1/resource/003', method: 'GET', handler: 'handleResource003', auth: true },
  { path: '/api/v1/resource/004', method: 'GET', handler: 'handleResource004', auth: true },
  { path: '/api/v1/resource/005', method: 'GET', handler: 'handleResource005', auth: true },
  { path: '/api/v1/resource/006', method: 'GET', handler: 'handleResource006', auth: true },
  { path: '/api/v1/resource/007', method: 'GET', handler: 'handleResource007', auth: true },
  { path: '/api/v1/resource/008', method: 'GET', handler: 'handleResource008', auth: true },
  { path: '/api/v1/resource/009', method: 'GET', handler: 'handleResource009', auth: true },
  { path: '/api/v1/resource/010', method: 'GET', handler: 'handleResource010', auth: true },
  { path: '/api/v1/resource/011', method: 'GET', handler: 'handleResource011', auth: true },
  { path: '/api/v1/resource/012', method: 'GET', handler: 'handleResource012', auth: true },
  { path: '/api/v1/resource/013', method: 'GET', handler: 'handleResource013', auth: true },
  { path: '/api/v1/resource/014', method: 'GET', handler: 'handleResource014', auth: true },
  { path: '/api/v1/resource/015', method: 'GET', handler: 'handleResource015', auth: true },
  { path: '/api/v1/resource/016', method: 'GET', handler: 'handleResource016', auth: true },
  { path: '/api/v1/resource/017', method: 'GET', handler: 'handleResource017', auth: true },
  { path: '/api/v1/resource/018', method: 'GET', handler: 'handleResource018', auth: true },
  { path: '/api/v1/resource/019', method: 'GET', handler: 'handleResource019', auth: true },
  { path: '/api/v1/resource/020', method: 'GET', handler: 'handleResource020', auth: true },
  { path: '/api/v1/resource/021', method: 'GET', handler: 'handleResource021', auth: true },
  { path: '/api/v1/resource/022', method: 'GET', handler: 'handleResource022', auth: true },
  { path: '/api/v1/resource/023', method: 'GET', handler: 'handleResource023', auth: true },
  { path: '/api/v1/resource/024', method: 'GET', handler: 'handleResource024', auth: true },
  { path: '/api/v1/resource/025', method: 'GET', handler: 'handleResource025', auth: true },
  { path: '/api/v1/resource/026', method: 'GET', handler: 'handleResource026', auth: true },
  { path: '/api/v1/resource/027', method: 'GET', handler: 'handleResource027', auth: true },
  { path: '/api/v1/resource/028', method: 'GET', handler: 'handleResource028', auth: true },
  { path: '/api/v1/resource/029', method: 'GET', handler: 'handleResource029', auth: true },
  { path: '/api/v1/resource/030', method: 'GET', handler: 'handleResource030', auth: true },
  { path: '/api/v1/resource/031', method: 'GET', handler: 'handleResource031', auth: true },
  { path: '/api/v1/resource/032', method: 'GET', handler: 'handleResource032', auth: true },
  { path: '/api/v1/resource/033', method: 'GET', handler: 'handleResource033', auth: true },
  { path: '/api/v1/resource/034', method: 'GET', handler: 'handleResource034', auth: true },
  { path: '/api/v1/resource/035', method: 'GET', handler: 'handleResource035', auth: true },
  { path: '/api/v1/resource/036', method: 'GET', handler: 'handleResource036', auth: true },
  { path: '/api/v1/resource/037', method: 'GET', handler: 'handleResource037', auth: true },
  { path: '/api/v1/resource/038', method: 'GET', handler: 'handleResource038', auth: true },
  { path: '/api/v1/resource/039', method: 'GET', handler: 'handleResource039', auth: true },
  { path: '/api/v1/resource/040', method: 'GET', handler: 'handleResource040', auth: true },
  { path: '/api/v1/resource/041', method: 'GET', handler: 'handleResource041', auth: true },
  { path: '/api/v1/resource/042', method: 'GET', handler: 'handleResource042', auth: true },
  { path: '/api/v1/resource/043', method: 'GET', handler: 'handleResource043', auth: true },
  { path: '/api/v1/resource/044', method: 'GET', handler: 'handleResource044', auth: true },
  { path: '/api/v1/resource/045', method: 'GET', handler: 'handleResource045', auth: true },
  { path: '/api/v1/resource/046', method: 'GET', handler: 'handleResource046', auth: true },
  { path: '/api/v1/resource/047', method: 'GET', handler: 'handleResource047', auth: true },
  { path: '/api/v1/resource/048', method: 'GET', handler: 'handleResource048', auth: true },
  { path: '/api/v1/resource/049', method: 'GET', handler: 'handleResource049', auth: true },
  { path: '/api/v1/resource/050', method: 'GET', handler: 'handleResource050', auth: true },
  { path: '/api/v1/resource/051', method: 'GET', handler: 'handleResource051', auth: true },
  { path: '/api/v1/resource/052', method: 'GET', handler: 'handleResource052', auth: true },
  { path: '/api/v1/resource/053', method: 'GET', handler: 'handleResource053', auth: true },
  { path: '/api/v1/resource/054', method: 'GET', handler: 'handleResource054', auth: true },
  { path: '/api/v1/resource/055', method: 'GET', handler: 'handleResource055', auth: true },
  { path: '/api/v1/resource/056', method: 'GET', handler: 'handleResource056', auth: true },
  { path: '/api/v1/resource/057', method: 'GET', handler: 'handleResource057', auth: true },
  { path: '/api/v1/resource/058', method: 'GET', handler: 'handleResource058', auth: true },
  { path: '/api/v1/resource/059', method: 'GET', handler: 'handleResource059', auth: true },
  { path: '/api/v1/resource/060', method: 'GET', handler: 'handleResource060', auth: true },
  { path: '/api/v1/resource/061', method: 'GET', handler: 'handleResource061', auth: true },
  { path: '/api/v1/resource/062', method: 'GET', handler: 'handleResource062', auth: true },
  { path: '/api/v1/resource/063', method: 'GET', handler: 'handleResource063', auth: true },
  { path: '/api/v1/resource/064', method: 'GET', handler: 'handleResource064', auth: true },
  { path: '/api/v1/resource/065', method: 'GET', handler: 'handleResource065', auth: true },
  { path: '/api/v1/resource/066', method: 'GET', handler: 'handleResource066', auth: true },
  { path: '/api/v1/resource/067', method: 'GET', handler: 'handleResource067', auth: true },
  { path: '/api/v1/resource/068', method: 'GET', handler: 'handleResource068', auth: true },
  { path: '/api/v1/resource/069', method: 'GET', handler: 'handleResource069', auth: true },
  { path: '/api/v1/resource/070', method: 'GET', handler: 'handleResource070', auth: true },
  { path: '/api/v1/resource/071', method: 'GET', handler: 'handleResource071', auth: true },
  { path: '/api/v1/resource/072', method: 'GET', handler: 'handleResource072', auth: true },
  { path: '/api/v1/resource/073', method: 'GET', handler: 'handleResource073', auth: true },
  { path: '/api/v1/resource/074', method: 'GET', handler: 'handleResource074', auth: true },
  { path: '/api/v1/resource/075', method: 'GET', handler: 'handleResource075', auth: true },
  { path: '/api/v1/resource/076', method: 'GET', handler: 'handleResource076', auth: true },
  { path: '/api/v1/resource/077', method: 'GET', handler: 'handleResource077', auth: true },
  { path: '/api/v1/resource/078', method: 'GET', handler: 'handleResource078', auth: true },
  { path: '/api/v1/resource/079', method: 'GET', handler: 'handleResource079', auth: true },
  { path: '/api/v1/resource/080', method: 'GET', handler: 'handleResource080', auth: true },
  { path: '/api/v1/resource/081', method: 'GET', handler: 'handleResource081', auth: true },
  { path: '/api/v1/resource/082', method: 'GET', handler: 'handleResource082', auth: true },
  { path: '/api/v1/resource/083', method: 'GET', handler: 'handleResource083', auth: true },
  { path: '/api/v1/resource/084', method: 'GET', handler: 'handleResource084', auth: true },
  { path: '/api/v1/resource/085', method: 'GET', handler: 'handleResource085', auth: true },
  { path: '/api/v1/resource/086', method: 'GET', handler: 'handleResource086', auth: true },
  { path: '/api/v1/resource/087', method: 'GET', handler: 'handleResource087', auth: true },
  { path: '/api/v1/resource/088', method: 'GET', handler: 'handleResource088', auth: true },
  { path: '/api/v1/resource/089', method: 'GET', handler: 'handleResource089', auth: true },
  { path: '/api/v1/resource/090', method: 'GET', handler: 'handleResource090', auth: true },
  { path: '/api/v1/resource/091', method: 'GET', handler: 'handleResource091', auth: true },
  { path: '/api/v1/resource/092', method: 'GET', handler: 'handleResource092', auth: true },
  { path: '/api/v1/resource/093', method: 'GET', handler: 'handleResource093', auth: true },
  { path: '/api/v1/resource/094', method: 'GET', handler: 'handleResource094', auth: true },
  { path: '/api/v1/resource/095', method: 'GET', handler: 'handleResource095', auth: true },
  { path: '/api/v1/resource/096', method: 'GET', handler: 'handleResource096', auth: true },
  { path: '/api/v1/resource/097', method: 'GET', handler: 'handleResource097', auth: true },
  { path: '/api/v1/resource/098', method: 'GET', handler: 'handleResource098', auth: true },
  { path: '/api/v1/resource/099', method: 'GET', handler: 'handleResource099', auth: true },
  { path: '/api/v1/resource/100', method: 'GET', handler: 'handleResource100', auth: true },
  { path: '/api/v1/resource/101', method: 'GET', handler: 'handleResource101', auth: true },
  { path: '/api/v1/resource/102', method: 'GET', handler: 'handleResource102', auth: true },
  { path: '/api/v1/resource/103', method: 'GET', handler: 'handleResource103', auth: true },
  { path: '/api/v1/resource/104', method: 'GET', handler: 'handleResource104', auth: true },
  { path: '/api/v1/resource/105', method: 'GET', handler: 'handleResource105', auth: true },
  { path: '/api/v1/resource/106', method: 'GET', handler: 'handleResource106', auth: true },
  { path: '/api/v1/resource/107', method: 'GET', handler: 'handleResource107', auth: true },
  { path: '/api/v1/resource/108', method: 'GET', handler: 'handleResource108', auth: true },
  { path: '/api/v1/resource/109', method: 'GET', handler: 'handleResource109', auth: true },
  { path: '/api/v1/resource/110', method: 'GET', handler: 'handleResource110', auth: true },
  { path: '/api/v1/resource/111', method: 'GET', handler: 'handleResource111', auth: true },
  { path: '/api/v1/resource/112', method: 'GET', handler: 'handleResource112', auth: true },
  { path: '/api/v1/resource/113', method: 'GET', handler: 'handleResource113', auth: true },
  { path: '/api/v1/resource/114', method: 'GET', handler: 'handleResource114', auth: true },
  { path: '/api/v1/resource/115', method: 'GET', handler: 'handleResource115', auth: true },
  { path: '/api/v1/resource/116', method: 'GET', handler: 'handleResource116', auth: true },
  { path: '/api/v1/resource/117', method: 'GET', handler: 'handleResource117', auth: true },
  { path: '/api/v1/resource/118', method: 'GET', handler: 'handleResource118', auth: true },
  { path: '/api/v1/resource/119', method: 'GET', handler: 'handleResource119', auth: true },
  { path: '/api/v1/resource/120', method: 'GET', handler: 'handleResource120', auth: true },
]
```

Paragraph 1 of the long tail. It is here to push the whole reply well past ten thousand characters, so the test shows what happens to a long reply as a whole, and not only to one long block inside it.

Paragraph 2 of the long tail. It is here to push the whole reply well past ten thousand characters, so the test shows what happens to a long reply as a whole, and not only to one long block inside it.

Paragraph 3 of the long tail. It is here to push the whole reply well past ten thousand characters, so the test shows what happens to a long reply as a whole, and not only to one long block inside it.

Paragraph 4 of the long tail. It is here to push the whole reply well past ten thousand characters, so the test shows what happens to a long reply as a whole, and not only to one long block inside it.

Paragraph 5 of the long tail. It is here to push the whole reply well past ten thousand characters, so the test shows what happens to a long reply as a whole, and not only to one long block inside it.

Paragraph 6 of the long tail. It is here to push the whole reply well past ten thousand characters, so the test shows what happens to a long reply as a whole, and not only to one long block inside it.

Paragraph 7 of the long tail. It is here to push the whole reply well past ten thousand characters, so the test shows what happens to a long reply as a whole, and not only to one long block inside it.

Paragraph 8 of the long tail. It is here to push the whole reply well past ten thousand characters, so the test shows what happens to a long reply as a whole, and not only to one long block inside it.

Paragraph 9 of the long tail. It is here to push the whole reply well past ten thousand characters, so the test shows what happens to a long reply as a whole, and not only to one long block inside it.

Paragraph 10 of the long tail. It is here to push the whole reply well past ten thousand characters, so the test shows what happens to a long reply as a whole, and not only to one long block inside it.

Paragraph 11 of the long tail. It is here to push the whole reply well past ten thousand characters, so the test shows what happens to a long reply as a whole, and not only to one long block inside it.

Paragraph 12 of the long tail. It is here to push the whole reply well past ten thousand characters, so the test shows what happens to a long reply as a whole, and not only to one long block inside it.

### What to check

- With the navigator open, the reply draws whole: the code block, from its first route to its last (`resource/120`), and every paragraph after it
- The code block is one block; selecting and marking it works, and its quote in the suggestion is its opening code
- Mod on and off look the same apart from marks and the selection
- Classic renderer: the code block selected in the pane shows without breaking the layout
