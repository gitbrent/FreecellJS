
// CONSTS
var CARD_OFFSET = 50;
var CARD_DECK = {
  suits: [
    { name:'club',    logo:'♣' },
    { name:'diamond', logo:'♦' },
    { name:'heart',   logo:'♥' },
    { name:'spade',   logo:'♠' }
  ],
  cards: [
    { name:'ace',   numb:'A',  class:'suit' },
    { name:'two',   numb:'2',  class:'suit' },
    { name:'three', numb:'3',  class:'suit' },
    { name:'four',  numb:'4',  class:'suit' },
    { name:'five',  numb:'5',  class:'suit' },
    { name:'six',   numb:'6',  class:'suit' },
    { name:'seven', numb:'7',  class:'suit' },
    { name:'eight', numb:'8',  class:'suit' },
    { name:'nine',  numb:'9',  class:'suit' },
    { name:'ten',   numb:'10', class:'suit' },
    { name:'jack',  numb:'J',  class:'face' },
    { name:'queen', numb:'Q',  class:'face' },
    { name:'king',  numb:'K',  class:'face' }
  ]
};
var SUIT_DICT = {
  club:    { color:'b', accepts:['diamond', 'heart'] },
  diamond: { color:'r', accepts:['club'   , 'spade'] },
  heart:   { color:'r', accepts:['club'   , 'spade'] },
  spade:   { color:'b', accepts:['diamond', 'heart'] }
};
var NUMB_DICT = {
  A: { cascDrop:''  , founDrop:'2' },
  2: { cascDrop:'A' , founDrop:'3' },
  3: { cascDrop:'2' , founDrop:'4' },
  4: { cascDrop:'3' , founDrop:'5' },
  5: { cascDrop:'4' , founDrop:'6' },
  6: { cascDrop:'5' , founDrop:'7' },
  7: { cascDrop:'6' , founDrop:'8' },
  8: { cascDrop:'7' , founDrop:'9' },
  9: { cascDrop:'8' , founDrop:'10'},
  10:{ cascDrop:'9' , founDrop:'J' },
  J: { cascDrop:'10', founDrop:'Q' },
  Q: { cascDrop:'J' , founDrop:'K' },
  K: { cascDrop:'Q' , founDrop:''  }
};
// VARIABLES
var gAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
var gTimer;

// GAME SETUP
{
  // SETUP: Table backgrounds
  var gGameTableBkgds = {};
  gGameTableBkgds.pattern = { url:'img/table_pattern.jpg' };
  gGameTableBkgds.circles = { url:'img/table_circles.jpg' };
  gGameTableBkgds.felt    = { url:'img/table_felt.jpg'    };
  gGameTableBkgds.plain   = { url:'img/table_plain.png'   };

  // SETUP: Game Options / Defaults
  var gGameOpts = {};
  gGameOpts.allowFounReuse = false;
  gGameOpts.cheatUnlimOpen = false;
  gGameOpts.debugOneLeft   = false;
  gGameOpts.showTips       = true;
  gGameOpts.sound          = true;
  gGameOpts.tableBkgdUrl   = gGameTableBkgds.pattern.url;

  // SETUP: Define / Start async load of sounds files
  // NOTE: iOS (as of iOS9) is unable to play ogg files, so we are using MP3 for everything
  var gGameSounds = {};
  gGameSounds.cardFlip    = { buffer:null, url:'sounds/cardFlip.mp3',    src:'freesound.org/people/f4ngy/sounds/240776/'    };
  gGameSounds.cardShuffle = { buffer:null, url:'sounds/cardShuffle.mp3', src:'freesound.org/people/deathpie/sounds/19245/'  };
  gGameSounds.crowdCheer  = { buffer:null, url:'sounds/crowdCheer.mp3',  src:'soundbible.com/1700-5-Sec-Crowd-Cheer.html'   };
  gGameSounds.sadTrombone = { buffer:null, url:'sounds/sadTrombone.mp3', src:'freesound.org/people/Benboncan/sounds/73581/' };
}

// ==============================================================================================

