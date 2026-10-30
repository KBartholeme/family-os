"""Builds site/catalog/ideen-katalog.json – age-based ideas for the kids' development areas.

Each idea has an age window in months [from, to). For any month the app shows the 3–4 ideas
per area whose window contains that month, newest first. Run:  python3 tools/build_catalog.py
The script checks that every month 0–71 has at least 3 ideas in every area.
"""
import json, pathlib, sys

AREAS = {
    "motor": ("Motorik & Sport", "Motor skills & sport"),
    "lang": ("Sprache & Lesen", "Language & reading"),
    "social": ("Sozial-emotional", "Social-emotional"),
    "mind": ("Denken & Neugier", "Thinking & curiosity"),
    "creative": ("Kreativität & Musik", "Creativity & music"),
    "indep": ("Selbstständigkeit", "Independence"),
    "nature": ("Natur & Welt", "Nature & world"),
    "langs": ("Sprachen", "Languages"),
}
MAX_MONTH = 72

# (area, from, to, title_de, title_en, tip_de, tip_en)
IDEAS = [
    # ---------- Motorik & Sport ----------
    ("motor", 0, 4, "Bauchlage-Zeit", "Tummy time", "Kurz und oft, auf Augenhöhe mitmachen", "Short and often, get down at eye level"),
    ("motor", 0, 6, "Greifspiele mit Rassel", "Grasping games with a rattle", "Rassel seitlich anbieten, nicht in die Hand drücken", "Offer it from the side instead of placing it in the hand"),
    ("motor", 0, 6, "Babymassage", "Baby massage", "Warme Hände, ruhiger Moment nach dem Baden", "Warm hands, a calm moment after the bath"),
    ("motor", 2, 7, "Strampeln auf der Decke", "Kicking on a blanket", "Ohne Windel auf warmer Decke – viel Bewegungsfreiheit", "Diaper-free on a warm blanket – lots of freedom to move"),
    ("motor", 3, 8, "Drehen üben", "Practice rolling over", "Spielzeug seitlich hinlegen, damit sich das Drehen lohnt", "Place a toy to the side so rolling is worth it"),
    ("motor", 5, 10, "Krabbelparcours aus Kissen", "Cushion crawling course", "Kissen, Decken und Tunnel aus Kartons", "Cushions, blankets and cardboard tunnels"),
    ("motor", 6, 12, "Babyschwimmen", "Baby swimming", "Wassergewöhnung mit viel Körperkontakt", "Water confidence with lots of body contact"),
    ("motor", 7, 12, "Hochziehen an Möbeln", "Pulling up on furniture", "Kippsichere Möbel, Ecken entschärfen", "Tip-proof furniture, padded corners"),
    ("motor", 8, 14, "An der Hand laufen", "Walking hand in hand", "Lieber an beiden Händen als hochziehen", "Hold both hands instead of pulling up"),
    ("motor", 9, 15, "Schiebewagen", "Push-along walker", "Stabiler Schiebewagen statt Lauflernhilfe zum Hineinsetzen", "A sturdy push toy rather than a sit-in walker"),
    ("motor", 10, 18, "Treppe krabbelnd hochklettern", "Crawling up stairs", "Immer mit Begleitung, rückwärts runter üben", "Always supervised, practice going down backwards"),
    ("motor", 12, 24, "Barfuß auf verschiedenen Untergründen", "Barefoot on different surfaces", "Gras, Sand, Kies, Teppich – Füße trainieren mit", "Grass, sand, gravel, rug – trains the feet too"),
    ("motor", 12, 24, "Bälle rollen und werfen", "Rolling and throwing balls", "Weiche Bälle, gegenseitig zurollen", "Soft balls, roll them back and forth"),
    ("motor", 14, 30, "Bobbycar / Rutschauto", "Ride-on car", "Abstoßen stärkt Beine und Gleichgewicht", "Pushing off builds legs and balance"),
    ("motor", 15, 30, "Klettern auf kleinen Spielplatzgerüsten", "Climbing small playground frames", "Eigene Grenzen finden lassen, in der Nähe bleiben", "Let them find their limits, stay close"),
    ("motor", 18, 30, "Tanzen zu Musik", "Dancing to music", "Stopp-Tanz: einfrieren, wenn die Musik aufhört", "Freeze dance: stop when the music stops"),
    ("motor", 18, 36, "Treppen gehen an der Hand", "Walking up stairs holding hands", "Erst Nachstellschritt, später abwechselnd", "First one step at a time, later alternating feet"),
    ("motor", 20, 40, "Laufrad ausprobieren", "Try a balance bike", "Sattel so tief, dass beide Füße flach aufsetzen", "Saddle low enough for both feet to be flat"),
    ("motor", 24, 42, "Hüpfen mit beiden Füßen", "Jumping with both feet", "Von der untersten Stufe oder über ein Seil am Boden", "Off the bottom step or over a rope on the ground"),
    ("motor", 24, 48, "Eltern-Kind-Turnen", "Parent-and-child gym", "Feste Gruppe, viel Bewegung, andere Kinder", "A regular group, lots of movement, other kids"),
    ("motor", 30, 54, "Balancieren", "Balancing", "Bordstein, Baumstamm, Seil am Boden", "Kerb, tree trunk, a rope on the ground"),
    ("motor", 30, 60, "Fangen und Werfen mit großem Ball", "Catching and throwing a big ball", "Erst aus kurzer Distanz, Arme vorstrecken", "Start close, arms stretched out"),
    ("motor", 36, 60, "Kinderturnen", "Kids gymnastics", "Rollen, Klettern, Springen in der Gruppe", "Rolling, climbing, jumping in a group"),
    ("motor", 36, 60, "Selbst anschwingen auf der Schaukel", "Swinging by themselves", "Beine vor und zurück – erst mit kleinem Schubs", "Legs forward and back – start with a small push"),
    ("motor", 40, 66, "Roller fahren", "Riding a scooter", "Mit Helm, erst auf ruhigen Wegen", "With a helmet, start on quiet paths"),
    ("motor", 42, 72, "Fahrrad ohne Stützräder", "Bike without training wheels", "Nach dem Laufrad geht es oft ganz schnell", "After a balance bike it often happens quickly"),
    ("motor", 48, 72, "Schwimmkurs (Seepferdchen)", "Swimming course (beginner badge)", "Kurse sind oft lange im Voraus ausgebucht", "Courses are often booked out far in advance"),
    ("motor", 48, 72, "Klettern oder Bouldern für Kinder", "Climbing or bouldering for kids", "Kinderkurse in der Kletterhalle", "Kids' sessions at a climbing gym"),
    ("motor", 48, 72, "Hüpfkästchen und einbeinig hüpfen", "Hopscotch and hopping on one leg", "Mit Kreide auf den Gehweg malen", "Draw it with chalk on the pavement"),
    ("motor", 54, 72, "Seilspringen ausprobieren", "Try skipping rope", "Erst über ein schwingendes Seil springen", "Start by jumping over a swinging rope"),
    ("motor", 54, 72, "Ballsport schnuppern", "Try a ball sport", "Kinderfußball oder Ballschule im Verein", "Kids' football or a ball school at a club"),
    ("motor", 56, 72, "Inliner oder Eislaufen", "Inline skating or ice skating", "Mit Schutzausrüstung, an der Hand starten", "With protective gear, start holding hands"),

    # ---------- Sprache & Lesen ----------
    ("lang", 0, 6, "Den Alltag kommentieren", "Narrate the day", "Beim Wickeln und Anziehen erzählen, was passiert", "Talk about what's happening while changing and dressing"),
    ("lang", 0, 6, "Reime und Verse summen", "Hum rhymes and verses", "Melodie und Rhythmus beruhigen und üben Laute", "Melody and rhythm soothe and practise sounds"),
    ("lang", 0, 8, "Lieder und Wiegenlieder", "Songs and lullabies", "Immer wieder dieselben – Wiederholung hilft", "The same ones again and again – repetition helps"),
    ("lang", 2, 9, "Brabbeln nachahmen", "Imitate babbling", "Laute zurückgeben, Pausen zum Antworten lassen", "Echo the sounds, leave pauses for a reply"),
    ("lang", 4, 12, "Kontrast- und Stoffbücher", "Contrast and cloth books", "Zum Anschauen, Anfassen und In-den-Mund-Nehmen", "To look at, touch and mouth"),
    ("lang", 6, 15, "Fingerspiele und Kniereiter", "Finger plays and knee rides", "„Hoppe hoppe Reiter“ & Co.", "Classic knee-bouncing rhymes"),
    ("lang", 8, 18, "Zeigen und benennen", "Point and name", "„Wo ist der Ball?“ – auf Zeigen mit Worten antworten", "“Where's the ball?” – answer pointing with words"),
    ("lang", 10, 24, "Bilderbücher mit Klappen", "Lift-the-flap books", "Kurz, robust, viel zum Entdecken", "Short, sturdy, lots to discover"),
    ("lang", 12, 24, "Wörter erweitern", "Expand on words", "Kind sagt „Auto“ – „Ja, ein rotes Auto!“", "Child says “car” – “Yes, a red car!”"),
    ("lang", 15, 30, "Tiergeräusche und Wortspiele", "Animal sounds and word games", "„Wie macht die Kuh?“ – Lachen erlaubt", "“What does the cow say?” – laughing allowed"),
    ("lang", 18, 36, "Vorlese-Ritual vor dem Schlafen", "Bedtime reading ritual", "Jeden Abend, gern dasselbe Buch", "Every evening, the same book is fine"),
    ("lang", 20, 36, "Zwei-Wort-Sätze aufgreifen", "Pick up two-word sentences", "Nicht korrigieren, richtig wiederholen", "Don't correct, repeat it correctly"),
    ("lang", 24, 42, "Reime und Abzählverse", "Rhymes and counting-out verses", "Reime schulen das Hören von Lauten", "Rhymes train hearing sounds"),
    ("lang", 24, 48, "Besuch in der Bücherei", "Visit to the library", "Kinderecke, eigene Bücher aussuchen lassen", "Children's corner, let them pick books"),
    ("lang", 30, 54, "Beim Vorlesen Fragen stellen", "Ask questions while reading", "„Was passiert wohl als Nächstes?“", "“What do you think happens next?”"),
    ("lang", 36, 60, "Geschichten nacherzählen lassen", "Let them retell stories", "Mit Bildern als Stütze", "With pictures as prompts"),
    ("lang", 36, 60, "Hörspiele und Hörbücher", "Audio stories and audiobooks", "Gemeinsam hören, danach darüber reden", "Listen together, talk about it afterwards"),
    ("lang", 42, 72, "Buchstaben im Alltag entdecken", "Spot letters in everyday life", "Mit dem eigenen Namen anfangen", "Start with their own name"),
    ("lang", 48, 72, "Silben klatschen", "Clap syllables", "„Ba-na-ne“ – drei Klatscher", "“Ba-na-na” – three claps"),
    ("lang", 48, 72, "Witze und Rätsel erfinden", "Make up jokes and riddles", "Sprachwitz macht Spaß und fördert", "Wordplay is fun and builds skills"),
    ("lang", 54, 72, "Anlaute raten", "Guess the first sound", "„Was beginnt mit M?“ – Mama, Maus, Mond", "“What starts with M?” – mum, mouse, moon"),
    ("lang", 60, 72, "Erste Wörter malen und schreiben", "Draw and write first words", "Ohne Druck – Schreiben wie es klingt ist okay", "No pressure – writing as it sounds is fine"),

    # ---------- Sozial-emotional ----------
    ("social", 0, 6, "Viel Körperkontakt und Tragen", "Lots of body contact and carrying", "Nähe gibt Sicherheit – verwöhnen gibt es hier nicht", "Closeness gives security – you can't spoil a baby"),
    ("social", 0, 8, "Mimik spiegeln", "Mirror facial expressions", "Lächeln erwidern, Gesichter machen", "Smile back, make faces"),
    ("social", 0, 12, "Feste Abendroutine mit Nähe", "A cosy fixed bedtime routine", "Gleiche Abfolge gibt Halt", "The same sequence gives security"),
    ("social", 3, 10, "Guck-guck-Spiele", "Peekaboo", "Weg und wieder da – Grundlage für Vertrauen", "Gone and back again – a basis for trust"),
    ("social", 6, 14, "Fremdeln begleiten", "Support stranger anxiety", "Neue Menschen langsam kennenlernen, auf dem Arm", "Meet new people slowly, from your arms"),
    ("social", 8, 18, "Krabbel- oder Spielgruppe", "Toddler or playgroup", "Andere Kinder erleben, Eltern vernetzen sich", "Experience other kids, parents connect"),
    ("social", 10, 24, "Geben-und-Nehmen-Spiele", "Give-and-take games", "„Danke!“ – und zurückgeben", "“Thank you!” – and give it back"),
    ("social", 12, 30, "Gefühle benennen", "Name feelings", "„Du bist wütend, weil …“", "“You're angry because …”"),
    ("social", 15, 30, "Kuscheltier versorgen", "Care for a soft toy", "Füttern, ins Bett bringen, trösten", "Feed it, put it to bed, comfort it"),
    ("social", 18, 36, "Begegnungen auf dem Spielplatz begleiten", "Support playground encounters", "Nicht sofort eingreifen, aber nah sein", "Don't step in at once, but stay close"),
    ("social", 24, 42, "Abwechseln üben", "Practise taking turns", "Rutsche, Würfelspiel, „Jetzt du, dann ich“", "Slide, dice games, “you, then me”"),
    ("social", 24, 48, "Rollenspiele", "Pretend play", "Kaufladen, Arztkoffer, Kochen", "Play shop, doctor's kit, cooking"),
    ("social", 30, 54, "Gefühlskarten und Gefühlsbücher", "Feelings cards and books", "Beim Abendessen: Wie war dein Tag?", "At dinner: how was your day?"),
    ("social", 36, 60, "Verabredung mit einem Freund oder einer Freundin", "Play date with a friend", "Erst bei euch, später auch woanders", "First at your place, later elsewhere too"),
    ("social", 36, 72, "Streit lösen üben", "Practise resolving conflicts", "Gemeinsam Lösungen suchen statt Schuld", "Look for solutions together instead of blame"),
    ("social", 42, 72, "Familienregeln gemeinsam aufstellen", "Set family rules together", "Wenige, klare Regeln – aufmalen", "Few, clear rules – draw them"),
    ("social", 48, 72, "Übernachtung bei Großeltern oder Freunden", "Sleepover at grandparents or friends", "Kuscheltier und Abendritual mitnehmen", "Bring the soft toy and the bedtime routine"),
    ("social", 48, 72, "Verlieren lernen bei Gesellschaftsspielen", "Learn to lose at board games", "Gefühle aushalten, gute Verlierer loben", "Sit with the feelings, praise good losers"),
    ("social", 54, 72, "Kleine Verantwortung übernehmen", "Take on small responsibilities", "Pflanze gießen, Haustier füttern", "Water a plant, feed a pet"),
    ("social", 60, 72, "Hilfsbereitschaft stärken", "Encourage helpfulness", "Jüngeren helfen, Kita-Aufgaben übernehmen", "Help younger kids, take on daycare tasks"),

    # ---------- Denken & Neugier ----------
    ("mind", 0, 4, "Schwarz-Weiß-Kontraste anschauen", "Look at black-and-white contrasts", "Starke Kontraste sieht ein Baby am besten", "Strong contrasts are easiest for babies to see"),
    ("mind", 0, 6, "Dinge mit den Augen verfolgen", "Follow things with their eyes", "Mobile oder Spielzeug langsam bewegen", "Move a mobile or toy slowly"),
    ("mind", 0, 6, "Materialien ertasten", "Explore different materials", "Weich, rau, kühl, knisternd", "Soft, rough, cool, crinkly"),
    ("mind", 2, 8, "Spiegel entdecken", "Discover the mirror", "Wer ist das? Gesichter machen", "Who's that? Make faces"),
    ("mind", 4, 10, "Ursache und Wirkung", "Cause and effect", "Rasseln, Knistertücher, Drücken und Klingeln", "Rattles, crinkly cloths, press-and-ring toys"),
    ("mind", 6, 12, "Ein- und Ausräumen", "Filling and emptying", "Dose mit großen Bausteinen", "A tin with big blocks"),
    ("mind", 8, 15, "Gegenstände verstecken", "Hide objects", "Unter dem Tuch – noch da?", "Under the cloth – still there?"),
    ("mind", 10, 20, "Stapelbecher", "Stacking cups", "Stapeln, ineinanderstecken, umwerfen", "Stack, nest, knock over"),
    ("mind", 12, 24, "Formen-Steckspiel", "Shape sorter", "Erst wenige Formen", "Start with a few shapes"),
    ("mind", 14, 26, "Umfüllen mit Sand und Wasser", "Pouring sand and water", "Becher, Trichter, Löffel", "Cups, funnels, spoons"),
    ("mind", 18, 30, "Erste Puzzles (2–4 Teile)", "First puzzles (2–4 pieces)", "Steckpuzzle mit Knöpfen", "Peg puzzles with knobs"),
    ("mind", 20, 36, "Sortieren nach Farben", "Sort by colour", "Socken, Bausteine, Obst", "Socks, blocks, fruit"),
    ("mind", 24, 40, "Zählen im Alltag", "Counting in daily life", "Treppenstufen, Teller, Äpfel", "Stairs, plates, apples"),
    ("mind", 24, 42, "Bauen mit großen Bausteinen", "Building with big blocks", "Türme, Brücken, Garagen", "Towers, bridges, garages"),
    ("mind", 30, 48, "Memory mit wenigen Paaren", "Memory with a few pairs", "Mit 6 Paaren starten", "Start with 6 pairs"),
    ("mind", 36, 60, "Experimente mit Wasser", "Water experiments", "Schwimmt es oder sinkt es?", "Does it float or sink?"),
    ("mind", 36, 60, "Puzzles mit 12–30 Teilen", "Puzzles with 12–30 pieces", "Erst Rand, dann Mitte", "Edges first, then the middle"),
    ("mind", 42, 66, "Magnete entdecken", "Explore magnets", "Nur große Magnete und mit Aufsicht – kleine sind gefährlich", "Only big magnets and supervised – small ones are dangerous"),
    ("mind", 48, 72, "Erste Brettspiele", "First board games", "Würfeln und Zählen, z. B. Leiterspiele", "Dice and counting, e.g. snakes and ladders"),
    ("mind", 48, 72, "Mengen vergleichen", "Compare quantities", "Mehr oder weniger? Zahlen bis 10–20", "More or fewer? Numbers up to 10–20"),
    ("mind", 54, 72, "Zeit spielerisch erleben", "Experience time playfully", "Sanduhr, Tagesplan mit Bildern", "Sand timer, picture schedule for the day"),
    ("mind", 60, 72, "Muster und Logikrätsel", "Patterns and logic puzzles", "Rot-Blau-Rot – was kommt dann?", "Red-blue-red – what comes next?"),

    # ---------- Kreativität & Musik ----------
    ("creative", 0, 6, "Spieluhr und sanfte Musik", "Music box and gentle music", "Zum Einschlafen und Zuhören", "For falling asleep and listening"),
    ("creative", 0, 8, "Zu Musik wiegen und schaukeln", "Sway and rock to music", "Rhythmus mit dem ganzen Körper spüren", "Feel rhythm with the whole body"),
    ("creative", 0, 8, "Bunte Tücher tanzen lassen", "Make colourful scarves dance", "Über dem Baby schweben lassen", "Let them float above the baby"),
    ("creative", 3, 12, "Klänge erkunden", "Explore sounds", "Rassel, Glöckchen, Löffel auf Holz", "Rattle, bells, a spoon on wood"),
    ("creative", 6, 15, "Auf Töpfe trommeln", "Drum on pots", "Kochlöffel und Topf – Lärm ist erwünscht", "Wooden spoon and pot – noise welcome"),
    ("creative", 8, 18, "Eltern-Kind-Musikgruppe", "Parent-and-child music group", "Singen, Klatschen, Instrumente", "Singing, clapping, instruments"),
    ("creative", 12, 24, "Fingerfarben", "Finger paint", "Unbedenkliche Farben, großes Papier", "Child-safe paints, big paper"),
    ("creative", 14, 30, "Kritzeln mit Wachsmalblöcken", "Scribbling with crayon blocks", "Dicke Blöcke liegen gut in der Hand", "Chunky blocks are easy to hold"),
    ("creative", 18, 36, "Knete und Salzteig", "Play dough and salt dough", "Selbst gemacht: Mehl, Salz, Wasser, Öl", "Homemade: flour, salt, water, oil"),
    ("creative", 20, 36, "Rasseln selbst basteln", "Make your own shakers", "Dose mit Reis – sehr fest verschließen", "A tin with rice – seal it very tightly"),
    ("creative", 24, 42, "Verkleiden", "Dressing up", "Kiste mit alten Tüchern, Hüten, Taschen", "A box of old scarves, hats, bags"),
    ("creative", 24, 48, "Malen mit Pinsel und Wasserfarben", "Painting with brushes and watercolours", "Malkittel, Zeitungspapier unterlegen", "Smock, newspaper underneath"),
    ("creative", 30, 54, "Kleben und Collagen", "Gluing and collages", "Papierschnipsel, Stoffreste, Naturmaterial", "Paper scraps, fabric, nature finds"),
    ("creative", 36, 60, "Basteln mit Kinderschere", "Crafting with child scissors", "Erst Streifen schneiden, dann Linien", "Cut strips first, then lines"),
    ("creative", 36, 72, "Musikalische Früherziehung", "Early music education", "Rhythmus, Singen, erste Instrumente", "Rhythm, singing, first instruments"),
    ("creative", 42, 66, "Puppentheater spielen", "Puppet theatre", "Socken als Handpuppen, Karton als Bühne", "Socks as puppets, a box as the stage"),
    ("creative", 48, 72, "Ein Instrument ausprobieren", "Try an instrument", "Trommel, Glockenspiel, Ukulele", "Drum, glockenspiel, ukulele"),
    ("creative", 48, 72, "Bauen mit Recycling und Naturmaterial", "Build with recycling and nature finds", "Kartons, Rollen, Stöcke, Zapfen", "Boxes, tubes, sticks, cones"),
    ("creative", 54, 72, "Eigene Bildergeschichten malen", "Draw your own picture stories", "Drei Bilder: Anfang, Mitte, Ende", "Three pictures: beginning, middle, end"),
    ("creative", 60, 72, "Kindertanz schnuppern", "Try a kids' dance class", "Ballett, Hip-Hop oder kreativer Tanz", "Ballet, hip-hop or creative dance"),

    # ---------- Selbstständigkeit ----------
    ("indep", 0, 6, "Fester Tagesrhythmus", "A steady daily rhythm", "Schlafen, Essen, Spielen in ähnlicher Abfolge", "Sleep, food, play in a similar order"),
    ("indep", 0, 12, "Wickeln als gemeinsame Zeit", "Changing time as together time", "Ankündigen, was passiert, Kind mitmachen lassen", "Say what's happening, let the child join in"),
    ("indep", 0, 8, "Hunger- und Müdigkeitszeichen lesen", "Read hunger and tiredness cues", "Früh reagieren – das Kind lernt: ich werde verstanden", "Respond early – the child learns: I'm understood"),
    ("indep", 2, 10, "Kurz allein spielen lassen", "Short solo play", "In Sichtweite, nicht ständig unterhalten", "Within sight, no need to entertain all the time"),
    ("indep", 3, 9, "Selbst nach Spielzeug greifen lassen", "Let them reach for toys", "Nicht sofort reichen – kleiner Abstand motiviert", "Don't hand it over at once – a little distance motivates"),
    ("indep", 6, 12, "Fingerfood selbst essen", "Self-feeding finger food", "Weiche Stücke in Stangenform, immer dabei bleiben", "Soft stick-shaped pieces, always stay close"),
    ("indep", 8, 15, "Aus dem offenen Becher trinken", "Drink from an open cup", "Wenig einfüllen, Kleckern gehört dazu", "Fill only a little, spills are part of it"),
    ("indep", 10, 20, "Mit dem Löffel essen üben", "Practise eating with a spoon", "Dicke Breie und Joghurt klappen am besten", "Thick purées and yoghurt work best"),
    ("indep", 12, 24, "Schuhe und Socken ausziehen", "Take off shoes and socks", "Klettverschlüsse helfen", "Velcro helps"),
    ("indep", 15, 30, "Hände waschen mit Hilfe", "Wash hands with help", "Tritthocker am Waschbecken", "A step stool at the sink"),
    ("indep", 18, 36, "Beim Aufräumen helfen", "Help tidy up", "Eine Kiste pro Spielzeugart, Aufräumlied", "One box per toy type, a tidy-up song"),
    ("indep", 20, 36, "Selbst anziehen üben", "Practise dressing", "Erst Mütze und Hose, Zeit einplanen", "Start with hat and trousers, allow time"),
    ("indep", 24, 42, "Trocken werden begleiten", "Support toilet learning", "Ohne Druck, wenn das Kind Interesse zeigt", "No pressure, when the child shows interest"),
    ("indep", 24, 48, "Kleine Aufgaben im Haushalt", "Small household jobs", "Wäsche sortieren, Salat waschen", "Sort laundry, wash lettuce"),
    ("indep", 30, 54, "Zähne selbst putzen", "Brush teeth themselves", "Danach nachputzen – bis ins Schulalter", "Brush after them – until school age"),
    ("indep", 36, 60, "Allein anziehen mit Jacke", "Dress alone incl. jacket", "Jacken-Trick: kopfüber auf den Boden legen", "Jacket flip: lay it upside down on the floor"),
    ("indep", 36, 60, "Tisch decken", "Set the table", "Teller und Besteck in Kinderhöhe", "Plates and cutlery at child height"),
    ("indep", 42, 72, "Brot schmieren und in der Küche helfen", "Spread bread and help in the kitchen", "Stumpfes Messer, Lernturm", "A blunt knife, a learning tower"),
    ("indep", 48, 72, "Schleife binden", "Tie shoelaces", "Mit zwei Farben am Schnürsenkel üben", "Practise with two-coloured laces"),
    ("indep", 48, 72, "Kleines Taschengeld", "Small pocket money", "Wenig, aber regelmäßig – selbst entscheiden lassen", "Little but regular – let them decide"),
    ("indep", 54, 72, "Rucksack selbst packen", "Pack their own backpack", "Checkliste mit Bildern", "A picture checklist"),
    ("indep", 54, 72, "Verkehr üben", "Practise traffic safety", "Bordsteinkante = Stopp, Ampel erklären", "Kerb = stop, explain traffic lights"),

    # ---------- Natur & Welt ----------
    ("nature", 0, 6, "Am Fenster Vögel und Bäume zeigen", "Show birds and trees from the window", "Benennen, was sich bewegt", "Name what moves"),
    ("nature", 0, 6, "Viel draußen sein", "Spend lots of time outside", "Bei jedem Wetter, passend angezogen", "In any weather, dressed right"),
    ("nature", 0, 8, "Spaziergänge mit Blick in den Himmel", "Walks looking at the sky", "Blätter, Wolken, Licht und Schatten", "Leaves, clouds, light and shadow"),
    ("nature", 3, 12, "Wind, Wasser und Sand fühlen", "Feel wind, water and sand", "Hände ins Wasser, Füße in den Sand", "Hands in water, feet in sand"),
    ("nature", 6, 15, "Barfuß im Gras", "Barefoot in the grass", "Kitzelt – und stärkt die Füße", "Tickles – and strengthens feet"),
    ("nature", 6, 14, "Blätter, Blüten und Rinde befühlen", "Feel leaves, blossoms and bark", "Auf dem Arm an Bäumen und Sträuchern stehen bleiben", "Stop at trees and bushes while carrying them"),
    ("nature", 10, 24, "Tiere im Park oder auf dem Bauernhof", "Animals in the park or on a farm", "Enten füttern nur mit passendem Futter", "Feed ducks only with suitable food"),
    ("nature", 12, 24, "Steine und Stöcke sammeln", "Collect stones and sticks", "Ein Schatzkästchen für Fundstücke", "A treasure box for finds"),
    ("nature", 15, 30, "In Pfützen springen", "Jump in puddles", "Matschhose an – Spaß garantiert", "Rain trousers on – fun guaranteed"),
    ("nature", 18, 36, "Tierbücher und Zoobesuch", "Animal books and a zoo visit", "Tiere im Buch wiederfinden", "Find the animals from the book"),
    ("nature", 20, 40, "Pflanzen gießen", "Water plants", "Eigene kleine Gießkanne", "Their own little watering can"),
    ("nature", 24, 48, "Waldspaziergang mit Sammelbeutel", "Forest walk with a collecting bag", "Zapfen, Blätter, Federn", "Cones, leaves, feathers"),
    ("nature", 30, 54, "Kresse säen", "Grow cress", "Nach wenigen Tagen zu sehen und zu essen", "Visible and edible within days"),
    ("nature", 36, 60, "Waldtage", "Forest days", "Regelmäßig in denselben Wald – Jahreszeiten erleben", "Same forest regularly – experience the seasons"),
    ("nature", 36, 60, "Insekten beobachten", "Watch insects", "Becherlupe, danach wieder freilassen", "Bug viewer, then let them go"),
    ("nature", 42, 66, "Jahreszeiten-Tisch", "Seasons table", "Fundstücke der Saison ausstellen", "Display seasonal finds"),
    ("nature", 48, 72, "Eigene Pflanze oder Hochbeet", "Own plant or raised bed", "Radieschen und Erdbeeren klappen gut", "Radishes and strawberries work well"),
    ("nature", 48, 72, "Müll trennen und Natur schützen", "Sort waste and protect nature", "Warum gehört das in welche Tonne?", "Why does it go in which bin?"),
    ("nature", 54, 72, "Ausflüge ins Museum oder Planetarium", "Trips to a museum or planetarium", "Kinderführungen nutzen", "Use kids' tours"),
    ("nature", 60, 72, "Wetter beobachten und aufmalen", "Watch and draw the weather", "Wetterkalender für eine Woche", "A weather calendar for a week"),

    # ---------- Sprachen (Deutsch · Portugiesisch · Englisch) ----------
    ("langs", 0, 12, "Eine Person – eine Sprache", "One person – one language", "Jede Bezugsperson bleibt bei ihrer Sprache", "Each caregiver sticks to their language"),
    ("langs", 0, 12, "Portugiesische Wiegenlieder", "Portuguese lullabies", "Lieder aus der eigenen Kindheit weitergeben", "Pass on songs from your own childhood"),
    ("langs", 0, 18, "Englisch einfach hören lassen", "Let them simply hear English", "Eure Gespräche miteinander sind schon Input", "Your conversations with each other are input already"),
    ("langs", 6, 18, "Fingerspiele auf Portugiesisch", "Finger plays in Portuguese", "Reime mit Bewegung bleiben hängen", "Rhymes with movement stick"),
    ("langs", 6, 36, "Englische Kinderlieder", "English nursery songs", "Zum Mitsingen im Auto oder beim Baden", "To sing along in the car or the bath"),
    ("langs", 10, 30, "Bilderbücher auf Portugiesisch", "Picture books in Portuguese", "Gleiches Buch in zwei Sprachen ist ein Plus", "The same book in two languages is a bonus"),
    ("langs", 12, 36, "Videocall mit der portugiesischsprachigen Familie", "Video calls with the Portuguese-speaking family", "Kurz und regelmäßig, mit Liedern oder Fotos", "Short and regular, with songs or photos"),
    ("langs", 18, 36, "Wörter in beiden Sprachen spiegeln", "Mirror words in both languages", "Nicht korrigieren, in der eigenen Sprache wiederholen", "Don't correct, repeat in your own language"),
    ("langs", 24, 48, "Portugiesischsprachige Spielgruppe suchen", "Find a Portuguese-speaking playgroup", "Andere Kinder machen die Sprache „cool“", "Other kids make the language “cool”"),
    ("langs", 24, 60, "Sprachen mischen gelassen nehmen", "Take language mixing calmly", "Mischen ist normal und kein Rückschritt", "Mixing is normal and not a setback"),
    ("langs", 30, 60, "Englische Bücher und Lieder", "English books and songs", "Dritte Sprache spielerisch, ohne Pflicht", "The third language playfully, no pressure"),
    ("langs", 36, 60, "Hörspiele oder Filme auf Portugiesisch", "Audio stories or films in Portuguese", "Begrenzt, aber gemeinsam schauen", "Limited, but watch together"),
    ("langs", 36, 72, "Ferien bei der Familie", "Holidays with family", "Eintauchen wirkt Wunder für die Sprache", "Immersion works wonders for the language"),
    ("langs", 42, 72, "„Wie heißt das auf …?“-Spiel", "“What's that in …?” game", "Drei Sprachen als Rätselspiel", "Three languages as a guessing game"),
    ("langs", 48, 72, "Portugiesische Buchstaben entdecken", "Discover Portuguese letters", "ç, ã, õ – Lesen in zwei Schriftbildern vorbereiten", "ç, ã, õ – prepare reading in two spelling systems"),
    ("langs", 54, 72, "„Ich sehe was“ auf Englisch", "“I spy” in English", "Farben und Dinge auf Englisch raten", "Guess colours and things in English"),
    ("langs", 60, 72, "Unterricht in der Herkunftssprache suchen", "Look for heritage-language classes", "Portugiesisch-Unterricht für Kinder, oft ab der Schule", "Portuguese classes for kids, often from school age"),
]


