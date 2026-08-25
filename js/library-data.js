// ═══════════════════════════════════════════════════════════════
// The Library — curated examples by family, each doable with no
// money, no authority, and no audience. Exposure 1–5 marks the
// self-assessed size of the stake, not the size of the deed.
// Checked by tools/lint-strings.js against the banned vocabulary.
// ═══════════════════════════════════════════════════════════════

export const FAMILIES = [
  { id: 'care', name: 'Care', note: 'The acts most lives are actually made of.' },
  { id: 'repair', name: 'Repair', note: 'Going back to what broke, on purpose.' },
  { id: 'speech', name: 'Speech', note: 'Saying the thing, signed, to the face it concerns.' },
  { id: 'promise', name: 'Promise', note: 'Binding your future self in front of another.' },
  { id: 'convening', name: 'Convening', note: 'Making a table exist where there was none.' },
  { id: 'asking', name: 'Asking', note: 'Requests that expose the asker.' },
  { id: 'refusal', name: 'Refusal', note: 'The no that costs something.' },
];

export const EXAMPLES = [
  // ── Care — prominent, not an appendix ──
  { family: 'care', exposure: 3, title: 'Draw the boundary with a parent', text: 'Tell a parent, plainly and without cruelty, what will no longer happen — and hold it the first time it is tested.' },
  { family: 'care', exposure: 4, title: 'Confront a sibling about a parent’s care', text: 'Name the imbalance out loud to the sibling who has left an ailing parent’s care to you, and ask for a specific share of it.' },
  { family: 'care', exposure: 2, title: 'The bedside promise', text: 'Promise something specific to someone who is ill — a visit every week, a letter every month — and let them hold you to it.' },
  { family: 'care', exposure: 5, title: 'Begin the leaving', text: 'Take the first concrete step out of a situation that harms you — the call, the bag, the told friend. The first step is the act; everything after is its unfolding.' },
  { family: 'care', exposure: 2, title: 'Tell the family the diagnosis', text: 'Stop managing everyone’s feelings and say the true thing about your health, or theirs, to the people it concerns.' },
  { family: 'care', exposure: 1, title: 'Ask the quiet one', text: 'Ask the withdrawn person in your family one real question, alone, and stay for the whole answer.' },

  // ── Repair ──
  { family: 'repair', exposure: 2, title: 'The apology without an excuse', text: 'Go back to someone you wronged and apologise for the specific thing, with no “but”, accepting whatever they do with it.' },
  { family: 'repair', exposure: 3, title: 'Reopen the closed door', text: 'Write to the estranged friend or relative first, knowing they may not answer, saying what you want to exist between you.' },
  { family: 'repair', exposure: 2, title: 'Correct the record', text: 'Tell the person who was blamed in your presence what you know to be true, or tell the one who blamed them.' },
  { family: 'repair', exposure: 1, title: 'Return what was borrowed long ago', text: 'Give back the thing, with the sentence that names how long you kept it.' },

  // ── Speech ──
  { family: 'speech', exposure: 3, title: 'Signed dissent', text: 'Disagree in the meeting, with your name on it, while the decision can still change.' },
  { family: 'speech', exposure: 2, title: 'The sent letter', text: 'Send the letter you have rewritten in your head for years — to the teacher, the ex-friend, the parent. Sending is the act; drafting was rehearsal.' },
  { family: 'speech', exposure: 4, title: 'Tell the truth that ends the pretence', text: 'Say the thing everyone in the room is managing around — the drinking, the debt, the marriage — to the person it belongs to.' },
  { family: 'speech', exposure: 1, title: 'Say it while they can hear it', text: 'Tell someone precisely what they did for you, in enough detail that they know you mean it.' },
  { family: 'speech', exposure: 5, title: 'Blow the whistle', text: 'Report the wrong you have evidence of, through a channel that can act on it. Anonymity does not diminish this: the stake and the reach are real. The arc is where you sign it.' },

  // ── Promise ──
  { family: 'promise', exposure: 2, title: 'The dated promise', text: 'Promise one person one specific thing with a date on it, and put the date in their hands, not just yours.' },
  { family: 'promise', exposure: 3, title: 'Declare the change of course', text: 'Tell the people your decision affects that you are changing direction — the degree, the trade, the city — before it is safe to say.' },
  { family: 'promise', exposure: 1, title: 'Offer the standing hour', text: 'Give someone a fixed hour of your week — the call every Sunday, the walk every Thursday — and name it as theirs.' },

  // ── Convening ──
  { family: 'convening', exposure: 2, title: 'The standing table', text: 'Start the monthly dinner, the reading circle, the walking group — and hold the second one, which is the hard one.' },
  { family: 'convening', exposure: 2, title: 'Introduce the two who should know each other', text: 'Put your credibility between two people and make the introduction you keep meaning to make.' },
  { family: 'convening', exposure: 3, title: 'Call the meeting no one owns', text: 'Gather the neighbours, the parents, the team — about the shared thing everyone mutters about and no one convenes on.' },
  { family: 'convening', exposure: 1, title: 'Host the first one', text: 'Invite people into your actual home, as it is, and let them see how you live.' },

  // ── Asking ──
  { family: 'asking', exposure: 2, title: 'Ask for the real number', text: 'Ask the person who knows — what they earn, what they paid, what it costs — so you can stop deciding in the dark.' },
  { family: 'asking', exposure: 3, title: 'Ask for what you actually need', text: 'Make the specific request you have been hoping someone would guess — of a partner, a boss, a friend.' },
  { family: 'asking', exposure: 2, title: 'Ask to learn at the feet of someone', text: 'Ask a person you admire to teach you, concretely: an hour, a look at your work, an apprenticeship of any size.' },
  { family: 'asking', exposure: 4, title: 'Ask the question that risks the answer', text: 'Ask what the silence has been protecting — “do you want this?”, “was it me?”, “is there someone else?”' },
  { family: 'asking', exposure: 1, title: 'Ask for the unsoftened feedback', text: 'Ask a boss, mentor, or client for the one criticism they have been polite about — and only listen.' },

  // ── First acts across domains — small beginnings, exposure 1 ──
  { family: 'speech', exposure: 1, title: 'Show the unfinished thing', text: 'Send the draft, the demo, the sketch you keep polishing to one person whose opinion matters — as it is today.' },
  { family: 'promise', exposure: 1, title: 'Put a date on the someday idea', text: 'Tell one person about the idea you keep meaning to try — the trip, the course, the odd little project — and give them the date you’ll start.' },

  // ── Refusal ──
  { family: 'refusal', exposure: 3, title: 'Decline the expected role', text: 'Say no to the duty everyone assumed was yours — the hosting, the covering, the fixing — to the person who assumed it.' },
  { family: 'refusal', exposure: 4, title: 'Refuse the instruction', text: 'Decline, with your name attached, to do the thing you believe is wrong — and say why to the person who asked.' },
  { family: 'refusal', exposure: 2, title: 'End the arrangement kindly', text: 'End the recurring thing that no longer serves either of you — the collaboration, the committee seat — to their face, with the reason.' },
  { family: 'refusal', exposure: 1, title: 'Give back the inherited opinion', text: 'Say, to the person you got it from, that you no longer believe the thing your family or circle has always said.' },
];