function handleFounDrop(event, ui, drop) {
  // DOCS: "$(this) [drop] represents the droppable the draggable is dropped on. ui.draggable represents the draggable"
  // NOTE: jQuery UI draggables will revert no matter what (even if we func accept:ARG and return true/fasle), so revert:false is reqd!

  // RULE 1: Was only a single card provided?
  if ( ui.helper.children().length != 1 ) {
    if ( gGameOpts.showTips ) null; // TODO
    return false;
  }

  // RULE 2: Is card valid?
  if ( drop.children('.card').length == 0 ) {
    if ( ui.draggable.data('numb') != 'A' ) {
      if ( gGameOpts.showTips ) null; // TODO
      return false;
    }
  }
  else {
    var card = $(ui.draggable);
    var topCard = $(drop.children('.card').last());

    // Is card next in sequence?
    if ( topCard.data('suit') != card.data('suit') || NUMB_DICT[topCard.data('numb')].founDrop != card.data('numb') ) {
      if ( gGameOpts.showTips ) null; // TODO
      return false;
    }
  }

  // ------------------------------------------------------------------------

  // STEP 1: VFX/SFX update
  if (gGameOpts.sound) playSound(gGameSounds.cardFlip);

  // STEP 2: "Grab" card and place it into this foundation
  {
    // A: Remove revert or the card flyback animation will run (yes, even with code below that deatches it!)
    ui.draggable.draggable('option', 'revert', false);
    // B: "Grab"/Deatch/Append CARD
    ui.draggable.detach().appendTo( $(drop) ).removeAttr('style'); // NOTE: Remove style is a small fix for jquery-ui oddness
    // C: Unhide the card that we hid when we built draggable container
    ui.draggable.find('span').css('visibility','visible'); // IMPORTANT: the cool cards we use have spans that must be set on their own
    // D: Reset z-index to mid-level
    ui.draggable.css('z-index', $(drop).find('.card').length);
    // E: "Stack" all cards by using position (0,0)
    ui.draggable.css({ position:'absolute', top:'0px', left:'0px' });
  }

  // STEP 3: Apply options
  if ( !gGameOpts.allowFounReuse ) {
    ui.draggable.draggable('disable');
    ui.draggable.css('cursor','default');
  }

  // STEP 4: CHECK: End of game?
  if ( $('#cardFoun .card').length == 52 ) doGameWon();
}

function handleOpenDrop(event, ui, drop) {
  // -------------------------------------------

  // RULE 1: Was only a single card provided?
  if ( ui.helper.children().length != 1 ) {
    if ( gGameOpts.showTips ) null; // TODO
    return false;
  }

  // -------------------------------------------

  // STEP 1: VFX/SFX update
  if (gGameOpts.sound) playSound(gGameSounds.cardFlip);

  // STEP 2: "Grab" card and place it into this slow
  // A: Remove revert or the card flyback animation will run (yes, even with code below that deatches it!)
  ui.draggable.draggable('option', 'revert', false);
  // B: "Grab"/Detach/Append CARD
  ui.draggable.detach().appendTo(drop).removeAttr('style'); // NOTE: Remove style is a small fix for jquery-ui oddness
  // C: Unhide the card that we hid when we built draggable container
  ui.draggable.find('span').css('visibility','visible'); // IMPORTANT: the cool cards we use have spans that must be set on their own
  // D: Fix positioning CSS
  ui.draggable.css('top', '0px');
  ui.draggable.css('left', '0px');
  // E: Reset z-index to mid-level (use 99 so we're above any 500 but always under card which drags at 100)
  ui.draggable.css('z-index',99);

  // STEP 3: Turn off this slot until it frees up again
  if ( !gGameOpts.cheatUnlimOpen ) drop.droppable('disable');
  else $.each(drop.children('.card'), function(i,card){ $(card).css('position','relative').css('top',i*-1*($(card).height()-20)+'px').css('left','0px');});

  // STEP 4: Reset draggable params (esp. helper as prev one from cascades does things we no longer want to do)
  var strNeeded = $(drop).attr('id');
  ui.draggable.draggable({
    helper: 'original',
    start: function(event, ui){
      $(this).css('z-index', 100);
      $(this).draggable('option', 'revert', true);
      $('#'+strNeeded).droppable('enable');
    },
  });
}

