
function getCookies(domain, name, callback) {
	chrome.cookies.get({ "url": domain, "name": name }, function (cookie) {
		if (callback) {
			callback(cookie.value);
		}
	});
}
var arrDefaultParams = {};

async function sessionPost(arrParams) {
	var callback = async function (session_hash) {
			if (arrDefaultParams) $.extend(arrParams.post, arrDefaultParams);
			$.extend(arrParams.post, { __DbSessionNamespaces: session_hash });
			try {
				var request = await fetch(arrParams.url, {
					method: 'post',
					headers: { "Content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
					body: $.queryString(arrParams.post)
				})
				var data = await request.text();
				var mixedData = JSON.parse(data);
				if (arrParams.success) arrParams.success(mixedData);
			} catch (error) {
				if (arrParams.failure) { arrParams.failure(error) }
				//else { throw new Error(error) }
			} finally {}
		};
		
	getCookies("https://webcull.com", "__DbSessionNamespaces", callback);
}
async function sessionPostWithRetries(arrParams, retries = 0, delayMs = 15) {
	var promise = sessionPost(arrParams);
	for (var i = 0; i < retries; i++) {
		promise = promise.catch(function (err) {
			return new Promise((resolve, reject) => {
				setTimeout(reject.bind(null, err), delayMs);
			});
		}).catch(function (err) {
			return sessionPost(arrParams);
		});
	}
	return promise;
}

function getTab(fnCallback) {
	chrome.tabs.getSelected(null, function (tab) {
		fnCallback(tab);
	});
}
function dblEncode(val) {
	return encodeURIComponent(encodeURIComponent(val));
}
function backlog(strVal) {
	chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
		chrome.tabs.executeScript(
			tabs[0].id,
			{ code: 'console.log(unescape("' + escape(strVal) + '"));' }
		);
	});
}
