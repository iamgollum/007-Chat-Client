/*
CSCI-4220 Network Programming
Project #4 Chat Client Protocol

Your chat client must implement all TCP aspects of
the protocol specified in Project #3.

You may assume that UDP will be ignored.

You must support (via TCP and WebSockets) both chunked
and non-chunked messaging.  You may assume that all
data/chunks will be received successfully by the client.

Further, you may assume that the chat server will adhere
to all rules/specifications of the protocol.  This will
limit the amount of error-checking you'll need to do on
the client side.

Modifications to the Project #3 protocol are:

(a) When a client receives a message from the server,
    it will appear as a FROM message, but with either
    BROADCAST or PRIVATE prepended (indicating the type
    of message it is), as in:

      BROADCAST FROM ladygaga\n
      9\n
      You suck!

      PRIVATE FROM selenagomez\n
      15\n
      leave me alone!

(b) Note that for multicast messages sent to the server
    (the extra credit from Project #3), the message will
    appear as a PRIVATE message, described above in (a).
    In other words, there will be no indication that the
    message was sent to anyone else.
*/

//globals
var socket;
var port;
var yourName;
var CHUNK_SIZE = 10;
var clients = ["Aaron", "selenagomez","parishilton", "justinbieber", "edwardvampire", "bellhuman", "jacobwerewolf"];

$("#close").hide("fast");
$("#lock").show("slow");

$(document).ready(function() {


	/*
	 * SECTION I: HTML 5 Web Sockets
	 */
	
	function init () {
	
		var host = "ws://localhost"; //ws://localhost:8787/
		
		try {
			// Firefox accept only MozWebSocket
			socket = ("MozWebSocket" in window ? new MozWebSocket (host) : new WebSocket(host));
			//socket = ("WebScoket" in window) ? new WebSocket(host) :
			log ('WebSocket - status ' + socket.readyState);
			
			socket.onopen = function (msg) {
				log ("Welcome - status " + this.readyState);
			}
			
			socket.onmessage = function (msg) {
				log ("Received: " + msg.data);
			}

			socket.onclose = function (msg) {
				log ("Disconnected - status " + this.readyState); 
			}
		}
		catch (ex) {
			log (ex);
		}
		$("#msg").focus ();
	}
	
	$("#send").live().click(function(){
	   send();
	});
	
	$("#quit").live().click(function(){
	   quit();
	});
	
	function send () {
		var txt, msg;
		
		txt = $("#msg");
		msg = txt.attr("value");

		if (!msg) {
			alert ("Message can not be empty");
			return;
		}

		/*txt.value = "";*/
		/*txt.focus ();*/
		
		//prepare Message
		var originalMsg = msg;
		var msgLen = msg.length;
		var remSize = msgLen;
		var start = 0;
		
		msg = "BROADCAST FROM " + yourName + "\n";
		
		if(msgLen > 999){ alert("Maximum Exceeded!"); }
		if(msgLen > 30){
		    while(remSize >= CHUNK_SIZE){
				msg = "C" + CHUNK_SIZE + "\n" + originalMsg.substring(start, CHUNK_SIZE+1); 
			    log(msg);
				remSize	-= CHUNK_SIZE;
				start += (CHUNK_SIZE + 1);				
			}
			//grab remaining			
			msg = msg + "C" + remSize + "\n" + originalMsg.substring(start) + "\nC0"; 			
			log(msg);
		}
		else{
			msg += msgLen + "\n" + originalMsg;
		}

		try {
			socket.send (msg);
			/*log ('Sent: ' + msg);*/
		}
		catch (ex) {
			log (ex);
		}
	}
	
	
	/*
	 * SECTION II: Fake Server
	 */
	 
	 function recieveFromServer(){
	    
	    //replace \n with <br /> for output
		var brChunk = "BROADCAST FROM justinbieber\nC5\nDude!\nC9\nYou suck!\nC0";
		var prvChunk = "PRIVATE FROM ladygaga\nC5\nDude!\nC9\nYou rock!\nC0";
		var brUnChunk = "BROADCAST FROM ladygaga\n9\nYou suck!";
		var prvUnChunk = "PRIVATE FROM selenagomez\n15\nleave me alone!";
	    
		var lines = prvUnChunk.split("\n");
		 for(i=0; i < lines.length; i++){
			var words = lines[i].split(" ");
			//alert(words[0] + " " + words [1]);
		 }
		 
		 var response = "OK\n";
		 
		 return response; 
	 }

	function getClientListing () {
	
	    //socket.send ("USERS\n");
		//split by \n, split by , and new client array!
		
		var allUsers = "";
		for(i = 0; i < clients.length; i++){
			 link = createPrivateLink(clients[i]);
			 allUsers += link;
			 
			 if(yourName == clients[i]){
			 allUsers += " (that's you!) ";
			 }
			 
			 if(i < clients.length - 1){
			 allUsers += ", ";
			 }
		}
		
		$("#users").html(allUsers);
	}

	function quit () {
		log ("Goodbye!");
		socket.close ();
		socket = null;
	}

	// Utilities
	function log (msg) {
		$("#log").append("<p>" + msg + "<p>");
	}
	
	function createPrivateLink(n){
	    var color = get_random_color();
		var link = '<a href="newPrivateChat(' + n + ')" style=" color: ' + color + '">' + n +'</a>';
		return link;
	}
	
	function get_random_color() {
		var letters = 'A709C'.split('');
		var color = '#';
		for (var i=0; i<3; i++ ) {
			color += letters[Math.floor(Math.random() * letters.length)];
		}
		return color;
	}
	
	$("#msg").bind('keypress', function(event) {
		if (event.keyCode == 13) {
			send();
		}
	});
	
	/*
	 * SECTION III: Login and Animations
	 */
	
	
	//login effect
	$("#verify").submit(function(){
	
	  yourName = $("input:nth-child(1)").attr("value");
	  port = $("input:nth-child(2)").attr("value");
	  if(yourName == ""){return; }//initiate 10 second explosion counter
	  if(port == "") {return; }
	  
	  if(isNaN(parseInt(port))){ alert("Not Valid Number"); return; }
	 
	 //socket.send ("I AM "+ yourName + "\n");
	 
	 var resp = recieveFromServer();
	 
	 if(resp != "OK\n"){ return; }
	 
	 //do loading sequence
	 var sequence = $(".loading");
	 var count = sequence.length;
	 var i = 0;
	 var pause = 500;
	 setTimeout(transition, pause);
	 function transition(){
		sequence.eq(i).animate({opacity:'1.0'}, 400);
	 
		if(++i >=count){
		 $("#centerPanel").replaceWith('<div id="brand"></div>');
		 setTimeout(unlock, pause);	
		 return false;
		}

		sequence.eq(i).animate({opacity:'0.2'}, 400);

		setTimeout(transition, pause);	 
	 }
	   return false;
	});
	
	function unlock(){
	  $("#lock").hide("slow");
	  $("#close").hide("slow");
	  $("div#panel").slideUp(2000, function(){
			  $("#open").show("slow");
	  });	
	  
	  $(".login li:nth-child(2)").html(yourName + " online");
	  $(".window").addClass("windowGlow");
	  getClientListing();
	  init();
	}
	
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
	
	function wait(millis)
	{
		var date = new Date();
		var curDate = null;

		do { curDate = new Date(); }
		while(curDate-date < millis);
	} 
	unlock();
});