function handleCascDrop(event, ui, drop) {
  // DESIGN: We check for valid sets upon dragStart, so assume set sequence is valid upon drop
  var cardTopCasc = $(drop).children().last();
  var card = ( ui.helper.prop('id') == 'draggingContainer' ) ? ui.helper.children()[0] : ui.draggable;
  var cards = ( ui.helper.prop('id') == 'draggingContainer' ) ? ui.helper.children() : [ui.draggable];

  // RULE 1: Is the single-card/container-top-card in run order?
  if ( $(drop).children().length > 0
    && ( $.inArray($(cardTopCasc).data('suit'), SUIT_DICT[$(card).data('suit')].accepts) == -1
      || NUMB_DICT[$(cardTopCasc).data('numb')].cascDrop != $(card).data('numb') )
  ) {
    if ( gGameOpts.showTips ) null; // TODO
    return false;
  }

  // STEP 1: VFX/SFX update
  if (gGameOpts.sound) playSound(gGameSounds.cardFlip);

  // STEP 2: "Grab" card(s) and place them into this cascade
  $.each(cards, function(i,obj){
    // NOTE: ui.helper.children()[0] != ui.draggable (!!!) - you can call .draggable() on the ui ene but not on the array element!!
    // ....: Correct way is to call object directly using its id - reference does not work
    var card = $('#'+$(obj).prop('id'));

    // A: Remove revert or the card flyback animation will run (yes, even with code below that deatches it!)
    card.draggable('option', 'revert', false);
    // B: "Grab"/Detach/Append CARD
    var intTop = ( $(drop).children().length > 0 )
      ? Number($(drop).children().last().css('top').replace('px','')) - ($('.card:first-child').height() - CARD_OFFSET) : 0;
    //ui.draggable.hide().detach().appendTo(drop).show('fast').removeAttr('style'); // NOTE: Remove style is a small fix for jquery-ui oddness
    card.detach().appendTo(drop).removeAttr('style'); // NOTE: Remove style is a small fix for jquery-ui oddness
    // C: Unhide the card that we hid when we built draggable container
    card.find('span').css('visibility','visible'); // IMPORTANT: the cool cards we use have spans that must be set on their own
    // D: Fix positioning CSS
    card.css({ 'position':'relative', 'left':'0px', 'top':intTop+'px', 'z-index':'' });
    // E: Reset draggable params (REQD here as we need to turn revert back on)
    card.draggable({
      helper: cascHelper,
      start : function(event, ui){ $(this).draggable('option', 'revert', true); }
    });
  });

  // STEP 3: Shorten fanning padding if card stack grows too large
  // TODO: measure #playArea and length of children
}

function handleCardDblClick(card) {
  // RULE 1: Only topmost card can be double-clicked
  if ( $($(card).parent().find('.card:last-child')[0]).prop('id') != $(card).prop('id') ) return;

  // STEP 1: Where are we?
  switch ( $(card).parent().parent().prop('id') ) {
    case 'cardCasc':
      // CHECK 1: Can card go to foundation?
      // TODO:

      // CHECK 2: Do we have an open slot to send this card to?
      var event = {};
      var ui = { draggable:$(card), helper:{ children:function(){ return [$(card)]; } } };
      var drop = null;
      if      ( $('#cardOpen1').children().length == 0 ) drop = $('#cardOpen1');
      else if ( $('#cardOpen2').children().length == 0 ) drop = $('#cardOpen2');
      else if ( $('#cardOpen3').children().length == 0 ) drop = $('#cardOpen3');
      else if ( $('#cardOpen4').children().length == 0 ) drop = $('#cardOpen4');
      else return false;
      handleOpenDrop(event, ui, drop);
      break;
    default:
      break;
  }

  // TODO: more!!!

}

/**
 * jquery-ui handler
 * Validate selection - only begin drag if selection meets rules
 */
function handleDragStart(event, ui){
  var prevCard;

  // RULE 1: If a group is being dragged, then vallidate the sequence, otherwise, dont allow drag to even start
  if ( ui.helper.prop('id') == 'draggingContainer' && ui.helper.children().length > 1 ) {
    for (var idx=0; idx<ui.helper.children().length; idx++) {
      var card = ui.helper.children()[idx];
      // Just capture first card, then start checking seq
      if ( idx > 0 ) {
        if ( $.inArray($(card).data('suit'), SUIT_DICT[$(prevCard).data('suit')].accepts) == -1
          || NUMB_DICT[$(prevCard).data('numb')].cascDrop != $(card).data('numb')
        ) {
          // Disallow drag start
          handleDragStop(event, ui);
          return false;
        }
      }
      prevCard = card;
    }
  }

  // RULE 2: Ensure enough free slots existing to ahndle number of cards being dragged
  if ( ui.helper.prop('id') == 'draggingContainer' && ui.helper.children().length > 1 ) {
    if ( (ui.helper.children().length - 1) > (4 - $('#cardOpen .card').length) ) {
      if ( gGameOpts.showTips ) null; // TODO
      // Disallow drag start
      handleDragStop(event, ui);
      return false;
    }
  }
}