// ── Contrast pairs: the same territory, a world apart ──
export const CONTRASTS = [
  {
    left: { title: 'Voting', note: 'Anonymous by design, and nothing personal at risk. Fine, necessary — and not an act.' },
    right: { title: 'Canvassing your neighbours', note: 'Your face, your name, your street. Stake and reach in every knocked door.' },
    lesson: 'The difference is skin in the game.',
  },
  {
    left: { title: 'The unsent letter', note: 'Rehearsal. It moves nothing outside your own head.' },
    right: { title: 'The sent one', note: 'The same words, now irreversible and landed in another life.' },
    lesson: 'The difference is reach — and no taking it back.',
  },
  {
    left: { title: 'The 100-day public run, posted daily', note: 'Repetition displayed. Admirable labour — but it is maintenance, performed.' },
    right: { title: 'The standing monthly table', note: 'A convening that exists because you began it, and holds people together without an audience.' },
    lesson: 'The difference is a beginning that lands among others.',
  },
  {
    left: { title: 'Burner-account bravado', note: 'Loud, costless, deniable. No skin in the game.' },
    right: { title: 'Signed dissent', note: 'The same opinion with your name on it, while it can still cost you.' },
    third: { title: 'The anonymous whistleblower', note: 'Concealed authorship — but real stake and real reach. A full act. The arc is the one place it finally gets signed.' },
    lesson: 'Anonymity is not the failing test. Costlessness is.',
  },
];

// ── Counterfeits: close relatives of the act, each failing one test ──
export const COUNTERFEITS = [
  { title: 'The announcement', fails: 'Stake', note: 'Telling people after it was already safe. The original moment — before the outcome was known — was the act.' },
  { title: 'The next step', fails: 'A beginning', note: 'Diligent motion along a line already drawn. It belongs to its chapter, honourably — as work.' },
  { title: 'The grand plan', fails: 'Irreversibility', note: 'Still fully retractable, still private. Declaring it to someone with a date is what commits it to the world.' },
  { title: 'The inner vow', fails: 'Reach', note: 'A true hinge with nothing landed outside you — which makes it a turning, with a crescent’s full dignity, not a failed star.' },
  { title: 'Performed busyness', fails: 'A beginning', note: 'Visible effort that starts nothing. It is maintenance wearing a costume.' },
];