def build():
    ideas, seen = [], set()
    for area, a, b, de, en, tde, ten in IDEAS:
        assert area in AREAS and 0 <= a < b <= MAX_MONTH, (area, a, b, de)
        key = (area, de)
        assert key not in seen, f"duplicate: {key}"
        seen.add(key)
        ideas.append({"id": f"{area}-{len(ideas) + 1:03d}", "area": area, "from": a, "to": b,
                      "de": de, "en": en, "tip_de": tde, "tip_en": ten})
    gaps = [(m, area, n) for m in range(MAX_MONTH) for area in AREAS
            if (n := sum(1 for i in ideas if i["area"] == area and i["from"] <= m < i["to"])) < 3]
    if gaps:
        for m, area, n in gaps[:30]:
            print(f"month {m:2d}  {area:9s} only {n} ideas", file=sys.stderr)
        sys.exit(f"{len(gaps)} gaps")
    return {"version": 1, "ages": {"from": 0, "to": MAX_MONTH, "unit": "months"},
            "note": {"de": "Anregungen, keine Normen – jedes Kind entwickelt sich in seinem eigenen Tempo.",
                     "en": "Suggestions, not norms – every child develops at their own pace."},
            "areas": {k: {"de": v[0], "en": v[1]} for k, v in AREAS.items()},
            "ideas": ideas}


if __name__ == "__main__":
    out = pathlib.Path(__file__).resolve().parent.parent / "site" / "catalog" / "ideen-katalog.json"
    out.parent.mkdir(exist_ok=True)
    data = build()
    out.write_text(json.dumps(data, ensure_ascii=False, indent=1))
    counts = {a: sum(1 for i in data["ideas"] if i["area"] == a) for a in AREAS}
    print(f"{len(data['ideas'])} ideas → {out}\n{counts}")