function handleDragStop(event, ui){
  // STEP 1: Re-display hidden/cloned cards on revert (or orig one being dragged shows)
  $('#cardCasc div, #cardCasc span').show().css('visibility', 'visible');
}

// ==============================================================================================

function handleStartBtn() {
  // STEP 1:
  $('#dialogStart').dialog('close');

  // STEP 2: iOS requires a touch event before any type of audio can be played, then everything will work as normal
  // SOLN: A: play a dummy sound (https://paulbakaus.com/tutorials/html5/web-audio-on-ios/)
  // ....: B: play a real startup sound when applicable (this is our case)
  if (gGameOpts.sound) playSound(gGameSounds.cardShuffle);

  // STEP 3: Fill board
  doRespConfig();
  doFillBoard();
}

function handleMenuBtn() {
  $('#dialogMenu').dialog('open');
  $('#dialogMenu button').blur();
}

function handleOptionsNewGame() {
  // STEP 1: UX/UI Update
  if (gGameOpts.sound) playSound(gGameSounds.sadTrombone);

  // STEP 2: Close dialog
  $('#dialogMenu').dialog('close');

  // STEP 3: Clear/Fill board
  doFillBoard();
}

function handleOptionsOpen() {
  // STEP 1: Update UI options
  $('#chkOptSound').prop('checked', gGameOpts.sound);

  // LAST: Open dialog
  $('#dialogOptions').dialog('open');
}

function handleOptionsClose() {
  // STEP 1: Update game options
  gGameOpts.sound = $('#chkOptSound').prop('checked');
  localStorage.sound = (gGameOpts.sound?"true":"false");
  
  // STEP 2: Set background
  var strBkgdUrl = $('input[type="radio"][name="radBkgd"]:checked').data('url');
  if ( strBkgdUrl ) $('body').css('background', 'url("'+ strBkgdUrl +'")');
  localStorage.tableBkgdUrl = strBkgdUrl;

  // LAST: Close dialog
  $('#dialogOptions').dialog('close');
}

function playSound(objSound) {
  // SRC: http://www.html5rocks.com/en/tutorials/webaudio/intro/

  // STEP 1: Reality Check
  if ( !objSound.buffer ) {
    console.warn('WARN: No buffer exists for: '+objSound.url);
    console.log(objSound.buffer);
    return;
  }

  // STEP 2: Create new bufferSource with existing file buffer and play sound
  var source = gAudioCtx.createBufferSource();
  source.buffer = objSound.buffer;
  source.connect(gAudioCtx.destination);
  (source.start) ? source.start(0) : source.noteOn(0);
}

// ==============================================================================================

function cascHelper() {
  // A: Build container and fill with cards selected
  var container = $('<div/>').attr('id', 'draggingContainer').addClass('cardCont');
  container.css( 'position', 'absolute' );
  container.css( 'z-index', '100' );
  container.css( 'top' , $(this).offset().top +'px' );
  container.css( 'left', $(this).offset().left+'px' );
  container.append( $(this).clone() );
  container.append( $(this).nextAll('.card').clone() );

  // B: Hide original cards
  $(this).css('visibility','hidden'); // IMPORTANT: Dont hide() this or container jumps to {0,0} (jQuery must be using .next or whataver)
  $(this).find('span').css('visibility','hidden'); // IMPORTANT: the cool cards we use have spans that must be set on their own
  $(this).nextAll().hide();

  // C: "Cascade" cards in container to match orig style
  // REQD! We have to do this as we use negative margins to stack cards above, else they'll go up in this container and look all doofy
  container.find('div.card').each(function(i,ele){ $(this).css('position', 'absolute').css('top', (i*CARD_OFFSET)+'px'); });

  // LAST:
  return container;
}

