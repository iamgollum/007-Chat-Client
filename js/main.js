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
	var yourName = "";
	var CHUNK_SIZE = 500;
	var CHUNK_MIN_REQ = 200;
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
	
	/* >> HTML 5 Web Sockets >> */

	function init () {
	
		var host = "ws://karnani.co:8787/chat"; /* ws://tomrozanski.com:8787/chat  ws://echo.websocket.org/ echo server*/
		
		try {
			socket = ("MozWebSocket" in window ? new MozWebSocket (host) : new WebSocket(host));

				log ('WebSocket - status ' + socket.readyState);
			
			socket.onopen = function (msg) {
				log ("Welcome - status " + this.readyState);
			}
			
			socket.onmessage = function (msg) {

			   if(serverResponse(msg.data) == "OK"){
				  LOGGED_IN = 1;
				  CURRENT_PRIVATE_USER = yourName;
				  //loginAnimation();
				  unlock();
			   };
			}

			socket.onclose = function (msg) {
				log ("Disconnected - status " + this.readyState); 
			}
		}
		catch (ex) {
			log (ex);
		}
		
		/*
		$("#msg").focus();
		*/
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
		
		// prepare Message
		msg = msg.replace(/\n/g,"<br/>");
		var newImage = $("#imgclone").clone().removeClass("hidden");
		
		//test replace in loop for each image!
		var imgListSize = Object.keys(imageList).length;
		for(i = 1; i <= imgListSize; i++){
			newImage.attr('src', imageList[i]);
			msg = msg.replace("[img" + i + "]", newImage.prop("outerHTML"));
		}

		var originalMsg = msg;
		var msgLen = msg.length;
		var remSize = msgLen;
		var start = 0;
		var stop = CHUNK_SIZE;
		
		msg = "BROADCAST\n";
		
		if(CURRENT_PRIVATE_USER != yourName){
			msg = "PRIVATE FROM " + yourName;
		}
		// Max Limit
		
		/*
		if(msgLen > 999){ 
			txt.val("Maximum Exceeded!"); 
			return; 
		}
		*/
		
		/*
		PROBLEM TO FIX: originalMsg containing image data, 
		substring does not work, returns undefined!!
		*/
		
		// Chunk If Needed
		if(msgLen > CHUNK_MIN_REQ){
		
		    while(remSize > CHUNK_SIZE){
				msg += "C" + CHUNK_SIZE + "\n" + originalMsg.substring(start, stop) + "\n"; 
				log();
				remSize	-= CHUNK_SIZE;
				stop += CHUNK_SIZE;
				start += CHUNK_SIZE;
			}
			// grab remaining
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
		    log ('Sent: ' + msg);
			socket.send (msg);
		}
		catch (ex) {
			log (ex);
		}
	}
	 
	 function serverResponse(resp){

		var lines = resp.split("\n");
		var users = resp.split(",");
		
		if( (users[0] == yourName && users.length == 1) || users.length > 1){
			
			clients = users;
			getClientListing();
			return;
		}
		log(resp);
		
		var pattern = /\d/g;
        var compiledMsg = "";
		var isPrivate = 0;
		var userID = "";

		/* For Login "I AM" response */
		if(lines[0] == "OK"){
			return "OK";
		}
		
		for(i=0; i < lines.length; i++){
		     
		    //parse Header for Recipient 
		    if(i == 0){
				var head = lines[i].split(" ");
			   
				if(head[0] == "BROADCAST"){ 
					userID = head[2];
				}
				if(head[0] == "PRIVATE"){
			        isPrivate = 1;
					userID = head[2];
				}
			}
			else{
			    /*
			    var line = lines[i].match(pattern);
				alert(line);
				*/
				if(lines[i].match(pattern) == null)
					compiledMsg += lines[i];
			}
		}
		log(compiledMsg, userID, isPrivate);
	 }
     
	//create new private client
	$(".client").live("click", function(){
	    
		$(".currentUser").parent().css("border", "2px solid rgb(216, 216, 211)");
	    $(".currentUser").removeClass('currentUser');
		
		var user = $(this).attr('id').substring(1);
       
		if( !( $("#"+user).hasClass("currentClient")) )
		{
			$(".currentClient").addClass("hidden").removeClass("currentClient");
			
			// existing user
			if($("#"+user).hasClass("hidden")){
				$("#"+user).addClass("currentClient").removeClass("hidden");
			}
			// create new
			else{
				$("#log").append('<div id="' + user + '"> </div>');
				$("#"+user).addClass("currentClient");
				$(this).parent().addClass("open");
				$(this).siblings().addClass("remove");

			}
		}
		$(this).addClass('currentUser');
		$(this).parent().css("border", "2px solid rgb(155, 155, 198)");
	});
	
	// Remove private client
    $(".remove").live("click", function(){
        
		var sibling = $(this).siblings();
		var clientId = sibling.attr('id').substring(1);
		
		$(this).parent().removeClass("open");
		$("#"+clientId).remove();
		$("#"+yourName).removeClass("hidden").addClass("currentClient");
		$(".currentUser").parent().css("border", "2px solid rgb(216, 216, 211)");
		$(".currentUser").removeClass('currentUser');
		$("#_"+yourName).addClass("currentUser");
		$(".currentUser").parent().css("border", "2px solid rgb(155, 155, 198)");
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
				allUsers += link;
			 }

			$("#_"+thisClient).addClass("online");
		}
		$("#controller p").html('Logged in as "' + yourName + '" (type message and hit ENTER or click SEND)');
		$("#users").append(allUsers);
		
		/* Remove Disconnected Clients */
		var allLinks = $(".client");
		allLinks.each(function(){
			
			var id = $(this).attr('id');

			if($(this).hasClass("online")){
				log(id + " is online");
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
		CRON_SCRIPT = setTimeout(requestClientList, 10000);
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
	
	// Output messages to console: private or broadcast
	function log (msg, targetUser, isPrivate) {

	    if(isPrivate) {			
			$("#"+targetUser).append("<p>" + colorLogUsers(targetUser) + ": " + msg + "<p>");
		}
		else{
			$("#"+yourName).append("<p>" + colorLogUsers(targetUser) + ": " + msg + "<p>");
		}
	}
	
	// Get random color for user links
	function get_random_color() {
		var letters = 'A709C2'.split('');
		var color = '#';
		for (var i=0; i<3; i++ ) {
			color += letters[Math.floor(Math.random() * letters.length)];
		}
		return color;
	}
	
	// Color users in chat window
	function colorLogUsers(n){
		var link = '<span style=" color: ' + cColors[n] + '">' + n + '</span>';
	    return link;
	}
	
	// Create User Links
	function createPrivateLink(n){
	    var color = get_random_color();	
        cColors[n] = color;		
		var link = '<span>';
		link += '<a id="_'+ n +'" href="#"' +' style=" color: ' + color + '" class="client">' + n + '</a>';
		link += '<a href="#"><></a>';
		link += '</span>';
		return link;
	}
	
	// Handle Hotkeys for Messages
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
	
	/* >> >> >> >> */	
	
	$("#upload").change(function(){
		loadImageFile();
	});

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
	
	
	// Animation 0: start sequence
	function loginAnimation(){
		var sequence = $(".loading");
		var count = sequence.length;
		var i = 0;
		var pause = 1500;
		triggerAudio("startUp");
		setTimeout(bondSequence, 8700);

		setTimeout(transition, pause);

		// Login Animation
		function transition(){
			sequence.eq(i).animate({opacity:'1.0'}, 1000);

			if(++i >=count){
			return false;
		}

		sequence.eq(i).animate({opacity:'0.2'}, 1000);

		setTimeout(transition, pause);	 
		}
	}
	// Animation 1: bond sequence
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

	$(".lock form").submit(function(){
	  var submitName = $(".lock input:nth-child(1)").attr("value");
	  var submitPasswd = $(".lock input:nth-child(2)").attr("value");
	  if(yourName == "" || yourName != submitName){ return; }
	  if(psswd == "" || psswd != submitPasswd) {return; }
	  lock();
	  return false;
	
	});
	
	/* Animation 2: lock sequence */
	
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
	  
	  if(yourName == "" || yourName != submitName){return; }
	  if(psswd == "" || psswd != submitPasswd) {return; }

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
	  
	  $(".login li:nth-child(2)").html(yourName + " online");
	  uxWindows.addClass("windowGlow");
	  $("#log").append('<div id="' + yourName + '" class="currentClient"> </div>');

	  requestClientList();
	  setTimeout(displayLoginLock, 2000);
	}
	
	function displayLoginLock(){
		startUpAnimArea.addClass("hidden");
		lockPanel.removeClass("hidden");
		$(".login-form").removeClass("goldschmidt");
		graphicBlood.addClass("hidden");
	}
	
	
	/* Animation 4: panel sliding sequence of events */
	
	open.click(function(){
	    open.hide("slow");
		slidingPanel.slideDown(1000, function(){
			close.show("slow");
		});	
        uxWindows.removeClass("windowGlow");		
	});	
	
	/* Collapse Panel */
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