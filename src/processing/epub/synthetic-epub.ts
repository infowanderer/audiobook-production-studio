import JSZip from 'jszip';

export async function createSyntheticEpub(): Promise<File> {
  const zip = new JSZip();

  zip.file('mimetype', 'application/epub+zip');

  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
  );

  zip.file(
    'OEBPS/content.opf',
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>The Clockmaker\u2019s Apprentice</dc:title>
    <dc:creator>Synthetic Test Author</dc:creator>
    <dc:identifier id="uid">test-epub-001</dc:identifier>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="ch0" href="frontmatter.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch1" href="prologue.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="chapter01.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch3" href="chapter02.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch4" href="chapter03.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch5" href="epilogue.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch0"/>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
    <itemref idref="ch3"/>
    <itemref idref="ch4"/>
    <itemref idref="ch5"/>
  </spine>
</package>`,
  );

  zip.file(
    'OEBPS/nav.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><title>Navigation</title></head>
<body>
<nav epub:type="toc">
  <ol>
    <li><a href="frontmatter.xhtml">Front Matter</a></li>
    <li><a href="prologue.xhtml">Prologue: The Last Midnight</a></li>
    <li><a href="chapter01.xhtml">Chapter One: Gears and Dust</a></li>
    <li><a href="chapter02.xhtml">Chapter Two: The Stranger\u2019s Request</a></li>
    <li><a href="chapter03.xhtml">Chapter Three: Beneath the Clocktower</a></li>
    <li><a href="epilogue.xhtml">Epilogue</a></li>
  </ol>
</nav>
</body>
</html>`,
  );

  zip.file(
    'OEBPS/frontmatter.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Front Matter</title></head>
<body>
<h1>The Clockmaker\u2019s Apprentice</h1>
<p>by Synthetic Test Author</p>
<p>\u00A9 2025 Synthetic Press. All rights reserved.</p>
<p>This is a test EPUB created for the Audiobook Production Studio.</p>
</body>
</html>`,
  );

  // Prologue: contains page numbers, repeated header, unusual Unicode
  zip.file(
    'OEBPS/prologue.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Prologue</title></head>
<body>
<p>THE CLOCKMAKER'S APPRENTICE</p>
<h2>Prologue: The Last Midnight</h2>
<p>1</p>
<p>The old clock tower stood at the center of Millhaven, its face dark against the winter sky. For thirty\u00ADyears it had kept perfect time\u2014until tonight.</p>
<p>\u201CYou can\u2019t fix what doesn\u2019t want fixing,\u201D old Thomas said, his voice barely above a whisper.</p>
<p>The apprentice stared at the silent gears.\u00A0\u00A0\u00A0Each one was larger than his head, coated in a fine layer of\u200Bdust that sparkled in the candlelight.</p>
<hr/>
<p>Outside, the town slept. No one heard the first chime\u2014a sound that hadn\u2019t rung in three decades.</p>
<p>2</p>
</body>
</html>`,
  );

  // Chapter 1: contains dialogue, italics, bold, and malformed whitespace
  zip.file(
    'OEBPS/chapter01.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter One</title></head>
<body>
<p>THE CLOCKMAKER'S APPRENTICE</p>
<h2>Chapter One: Gears and Dust</h2>
<p>Elias arrived at the workshop before dawn, as he always did.    The cobblestones were slick with morning dew, and his boots echoed in the empty street.</p>
<p></p>
<p></p>
<p></p>
<p>The workshop smelled of machine oil and old wood. <em>Master Harwick</em> was already bent over his workbench, a magnifying glass pressed to one eye.</p>
<p>\u201CYou\u2019re late,\u201D Harwick said without looking up.</p>
<p>\u201CI\u2019m ten minutes early.\u201D</p>
<p>\u201CFor a clockmaker, early <em>is</em> late. Time waits for no one, boy.\u201D</p>
<p>Elias hung his coat on the peg by the door and rolled up his sleeves. On the bench before him lay the innards of a pocket watch\u2014springs, escapement, balance wheel\u2014all scattered like the bones of some tiny mechanical creature.</p>
<blockquote>
<p>\u201CThe measure of a clockmaker is not in the clocks he builds, but in the time he keeps.\u201D</p>
<p>\u2014 <strong>Wilhelm Harwick</strong>, <em>On the Art of Horology</em></p>
</blockquote>
<p>He picked up the tweezers and began.</p>
<p>47</p>
</body>
</html>`,
  );

  // Chapter 2: contains scene break, repeated footer, intentionally broken lines
  zip.file(
    'OEBPS/chapter02.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter Two</title></head>
<body>
<p>THE CLOCKMAKER'S APPRENTICE</p>
<h2>Chapter Two: The Stranger\u2019s Request</h2>
<p>The stranger appeared on a Tuesday. She wore a long grey coat and carried a case
made of leather so old it had turned almost black. Her eyes swept the workshop
with the careful precision of someone who understood what she was looking at.</p>
<p>\u201CI need a clock repaired,\u201D she said. \u201COne that\u2019s\u2026 unusual.\u201D</p>
<p>Harwick wiped his hands on his apron. \u201CWe repair all manner of timepieces here.\u201D</p>
<p>\u201CNot like this one.\u201D She set the case on the counter and opened it.</p>
<p>Inside, resting on faded velvet, was the most extraordinary clock Elias had ever seen. Its face was divided not into twelve hours but into <strong>thirteen</strong>. The numbers were etched in a script he didn\u2019t recognize.</p>
<hr/>
<p>That night, Elias couldn\u2019t sleep. He lay in his narrow bed above the workshop, staring at the ceiling, thinking about the thirteen-hour clock.</p>
<p>\u201CWhat language were those numbers?\u201D he asked the darkness.</p>
<p>The darkness, predictably, did not answer.</p>
<p>THE CLOCKMAKER'S APPRENTICE \u2014 PAGE 63</p>
</body>
</html>`,
  );

  // Chapter 3: contains footnote references, block quotes, more Unicode
  zip.file(
    'OEBPS/chapter03.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter Three</title></head>
<body>
<h2>Chapter Three: Beneath the Clocktower</h2>
<p>The passage beneath the clocktower was older than the town itself. According to the <em>Historical Register of Millhaven</em><sup class="footnote">1</sup>, the tunnels dated back to the twelfth century.</p>
<p>Elias held his lantern high. The walls were lined with\u2026 were those gears? Enormous bronze gears, each one taller than a man, embedded directly into the stone.</p>
<p>\u201CThis is impossible,\u201D he breathed.</p>
<blockquote>
<p>The tunnels of Millhaven are mentioned in three separate medieval documents, all of which describe them as \u201Cthe works beneath\u201D\u2014a phrase whose meaning has been debated for centuries.</p>
</blockquote>
<p>\u201CNot impossible,\u201D said a voice behind him. \u201CJust very, very old.\u201D</p>
<p>He spun around. The stranger stood in the tunnel entrance, her grey coat now spattered with rain. In her hand she held the thirteen-hour clock, and it was <em>ticking</em>.</p>
<p>\u201CHow\u2014\u201D</p>
<p>\u201CThe clock needed to come home,\u201D she said simply. \u201CThis is where it was made.\u201D</p>
<hr/>
<p>The gears in the walls began to turn.</p>
<p>103</p>
</body>
</html>`,
  );

  // Epilogue
  zip.file(
    'OEBPS/epilogue.xhtml',
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Epilogue</title></head>
<body>
<h2>Epilogue</h2>
<p>Years later, when people asked Elias about that night, he would smile and say only this:</p>
<p>\u201CSome clocks measure hours. Some measure something else entirely.\u201D</p>
<p>The clocktower of Millhaven still stands. Its face now shows thirteen hours, though most visitors assume it\u2019s a quirk of the old design. The townsfolk know better, but they don\u2019t talk about it.</p>
<p>And if you press your ear to the base of the tower on a quiet night, you can still hear them\u2014the great gears, turning deep beneath the stone, keeping time to a rhythm older than memory.</p>
<p><em>The End</em></p>
</body>
</html>`,
  );

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  return new File([blob], 'the-clockmakers-apprentice.epub', { type: 'application/epub+zip' });
}
