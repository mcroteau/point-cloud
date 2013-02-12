var SUCCESS = 200,
	LOCAL = 0,
    DONE = 4;

self.addEventListener('message', function(message) {
	
	
    var http = new XMLHttpRequest();
    var url = message.data.url;
	
    http.open("GET", url, false);
    http.send();
	
	//self.postMessage({id : message.data.id, status : 'processing'})
		
	if(http.readyState === DONE && 
			( http.status == SUCCESS || http.status == LOCAL )){
		var responseMessage = {
			id   : message.data.id,
			status : 'complete',
			data : http.responseText
		}
		self.postMessage(responseMessage);
	}
	
}, false);