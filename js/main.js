/*
File: main.js
Author: Aaron Tobias
url: http://www.aarontobias.com
*/

$(document).ready(function() {
	
	/* Primary Variables */
	var socket;
	var psswd;
	var serverMsg = "";
	var yourName = "Aaron";
	var CHUNK_SIZE = 100;
	var CHUNK_MIN_REQ = 1000;
	var clients = [];
    var cColors = new Object();
	var imageList = new Object();
	var loadedPage = this;
	
	/* Dynamic Global */
	var LOGGED_IN = 0;
	var CURRENT_PRIVATE_USER = "";
	var CRON_SCRIPT = "";
	
	/* Cache frequently used DOM lookup */
	var close = $("#close");
	var open = $("#open");
    var panelMsg = $("#panelMsg");
	var slidingPanel = $("div#panel");
	var lockPanel = $(".lock");
	var unlockPanel = $(".ulock");
	var uxWindows = $(".window");
	var graphicBlood = $("#blood");
	var startUpAnimArea = $(".startUp");
	
	/* preload Audio file */
	var bondAudio = loadedPage.createElement("audio");
	bondAudio.src = "audio/TomorrowNeverDies.wav";
	bondAudio.load();
	
	/*DEBUG */
	var DEBUG_MODE = 0;
	var SKIP_BOND_ANIMATION = 0;
	
	/* Test Chunking with Echo Server */
	var ECHO_SERVER_CHUNK_TEST = 0;
	var ECHO_SERVER_START_TEST = 0;
	
	/* Test Inline Images with Echo Server
    (inline images cannot be chunked becuase of substring function) */
	var INLINE_IMAGE_TEST = 0;
	
	/* User options */
	var SERVER_HOST = "ws://karnani.co:8787/chat";
	/* Other option if running: ws://aarontobias.com:8787/chat, ws://karnani.co:8787/chat, ws://tomrozanski.com:8787/chat */
	
	
	/* >> Connect to Server - Start Up >> */

	function init () {
	
	   var host = "";
	   
	   if( INLINE_IMAGE_TEST || ECHO_SERVER_CHUNK_TEST)
		  host = "ws://echo.websocket.org/"; 
	   else if(SERVER_HOST)
		  host = SERVER_HOST;
		
		var sequence = $("#socketStatus .loading");

		try {
			socket = ("MozWebSocket" in window ? new MozWebSocket (host) : new WebSocket(host));

				/* socket.readyState - access web socket state information */
				sequence.eq(0).animate({opacity:'1.0'}, 1000);
			
			socket.onopen = function (msg) {
				sequence.eq(1).animate({opacity:'1.0'}, 1000);
			}
			
			socket.onmessage = function (msg) {

			   if(serverResponse(msg.data) == "OK" || ECHO_SERVER_START_TEST){
				  LOGGED_IN = 1;
				  CURRENT_PRIVATE_USER = yourName;
				  
				  if(!SKIP_BOND_ANIMATION) 
					loginAnimation();
				  else
				   unlock();

				  ECHO_SERVER_START_TEST = 0;
			   };
			}

			socket.onclose = function (msg) {
				log("Disconnected - status " + this.readyState, "Q-Unit"); 
				sequence.eq(1).animate({opacity:'0.2'}, 1000);
				sequence.eq(0).animate({opacity:'0.2'}, 1000);
			}
		}
		catch (ex) {
			log (ex, "Q-Unit");
		}
	}
	
	/* trigger send */
	$("#send").live('click', function(){
	   send();
	   $('textarea').val('');
	});
	
	function send () {
		var txt, msg;
		
		txt = $("#msg");
		msg = txt.val();
		if (!msg) {
			txt.val("Message can not be empty!");
			return;
		}
		
		/* prepare Message */
		msg = msg.replace(/\n/g,"<br/>");
		var newImage = $("#imgclone").clone().removeClass("hidden");
		
		/* test replace in loop for each image! */
		var imgListSize = Object.keys(imageList).length;
		for(i = 1; i <= imgListSize; i++){
			newImage.attr('src', imageList[i]);
			newImage.attr('target', "_blank");
			msg = msg.replace("[img" + i + "]", newImage.prop("outerHTML"));
		}

		var originalMsg = msg;
		var msgLen = msg.length;
		var remSize = msgLen;
		var start = 0;
		var stop = CHUNK_SIZE;
		
		
		if(CURRENT_PRIVATE_USER != yourName){
			msg = "SEND " + CURRENT_PRIVATE_USER + "\n";
			log(originalMsg, CURRENT_PRIVATE_USER, 1);
		}
		else{
			msg = "BROADCAST\n";
		}
		
		/*
		Max Limit
		if(msgLen > 999){ 
			txt.val("Maximum Exceeded!"); 
			return; 
		}
		*/
		
		/* Chunk If Needed */
		if(msgLen > CHUNK_MIN_REQ){
		
		    while(remSize > CHUNK_SIZE){
				msg += "C" + CHUNK_SIZE + "\n" + originalMsg.substring(start, stop) + "\n"; 
				remSize	-= CHUNK_SIZE;
				stop += CHUNK_SIZE;
				start += CHUNK_SIZE;
			}
			/* grab remaining */
            if(remSize > 0){			
				msg = msg + "C" + remSize + "\n" + originalMsg.substring(start) + "\nC0";
			}
			else
			   msg += "C0";
		}
		else{
			msg += msgLen + "\n" + originalMsg;
		}

		try {
		
			if( DEBUG_MODE){
				log("Sent: "+msg, yourName);
			}
			
			socket.send (msg);
		}
		catch (ex) {
			log (ex);
		}
	}
	 
	 function serverResponse(resp){

		var lines = resp.split("\n");
		var users = resp.split(",");

		/* get client listing */
		if(!INLINE_IMAGE_TEST && ((users[0] == yourName && users.length == 1) || users.length > 1)){
			
			clients = users;
			getClientListing();
			return;
		}
		
		if(DEBUG_MODE){
			log("Server: " +resp, yourName);
			if(lines.length > 2)
				log("Lines: " +lines[2], yourName);
		}
		
		var chunkPattern = /C\d+/;
		var imagePattern = /data:image/;
		var numbersOnly = /^[0-9]+/;
        var compiledMsg = "";
		var isPrivate = 0;
		var userID = "";

		/* For General Response */
		if(lines[0] == "OK"){
			return "OK";
		}
		
		if(lines[0] == "ERROR"){
			return "ERROR";
		}
		
		for(i=0; i < lines.length; i++){
		     
		    /* Parse header for recipient */ 
		    if(i == 0){
				var head = lines[i].split(" ");
			   
				if(head[0] == "BROADCAST"){ 
				
				    if(INLINE_IMAGE_TEST || ECHO_SERVER_CHUNK_TEST){
						userID = yourName;
					}	
					else
						userID = head[2];
					
					$("#_"+yourName).parent().css("background-color", "rgb(188, 51, 13)");
					
					setTimeout(function(){
						$("#_"+yourName).parent().css("background-color", "white");
					}, 500);
				}
				if(head[0] == "PRIVATE"){
			        isPrivate = 1;
					userID = head[2];
					
					$("#_"+userID).parent().css("background-color", "rgb(188, 51, 13)");
					
					setTimeout(function(){
						$("#_"+userID).parent().css("background-color", "white");
					}, 500);
				}
			}
			else{

				if(lines[i].match(numbersOnly) == null){
					compiledMsg += lines[i];
				}
				else if(lines[i].match(imagePattern) != null){
					compiledMsg += lines[i];
				}
			}
		}
		log(compiledMsg, userID, isPrivate);
	 }
     
	//create new private client
	$(".client").live("click", function(){
	    
		$(".currentUser").parent().css("border", "2px solid rgb(216, 216, 211)");
		$(".currentUser").siblings().removeClass("privateOn");
	    $(".currentUser").removeClass('currentUser');
		
		var user = $(this).attr('id').substring(1);
        CURRENT_PRIVATE_USER = user;
		
		if( !( $("#"+user).hasClass("currentClient")) )
		{
			$(".currentClient").addClass("hidden").removeClass("currentClient");
			
			// existing user
			if($("#"+user).hasClass("hidden")){
				$("#"+user).addClass("currentClient").removeClass("hidden");
			}
			// create new
			else{
				$("#"+user).addClass("currentClient");
				$(this).parent().addClass("open");
			}
		}
		$(this).addClass('currentUser');
		$(this).parent().css("border", "2px solid rgb(155, 155, 198)");
		$(this).siblings().addClass("privateOn");
	});
	
	// Request clients from Server periodically
	function getClientListing () {
	
		var allUsers = "";
		var thisClient = "";
		$(".client").addClass("check").removeClass("online");
		for(i = 0; i < clients.length; i++){
		     thisClient = clients[i];
			 
			 /* Add only new clients */
		     if($("#_"+thisClient).length == 0){
				link = createPrivateLink(thisClient);
				$("#log").append('<div id="' + thisClient + '"> </div>');
				allUsers += link;
			 }

			$("#_"+thisClient).addClass("online");
		}
		$("#controller p").html('Logged in as "' + yourName + '" (type message and hit ENTER or click SEND)');
		$("#users").append(allUsers);

		if($('.currentUser').attr('id') == undefined){
			$("#_"+yourName).addClass('currentUser');
			$("#_"+yourName).parent().css("border", "2px solid rgb(155, 155, 198)");
		}
		
		/* Remove Disconnected Clients */
		var allLinks = $(".client");
		allLinks.each(function(){
			
			var id = $(this).attr('id');

			if($(this).hasClass("online")){
				/* do nothing */
			}
			else
			if(!$(this).hasClass("online") && $(this).hasClass("check")){
				var id = $(this).attr('id');
				log(id + " is no longer online");
				$(this).parent().remove();
				$(id).remove();
			}
		});
	}
	
	function requestClientList(){
		socket.send("USERS\n");
		
		if(!ECHO_SERVER_CHUNK_TEST){
			CRON_SCRIPT = setTimeout(requestClientList, 10000);
		}
	}
	
	
	function quit () {
		log ("Goodbye!");
		socket.close ();
		clearTimeout(CRON_SCRIPT);
		socket = null;
	}

	$("#imageinsert").click(function(){
	 quit();
	});
	
	/* >> Utilities >> */
	
	/* Output messages to console: private or broadcast */
	function log (msg, targetUser, isPrivate) {

	    if(isPrivate) {				
			$("#"+targetUser).append("<p>" + colorLogUsers(targetUser) + ": " + msg + "<p>");
		}
		else{
			$("#"+yourName).append("<p>" + colorLogUsers(yourName) + ": " + msg + "<p>");
		}
	}
	
	/* Get random color for user links */
	function get_random_color() {
		var letters = 'A709C2'.split('');
		var color = '#';
		for (var i=0; i<3; i++ ) {
			color += letters[Math.floor(Math.random() * letters.length)];
		}
		return color;
	}
	
	/* Color users in chat window */
	function colorLogUsers(n){
		var link = '<span style=" color: ' + cColors[n] + '">' + n + '</span>';
	    return link;
	}
	
	/* Create User Links */
	function createPrivateLink(n){
	    var color = get_random_color();	
        cColors[n] = color;		
		var link = '<span>';
		link += '<a id="_'+ n +'" href="#"' +' style=" color: ' + color + '" class="client">' + n + '</a>';
		
		if(n != yourName)
			link += '<a href="#" class="private"><></a>';
		else
			link += '<a href="#" class="broadcast"><></a>';
		
		link += '</span>';
		return link;
	}
	
	/* Handle Hotkeys for Messages */
	$("#msg").bind('keypress', function(event) {
	
		if (event.keyCode == 13 && !event.shiftKey) {
			send();
			$('textarea').val('');
			return false;
		}		
		return true;
	});
	
	/* >> >> >> >> */
	
	
	/* >> Image Support >> */
	var imageCount = 1;
	oFReader = new FileReader(), rFilter = /^(image\/bmp|image\/cis-cod|image\/gif|image\/ief|image\/jpeg|image\/jpeg|image\/jpeg|image\/pipeg|image\/png|image\/svg\+xml|image\/tiff|image\/x-cmu-raster|image\/x-cmx|image\/x-icon|image\/x-portable-anymap|image\/x-portable-bitmap|image\/x-portable-graymap|image\/x-portable-pixmap|image\/x-rgb|image\/x-xbitmap|image\/x-xpixmap|image\/x-xwindowdump)$/i;  
  
	oFReader.onload = function (oFREvent) {  
	  var byteImageData = oFREvent.target.result;
	  loadedPage.getElementById("uploadPreview").src = byteImageData;
	  var msg =  $("#msg");
	  
	  msg.val(msg.val() + '[img' + imageCount +']'); 
	  imageList[imageCount] = byteImageData;

	  imageCount++;
	};  
	  
	function loadImageFile() {  
	  if (loadedPage.getElementById("upload").files.length === 0) { return; }  
	  var oFile = loadedPage.getElementById("upload").files[0];  
	  if (!rFilter.test(oFile.type)) { alert("You must select a valid image file!"); return; }  
	  oFReader.readAsDataURL(oFile);  
	} 
		
	$("#upload").change(function(){
		loadImageFile();
	});

	/* clickable images in new window */
	$("#log img").live('click', function(){
		var w = window.open('popup_image.html', '', 'width=400,height=400');
		var imageId = $(this).attr('id');
		w.window.onload = function() {
			w.document.getElementById('image').innerHTML = document.getElementById(imageId).outerHTML;
			w.resizeBy(w.document.images[0].width - w.innerWidth, w.document.images[0].height - w.innerHeight);
		};
		w.document.close();
	});
	
	/* >> >> >> >> */	

	
	/* >> Login and Load Up Animations >> */
	
	$(".startUp form").submit(function(){

	  yourName = $(".startUp input:nth-child(1)").attr("value");
	  psswd = $(".startUp input:nth-child(2)").attr("value");
	  if(yourName == ""){return false; }

	  if(psswd == "") {return false; }
	  
	  if(isNaN(parseInt(psswd))){ alert("Not Valid Number"); return false; }
	 
	  /* LOGIN TO SERVER */
	  socket.send ("I AM "+ yourName);

	   return false;
	});
	
	
	/* Animation 0: start sequence */
	function loginAnimation(){
		var sequence = $("#processing .loading");
		var count = sequence.length;
		var i = 0;
		var pause = 1500;
		triggerAudio("startUp");
		setTimeout(bondSequence, 8700);

		setTimeout(transition, pause);

		/* Login Animation */
		function transition(){
			sequence.eq(i).animate({opacity:'1.0'}, 1000);

			if(++i >=count){
			return false;
		}

		sequence.eq(i).animate({opacity:'0.2'}, 1000);

		setTimeout(transition, pause);	 
		}
	}
	
	/* Animation 1: bond sequence */
	function bondSequence(){
	  panelMsg.hide("slow");
	  close.hide("slow");	
	  $("#processing").addClass("hidden");
	  startUpAnimArea.addClass("hidden");	  
	  graphicBlood.animate({top:'0px'}, 10000);
	  slidingPanel.animate({backgroundPosition: '-195px 50%'}, 2000)
	  .animate({backgroundPosition: '-225px 55%'}, 1000)
	  .animate({backgroundPosition: '-235px 45%'}, 1000)
	  .animate({backgroundPosition: '-225px 65%'}, 1000)
	  .animate({backgroundPosition: '-225px 50%'}, 1000);
	  setTimeout(unlock, 10500);
	}
	
	function triggerAudio(segment){
		if(segment = "startUp"){
			bondAudio.play();
		}
	}
	
	/* Animation 2: lock sequence */
	
	$(".lock form").submit(function(){
	  var submitName = $(".lock input:nth-child(1)").attr("value");
	  var submitPasswd = $(".lock input:nth-child(2)").attr("value");
	  if(yourName == "" || yourName != submitName){ return false; }
	  if(psswd == "" || psswd != submitPasswd) {return false; }
	  lock();
	  return false;
	
	});
	
	function lock(){
		close.hide("slow");
		lockPanel.addClass("hidden");
		unlockPanel.removeClass("hidden");
		panelMsg.html("LOCKED");
		panelMsg.show("slow");
	}
	
	$(".ulock form").submit(function(){
	  var submitName = $(".ulock input:nth-child(1)").attr("value");
	  var submitPasswd = $(".ulock input:nth-child(2)").attr("value");
	  
	  if(yourName == "" || yourName != submitName){return false; }
	  if(psswd == "" || psswd != submitPasswd) {return false; }

	  ulock();
	  
	  return false;
	
	});
	
	function ulock(){
	  panelMsg.hide("slow");
	  close.hide("slow");
	  slidingPanel.slideUp(2000, function(){
			  open.show("slow");
			  $(this).addClass("hidden");
			  lockPanel.removeClass("hidden");
			  unlockPanel.addClass("hidden");
	  });	
	}

	/* Animation 3: unlock sequence */
	function unlock(){
	
	  panelMsg.hide("slow");
	  slidingPanel.slideUp(2000, function(){
			  open.show("slow");
	  });	
	  $("#agent").slideUp(1800);
	  
	  $(".login li:nth-child(2)").html(yourName + " online");
	  uxWindows.addClass("windowGlow");
	  $("#log").append('<div id="' + yourName + '" class="currentClient"> </div>');

	  requestClientList();
	  setTimeout(displayLoginLock, 2000);
	}
	
	function displayLoginLock(){
		graphicBlood.addClass("hidden");
		startUpAnimArea.addClass("hidden");
		lockPanel.removeClass("hidden");
		$(".login-form").removeClass("goldschmidt");
	}
	
	
	/* Animation 4: panel sliding sequence of events */
	
	open.click(function(){
	    open.hide("slow");
		slidingPanel.slideDown(1000, function(){
			close.show("slow");
		});	
        uxWindows.removeClass("windowGlow");		
	});	
	
	close.click(function(){
		close.hide("slow");
		slidingPanel.slideUp(1000, function(){
			open.show("slow");
		});	
		uxWindows.addClass("windowGlow");		
	});		
	
	
	/* Initialization */
	
	close.hide("fast");
	open.hide("fast");
	panelMsg.show("slow");	
	init();
	
});