function doFillBoard() {
  var arrCards = [];
  var strHtml = '';

  // STEP 1: VFX/SFX
  if (gGameOpts.sound) playSound(gGameSounds.cardShuffle);

  // STEP 2: Build cards
  $('.card').remove();
  $.each(CARD_DECK.suits, function(i,suit){
    $.each(CARD_DECK.cards, function(j,card){
      // A:
      var objNode = $('<div id="card'+ suit.name.substring(0,1) + card.numb +'" class="card" '
        + ' data-suit="'+suit.name+'" data-numb="'+card.numb+'">'
        + '<div class="card-'+card.name+' '+suit.name+'">'
        + '<div class="corner top">'
        + '<span class="number'+ (card.numb == '10' ? ' ten':'') +'">'+card.numb+'</span><span>'+suit.logo+'</span></div>'
        + (card.class == 'suit'
          ? '<span class="suit top_center">'+suit.logo+'</span><span class="suit bottom_center">'+suit.logo+'</span>'
          : '<span class="face middle_center"><img src="img/faces/face-'+card.name+'-'+suit.name+'.png"></span>'
        )
        + '<div class="corner bottom">'
        + '<span class="number'+ (card.numb == '10' ? ' ten':'') +'">'+card.numb+'</span><span>'+suit.logo+'</span></div>'
        + '</div>'
        + '</div>');
      // B:
      arrCards.push( objNode );
    });
  });

  // STEP 3: Shuffle / Deal cards into tableau, fanned style
  var intCol = 1, intTop = 0;
  if ( gGameOpts.debugOneLeft ) {
    $.each(arrCards, function(i,card){
      if      (i < 13) $('#cardFoun1').append( card.css('position','absolute').animate({ left:0, top:0 }, (i*1000/52)) );
      else if (i < 26) $('#cardFoun2').append( card.css('position','absolute').animate({ left:0, top:0 }, (i*1000/52)) );
      else if (i < 39) $('#cardFoun3').append( card.css('position','absolute').animate({ left:0, top:0 }, (i*1000/52)) );
      else if (i < 51) $('#cardFoun4').append( card.css('position','absolute').animate({ left:0, top:0 }, (i*1000/52)) );
      else             $('#cardCasc1').append( card.css('position','absolute').animate({ left:0, top:0 }, (i*1000/52)) );
    });
  }
  else {
    $.each(arrCards.shuffle(), function(i,card){
      // NOTE: Set on the element itself (using a class with these values will not work)
      card.css('position','relative');
      card.css('left', (i%2 == 0 ? '-1000px' : '1000px') );
      card.css('top',  (i%2 == 0 ? '-1000px' : '1000px') );

      // Append CARD using animation
      $('#cardCasc'+intCol).append( card.animate({ left:0, top:-($('#cardCasc'+intCol+' .card').length * ($('.card:first-child').height()-CARD_OFFSET)) + 'px' }, (i*1000/52) ) );

      // Fill cascade cols in round-robin order
      if (intCol>=8) { intCol = 0; intTop = 0; }
      intCol++
    });
  }

  // STEP 4: Draggable setup
  $('.card')
  .draggable({
    helper: cascHelper,
    revert: true,
    start : handleDragStart,
            stop  : handleDragStop
  })
  .dblclick(function(){
    handleCardDblClick($(this));
  });

  // STEP 5: Adjust card fanning offset
  doRespLayout();
}

function doGameWon() {
  // FYI: pulsing CSS text (http://jsfiddle.net/thirtydot/aDZLy/)
  var intDelay = 500;

  // STEP 1: VFX/SFX update
  if (gGameOpts.sound) playSound(gGameSounds.crowdCheer);

  // STEP 2:
  $('#dialogYouWon').dialog('open');
  console.log('boom');

  // STEP 3:
  for (var idx=12; idx>=0; idx--){
    $('.card[data-numb='+CARD_DECK.cards[idx].numb+']').each(function(i,card){
      $(card).animate( {left:( Math.floor(Math.random()*12) * 100 )+'px', top:($(window).innerHeight()*1.1)+'px'}, (intDelay += 100), function(){$(this).remove();} );
    });
  }
}

function loadSounds() {
  // SEE: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/decodeAudioData (most up-to-date source)
  // SEE: http://www.html5rocks.com/en/tutorials/webaudio/intro/

  // STEP 1: Load each sound
  $.each(gGameSounds, function(key,sound){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', sound.url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onload = function(e){
      if (this.status == 0 || this.status == 200)
        gAudioCtx.decodeAudioData(xhr.response, function(buffer){ sound.buffer = buffer; }, onError);
    };
    xhr.send();
  });

  function onError(e){ console.error("Unable to load sound. "+e); }
}

function doRespConfig() {
  // STEP 1: Responsive Setup
  if      ( $(window).innerWidth() < 800 ) CARD_OFFSET = 30;
  else if ( $(window).innerWidth() < 900 ) CARD_OFFSET = 40;
  else CARD_OFFSET = 50;
}

