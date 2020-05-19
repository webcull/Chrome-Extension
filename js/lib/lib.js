
function getCookies(domain, name, callback) {
    chrome.cookies.get({"url": domain, "name": name}, function(cookie) {
        if(callback) {
            callback(cookie.value);
        }
    });
}
var arrDefaultParams = {
	
};
function sessionPost(arrParams) {
	getCookies("https://webcull.com", "__DbSessionNamespaces", function(session_hash) {
		if (arrDefaultParams)
			$.extend(arrParams.post, arrDefaultParams);
		$.extend(arrParams.post, {
			__DbSessionNamespaces : session_hash
		});
		console.log('arrParams', arrParams);
		// process the save
		fetch(arrParams.url, {
			method: 'post',
			//credentials : 'omit',
			headers: {
				"Content-type": "application/x-www-form-urlencoded; charset=UTF-8"
			},
			body: $.queryString(arrParams.post) 
		})
		.then(function(response) {
	    		return response.text();
	  	})
		.then(function (data) {
			try {
				var mixedData = JSON.parse(data);
				console.log('json', mixedData);
				if (arrParams.success)
					arrParams.success(mixedData);
			} catch (err) {
				console.log("Parse error: ", err, data);
			};
		})
		.catch(function (err) {
			console.log("Fetch Error: ", err);
		});
	});
}

function getTab (fnCallback) {
	chrome.tabs.getSelected(null,function(tab) {
		fnCallback(tab);
	});
}
function dblEncode(val) {
	return encodeURIComponent(encodeURIComponent(val));
}
function backlog(strVal) {
	chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
		chrome.tabs.executeScript(
			tabs[0].id,
			{code: 'console.log(unescape("' + escape(strVal) + '"));'}
		);
	});
}
