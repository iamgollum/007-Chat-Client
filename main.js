/*
CSCI-4220 Network Programming
Project #4 Chat Client Protocol

Your chat client must implement all TCP aspects of
the protocol specified in Project #3.

You may assume that UDP will be ignored.

You must suppsswd (via TCP and WebSockets) both chunked
and non-chunked messaging.  You may assume that all
data/chunks will be received successfully by the client.
*/

$(document).ready(function() {
	//Globals
	var socket;
	var psswd;
	var yourName = "Aaron";
	var CHUNK_SIZE = 2000;
	var CHUNK_MIN_REQ = 30;
	var clients = ["Aaron", "selenagomez","parishilton", "justinbieber", "edwardvampire", "bellhuman", "jacobwerewolf"];
    var cColors = new Object();
	var imageList = new Object();
	var loadedPage = this;
	
	/* >> HTML 5 Web Sockets >> */

	function init () {
	
		var host = "ws://echo.websocket.org/"; //ws://localhost:8787/
		
		try {
			socket = ("MozWebSocket" in window ? new MozWebSocket (host) : new WebSocket(host));

				log ('WebSocket - status ' + socket.readyState);
			
			socket.onopen = function (msg) {
				log ("Welcome - status " + this.readyState);
			}
			
			socket.onmessage = function (msg) {
			    serverResponse(msg.data);
				//log ("Received: " + msg.data);
			}

			socket.onclose = function (msg) {
				log ("Disconnected - status " + this.readyState); 
			}
		}
		catch (ex) {
			log (ex);
		}
		
		$("#msg").focus();
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
		
		msg = "BROADCAST FROM " + yourName + "\n";
		// Max Limit
		/*
		if(msgLen > 999){ 
			txt.val("Maximum Exceeded!"); 
			return; 
		}
		*/
		log ('Before Chunk: ' + originalMsg);
		log('size of msg: ' + msgLen);
		
		// Chunk If Needed
		if(msgLen > CHUNK_MIN_REQ){
		
		    while(remSize > CHUNK_SIZE){
				msg += "C" + CHUNK_SIZE + "\n" + originalMsg.substring(start, stop) + "\n"; 
				remSize	-= CHUNK_SIZE;
				stop += CHUNK_SIZE;
				start += CHUNK_SIZE;
				log(msg);
				if(start = 10000){ break; }
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
		var pattern = /\d/g;
        var compiledMsg = "";
		var isPrivate = 0;
		var userID = "";
		/*
		For Login "I AM" response
		if(lines[0] == "OK"){
			return "OK";
		}
		*/
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
			
			//existing user
			if($("#"+user).hasClass("hidden")){
				$("#"+user).addClass("currentClient").removeClass("hidden");
			}
			//create new
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
	
	    //socket.send ("USERS\n");		
		var allUsers = "";
		for(i = 0; i < clients.length; i++){
			 link = createPrivateLink(clients[i]);
			 allUsers += link;
		}
		$("#controller p").html('Logged in as "' + yourName + '" (type message and hit ENTER or click SEND)');
		$("#users").html(allUsers);
	}

	function quit () {
		log ("Goodbye!");
		socket.close ();
		socket = null;
	}

	
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
	  
	  $("#msg").val($("#msg").val() + '[img' + imageCount +']'); 
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
	
	$(".verify").submit(function(){
	
	  yourName = $("input:nth-child(1)").attr("value");
	  psswd = $("input:nth-child(2)").attr("value");
	  if(yourName == ""){return; }
	  //10 second explosion counter
	  if(psswd == "") {return; }
	  
	  if(isNaN(parseInt(psswd))){ alert("Not Valid Number"); return; }
	 
	 //socket.send ("I AM "+ yourName + "\n");
	 
	 var resp = "OK\n";
	 if(resp != "OK\n"){ return; }
	 
	 var sequence = $(".loading");
	 var count = sequence.length;
	 var i = 0;
	 var pause = 500;
	 
	 setTimeout(transition, pause/2);
	 
	 // Login Animation
	 function transition(){
		sequence.eq(i).animate({opacity:'1.0'}, 400);
	 
		if(++i >=count){
		 //$(".centerPanel").replaceWith('<div id="brand"></div>');
		 setTimeout(unlock, pause);	
		 return false;
		}

		sequence.eq(i).animate({opacity:'0.2'}, 400);

		setTimeout(transition, pause);	 
	 }
	   return false;
	});
	
	// Unlock chat client
	function unlock(){
	  $("#lock").hide("slow");
	  $("#close").hide("slow");
	  $("div#panel").slideUp(2000, function(){
			  $("#open").show("slow");
	  });	
	  
	  $(".login li:nth-child(2)").html(yourName + " online");
	  $(".window").addClass("windowGlow");
	  $("#log").append('<div id="' + yourName + '" class="currentClient"> </div>');
	  getClientListing();
	  init();
	}
	
	function lock(){
	
	}
	/* >> >> >> >> */
	
	
	/* >> Panel Sliding Animations >> */
	
	// Expand Panel
	$("#open").click(function(){
	
		$("div#panel").slideDown(1000, function(){
			$("close").show("slow");
		});	
        $(".window").removeClass("windowGlow");		
	});	
	
	// Collapse Panel
	$("#close").click(function(){
		$("open").hide("fast");
		$("div#panel").slideUp(1000, function(){
			$("open").show("slow");
		});	
		$(".window").addClass("windowGlow");		
	});		
	
	// Switch button types
	$("#toggle a").click(function () {
		$("#toggle a").slideToggle("slow");
	});
	
	/* >> >> >> >> */
	
	/* >> Misc Functions >> */
	
	function wait(millis)
	{
		var date = new Date();
		var curDate = null;

		do { curDate = new Date(); }
		while(curDate-date < millis);
	}
	
	
	/* Initialization */
	
	$("#close").hide("fast");
	$("#lock").show("slow");	
	//unlock();
	
});