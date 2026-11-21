// Authored dialogue and encounter layouts. Story state lives in story.mjs.
// voice: the syllable sample (sfx.mjs) and playback rate the character mumbles with.
export const CAST={
 red:{name:'Red',role:'A basket, a blade, a borrowed deck',color:'#df7773',voice:['voice_soft',1.26]},
 mother:{name:'Mother',role:'At the village gate',color:'#e6c591',voice:['voice_soft',1]},
 grandma:{name:'Grandmother',role:'Keeper of the forest roads',color:'#e6c591',voice:['voice_soft',0.8]},
 stranger:{name:'The stranger',role:'A familiar voice in the trees',color:'#aab6c7',voice:['voice_reed',0.9]},
 pip:{name:'Pip',role:'Ferryman. Very reasonable rates.',color:'#b8cb84',voice:['voice_reed',1.4]},
 rowan:{name:'Rowan',role:'The Huntsman',color:'#b9c9c5',voice:['voice_reed',0.7]},
 wren:{name:'Sister Wren',role:'Keeper of the chapel bell',color:'#b7b4e3',voice:['voice_soft',1.12]},
 wolf:{name:'The Wolf',role:'Keeper of stolen voices',color:'#d99494',voice:['voice_gruff',0.8]},
 hart:{name:'The Briar Hart',role:'A wounded guardian',color:'#c6bc89',voice:['voice_gruff',1.05]},
 tollkeeper:{name:'The Tollkeeper',role:'Bound to the mill',color:'#d0ae7e',voice:['voice_gruff',0.66]},
 widow:{name:'The Bell Widow',role:'Silence in the belfry',color:'#b9add3',voice:['voice_bell',1]}
};
function scene(title, caption, cast, script) {
 let currentCaption = caption;
 const lines = script.map(([speaker, text, beat]) => {
  if (beat) currentCaption = beat;
  return {speaker, text, caption: currentCaption};
 });
 return {title, caption, cast, lines};
}