function doRespLayout() {
  // STEP 1: Responsive Setup
  doRespConfig();

  // STEP 2: Re-fan cards to handle varying offsets as resizes occur
  $('#cardCasc > div').each(function(i,col){
    $(col).find('.card').each(function(idx,card){ $(card).css('top','-'+(idx*($('.card:first-child').height()-CARD_OFFSET))+'px'); });
  });
}

function appStart() {
  // STEP 1: Start async load of sound files
  loadSounds();

  // STEP 2: Setup 3 core droppable areas
  $('#cardFoun .slot').droppable({
    accept:     '.card',
    hoverClass: 'hvr-pulse-grow-hover',
    tolerance:  'pointer',
    drop:       function(event,ui){handleFounDrop(event,ui,$(this));}
  });
  $('#cardOpen .slot').droppable({
    accept:     '.card',
    hoverClass: 'hvr-pulse-grow-hover',
    tolerance:  'pointer',
    drop:       function(event,ui){ handleOpenDrop(event, ui, $(this)); }
  });
  $('#cardCasc > div').droppable({
    accept:     '.card',
    hoverClass: 'cascHover',
    tolerance:  'pointer',
    drop:       function(event,ui){ handleCascDrop(event, ui, $(this)); }
  });

  // STEP 3: jQuery Dialog setup
  $('#dialogStart').dialog({
    modal: true,
    autoOpen: true,
      draggable: false,
      resizable: false,
    dialogClass: 'dialogCool',
    closeOnEscape: false,
    height: ( $(window).innerWidth() < 1080 ? 300 : 330 ),
    width:  ( $(window).innerWidth() * ( $(window).innerWidth() < 1080 ? 0.9 : 0.8 ) )
  });
  $('#dialogYouWon').dialog({
    modal: true,
    autoOpen: false,
      draggable: false,
      resizable: false,
    dialogClass: 'dialogCool',
    closeOnEscape: false,
    width: ($(window).innerWidth() * 0.6),
    height: ($(window).innerHeight() * 0.5)
  });
  $('#dialogMenu').dialog({
    modal: true,
    autoOpen: false,
      draggable: false,
      resizable: false,
    dialogClass: 'dialogCool',
    closeOnEscape: true,
    width: ( $(window).innerWidth() * ( $(window).innerWidth() < 1080 ? 0.5 : 0.4 ) )
  });
  $('#dialogOptions').dialog({
    modal: true,
    autoOpen: false,
      draggable: false,
      resizable: false,
    dialogClass: 'dialogCool',
    closeOnEscape: true,
    width: ( $(window).innerWidth() * ( $(window).innerWidth() < 1080 ? 0.5 : 0.3 ) )
  });

  // STEP 4: Add handler for window resize (use a slight delay for PERF)
  window.onresize = function(){ clearTimeout(gTimer); gTimer = setTimeout(doRespLayout, 100); };

  // STEP 5: Web-Audio for iOS
  $(document).on('touchstart', '#btnStart', function(){
    // A: Create and play a dummy sound to init sound in iOS
    // NOTE: iOS (iOS8+) mutes all sounds until a touch is detected (good on you Apple!), so we have to do this little thing here
    var buffer = gAudioCtx.createBuffer(1, 1, 22050); // create empty buffer
    var source = gAudioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(gAudioCtx.destination); // connect to output (your speakers)
    (source.start) ? source.start(0) : source.noteOn(0);

    // B: Start game
    handleStartBtn();
  });

  // STEP 6: OPTIONS: Show available backgrounds
  if(localStorage.tableBkgdUrl)
    gGameOpts.tableBkgdUrl = localStorage.tableBkgdUrl;
  $('body').css('background', 'url("'+ gGameOpts.tableBkgdUrl +'")');
  if(localStorage.sound)
    gGameOpts.sound = (localStorage.sound == "true");
  $('#chkOptSound').prop('checked', gGameOpts.sound);
  $.each(gGameTableBkgds, function(i,obj){
    var strHtml = '<div>'
          + '  <div><input id="radBkgd'+i+'" name="radBkgd" type="radio" data-url="'+ obj.url +'" '
          + (gGameOpts.tableBkgdUrl == obj.url ? ' checked="checked"' : '') + '></div>'
          + '  <div><label for="radBkgd'+i+'"><div style="background:url(\''+ obj.url +'\'); width:100%; height:60px;"></div></div>'
          + '</div>';

    $('#optBkgds').append( strHtml );
  });
}

// ==============================================================================================
$(document).ready(function(){ appStart(); })