export const SCENES={
 prologue:scene('The empty letter','The envelope smells of lamp oil. Inside, the paper is blank.',['mother','red'],[
  ['red','She pressed so hard the pen went through. Here. Feel it.'],
  ['mother','That woman writes both sides of a shopping list. Something’s happened.'],
  ['red','I’ll take her medicine. And her cards. She still owes me a game.'],
  ['mother','Take the loaf. She’ll say she’s eaten. Put a slice in her hand anyway.'],
  ['red','You wrapped the letter around the deck?'],
  ['mother','Keeps it flat. Show it to her when you get there.'],
  ['red','I will. Leave the kettle out. I might bring her back with me.']]),
 stranger:scene('A supper invitation','A man in dry boots stands among the white flowers by the ford.',['stranger','red'],[
  ['stranger','That bread smells good. May I have the heel?'],
  ['red','That bit’s spoken for. Gran says, “A loaf without a heel is a slipper.”'],
  ['red','Here. You can have the middle.'],
  ['stranger','Would she set a place for me, do you think?','Red folds the slice in half. He slips it up his sleeve.'],
  ['red','You’d have to ask her. Excuse me. There’s an animal caught in something.'],
  ['stranger','Take your time. Poor thing.','He waits until Red kneels by the snare before taking the cottage path.']]),
 hartIntro:scene('A wounded guardian','An iron trap hangs from one antler. The Hart jerks and the wire cuts deeper.',['red','hart'],[
  ['red','That’s a length of bell wire. What’s it doing out here?'],
  ['red','All right, big lad. Come past me once more. I can get at the iron from this side.']]),
 hartOutro:scene('Downstream','The iron jaw drops. The Hart stands still enough for Red to unwind the wire.',['red','hart'],[
  ['red','There. That ear will have a notch in it. Gives you distinction.'],
  ['red','You smell my bread, don’t you?','The Hart noses her sleeve, then startles at a voice from the mill.'],
  ['red','I heard it too. Go on. I’ll look.']]),
 pip:scene('A very reasonable toll','Pip has one oar in the water. The other seat is empty.',['pip','red'],[
  ['pip','Passage costs a loaf. Half if you row.'],
  ['red','How much if I help you find the other oarsman?'],
  ['pip','My brother. Went up to oil the wheel. Listen.'],
  ['tollkeeper','Pip! Bring the boat round!','The shout comes from the mill. A moment later it comes from the reeds.'],
  ['pip','First time I heard it, I rowed straight into a tree.'],
  ['red','Tie up here, then. Show me where you last saw him.']]),
 tollIntro:scene('A boot full of tar','The mill guard raises his hook. One boot has a shiny black patch.',['pip','red','tollkeeper'],[
  ['pip','That’s my patch. Tar and half a floor mat. He’s in there.'],
  ['red','The chain goes through his coat. Can you hold the wheel?'],
  ['pip','For a bit. Please be quick. That’s my good oar.']]),
 tollOutro:scene('The second oar','The broken chain slips through the spokes. Pip catches a tar-black boot.',['pip','red'],[
  ['tollkeeper','You charged her a whole loaf? For that boat?'],
  ['pip','He’s all right. Give him a hand up.'],
  ['red','There was a light in Gran’s window a moment ago.'],
  ['tollkeeper','Quarry tunnel. Comes out under the chapel. Rowan’s still down there.'],
  ['red','The two of you split this. For the crossing.','Red leaves two slices on the empty seat.']]),
 cavern:scene('Do not answer','Someone has scratched DO NOT ANSWER into the rock at mouth height.',['red'],[
  ['rowan','Go home, Red.'],
  ['red','Rowan?'],
  ['rowan','Don’t talk to that end of the tunnel. I’m over here.']]),
 rowanIntro:scene('The wrong shadow','Rowan plants his axe across the path. A second shadow stretches out from Red’s boots.',['rowan','red'],[
  ['rowan','Yesterday I heard your gran say my name. I lifted the cottage latch for her.'],
  ['red','What came in?'],
  ['rowan','I heard her again. In the kitchen, behind me. By then he was through. Put the basket down.'],
  ['wolf','Rowan. Lift the latch.','The voice at Red’s feet is pitch-perfect. Her mouth is shut.'],
  ['red','Look at my mouth, Rowan. Just once, look up.']]),
 rowanOutro:scene('What the pen left behind','The axe sticks in a root. Red cuts through the shadow at Rowan’s back.',['rowan','red'],[
  ['rowan','You’ve cut my good brace clean through.'],
  ['red','Sit down before your trousers follow it. Have you got any charcoal?'],
  ['rowan','For marking the tunnel. Why?'],
  ['red','The light catches the dents. Hold my cards flat under the paper.'],
  ['rowan','“Ring the bell. Keep ringing.” That’s her G. Looks like a little boot.','Red rubs the charcoal sideways. White letters rise out of the soot.'],
  ['red','There’s a third line. “I can hear it in here.”'],
  ['rowan','Give me your basket till you’re up the stair. Then I’ll get the others through.']]),
 chapel:scene('Three knocks','From high in the belfry come three knocks. Then a long wait.',['wren','red'],[
  ['red','Three. Hang on. I’ve got a sword hilt.'],
  ['wren','Oh, thank goodness. Someone down there can count.','Red knocks three times on the rail. This time someone laughs.'],
  ['wren','Wren. Bell keeper. I have one elbow free and that’s about the extent of it.']]),
 widowIntro:scene('The bell keeper','Silk runs from Wren’s sleeve to the bell. The wooden frame unfolds a knee.',['wren','red','widow'],[
  ['wren','See where I’ve worn a hole with my elbow? That’s the rope underneath.'],
  ['red','Can you reach it if I get those legs off the beam?'],
  ['wren','Child, I rang six weddings with a broken wrist. Get me that rope.']]),
 widowOutro:scene('A voice from the house','Wren takes one turn of rope around her wrist and leans back.',['wren','red'],[
  ['grandma','That you, Wren? Again, please. It’s terribly dark between strokes.'],
  ['wren','Agnes! Where are you?'],
  ['grandma','I can feel his ribs go up and down. Red, are you there?'],
  ['red','I’ve got your letter, Gran. Wren, keep answering her till I get there.'],
  ['wren','I can do that.','Another stroke. This time the answering knock comes from the cottage.']]),
 house:scene('The rotten step','White flowers like the ones at the ford grow right up to the door.',['rowan','red'],[
  ['rowan','Mind the back step. I’ve been promising to mend it since spring.'],
  ['red','Pull it up. Use the board to wedge this gate open.'],
  ['rowan','Your gran’s going to want that board back.'],
  ['red','You can tell her what happened to it yourself.']]),
 wolfIntro:scene('Grandmother in bed','Her spectacles are on the correct hook. Her slippers are on the wrong feet.',['grandma','red'],[
  ['grandma','Come closer, love. Is that my bread?'],
  ['red','What big ears you have. Can you hear the chapel bell from here?'],
  ['grandma','All the better to hear your feet on the stair.'],
  ['red','Shall I cut off the heel for you?'],
  ['grandma','A loaf without a heel is a slipper.'],
  ['red','Funny. I told a man that this morning. I gave him the middle.'],
  ['red','Gran would have eaten it by now.','The slice she gave the stranger slips out of the nightdress cuff, still folded in half.'],
  ['red','Wren, pull!','The bell sounds. There is one sharp knock from inside the quilt.'],
  ['wolf','Every time I knock, she asks who’s there. When I used her voice, he let me in.']]),
 swallowed:scene('Swallowed','As the quilt falls, a hand pushes Red away from the dark.',['wolf','red'],[
  ['wolf','She’s trying to send you home. She’s been doing that all day.'],
  ['red','That’s her hand. I’d know that burn anywhere. Hold on, Gran.']]),
 inside:scene('The room that breathes','The walls rise and fall. Grandmother is tied to a chair in what used to be her kitchen.',['grandma','red'],[
  ['grandma','Mind my feet. I’m rather attached to them.'],
  ['red','Did he lick the ink off your letter?'],
  ['grandma','Faster than I could write. Nearly broke the nib making sure you could still read it.'],
  ['grandma','Dropped it between his teeth when he sniffed your letterbox. Nearly lost a finger.'],
  ['red','It took Rowan’s charcoal to read it. Even Pip helped, once we agreed on a price.'],
  ['grandma','Good. Now cut these three knots. When the bell sounds, mind where the shadow falls.']]),
 garden:scene('A seam of daylight','Grandmother catches a stitch of her apron on a splinter of daylight.',['grandma','red','rowan'],[
  ['grandma','I used to unpick your hems like this when you grew. Knife here.'],
  ['rowan','This way! I’ve still got the gate!'],
  ['red','Take her hand, Rowan. I’ve got one more thing to do.'],
  ['grandma','I’ll hold the board. You’ll want both hands for the cards.']]),
 breakfast:scene('Breakfast','There is ash on the path. Grandmother sits down where the back step used to be.',['grandma','red','rowan'],[
  ['grandma','Which of you owes me a step?'],
  ['rowan','I’ll come Monday. Proper nails this time.'],
  ['red','Here’s your medicine. I’m afraid all I’ve got left to eat is the heel.'],
  ['grandma','My favourite bit. You remembered.'],
  ['red','I gave the rest away. Even fed the wolf. I keep thinking about that.'],
  ['grandma','I’d have given him a slice too. Pass the bottle.']]),
 epilogue:scene('Room for one more','Dawn. Two oars rise together. A ferry crosses without a sound.',['mother','red','grandma','pip'],[
  ['pip','Return fare’s paid. My brother says I owe you change.'],
  ['mother','There you are. I’ve kept the kettle on so long there’s hardly any water left.'],
  ['grandma','Little game while it boils again? Your deal.'],
  ['red','Shift your chair up, Mum. Pip, do you know how to play?'],
  ['pip','Certainly. Which of these is worth a loaf?']])
};
export const STAGES=[
 {encounter:'stranger',intro:'hartIntro',outro:'hartOutro',boss:'hart',title:'The Briar Hart',objective:'Bring the basket to Grandmother',hint:'Bait the charge. Strike while the Hart catches its breath.'},
 {encounter:'pip',intro:'tollIntro',outro:'tollOutro',boss:'tollkeeper',title:'The Tollkeeper',objective:'Find Pip’s brother at the mill',hint:'Jump the chain sweep. Move away from the raised hook.'},
 {encounter:'cavern',intro:'rowanIntro',outro:'rowanOutro',boss:'rowan',title:'Rowan the Huntsman',objective:'Find the Huntsman beneath the roots',hint:'Bait his axe. Strike during recovery, while his guard is down.'},
 {encounter:'chapel',intro:'widowIntro',outro:'widowOutro',boss:'widow',title:'The Bell Widow',objective:'Help Wren ring the bell',hint:'Watch the falling silk. Jump the low rings of sound.'},
 {encounter:'house',intro:'wolfIntro',outro:'breakfast',boss:'wolf',title:'The Wolf',objective:"Reach Grandmother's bedroom",hint:'Dodge the bite. Strike after his leap lands.'}
];
const platform=(id,x,y,w,ground=false)=>({id,x,y,w,ground});
export function arenaPlatforms(stage,location='arena'){
 if(location==='inside')return [platform(0,0,420,960,true),platform(1,150,360,180),platform(2,340,300,180),platform(3,530,240,180),platform(4,730,300,180)];
 const ledges=[[[140,360,160],[650,360,170]],[[100,360,170],[680,360,170]],[[180,360,150],[620,360,150]],[[120,360,180],[660,360,180]],[[100,360,180],[680,360,180]]][stage];
 return [platform(0,0,420,960,true),...ledges.map(([x,y,w],i)=>{
  const p=platform(i+1,x,y,w);
  if(location==='arena'&&stage===4)p.kind=i===0?'mantel':'bed';
  return p;
 })];
}
